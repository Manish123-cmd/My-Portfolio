/* ==========================================================================
   Section: About (#about) — mirrors #welcome
   State 1 (heading + bio centred, no photo)  →  State 2 (photo left, text right)

   How it works (desktop ≥ 1024px, motion allowed)
   - The HTML/CSS layout IS State 2. JS measures it and computes the transforms
     that put the text block in the centre (and centre each line). A pinned,
     scrubbed timeline animates those transforms back to zero: translate + scale
     only, so nothing re-wraps or jumps mid-move.
   - One scroll gesture = one step (centred ↔ split) via the shared stepper
     (js/stepper.js). After the split, a short extra pinned scroll colours the
     bio word by word (grey → ink), then the section unpins.
   - The photo slides in from the left. Only transform and opacity animate; the
     photo ends at scale 1 (no zoom, so it stays sharp).
   Below 1024px: no pin; the photo slides in from the left as it enters view.
   Reduced motion: State 2 straight away, simple fades. No JS: State 2.
   The skills themselves are edited in index.html (one <li class="ptile"> each).
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------------ */
  const CONFIG = {
    // Pinned stage on every screen at least this wide OR this tall (phones in portrait,
    // tablets, laptops). Only short screens (phones held sideways) get the stacked layout.
    // Keep in sync with css/about.css.
    breakpoint: 1024,            // px wide
    minStageHeight: 560,         // px tall

    scroll: {
      transitionVh: 100,         // scroll distance (vh) for centred → split
      holdVh: 60,                // extra pinned scroll after the split: bio words colour in
    },

    centre: {
      width: 900,                // State 1 text block is scaled to about this wide…
      maxScale: 1.25,            // …but never more than this
      offsetY: -0.01,            // nudge the centred block up (−) / down (+), fraction of viewport height
      ease: 'power3.inOut',
    },

    photo: {
      delay: 0.14,               // timeline position (0–1) where the photo starts
      duration: 0.8,
      fromXPercent: -30,
      fromScale: 1.03,
      ease: 'power3.out',
      driftPx: 16,               // translate-only parallax during the hold (no scale)
    },

    words: {
      dim: 0.28,                 // starting opacity (ink at 0.28 ≈ --grey-2 on --bg)
      mobileStart: 'top 78%',    // below 1024px the bio colours while it scrolls by
      mobileEnd: 'bottom 45%',
    },

    snap: { duration: 1.1, tolerance: 2, absorbMs: 200, commit: 0.08 },

    mobile: { fromXPercent: -30, duration: 1, start: 'top 85%' },

    tiles: {
      start: 'top 82%',
      fromY: -46,                // px: dropped in from slightly above
      rotate: 9,                 // ± degrees of random tilt on the way in
      duration: 0.75,
      stagger: 0.07,
      ease: 'back.out(1.5)',
    },

    reducedFade: 0.5,
  };

  /* ------------------------------------------------------------------------ */

  const section = document.getElementById('about');
  if (!section) return;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const root = document.documentElement;
  const stage = section.querySelector('[data-about-stage]');
  const frame = section.querySelector('[data-about-frame]');
  const text = section.querySelector('[data-about-text]');
  const title = section.querySelector('[data-about-title]');
  const bio = section.querySelector('[data-about-bio]');
  const tiles = Array.from(section.querySelectorAll('.ptile'));

  // Wrap each word (screen readers still read each as one heading / paragraph)
  const titleWords = splitWords(title);
  const bioWords = splitWords(bio);
  const allWords = titleWords.concat(bioWords);

  // Tap to flip on touch screens (hover devices flip on hover / focus via CSS)
  const touch = window.matchMedia('(hover: none)');
  tiles.forEach((tile) => {
    tile.querySelector('.ptile__btn').addEventListener('click', () => {
      if (!section.classList.contains('is-flip')) return;
      if (!touch.matches) return;
      const on = !tile.classList.contains('is-flipped');
      tiles.forEach((t) => t.classList.remove('is-flipped'));
      tile.classList.toggle('is-flipped', on);
    });
  });

  // Set up after the pinned section above has added its spacing, then re-measure
  const bp = CONFIG.breakpoint;
  const start = () => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: `(min-width: ${bp}px) and (prefers-reduced-motion: no-preference), (min-height: ${CONFIG.minStageHeight}px) and (prefers-reduced-motion: no-preference)`,
        mobile: `(max-width: ${bp - 1}px) and (max-height: ${CONFIG.minStageHeight - 1}px) and (prefers-reduced-motion: no-preference)`,
        reduce: '(prefers-reduced-motion: reduce)',
      },
      (ctx) => {
        const { desktop, mobile } = ctx.conditions;
        if (desktop) return combine(setupDesktop(), setupTiles());
        if (mobile) return combine(setupMobile(), setupTiles());
        return setupReduced();
      }
    );
    ScrollTrigger.refresh();
  };
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(start, start);

  /* ========================================================================
     Desktop: pinned, scrubbed centred → split, then the bio colours in
     ======================================================================== */
  function setupDesktop() {
    section.classList.add('is-animated');
    const C = CONFIG;
    const m = { x: 0, y: 0, s: 1, wordX: allWords.map(() => 0) };

    function measure() {
      const W = stage.clientWidth;
      const H = window.innerHeight;
      const t = offsetWithin(text, stage);
      const bw = text.offsetWidth;
      const bh = text.offsetHeight;
      // a little larger when centred, but never wider than 92% of the screen
      const s = clamp(1, Math.min(C.centre.width / bw, (W * 0.92) / bw), C.centre.maxScale);
      m.s = s;
      m.x = (W - bw * s) / 2 - t.x;
      m.y = (H - bh * s) / 2 + H * C.centre.offsetY - t.y;
      // Centre every line inside the text block (local, pre-scale px)
      const mid = t.x + bw / 2;
      m.wordX = lineOffsets(titleWords, mid).concat(lineOffsets(bioWords, mid));
    }
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);

    gsap.set(text, { transformOrigin: '0 0' });
    const hold = C.scroll.holdVh / C.scroll.transitionVh; // hold length in timeline units (transition = 1)

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: () => '+=' + Math.round((window.innerHeight * (C.scroll.transitionVh + C.scroll.holdVh)) / 100),
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Text block: centred (and a little larger) → right column. force3D:false keeps text sharp.
    tl.fromTo(
      text,
      { x: () => m.x, y: () => m.y, scale: () => m.s },
      { x: 0, y: 0, scale: 1, duration: 1, ease: C.centre.ease, force3D: false },
      0
    );
    // Each line: centred → left-aligned
    allWords.forEach((w, i) => {
      tl.fromTo(w, { x: () => m.wordX[i] }, { x: 0, duration: 1, ease: C.centre.ease, force3D: false }, 0);
    });

    // Photo: slides in from the left, fades in, settles from 1.03 to exactly 1
    tl.fromTo(
      frame,
      { xPercent: C.photo.fromXPercent, scale: C.photo.fromScale, opacity: 0 },
      { xPercent: 0, scale: 1, opacity: 1, duration: C.photo.duration, ease: C.photo.ease },
      C.photo.delay
    );

    // Hold: the bio colours in word by word; the photo drifts up a few px (translate only)
    tl.addLabel('split', 1);
    const per = hold / (bioWords.length + 2);
    tl.fromTo(bioWords, { opacity: C.words.dim }, { opacity: 1, duration: per * 3, stagger: per }, 'split');
    tl.fromTo(frame, { y: 0 }, { y: -C.photo.driftPx, duration: hold }, 'split');
    // Words start dim in State 1 too (fromTo above only applies once the hold is reached)
    gsap.set(bioWords, { opacity: C.words.dim });

    const st = tl.scrollTrigger;
    const stepper = setupStepper(st, tl);

    return () => {
      section.classList.remove('is-animated');
      ScrollTrigger.removeEventListener('refreshInit', measure);
      if (stepper) stepper.destroy();
    };
  }

  // One gesture = one step (centred ↔ split) through the shared stepper (js/stepper.js)
  function setupStepper(st, tl) {
    if (!window.Site || !window.Site.createStepper) return null;
    const S = CONFIG.snap;
    const centreY = () => st.start;
    const splitY = () => st.start + ((st.end - st.start) * tl.labels.split) / tl.duration();
    return window.Site.createStepper({
      stops: () => [centreY(), splitY()],
      exitDown: () => st.end + 1,
      duration: S.duration,
      tolerance: S.tolerance,
      absorbMs: S.absorbMs,
      commit: S.commit,
      isBlocked: () =>
        root.classList.contains('intro-active') ||
        root.classList.contains('nav-menu-open') ||
        root.classList.contains('lightbox-open'),
    });
  }

  /* ========================================================================
     Below 1024px: no pin. Bio colours while it scrolls by; photo slides in
     ======================================================================== */
  function setupMobile() {
    const W = CONFIG.words;
    const M = CONFIG.mobile;
    gsap.set(bioWords, { opacity: W.dim });
    gsap.to(bioWords, {
      opacity: 1,
      ease: 'none',
      stagger: 1,
      scrollTrigger: { trigger: bio, start: W.mobileStart, end: W.mobileEnd, scrub: true },
    });
    gsap.fromTo(
      frame,
      { xPercent: M.fromXPercent, opacity: 0 },
      {
        xPercent: 0,
        opacity: 1,
        duration: M.duration,
        ease: 'power3.out',
        scrollTrigger: { trigger: frame, start: M.start, toggleActions: 'play none none reverse' },
      }
    );
  }

  /* ========================================================================
     Tiles (motion allowed): dropped into the table; 3D flip enabled
     ======================================================================== */
  function setupTiles() {
    section.classList.add('is-flip');
    const T = CONFIG.tiles;
    gsap.from(tiles, {
      y: T.fromY,
      rotation: () => gsap.utils.random(-T.rotate, T.rotate),
      opacity: 0,
      duration: T.duration,
      stagger: T.stagger,
      ease: T.ease,
      scrollTrigger: { trigger: section.querySelector('[data-ptable]'), start: T.start, toggleActions: 'play none none none' },
    });
    return () => {
      section.classList.remove('is-flip');
      tiles.forEach((t) => t.classList.remove('is-flipped'));
    };
  }

  /* ========================================================================
     Reduced motion: State 2 straight away, simple fades
     ======================================================================== */
  function setupReduced() {
    [frame, text, ...tiles].forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        duration: CONFIG.reducedFade,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });
  }

  /* ========================================================================
     Helpers
     ======================================================================== */
  function splitWords(el) {
    const parts = el.textContent.trim().split(/(\s+)/);
    const out = [];
    el.textContent = '';
    parts.forEach((p) => {
      if (/^\s+$/.test(p)) { el.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'about__word';
      w.textContent = p;
      el.appendChild(w);
      out.push(w);
    });
    return out;
  }

  // For each word: the x shift that centres its line on `mid` (layout px, ignores transforms)
  function lineOffsets(words, mid) {
    const lines = [];
    words.forEach((w, i) => {
      const top = offsetWithin(w, stage).y;
      const line = lines[lines.length - 1];
      if (line && Math.abs(line.top - top) < 4) line.items.push(i);
      else lines.push({ top, items: [i] });
    });
    const out = words.map(() => 0);
    lines.forEach(({ items }) => {
      const first = words[items[0]];
      const last = words[items[items.length - 1]];
      const left = offsetWithin(first, stage).x;
      const right = offsetWithin(last, stage).x + last.offsetWidth;
      const shift = mid - (left + right) / 2;
      items.forEach((i) => { out[i] = shift; });
    });
    return out;
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

  function combine(...fns) {
    return () => fns.forEach((fn) => fn && fn());
  }

  function clamp(min, value, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
