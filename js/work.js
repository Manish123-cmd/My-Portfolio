/* ==========================================================================
   Section: Work (#work)
   Featured projects as stacking cards + a compact "Also built" row.

   - Edit projects in CONFIG.projects / CONFIG.also below. JS renders the cards
     from that data. index.html holds a static copy of the same markup for
     visitors without JavaScript (keep it roughly in sync, or regenerate it).
   - Desktop (≥ 1024px, motion allowed, tall enough): cards are position:sticky;
     as the next card slides up over one, it scales to ~0.94 and darkens a little
     (transform + opacity only, scrubbed to scroll). Natural scroll, no pinning.
   - Hover a browser screen (mouse only): the full-page screenshot scrolls slowly
     top → bottom inside the frame, and back up on leave. Keyboard focus does the
     same. Clicking the screen (or "Preview" on phones) opens the full page in a
     scrollable lightbox (<dialog>).
   - Reduced motion: normal cards with fades, no stacking scale, no auto-scroll.
   - No JS: normal cards; the screen / Preview links open the full screenshot.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------------ */
  const CONFIG = {
    // Featured projects, in order. `accent` comes from each project's own branding;
    // `accentInk` is a darker shade of it that passes WCAG AA as text on the cards.
    projects: [
      {
        id: 'warren',
        title: 'Warren Street System',
        inProgress: true,
        year: '2026',
        lead: 'An inventory and operations tool for Qima Cafe’s Warren Street branch.',
        context: '', // TODO(Manish): e.g. "Built for the cafe where I work", or leave empty
        built: 'Stock counts by date, delivery reminders, daily proofer deductions, wastage reports, orders, recipes and tray-setting photo guides, plus a sales chart.',
        highlights: [
          'Scans supplier order sheets with OCR (Tesseract.js) and matches products automatically',
          'Automated tests (Playwright) and CI (GitHub Actions)',
          'Python tooling for weekly Excel backups',
        ],
        stack: ['React', 'Vite', 'JavaScript', 'Tesseract.js', 'Playwright', 'GitHub Actions', 'Python'],
        live: 'https://manish123-cmd.github.io/Warren_Street_System/',
        code: 'https://github.com/Manish123-cmd/Warren_Street_System',
        url: 'manish123-cmd.github.io/Warren_Street_System',
        accent: '#18653f',
        accentInk: '#18653f',
        shots: {
          desktop: 'assets/work/warren-desktop.webp',
          full: 'assets/work/warren-full.webp', fullHeight: 2929,
          mobile: 'assets/work/warren-mobile.webp',
          alt: 'Screenshot of Warren Street System’s stock page',
        },
      },
      {
        id: 'ludovic',
        title: 'Ludovic Monsorez — Pastry Artist',
        inProgress: false,
        year: '2026',
        lead: 'A portfolio website for a London pastry chef.',
        context: '', // TODO(Manish): e.g. "Client website", or leave empty
        built: 'Animated hero, a gallery of ~140 photos with category tabs, career timeline, custom whisk cursor, mobile navigation.',
        highlights: [
          'Scroll animations with GSAP, ScrollTrigger and Lenis',
          'Hero icons that deep-link to matching gallery images',
        ],
        stack: ['HTML', 'CSS', 'JavaScript', 'GSAP', 'ScrollTrigger', 'Lenis'],
        live: 'https://manish123-cmd.github.io/Ludovic_Website/',
        code: 'https://github.com/Manish123-cmd/Ludovic_Website',
        url: 'manish123-cmd.github.io/Ludovic_Website',
        accent: '#c88739',
        accentInk: '#885c27',
        shots: {
          desktop: 'assets/work/ludovic-desktop.webp',
          full: 'assets/work/ludovic-full.webp', fullHeight: 5999,
          mobile: 'assets/work/ludovic-mobile.webp',
          alt: 'Screenshot of the Ludovic Monsorez website’s hero',
        },
      },
      {
        id: 'portfolio',
        title: 'This portfolio',
        inProgress: true,
        year: '2026',
        lead: 'The site you’re on, designed and built from scratch.',
        context: '',
        built: '',
        highlights: [
          'Scroll-driven layout transitions',
          'A 3D WebGL certificate carousel',
          'An interactive guide that reacts to each section',
        ],
        stack: ['HTML', 'CSS', 'JavaScript', 'GSAP', 'ScrollTrigger', 'Lenis', 'Three.js'],
        live: '', // no live link yet
        code: 'https://github.com/Manish123-cmd/My-Portfolio/tree/redesign',
        url: 'manish123-cmd.github.io/My-Portfolio',
        accent: '#1f1f1f',
        accentInk: '#1f1f1f',
        shots: {
          desktop: 'assets/work/portfolio-desktop.webp',
          full: 'assets/work/portfolio-full.webp', fullHeight: 5999,
          mobile: 'assets/work/portfolio-mobile.webp',
          alt: 'Screenshot of this portfolio’s welcome section',
        },
      },
      {
        id: 'qima',
        title: 'QIMA Cafe',
        inProgress: false,
        year: '2025',
        lead: 'A three-page cafe website, designed in Figma and then hand-coded.',
        context: '',
        built: '',
        highlights: [
          'The full process from Figma design to code (the Figma designs are in the repo)',
        ],
        stack: ['Figma', 'HTML', 'CSS'],
        live: 'https://manish123-cmd.github.io/QIMA-Cafe/',
        code: 'https://github.com/Manish123-cmd/QIMA-Cafe',
        url: 'manish123-cmd.github.io/QIMA-Cafe',
        accent: '#d86d1b',
        accentInk: '#9c4e13',
        shots: {
          desktop: 'assets/work/qima-desktop.webp?v=2',
          full: 'assets/work/qima-full.webp?v=2', fullHeight: 3419,
          mobile: 'assets/work/qima-mobile.webp?v=2',
          alt: 'Screenshot of the QIMA Cafe home page',
        },
      },
    ],

    // Smaller "Also built" row
    also: [
      {
        id: 'cinewith',
        title: 'Cinewith',
        tag: 'Team project',
        year: '2026',
        lead: 'A two-person team project. I built the concept and layout, the home page, navigation, movie search and live search suggestions.',
        stack: ['HTML', 'CSS', 'JavaScript'],
        live: 'https://manish123-cmd.github.io/Cinewith/',
        code: 'https://github.com/Manish123-cmd/Cinewith',
        url: 'manish123-cmd.github.io/Cinewith',
        accent: '#e60a19',
        accentInk: '#ca0916',
        shots: { desktop: 'assets/work/moviehub-desktop.webp', alt: 'Screenshot of the Cinewith home page' },
      },
    ],

    stack: {
      breakpoint: 1200,      // px. Narrower: plain cards, no stacking (two columns from 1024px, see css/work.css)
      minHeight: 760,        // px. Shorter viewports: plain cards (the fixed-height card would not fit)
      scale: 0.94,           // a card's scale once the next card covers it
      shade: 0.16,           // how dark it gets (opacity of a black layer)
    },

    preview: {
      speed: 260,            // px per second the full page scrolls inside the frame
      minDuration: 3,        // s
      backDuration: 0.9,     // s to scroll back to the top on leave
    },

    reveal: { fromY: 32, duration: 0.8, start: 'top 85%' }, // reduced motion: fade only

    // Each whole card drops in from above the screen ("from the sky") as it arrives
    drop: {
      start: '88%',          // falls in when its resting place reaches this point of the screen
      fall: 0.9,             // s: falling time (accelerates like gravity)
      fallEase: 'power2.in', // try 'power3.in' for a harder, faster drop
      tilt: -4,              // degrees while falling; it straightens as it lands
      bounce: 22,            // px: one small bounce on landing
    },
  };

  /* ------------------------------------------------------------------------
     Markup (also used to generate the static no-JS copy in index.html)
     ------------------------------------------------------------------------ */
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad = (n) => String(n).padStart(2, '0');
  const ext = '<span class="work-sr"> (opens in a new tab)</span>';
  const arrow = '<span class="wbtn__arrow" aria-hidden="true">↗</span>';

  function links(p) {
    let out = '';
    if (p.live) out += `<a class="wbtn wbtn--filled" href="${esc(p.live)}" target="_blank" rel="noopener">Live site ${arrow}${ext}</a>`;
    if (p.code) out += `<a class="wbtn wbtn--outline" href="${esc(p.code)}" target="_blank" rel="noopener">Code ${arrow}${ext}</a>`;
    return out;
  }
  const tags = (list) => `<ul class="wtags" aria-label="Built with">${list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

  function browser(p, eager) {
    const s = p.shots;
    const load = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    return `
          <div class="wbrowser">
            <div class="wbrowser__bar" aria-hidden="true">
              <span class="wbrowser__dots"><i></i><i></i><i></i></span>
              <span class="wbrowser__url"><svg viewBox="0 0 16 16" focusable="false"><path d="M4.5 7V5.5a3.5 3.5 0 0 1 7 0V7M3.5 7h9v6.5h-9z"/></svg>${esc(p.url)}</span>
            </div>
            ${s.full
              ? `<a class="wbrowser__screen" href="${esc(s.full)}" target="_blank" rel="noopener" data-preview aria-label="Preview the whole ${esc(p.title)} page">`
              : '<div class="wbrowser__screen">'}
              <img class="wbrowser__shot" src="${esc(s.desktop)}" width="1600" height="1000" alt="${esc(s.alt)}" ${load} decoding="async">
              ${s.full ? `<img class="wbrowser__full" data-src="${esc(s.full)}" width="1600" height="${s.fullHeight}" alt="" aria-hidden="true" decoding="async">
              <span class="wbrowser__hint" aria-hidden="true">Hover to preview</span>` : ''}
            ${s.full ? '</a>' : '</div>'}
          </div>`;
  }

  function card(p, i) {
    const eager = i === 0;
    const meta = [
      p.inProgress ? '<span class="wcard__status">In progress</span>' : '',
      `<span class="wcard__year">${esc(p.year)}</span>`,
    ].join('');
    return `
      <article class="wcard" id="work-${esc(p.id)}" style="--i:${i}; --accent:${p.accent}; --accent-ink:${p.accentInk}" aria-labelledby="work-${esc(p.id)}-title">
        <div class="wcard__inner">
          <div class="wcard__text">
            <p class="wcard__num" aria-hidden="true">${pad(i + 1)}</p>
            <h3 class="wcard__title" id="work-${esc(p.id)}-title">${esc(p.title)}</h3>
            <p class="wcard__meta">${meta}</p>
            <p class="wcard__lead">${esc(p.lead)}</p>
            ${p.context ? `<p class="wcard__context">${esc(p.context)}</p>` : ''}
            ${p.built ? `<p class="wcard__built"><span class="wcard__built-label">What I built</span> ${esc(p.built)}</p>` : ''}
            <ul class="wcard__highlights">${p.highlights.slice(0, 3).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
            ${tags(p.stack)}
            <div class="wcard__links">${links(p)}</div>
          </div>
          <div class="wcard__media">
            ${browser(p, eager)}
            <div class="wphone" aria-hidden="true"><img src="${esc(p.shots.mobile)}" width="600" height="1298" alt="" loading="lazy" decoding="async"></div>
            <a class="wbtn wbtn--outline wcard__preview" href="${esc(p.shots.full)}" target="_blank" rel="noopener" data-preview aria-label="Preview the whole ${esc(p.title)} page">Preview</a>
          </div>
        </div>
        <span class="wcard__shade" aria-hidden="true"></span>
      </article>`;
  }

  function also(p) {
    return `
      <article class="walso" id="work-${esc(p.id)}" style="--accent:${p.accent}; --accent-ink:${p.accentInk}" aria-labelledby="work-${esc(p.id)}-title">
        <div class="walso__thumb">${browser(p, false)}</div>
        <div class="walso__text">
          <p class="walso__meta"><span class="walso__tag">${esc(p.tag)}</span><span class="wcard__year">${esc(p.year)}</span></p>
          <h4 class="walso__title" id="work-${esc(p.id)}-title">${esc(p.title)}</h4>
          <p class="walso__lead">${esc(p.lead)}</p>
          ${tags(p.stack)}
          <div class="wcard__links">${links(p)}</div>
        </div>
      </article>`;
  }

  const stackHTML = () => CONFIG.projects.map(card).join('') + '\n    ';
  const alsoHTML = () => CONFIG.also.map(also).join('') + '\n    ';

  // Node (used once to write the static copy into index.html): export and stop here
  if (typeof module === 'object' && module.exports) module.exports = { CONFIG, stackHTML, alsoHTML };
  if (typeof document === 'undefined') return;

  /* ------------------------------------------------------------------------
     Page
     ------------------------------------------------------------------------ */
  const section = document.getElementById('work');
  if (!section) return;
  const root = document.documentElement;
  const stackEl = section.querySelector('[data-work-stack]');
  const alsoEl = section.querySelector('[data-work-also]');
  const countEl = section.querySelector('[data-work-count]');

  stackEl.innerHTML = stackHTML();
  if (alsoEl) alsoEl.innerHTML = alsoHTML();
  if (countEl) countEl.textContent = `${pad(CONFIG.projects.length)} projects`;

  const cards = Array.from(section.querySelectorAll('.wcard'));
  const lenis = () => window.Site && window.Site.lenis;

  // A card's resting position (px from the top of the section), ignoring transforms and
  // sticky offsets. Triggers are measured from this, so the drop / scale tweens on the
  // cards themselves can never shift where they start.
  function naturalTop(el) {
    const i = cards.indexOf(el);
    if (i > -1 && section.classList.contains('is-stack')) {
      const gap = parseFloat(getComputedStyle(stackEl).rowGap) || 0;
      return stackEl.offsetTop + i * (el.offsetHeight + gap);
    }
    let y = 0;
    for (let n = el; n && n !== section; n = n.offsetParent) y += n.offsetTop;
    return y;
  }

  setupLightbox();

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const S = CONFIG.stack;
  const start = () => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        stack: `(min-width: ${S.breakpoint}px) and (min-height: ${S.minHeight}px) and (prefers-reduced-motion: no-preference)`,
        plain: `((max-width: ${S.breakpoint - 1}px) or (max-height: ${S.minHeight - 1}px)) and (prefers-reduced-motion: no-preference)`,
        reduce: '(prefers-reduced-motion: reduce)',
        hover: '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      },
      (ctx) => {
        const c = ctx.conditions;
        const cleanups = [];
        const stacked = c.stack ? setupStack() : null;
        if (stacked) cleanups.push(stacked);
        if (c.reduce) cleanups.push(setupReveal(true));
        else cleanups.push(setupDrop());
        if (c.hover) cleanups.push(setupHoverPreview());
        return () => cleanups.forEach((fn) => fn && fn());
      }
    );
    ScrollTrigger.refresh();
  };
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(start, start);

  /* ========================================================================
     Stacking cards (sticky): the covered card scales down and darkens
     ======================================================================== */
  function setupStack() {
    section.classList.add('is-stack');
    // A card whose text does not fit its fixed height: keep plain cards instead
    const overflows = cards.some((c) => { const inner = c.querySelector('.wcard__inner'); return inner.scrollHeight > inner.clientHeight + 1; });
    if (overflows) { section.classList.remove('is-stack'); return null; }
    const stickyTop = (card) => parseFloat(getComputedStyle(card).top) || 0;

    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: () => `top+=${naturalTop(next)} bottom`,                 // next card starts sliding up
          end: () => `top+=${naturalTop(next)} ${stickyTop(next)}px`,     // …until it sticks on top of this one
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
        .fromTo(card, { scale: 1 }, { scale: S.scale }, 0)
        .fromTo(card.querySelector('.wcard__shade'), { opacity: 0 }, { opacity: S.shade }, 0);
    });

    // Keyboard: focusing something inside a card brings that card to its stacked
    // position, so the card on top never hides the focused link
    function onFocusIn(e) {
      const card = e.target.closest('.wcard');
      if (!card || e.target.closest('dialog')) return;
      const i = cards.indexOf(card);
      const r = card.getBoundingClientRect();
      const nextR = cards[i + 1] && cards[i + 1].getBoundingClientRect();
      const covered = nextR && nextR.top < r.bottom - 8;
      if (!covered && r.top >= 0 && r.bottom <= window.innerHeight) return;
      const stackTop = stackEl.getBoundingClientRect().top + window.scrollY;
      const gap = parseFloat(getComputedStyle(stackEl).rowGap) || 0;
      const y = stackTop + i * (card.offsetHeight + gap) - stickyTop(card);
      if (lenis()) lenis().scrollTo(y, { duration: 0.6, force: true });
      else window.scrollTo({ top: y });
    }
    section.addEventListener('focusin', onFocusIn);

    return () => {
      section.classList.remove('is-stack');
      section.removeEventListener('focusin', onFocusIn);
      gsap.set(cards, { clearProps: 'transform' });
    };
  }

  /* ========================================================================
     Drop: each whole card falls in from above the screen when it arrives
     ======================================================================== */
  function setupDrop() {
    const D = CONFIG.drop;
    const tls = [];
    section.querySelectorAll('.wcard, .walso').forEach((card) => {
      // Start fully above the screen: one viewport + the card's own height higher up
      const fromY = () => -(window.innerHeight + card.offsetHeight + 40);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: () => `top+=${naturalTop(card)} ${D.start}`, toggleActions: 'play none none reverse', invalidateOnRefresh: true },
      });
      // While it waits above the screen it is invisible AND ignores the mouse, so it never
      // blocks what is really there (e.g. the About skill tiles). Keyboard focus still works.
      tl.fromTo(card, { opacity: 0, pointerEvents: 'none' }, { opacity: 1, pointerEvents: 'auto', duration: 0.05, ease: 'none' }, 0)
        .fromTo(card, { y: fromY, rotation: D.tilt }, { y: 0, rotation: 0.5, duration: D.fall, ease: D.fallEase }, 0)
        .to(card, { y: -D.bounce, rotation: 0, duration: 0.18, ease: 'power2.out' })
        .to(card, { y: 0, duration: 0.2, ease: 'power2.in' });
      tls.push(tl);
    });
    return () => tls.forEach((tl) => { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.revert(); });
  }

  /* ========================================================================
     Plain cards: fade + rise (reduced motion: fade only)
     ======================================================================== */
  function setupReveal(reduced) {
    const R = CONFIG.reveal;
    section.querySelectorAll('.wcard, .walso').forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: reduced ? 0 : R.fromY,
        duration: reduced ? 0.5 : R.duration,
        ease: reduced ? 'none' : 'power3.out',
        scrollTrigger: { trigger: el, start: R.start, once: true },
      });
    });
    return null;
  }

  /* ========================================================================
     Hover preview: the full-page screenshot scrolls inside the browser frame
     ======================================================================== */
  function setupHoverPreview() {
    section.classList.add('has-hover-preview');
    const P = CONFIG.preview;
    const off = [];

    section.querySelectorAll('.wbrowser__screen[data-preview]').forEach((screen) => {
      const full = screen.querySelector('.wbrowser__full');
      if (!full) return;
      let tween = null;

      const load = () => {
        if (full.getAttribute('src')) return;
        full.src = full.dataset.src;
      };
      // Load the full page shortly before the card is on screen
      const st = ScrollTrigger.create({ trigger: screen, start: 'top 150%', once: true, onEnter: load });

      const play = () => {
        load();
        section.classList.add('has-previewed'); // hides the "Hover to preview" hints
        const go = () => {
          const distance = full.offsetHeight - screen.clientHeight;
          if (distance <= 0) return;
          if (tween) tween.kill();
          screen.classList.add('is-previewing');
          tween = gsap.to(full, {
            y: -distance,
            duration: Math.max(P.minDuration, distance / P.speed),
            ease: 'power1.inOut',
          });
        };
        if (full.complete && full.naturalWidth) go();
        else full.addEventListener('load', go, { once: true });
      };
      const stop = () => {
        if (tween) tween.kill();
        tween = gsap.to(full, {
          y: 0,
          duration: P.backDuration,
          ease: 'power2.inOut',
          onComplete: () => screen.classList.remove('is-previewing'),
        });
      };

      screen.addEventListener('pointerenter', play);
      screen.addEventListener('pointerleave', stop);
      screen.addEventListener('focus', play);
      screen.addEventListener('blur', stop);
      off.push(() => {
        st.kill();
        if (tween) tween.kill();
        gsap.set(full, { clearProps: 'transform' });
        screen.classList.remove('is-previewing');
        screen.removeEventListener('pointerenter', play);
        screen.removeEventListener('pointerleave', stop);
        screen.removeEventListener('focus', play);
        screen.removeEventListener('blur', stop);
      });
    });

    return () => {
      section.classList.remove('has-hover-preview');
      off.forEach((fn) => fn());
    };
  }

  /* ========================================================================
     Lightbox: the whole page in a scrollable <dialog>
     ======================================================================== */
  function setupLightbox() {
    const dialog = document.querySelector('[data-work-lightbox]');
    if (!dialog || typeof dialog.showModal !== 'function') return; // no <dialog>: links open the image
    const img = dialog.querySelector('[data-work-lightbox-img]');
    const title = dialog.querySelector('[data-work-lightbox-title]');
    const scroller = dialog.querySelector('[data-work-lightbox-scroll]');

    section.addEventListener('click', (e) => {
      const link = e.target.closest('[data-preview]');
      if (!link) return;
      e.preventDefault();
      const card = link.closest('.wcard, .walso');
      const name = card ? card.querySelector('.wcard__title, .walso__title').textContent : '';
      const full = card && card.querySelector('.wbrowser__full');
      title.textContent = name;
      img.alt = `Full-page screenshot of ${name}`;
      img.width = 1600;
      img.height = full ? +full.getAttribute('height') : 1000;
      img.src = link.getAttribute('href');
      scroller.scrollTop = 0;
      root.classList.add('lightbox-open');
      if (lenis()) lenis().stop();
      dialog.showModal();
    });

    dialog.addEventListener('close', () => {
      root.classList.remove('lightbox-open');
      if (lenis()) lenis().start();
    });
    dialog.querySelector('[data-work-lightbox-close]').addEventListener('click', () => dialog.close());
    // Click on the backdrop closes it
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  }
})();
