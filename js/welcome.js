/* ==========================================================================
   Section: "Welcome to my World"
   State 1 (hero, centred heading)  →  State 2 (split: text left, photo right)

   How it works
   - The HTML/CSS layout IS State 2. JS measures that layout and computes the
     transforms that put the heading/kicker/subline into the centred hero
     position. A scrubbed, pinned timeline animates those transforms back to
     zero. Only transform, opacity and clip-path are animated.
   - "One step" snapping is done through Lenis (not ScrollTrigger's snap), so
     the two never fight over the scroll position.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG — every tunable lives here
     ------------------------------------------------------------------------ */
  const CONFIG = {
    breakpoint: 1024, // px. Below this: stacked layout, no pinning (keep in sync with css/welcome.css)

    scroll: {
      transitionVh: 100, // scroll distance (in vh) for hero → split
      holdVh: 45,        // extra pinned scroll after the split (parallax) before the section unpins
      scrub: true,       // true = tied 1:1 to (Lenis-smoothed) scroll; a number = extra lag in seconds
    },

    hero: {
      // Hero heading size = clamp(fontMin px, fontVw vw, fontMax px)  ≈ clamp(3.5rem, 11vw, 10rem)
      fontMin: 56,
      fontVw: 11,
      fontMax: 160,
      maxWidth: 0.92,    // hero heading never wider than this fraction of the viewport
      kickerGap: 32,     // px between kicker and heading in the hero state
      subGap: 30,        // px between heading and subline in the hero state
      offsetY: -0.015,   // nudge the whole hero group up (−) / down (+), fraction of viewport height
    },

    heading: { ease: 'power3.inOut' }, // heading move takes the whole transition (timeline 0 → 1)

    meta: { duration: 0.35, lift: 28 }, // kicker + subline fade-out: timeline length, px moved up

    photo: {
      delay: 0.22,        // timeline position (0–1) where the photo starts
      duration: 0.62,
      fromXPercent: 15,
      fromScale: 1.05,
      ease: 'power2.out',
    },

    intro: { start: 0.62, duration: 0.28, stagger: 0.05, fromY: 24, ease: 'power2.out' },

    // Movement during the hold (after the split): the frame drifts slightly less than
    // the text. Keep the two close so the top/bottom alignment stays readable.
    parallax: { textVh: 5, photoVh: 4 },

    tilt: { enabled: false, maxDeg: 3, duration: 0.9 }, // off: a tilting frame reads as a gimmick here

    snap: {
      enabled: true,
      duration: 1.1,   // seconds for one step (hero ↔ split)
      tolerance: 2,    // px
      absorbMs: 200,   // swallow trailing trackpad/wheel momentum (same direction) after a step
      commit: 0.08,    // non-wheel scrolls (keys, scrollbar, touch): fraction past a state that commits the step
    },

    load: { delay: 0.15, lineDuration: 1.1, lineStagger: 0.12, metaAt: 0.55, metaDuration: 0.7 },

    mobile: { fromY: 40, duration: 0.9, start: 'top 88%' },
  };

  /* ------------------------------------------------------------------------ */

  const root = document.documentElement;
  const section = document.getElementById('welcome');
  const ready = () => root.classList.remove('js-loading');
  const introRunning = () => root.classList.contains('intro-active');
  // Run fn now, or once the intro (js/intro.js) has finished sliding the site in
  const afterIntro = (fn) => {
    if (introRunning()) document.addEventListener('intro:done', fn, { once: true });
    else fn();
  };
  // Tell the nav (js/nav.js) the hero heading has started animating
  const signalReveal = () => {
    (window.Site = window.Site || {}).welcomeRevealed = true;
    document.dispatchEvent(new CustomEvent('welcome:reveal'));
  };
  if (!section) return ready();

  setupCvButton(section.querySelector('[data-cv-link]'));

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return ready(); // libraries failed → static State 2
  gsap.registerPlugin(ScrollTrigger);

  const $ = (sel) => section.querySelector(sel);
  const $$ = (sel) => Array.from(section.querySelectorAll(sel));
  const els = {
    inner: $('.welcome__inner'),
    text: $('.welcome__text'),
    kicker: $('.welcome__kicker'),
    kickerIn: $('.welcome__kicker-in'),
    title: $('.welcome__title'),
    lines: $$('.welcome__line'),
    lineIns: $$('.welcome__line-in'),
    sub: $('.welcome__sub'),
    subIn: $('.welcome__sub-in'),
    reveals: $$('[data-welcome-reveal]'),
    media: $('.welcome__media'),
    parallax: $('.welcome__parallax'),
    tilt: $('.welcome__tilt'),
    clip: $('.welcome__clip'),
    chrome: $$('[data-welcome-chrome]'), // top rule + meta row
  };

  const bp = CONFIG.breakpoint;
  const start = () => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: `(min-width: ${bp}px) and (prefers-reduced-motion: no-preference)`,
        mobile: `(max-width: ${bp - 1}px) and (prefers-reduced-motion: no-preference)`,
        reduce: '(prefers-reduced-motion: reduce)',
      },
      (ctx) => {
        const { desktop, mobile } = ctx.conditions;
        if (desktop) return setupDesktop();
        if (mobile) return setupMobile();
        return setupReduced();
      }
    );
    ready();
  };

  // Measure with the real font, but never wait more than 2.5s for it
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(start, start);

  /* ========================================================================
     Desktop: pinned, scrubbed hero → split
     ======================================================================== */
  function setupDesktop() {
    section.classList.add('is-animated');

    const C = CONFIG;
    const m = {}; // measured hero-state offsets, refreshed on every ScrollTrigger refresh

    function measure() {
      const W = section.clientWidth;
      const H = window.innerHeight;
      const vw = window.innerWidth;

      const t = offsetWithin(els.title, section);
      const tw = els.title.offsetWidth;
      const th = els.title.offsetHeight;
      const fSplit = parseFloat(getComputedStyle(els.title).fontSize);
      const fHero = clamp(C.hero.fontMin, (vw * C.hero.fontVw) / 100, C.hero.fontMax);
      const s = Math.min(fHero / fSplit, (W * C.hero.maxWidth) / tw);

      const k = offsetWithin(els.kicker, section);
      const kw = els.kicker.offsetWidth;
      const kh = els.kicker.offsetHeight;
      const sb = offsetWithin(els.sub, section);
      const sw = els.sub.offsetWidth;
      const sh = els.sub.offsetHeight;

      const group = kh + C.hero.kickerGap + th * s + C.hero.subGap + sh;
      const top = (H - group) / 2 + H * C.hero.offsetY;
      const headingTop = top + kh + C.hero.kickerGap;

      m.scale = s;
      m.titleX = (W - tw * s) / 2 - t.x;
      m.titleY = headingTop - t.y;
      // Centre each line inside the (scaled) heading box; translate is in local, pre-scale px
      m.lineX = els.lineIns.map((el) => (tw - el.offsetWidth) / 2);
      m.kickerX = (W - kw) / 2 - k.x;
      m.kickerY = top - k.y;
      m.subX = (W - sw) / 2 - sb.x;
      m.subY = headingTop + th * s + C.hero.subGap - sb.y;
    }

    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);

    gsap.set(els.title, { transformOrigin: '0 0' });

    const hold = C.scroll.holdVh / C.scroll.transitionVh; // hold length in timeline units (transition = 1)

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + Math.round((window.innerHeight * (C.scroll.transitionVh + C.scroll.holdVh)) / 100),
        pin: true,
        scrub: C.scroll.scrub,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Heading: centred + big → left column + normal size (translate + scale only).
    // force3D:false keeps text re-rasterised (sharp) instead of a scaled bitmap.
    tl.fromTo(
      els.title,
      { x: () => m.titleX, y: () => m.titleY, scale: () => m.scale },
      { x: 0, y: 0, scale: 1, duration: 1, ease: C.heading.ease, force3D: false },
      0
    );
    els.lines.forEach((line, i) => {
      tl.fromTo(line, { x: () => m.lineX[i] }, { x: 0, duration: 1, ease: C.heading.ease, force3D: false }, 0);
    });

    // Kicker + subline: fade out and drift up as the heading starts moving
    tl.fromTo(
      els.kicker,
      { x: () => m.kickerX, y: () => m.kickerY, autoAlpha: 1 },
      { x: () => m.kickerX, y: () => m.kickerY - C.meta.lift, autoAlpha: 0, duration: C.meta.duration, ease: 'power1.in' },
      0
    );
    tl.fromTo(
      els.sub,
      { x: () => m.subX, y: () => m.subY, autoAlpha: 1 },
      { x: () => m.subX, y: () => m.subY - C.meta.lift, autoAlpha: 0, duration: C.meta.duration, ease: 'power1.in' },
      0
    );

    // Photo: slides in from the right, scales down, wipes in bottom → top
    tl.fromTo(
      els.media,
      { xPercent: C.photo.fromXPercent, scale: C.photo.fromScale, opacity: 0 },
      { xPercent: 0, scale: 1, opacity: 1, duration: C.photo.duration, ease: C.photo.ease },
      C.photo.delay
    );
    tl.fromTo(
      els.clip,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: C.photo.duration, ease: C.photo.ease },
      C.photo.delay
    );
    // Intro paragraph + buttons stagger in once the heading has (nearly) arrived
    tl.fromTo(
      els.reveals,
      { opacity: 0, y: C.intro.fromY },
      { opacity: 1, y: 0, duration: C.intro.duration, stagger: C.intro.stagger, ease: C.intro.ease },
      C.intro.start
    );

    // Hold: subtle parallax before unpinning — the photo moves less than the text
    tl.addLabel('split', 1);
    tl.fromTo(els.text, { y: 0 }, { y: () => (-window.innerHeight * C.parallax.textVh) / 100, duration: hold }, 'split');
    tl.fromTo(els.parallax, { y: 0 }, { y: () => (-window.innerHeight * C.parallax.photoVh) / 100, duration: hold }, 'split');

    const st = tl.scrollTrigger;

    // Page-load reveal: lines slide up out of their masks, then kicker + subline fade in
    // (paused until the intro is done, so it never plays hidden behind the video)
    const loadTl = gsap
      .timeline({ delay: CONFIG.load.delay, paused: true, onStart: signalReveal })
      .from(els.lineIns, {
        yPercent: 110,
        duration: CONFIG.load.lineDuration,
        stagger: CONFIG.load.lineStagger,
        ease: 'expo.out',
      })
      .from(
        [els.kickerIn, els.subIn],
        { opacity: 0, y: 10, duration: CONFIG.load.metaDuration, stagger: 0.08, ease: 'power2.out' },
        CONFIG.load.metaAt
      )
      .from(els.chrome, { opacity: 0, duration: CONFIG.load.metaDuration, ease: 'power1.out' }, CONFIG.load.metaAt);
    afterIntro(() => loadTl.play());

    const cleanups = [
      () => section.classList.remove('is-animated'),
      () => ScrollTrigger.removeEventListener('refreshInit', measure),
    ];
    if (C.snap.enabled) cleanups.push(setupStepSnap(st, tl));
    if (C.tilt.enabled) cleanups.push(setupTilt());

    return () => cleanups.forEach((fn) => fn && fn());
  }

  /* ------------------------------------------------------------------------
     One-step snapping (hero ↔ split) through the shared stepper (js/stepper.js)
     ------------------------------------------------------------------------ */
  function setupStepSnap(st, tl) {
    const S = CONFIG.snap;
    if (!window.Site || !window.Site.createStepper) return null;
    const heroY = () => st.start;
    const splitY = () => st.start + ((st.end - st.start) * tl.labels.split) / tl.duration();
    const stepper = window.Site.createStepper({
      stops: () => [heroY(), splitY()],
      exitDown: () => st.end + 1,
      duration: S.duration,
      tolerance: S.tolerance,
      absorbMs: S.absorbMs,
      commit: S.commit,
      isBlocked: () => introRunning() || root.classList.contains('nav-menu-open') || root.classList.contains('lightbox-open'),
    });

    // Keyboard focus on the (still hidden) intro buttons → reveal the split
    function onFocusIn(e) {
      if (!e.target.closest('[data-welcome-reveal]')) return;
      const y = window.scrollY;
      if (y < splitY() - S.tolerance && y >= heroY() - S.tolerance) stepper.goTo(1);
    }
    section.addEventListener('focusin', onFocusIn);

    return () => {
      stepper.destroy();
      section.removeEventListener('focusin', onFocusIn);
    };
  }

  /* ------------------------------------------------------------------------
     Mouse tilt (desktop, fine pointer only)
     ------------------------------------------------------------------------ */
  function setupTilt() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return null;
    const T = CONFIG.tilt;
    gsap.set(els.tilt, { transformPerspective: 1000, transformOrigin: '50% 100%' });
    const rotX = gsap.quickTo(els.tilt, 'rotationX', { duration: T.duration, ease: 'power3.out' });
    const rotY = gsap.quickTo(els.tilt, 'rotationY', { duration: T.duration, ease: 'power3.out' });

    function onMove(e) {
      const r = els.media.getBoundingClientRect();
      const nx = clamp(-1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), 1);
      const ny = clamp(-1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), 1);
      rotY(nx * T.maxDeg);  // face turns toward the cursor
      rotX(-ny * T.maxDeg);
    }
    function onLeave() {
      rotX(0);
      rotY(0);
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      gsap.set(els.tilt, { clearProps: 'transform' });
    };
  }

  /* ========================================================================
     Mobile: no pin. Hero reveal on load, then intro / photo fade up on scroll
     ======================================================================== */
  function setupMobile() {
    const M = CONFIG.mobile;
    const loadTl = gsap
      .timeline({ delay: CONFIG.load.delay, paused: true, onStart: signalReveal })
      .from(els.lineIns, { yPercent: 110, duration: CONFIG.load.lineDuration, stagger: CONFIG.load.lineStagger, ease: 'expo.out' })
      .from([els.kickerIn, els.subIn], { opacity: 0, y: 10, duration: CONFIG.load.metaDuration, stagger: 0.08, ease: 'power2.out' }, CONFIG.load.metaAt)
      .from(els.chrome, { opacity: 0, duration: CONFIG.load.metaDuration, ease: 'power1.out' }, CONFIG.load.metaAt);
    afterIntro(() => loadTl.play());

    [...els.reveals, els.media].forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: M.fromY },
        {
          opacity: 1,
          y: 0,
          duration: M.duration,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: M.start, toggleActions: 'play none none reverse' },
        }
      );
    });
  }

  /* ========================================================================
     Reduced motion: State 2 straight away, simple fade
     ======================================================================== */
  function setupReduced() {
    gsap.from(els.inner, { opacity: 0, duration: 0.6, ease: 'power1.out' });
    signalReveal();
  }

  /* ========================================================================
     Helpers
     ======================================================================== */

  // Show "Download CV" only if the PDF actually exists (GitHub Pages returns a 404 page otherwise)
  function setupCvButton(link) {
    if (!link || location.protocol === 'file:' || !window.fetch) return;
    fetch(link.getAttribute('href'), { method: 'HEAD', cache: 'no-store' })
      .then((res) => {
        const type = res.headers.get('content-type') || '';
        if (res.ok && !type.includes('text/html')) link.hidden = false;
      })
      .catch(() => {});
  }

  // Layout offset of el relative to ancestor (ignores transforms, so it is safe mid-animation)
  function offsetWithin(el, ancestor) {
    let x = 0;
    let y = 0;
    let node = el;
    while (node && node !== ancestor) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x, y };
  }

  function clamp(min, value, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
