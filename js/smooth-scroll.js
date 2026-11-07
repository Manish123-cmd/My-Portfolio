/* ==========================================================================
   Smooth scroll — Lenis, driven by GSAP's ticker and synced with ScrollTrigger.
   Exposes window.Site.lenis and window.Site.wheelGuards for sections that need
   to intercept wheel input (e.g. the one-step snap in js/welcome.js).
   ========================================================================== */
(function () {
  'use strict';

  const Site = (window.Site = window.Site || {});
  Site.wheelGuards = Site.wheelGuards || [];

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  // No smooth scrolling for reduced-motion users or if Lenis failed to load
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || typeof window.Lenis !== 'function') return;

  const lenis = new window.Lenis({
    lerp: 0.1,
    smoothWheel: true,
    anchors: true,
    autoRaf: false,
    // A guard returning false swallows that input event. It must call
    // event.preventDefault() itself, because Lenis skips its own handling.
    virtualScroll: (data) => Site.wheelGuards.every((guard) => guard(data) !== false),
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Stay locked while the intro video plays (js/intro.js calls lenis.start() when done)
  if (document.documentElement.classList.contains('intro-active')) lenis.stop();

  Site.lenis = lenis;
})();
