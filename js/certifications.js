/* ==========================================================================
   Section: Certifications (#certifications)
   - Desktop (WebGL ok, motion ok): the section pins; each scroll gesture rotates
     a curved 3D carousel (js/cert-carousel.js) by exactly one certificate.
   - Mobile / no WebGL / reduced motion / WebGL lost: a flat swipe carousel.
   - No JS: the HTML list (it is also the accessible list in every mode).
   Fires `guide:look` on document while the 3D carousel rotates.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------------ */
  const CONFIG = {
    // The 3D carousel runs on every screen size (the flat one is only for no WebGL / reduced motion)
    stepVh: 60,             // pinned scroll per certificate (vh)
    tailVh: 20,             // pinned scroll after the last certificate before the section unpins
    stepDuration: 0.9,      // s per step (eased rotation)
    preloadMargin: 600,     // px before the section reaches the viewport: load Three.js + textures
    ticker: { duration: 0.55, ease: 'power3.inOut' },
    carousel: {             // passed to js/cert-carousel.js (see its DEFAULTS for every option)
      // active card width as a share of the screen: wide screens 44%, phones in portrait up to 80%
      cardWidthFrac: (w, h) => (w / h >= 1.3 ? 0.44 : Math.min(0.82, 0.44 + (1.3 - w / h) * 0.9)),
      gap: 0.07,
      tiltDeg: 2.5,
      dimSide: 0.42,
    },
  };

  /* ------------------------------------------------------------------------ */

  const root = document.documentElement;
  const section = document.getElementById('certifications');
  if (!section) return;
  const stage = section.querySelector('[data-certs-stage]');
  const list = section.querySelector('[data-certs-list]');
  const items = Array.from(list.querySelectorAll('.ccard'));
  const N = items.length;
  const hud = section.querySelector('[data-certs-hud]');
  const countEl = section.querySelector('[data-certs-count]');
  const totalEl = section.querySelector('[data-certs-total]');
  const arcEl = section.querySelector('[data-certs-arc]');
  const issuerRoll = section.querySelector('[data-certs-issuer]');
  const titleRoll = section.querySelector('[data-certs-title]');
  const liveEl = section.querySelector('[data-certs-live]');
  const prevBtn = section.querySelector('[data-certs-prev]');
  const nextBtn = section.querySelector('[data-certs-next]');
  const skipBtn = section.querySelector('[data-certs-skip]');
  const pad2 = (n) => String(n).padStart(2, '0');
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lenis = () => window.Site && window.Site.lenis;
  const blocked = () =>
    root.classList.contains('intro-active') || root.classList.contains('nav-menu-open') || root.classList.contains('lightbox-open');
  const data = items.map((li) => ({
    li,
    title: li.querySelector('.ccard__title').textContent.trim(),
    issuer: li.querySelector('.ccard__issuer').textContent.trim(),
    src: li.dataset.certFull,
  }));

  const lightbox = setupLightbox();
  hud.hidden = false;
  totalEl.textContent = pad2(N);

  /* ---------- Shared: active certificate → counter, arc, ticker, live region ---------- */
  let active = -1;
  function setActive(i, { instant = false } = {}) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === active) return;
    const dir = i > active ? 1 : -1;
    const first = active < 0;
    active = i;
    countEl.textContent = pad2(i + 1);
    arcEl.style.strokeDashoffset = String(1 - (i + 1) / N);
    items.forEach((li, k) => li.classList.toggle('is-active', k === i));
    roll(issuerRoll, data[i].issuer, dir, instant || first);
    roll(titleRoll, data[i].title, dir, instant || first);
    if (!first) liveEl.textContent = `Certificate ${i + 1} of ${N}: ${data[i].title}, ${data[i].issuer}`;
  }

  // Slot-machine roll: the old line leaves, the new one comes in from the other side
  function roll(el, text, dir, instant) {
    const g = window.gsap;
    const old = el.lastElementChild;
    if (old && old.textContent === text) return;
    const next = document.createElement('span');
    next.textContent = text;
    el.appendChild(next);
    if (!old || instant || !g || reduceMotion()) {
      Array.from(el.children).forEach((c) => { if (c !== next) c.remove(); });
      if (g) g.set(next, { clearProps: 'all' });
      return;
    }
    Array.from(el.children).forEach((c) => { if (c !== old && c !== next) c.remove(); });
    const T = CONFIG.ticker;
    g.killTweensOf([old, next]);
    g.to(old, { yPercent: -110 * dir, opacity: 0, duration: T.duration, ease: T.ease, onComplete: () => old.remove() });
    g.fromTo(next, { yPercent: 110 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: T.duration, ease: T.ease });
  }

  setActive(0, { instant: true });

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) { startFlat(); return; } // libraries failed: the flat carousel still works
  gsap.registerPlugin(ScrollTrigger);

  let teardown = null;
  let mode = null;
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  let glFailed = false;

  function choose() {
    const want = !rm.matches && !glFailed && webglAvailable() ? 'gl' : 'flat';
    if (want === mode) return;
    if (teardown) teardown();
    teardown = want === 'gl' ? startGL() : startFlat();
    mode = want;
    ScrollTrigger.refresh();
  }
  rm.addEventListener('change', choose);
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(choose, choose);

  function webglAvailable() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) {
      return false;
    }
  }

  /* ========================================================================
     Desktop: pinned WebGL carousel
     ======================================================================== */
  function startGL() {
    section.classList.add('is-gl');
    let carousel = null;
    let loading = false;
    let visible = false;
    let destroyed = false;
    const stepPx = () => (window.innerHeight * CONFIG.stepVh) / 100;
    const posOf = (st) => Math.max(0, Math.min(N - 1, (st.scroll() - st.start) / stepPx()));

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => '+=' + Math.round(stepPx() * (N - 1) + (window.innerHeight * CONFIG.tailVh) / 100),
      pin: true,
      invalidateOnRefresh: true,
      onToggle: (self) => section.classList.toggle('is-pinned', self.isActive),
      onUpdate: (self) => {
        const p = posOf(self);
        if (carousel) carousel.setPosition(p);
        setActive(Math.round(p));
      },
    });

    const stepper = window.Site && window.Site.createStepper
      ? window.Site.createStepper({
          stops: () => Array.from({ length: N }, (_, k) => st.start + k * stepPx()),
          exitDown: () => st.end + 2,
          exitUp: () => Math.max(0, st.start - window.innerHeight * 0.6),
          duration: CONFIG.stepDuration,
          releaseStep: true,
          isBlocked: blocked,
        })
      : null;
    const goTo = (i) => {
      i = Math.max(0, Math.min(N - 1, i));
      if (stepper) stepper.goTo(i);
      else window.scrollTo({ top: st.start + i * stepPx(), behavior: 'smooth' });
    };

    // Load Three.js + textures shortly before the section is reached (never during the intro)
    const loader = ScrollTrigger.create({
      trigger: section,
      start: () => `top bottom+=${CONFIG.preloadMargin}`,
      end: () => `bottom+=${Math.round(stepPx() * N)} top`,
      onToggle: (self) => {
        visible = self.isActive;
        if (visible) load();
        if (carousel) (visible ? carousel.start() : carousel.stop());
      },
    });

    function load() {
      if (loading || carousel || destroyed) return;
      if (root.classList.contains('intro-active')) {
        document.addEventListener('intro:done', load, { once: true });
        return;
      }
      loading = true;
      import('./cert-carousel.js?v=2')
        .then((m) =>
          m.createCarousel({
            container: stage,
            items: data.map((d) => ({ src: d.src })),
            config: CONFIG.carousel,
            onPick: (i) => (i === active ? lightbox.open(i, stage) : goTo(i)),
            onLost: fail,
            onLook: (dx) => document.dispatchEvent(new CustomEvent('guide:look', { detail: { x: dx, y: 0, source: 'certifications' } })),
          })
        )
        .then((c) => {
          if (destroyed) return c.destroy();
          carousel = c;
          carousel.setPosition(posOf(st));
          if (visible) carousel.start();
          else carousel.renderOnce();
        })
        .catch((err) => {
          console.warn('[certifications] WebGL carousel unavailable, using the flat carousel.', err);
          fail();
        });
    }

    function fail() {
      glFailed = true;            // remembered: no retry this visit
      setTimeout(choose, 0);      // → flat carousel
    }

    // Keyboard: ← → move (through the stepper), Enter opens the lightbox
    function onKey(e) {
      if (e.target !== stage) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(active + (e.key === 'ArrowRight' ? 1 : -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        lightbox.open(active, stage);
      }
    }
    stage.addEventListener('keydown', onKey);

    const onSkip = () => {
      const y = st.end + 2;
      if (lenis()) lenis().scrollTo(y, { duration: 1.2, force: true });
      else window.scrollTo({ top: y, behavior: 'smooth' });
      const next = section.nextElementSibling;
      if (next) {
        if (!next.hasAttribute('tabindex')) next.setAttribute('tabindex', '-1');
        next.focus({ preventScroll: true });
      }
    };
    skipBtn.addEventListener('click', onSkip);

    // In WebGL mode the hidden list's links are not tab stops (the stage is)
    list.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));

    return () => {
      destroyed = true;
      section.classList.remove('is-gl', 'is-pinned');
      st.kill(true);
      loader.kill();
      if (stepper) stepper.destroy();
      if (carousel) carousel.destroy();
      carousel = null;
      stage.removeEventListener('keydown', onKey);
      skipBtn.removeEventListener('click', onSkip);
      list.querySelectorAll('a').forEach((a) => a.removeAttribute('tabindex'));
    };
  }

  /* ========================================================================
     Flat swipe carousel (mobile, no WebGL, reduced motion)
     ======================================================================== */
  function startFlat() {
    section.classList.add('is-flat');
    const center = (li) => li.offsetLeft + li.offsetWidth / 2;
    const scrollToItem = (i) => {
      i = Math.max(0, Math.min(N - 1, i));
      list.scrollTo({ left: center(items[i]) - list.clientWidth / 2, behavior: reduceMotion() ? 'auto' : 'smooth' });
    };
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const mid = list.scrollLeft + list.clientWidth / 2;
        let best = 0;
        items.forEach((li, k) => { if (Math.abs(center(li) - mid) < Math.abs(center(items[best]) - mid)) best = k; });
        setActive(best, { instant: reduceMotion() });
        prevBtn.disabled = best === 0;
        nextBtn.disabled = best === N - 1;
      });
    }
    const onPrev = () => scrollToItem(active - 1);
    const onNext = () => scrollToItem(active + 1);
    function onKey(e) {
      if (e.target !== stage) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToItem(active + (e.key === 'ArrowRight' ? 1 : -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        lightbox.open(active, stage);
      }
    }
    list.addEventListener('scroll', onScroll, { passive: true });
    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);
    stage.addEventListener('keydown', onKey);
    list.scrollLeft = 0;
    onScroll();

    return () => {
      section.classList.remove('is-flat');
      list.removeEventListener('scroll', onScroll);
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
      stage.removeEventListener('keydown', onKey);
    };
  }

  /* ========================================================================
     Lightbox (independent of GSAP; links in the list open it too)
     ======================================================================== */
  function setupLightbox() {
    const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
    const lb = document.createElement('div');
    lb.className = 'cert-lightbox';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-labelledby', 'cert-lb-title');
    lb.innerHTML = `
      <button class="cert-lightbox__btn cert-lightbox__close" type="button" aria-label="Close">${icon('M6 6l12 12M18 6L6 18')}</button>
      <button class="cert-lightbox__btn cert-lightbox__prev" type="button" aria-label="Previous certificate">${icon('M15 6l-6 6 6 6')}</button>
      <figure class="cert-lightbox__figure">
        <img class="cert-lightbox__img" alt="">
        <figcaption class="cert-lightbox__caption">
          <p class="cert-lightbox__issuer"></p>
          <p class="cert-lightbox__title" id="cert-lb-title"></p>
          <p class="cert-lightbox__links"></p>
          <p class="cert-lightbox__count"></p>
        </figcaption>
      </figure>
      <button class="cert-lightbox__btn cert-lightbox__next" type="button" aria-label="Next certificate">${icon('M9 6l6 6-6 6')}</button>`;
    document.body.appendChild(lb);

    const q = (s) => lb.querySelector(s);
    const img = q('.cert-lightbox__img');
    let index = 0;
    let opener = null;

    function fill(i) {
      index = (i + N) % N;
      const li = items[index];
      img.src = li.dataset.certFull;
      img.width = Number(li.dataset.certW) || 0;
      img.height = Number(li.dataset.certH) || 0;
      img.alt = 'Certificate: ' + data[index].title;
      q('.cert-lightbox__issuer').textContent = data[index].issuer;
      q('.cert-lightbox__title').textContent = data[index].title;
      const links = [];
      if (li.dataset.certPdf) links.push(`<a href="${li.dataset.certPdf}" target="_blank" rel="noopener">Open PDF</a>`);
      if (li.dataset.certVerify) links.push(`<a href="${li.dataset.certVerify}" target="_blank" rel="noopener">Verify ↗</a>`);
      q('.cert-lightbox__links').innerHTML = links.join('');
      q('.cert-lightbox__links').hidden = !links.length;
      q('.cert-lightbox__count').textContent = `${pad2(index + 1)} / ${pad2(N)}`;
    }
    function open(i, from) {
      opener = from || document.activeElement;
      fill(i);
      lb.hidden = false;
      requestAnimationFrame(() => lb.classList.add('is-open'));
      root.classList.add('lightbox-open');
      if (lenis()) lenis().stop();
      document.addEventListener('keydown', onKey);
      q('.cert-lightbox__close').focus();
    }
    function close() {
      lb.classList.remove('is-open');
      lb.hidden = true;
      root.classList.remove('lightbox-open');
      if (lenis()) lenis().start();
      document.removeEventListener('keydown', onKey);
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); fill(index + 1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); fill(index - 1); return; }
      if (e.key !== 'Tab') return;
      const f = Array.from(lb.querySelectorAll('button, a[href]')).filter((el) => !el.closest('[hidden]'));
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    q('.cert-lightbox__close').addEventListener('click', close);
    q('.cert-lightbox__prev').addEventListener('click', () => fill(index - 1));
    q('.cert-lightbox__next').addEventListener('click', () => fill(index + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });

    // "View certificate" links and card images (flat mode: tap a card)
    items.forEach((li, i) => {
      li.querySelectorAll('[data-cert-open]').forEach((a) =>
        a.addEventListener('click', (e) => {
          e.preventDefault();
          open(i, a);
        })
      );
    });
    return { open };
  }
})();
