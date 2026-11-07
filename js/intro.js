/* ==========================================================================
   Intro — plays the car video full-screen, then slides the site in from the
   left while the video drifts right and fades. Fires "intro:done" on
   document when finished (js/welcome.js waits for it before its hero reveal).

   Whether the intro runs at all is decided early by the inline script in
   index.html (adds .intro-active): JS on, no reduced motion, and — when
   CONFIG.oncePerSession is true — not already seen this session.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG — every timing lives here
     ------------------------------------------------------------------------ */
  const CONFIG = {
    oncePerSession: true,        // false = play on every page load
    storageKey: 'mk-intro-seen', // must match the inline script in index.html

    startTimeout: 4000,          // ms: if playback hasn't started by then, skip to the slide-in
    holdLastFrame: 0.5,          // s: pause on the last frame after the video ends
    holdOnSkip: 0,               // s: pause after "Skip intro" / Escape / fallbacks

    slide: {
      duration: 1.6,             // s: page slides in from the left
      ease: 'power3.inOut',      // try 'expo.out' for a faster start and longer settle
    },
    video: {
      driftXPercent: 15,         // how far the video moves right while the page slides in
      fadeEase: 'power2.inOut',
    },
  };

  /* ------------------------------------------------------------------------ */

  const root = document.documentElement;
  const intro = document.getElementById('intro');
  if (!intro || !root.classList.contains('intro-active')) return;

  const video = intro.querySelector('.intro__video');
  const skipBtn = intro.querySelector('.intro__skip');
  const main = document.querySelector('main');
  // This file runs before the deferred CDN scripts (so the video starts as early as
  // possible), so GSAP and Lenis are looked up only when needed.
  const lenis = () => window.Site && window.Site.lenis;

  let finished = false;
  let started = false;
  let startTimer = 0;

  intro.classList.add('is-running'); // cancels the CSS failsafe

  if (CONFIG.oncePerSession) {
    try { sessionStorage.setItem(CONFIG.storageKey, '1'); } catch (e) { /* private mode: ignore */ }
  }

  // Start at the top. Scrolling is locked by CSS (html.intro-active) and
  // js/smooth-scroll.js creates Lenis stopped while .intro-active is present.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ---------- Playback ---------- */
  video.preload = 'auto';
  video.muted = true; // required for autoplay
  video.load();

  video.addEventListener('playing', () => {
    started = true;
    clearTimeout(startTimer);
  }, { once: true });
  video.addEventListener('ended', () => finish(CONFIG.holdLastFrame));
  video.addEventListener('error', () => finish(CONFIG.holdOnSkip));
  const lastSource = video.querySelector('source:last-of-type');
  if (lastSource) lastSource.addEventListener('error', () => finish(CONFIG.holdOnSkip)); // no source could load

  startTimer = setTimeout(() => { if (!started) finish(CONFIG.holdOnSkip); }, CONFIG.startTimeout);

  const playPromise = video.play();
  if (playPromise && playPromise.catch) playPromise.catch(() => finish(CONFIG.holdOnSkip)); // autoplay blocked

  /* ---------- Skip ---------- */
  skipBtn.addEventListener('click', () => finish(CONFIG.holdOnSkip));
  const onKey = (e) => { if (e.key === 'Escape') finish(CONFIG.holdOnSkip); };
  document.addEventListener('keydown', onKey);

  /* ---------- Transition ---------- */
  function finish(hold) {
    if (finished) return;
    finished = true;
    clearTimeout(startTimer);
    document.removeEventListener('keydown', onKey);
    skipBtn.disabled = true;
    skipBtn.style.visibility = 'hidden';
    if (!video.ended) video.pause(); // hold the current frame

    // No GSAP (CDN failed or not loaded yet): just reveal the site
    const gsap = window.gsap;
    if (!gsap) return cleanup();

    gsap.timeline({ delay: hold, onComplete: cleanup })
      // x:0 stops GSAP from also reading the CSS translateX(-100%) as a pixel offset
      .fromTo(main, { x: 0, xPercent: -100 }, { x: 0, xPercent: 0, duration: CONFIG.slide.duration, ease: CONFIG.slide.ease }, 0)
      .to(video, { xPercent: CONFIG.video.driftXPercent, duration: CONFIG.slide.duration, ease: CONFIG.slide.ease }, 0)
      .to(intro, { opacity: 0, duration: CONFIG.slide.duration, ease: CONFIG.video.fadeEase }, 0);
  }

  function cleanup() {
    intro.remove(); // never blocks clicks again
    root.classList.remove('intro-active');
    main.style.transform = ''; // fixed/pinned elements must not have a transformed ancestor
    if (lenis()) lenis().start();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    document.dispatchEvent(new CustomEvent('intro:done'));
  }
})();
