/* ==========================================================================
   Floating pill navigation
   - Smooth link scrolling through Lenis
   - Active link + sliding dot for the section in view
   - Light/dark theme depending on what's under the nav (data-nav-theme="dark")
   - Hide on scroll down, show on scroll up
   - Enters after the intro / when the hero heading starts animating
   - Mobile full-screen menu with focus trap
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------------ */
  const CONFIG = {
    mobileBreakpoint: 768,   // px; below = badge + Menu button (keep in sync with css/nav.css)
    hideAfter: 200,          // px scrolled before hide-on-scroll-down kicks in
    hideThreshold: 8,        // px of travel before toggling hide/show (ignores jitter)
    activeLine: 0.4,         // a section becomes active when its top passes this share of the viewport
    scrollDuration: 1.2,     // s, smooth scroll for nav links (Lenis)
    enterDelay: 0.25,        // s after the hero heading starts animating
    enterFallback: 3,        // s: show the nav anyway if the hero never signals
    menuCloseMs: 300,        // matches the menu fade in css/nav.css
    themeSelector: '[data-nav-theme="dark"]',
  };

  /* ------------------------------------------------------------------------ */

  const root = document.documentElement;
  const header = document.querySelector('[data-site-nav]');
  const menu = document.getElementById('nav-menu');
  if (!header || !menu) return;

  const nav = header.querySelector('.nav');
  const dot = header.querySelector('.nav__dot');
  const menuBtn = header.querySelector('.nav__menu-btn');
  const closeBtn = menu.querySelector('.nav-menu__close');
  const links = Array.from(document.querySelectorAll('[data-nav-link]'));
  const sections = Array.from(new Set(links.map((a) => a.dataset.navLink)))
    .map((id) => document.getElementById(id))
    .filter(Boolean)
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMq = window.matchMedia(`(max-width: ${CONFIG.mobileBreakpoint - 1}px)`);
  const lenis = () => window.Site && window.Site.lenis;

  let menuOpen = false;
  let hidden = false;
  let lastY = window.scrollY;
  let activeId = null;
  let ticking = false;

  /* ---------- Entrance ---------- */
  let entered = false;
  const enter = () => {
    if (entered) return;
    entered = true;
    header.classList.add('is-in');
    update();
  };
  const enterSoon = () => setTimeout(enter, reduceMotion.matches ? 0 : CONFIG.enterDelay * 1000);
  const armFallback = () => setTimeout(enter, CONFIG.enterFallback * 1000);

  if (root.classList.contains('intro-active')) header.classList.add('from-top');

  if (window.Site && window.Site.welcomeRevealed) enterSoon();
  else document.addEventListener('welcome:reveal', enterSoon, { once: true });

  if (reduceMotion.matches && !root.classList.contains('intro-active')) enter();
  else if (root.classList.contains('intro-active')) document.addEventListener('intro:done', armFallback, { once: true });
  else armFallback();

  /* ---------- Scroll-driven state ---------- */
  function setHidden(value) {
    if (hidden === value) return;
    hidden = value;
    header.classList.toggle('is-hidden', value);
  }

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    links.forEach((a) => {
      if (a.dataset.navLink === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    moveDot();
  }

  function moveDot() {
    const link = activeId && nav.querySelector(`.nav__link[data-nav-link="${activeId}"]`);
    if (!link || !link.offsetWidth) {
      dot.style.opacity = '0';
      return;
    }
    const x = link.offsetLeft + link.offsetWidth / 2 - dot.offsetWidth / 2;
    dot.style.transform = `translateX(${x}px)`;
    dot.style.opacity = '1';
    if (!dot.classList.contains('is-ready')) requestAnimationFrame(() => dot.classList.add('is-ready')); // no slide on first placement
  }

  function currentSection() {
    if (!sections.length) return null;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) return sections[sections.length - 1].id;
    const line = window.innerHeight * CONFIG.activeLine;
    let id = sections[0].id;
    for (const s of sections) if (s.getBoundingClientRect().top <= line) id = s.id;
    return id;
  }

  function currentTheme() {
    const y = header.offsetTop + header.offsetHeight / 2; // offsetTop ignores the hide/show transform
    const x = window.innerWidth / 2;
    const dark = Array.from(document.querySelectorAll(CONFIG.themeSelector)).some((el) => {
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.top <= y && r.bottom >= y && r.left <= x && r.right >= x;
    });
    return dark ? 'dark' : 'light';
  }

  function update() {
    ticking = false;
    const y = window.scrollY;

    // hide on scroll down / show on scroll up
    if (reduceMotion.matches || menuOpen || y <= CONFIG.hideAfter) {
      setHidden(false);
      lastY = y;
    } else if (Math.abs(y - lastY) > CONFIG.hideThreshold) {
      setHidden(y > lastY);
      lastY = y;
    }

    setActive(currentSection());
    const theme = currentTheme();
    if (header.dataset.theme !== theme) header.dataset.theme = theme;
  }

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => { moveDot(); requestUpdate(); });
  // Keyboard users tabbing into a hidden nav bring it back
  header.addEventListener('focusin', () => setHidden(false));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveDot); // link widths change with the web font

  /* ---------- Smooth scrolling links ---------- */
  function onLinkClick(e) {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation(); // Lenis' own anchor handler listens on window; avoid a double scroll
    if (menuOpen) closeMenu(false);

    const isTop = sections[0] && target === sections[0];
    const l = lenis();
    if (l) l.scrollTo(isTop ? 0 : target, { duration: CONFIG.scrollDuration, force: true });
    else if (isTop) window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });

    // Move keyboard focus to the section without jumping
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  header.addEventListener('click', onLinkClick);
  menu.addEventListener('click', onLinkClick);

  /* ---------- Mobile menu ---------- */
  const focusables = () => Array.from(menu.querySelectorAll('a[href], button:not([disabled])'));

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    root.classList.add('nav-menu-open');
    if (lenis()) lenis().stop();
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    closeBtn.focus();
    document.addEventListener('keydown', onMenuKey);
  }

  function closeMenu(restoreFocus = true) {
    if (!menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    root.classList.remove('nav-menu-open');
    if (lenis()) lenis().start();
    document.removeEventListener('keydown', onMenuKey);
    setTimeout(() => { if (!menuOpen) menu.hidden = true; }, reduceMotion.matches ? 0 : CONFIG.menuCloseMs);
    if (restoreFocus) menuBtn.focus();
  }

  function onMenuKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  menuBtn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', () => closeMenu());
  mobileMq.addEventListener('change', (e) => { if (!e.matches) closeMenu(false); moveDot(); });

  update();
})();
