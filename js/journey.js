/* ==========================================================================
   Section: Journey (#education) — vertical timeline
   - The line draws itself downward, scrubbed to scroll (scaleY). Its tip always
     sits on the "reading line" (CONFIG.readLine), so…
   - …each entry's dot fills and its text slides up exactly when the line reaches it.
   - The entry closest to the screen centre is fully dark; the others are greyed.
   Not pinned: normal scrolling. Reduced motion: line drawn, entries just fade.
   No JS: everything visible (CSS default).
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------------ */
  const CONFIG = {
    readLine: 60,          // % from the top of the viewport where the line's tip sits
    currentAt: 0.5,        // the entry closest to this share of the viewport height is "current"
    reveal: {
      fromY: 28,           // px the text slides up from
      duration: 0.7,
      stagger: 0.06,       // between the parts of one entry (tag, title, role, points…)
      ease: 'power3.out',
    },
    dot: { duration: 0.35, ease: 'back.out(2)' },
    reducedFade: 0.5,      // s, reduced motion: simple fade per entry
  };

  /* ------------------------------------------------------------------------ */

  const section = document.getElementById('education');
  if (!section || !section.classList.contains('journey')) return;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const list = section.querySelector('[data-journey-list]');
  const line = section.querySelector('[data-journey-line]');
  const entries = Array.from(section.querySelectorAll('[data-journey-entry]'));
  const at = `top ${CONFIG.readLine}%`;

  // Set up after the pinned sections above (#welcome, #certifications) have created their
  // pin spacing — they also wait for the fonts — then re-measure, or every position here
  // would be off by the height of those pins.
  const start = () => {
    const mm = gsap.matchMedia();
    mm.add(
      { motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' },
      (ctx) => (ctx.conditions.motion ? setupMotion() : setupReduced())
    );
    ScrollTrigger.refresh();
  };
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(start, start);

  function setupMotion() {
    section.classList.add('is-js');

    // Line: drawn from the top of the list to its bottom, tip on the reading line
    gsap.fromTo(line, { scaleY: 0 }, {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: { trigger: list, start: at, end: `bottom ${CONFIG.readLine}%`, scrub: true },
    });

    // Entries: dot fills + text slides up when the line reaches the dot
    entries.forEach((entry) => {
      const fill = entry.querySelector('.jentry__dot-fill');
      const parts = entry.querySelectorAll('.jentry__when, .jentry__body > *');
      const R = CONFIG.reveal;
      const tl = gsap.timeline({ paused: true })
        .fromTo(fill, { scale: 0 }, { scale: 1, duration: CONFIG.dot.duration, ease: CONFIG.dot.ease }, 0)
        .fromTo(parts, { y: R.fromY, opacity: 0 }, { y: 0, opacity: 1, duration: R.duration, stagger: R.stagger, ease: R.ease }, 0);
      ScrollTrigger.create({
        trigger: entry.querySelector('.jentry__dot'),
        start: at,
        onEnter: () => tl.play(),
        onLeaveBack: () => tl.reverse(),
        onRefresh: (self) => { if (self.progress > 0 && !tl.progress()) tl.progress(1); }, // already passed (reload mid-page)
      });
    });

    // Current entry: closest to the screen centre
    let raf = 0;
    function updateCurrent() {
      raf = 0;
      const mid = window.innerHeight * CONFIG.currentAt;
      let best = null;
      let bestD = Infinity;
      entries.forEach((e) => {
        const r = e.getBoundingClientRect();
        const d = Math.abs(r.top + Math.min(r.height, 220) / 2 - mid);
        if (d < bestD) { bestD = d; best = e; }
      });
      entries.forEach((e) => e.classList.toggle('is-current', e === best));
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(updateCurrent); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateCurrent();

    return () => {
      section.classList.remove('is-js');
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      entries.forEach((e) => e.classList.remove('is-current'));
    };
  }

  function setupReduced() {
    gsap.set(line, { scaleY: 1 });
    entries.forEach((entry) => {
      gsap.from(entry, {
        opacity: 0,
        duration: CONFIG.reducedFade,
        ease: 'none',
        scrollTrigger: { trigger: entry, start: 'top 85%', once: true },
      });
    });
  }
})();
