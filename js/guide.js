/* ==========================================================================
   Guide — Manish himself (a photo avatar) walks the visitor through the page,
   speaking in the first person.
   - Section-aware messages, typed into a speech bubble automatically on every section change
   - Idle bob; the avatar tilts slightly toward the cursor (max CONFIG.tiltMax)
   - Moods = movement + a small badge (one photo, no facial changes):
     neutral (bob) · happy (bounce, heart) · curious (head tilt, ?) · worried (shake, !)
     celebrating (jump + sparkles) · waving (waving hand) · attentive (typing)
   - Moves next to the contact form while #contact is in view
   - Stays clear of buttons, links and form fields (nudges itself upward)
   - "Hide guide" is remembered (localStorage); the footer offers "Show guide"
   Public API (used by js/contact.js): window.Site.guide
     .say(text, { mood, hold, force }) · .lookAt(element | null) · .react('bounce' | 'shake' | 'celebrate', { mood })
   Listens to: intro:done, welcome:reveal, guide:look (from the certificates carousel)
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG — messages, timings, sizes
     ------------------------------------------------------------------------ */
  const CONFIG = {
    // In page order. `short` is used on mobile when present.
    messages: [
      { id: 'welcome', mood: 'waving',
        text: 'Hey, I’m Manish! Welcome to my world. Let me show you around.',
        short: 'Hey, I’m Manish! Let me show you around.' },
      { id: 'about', mood: 'happy',
        text: 'This is me, and the tools I work with. Hover a tile to see what I’ve done with it.',
        short: 'This is me, and the tools I work with. Tap a tile to see what I’ve done with it.' },
      { id: 'work', mood: 'curious',
        text: 'These are projects I’ve built. Hover a screen to scroll through the site.',
        short: 'These are projects I’ve built. Tap Preview to scroll through a site.' },
      { id: 'certifications', mood: 'curious', look: 'center',
        text: 'Scroll to flip through my certificates. Click one to see it up close.',
        short: 'Swipe through my certificates. Tap one to see it up close.' },
      { id: 'education', mood: 'happy',
        text: 'Here’s my journey so far, from studies to experience.' },
      { id: 'contact', mood: 'waving', seat: true,
        text: 'Want to work together? Leave a message and it comes straight to my inbox.',
        short: 'Want to work together? Leave me a message.' },
    ],

    typeMs: 22,             // per character while typing
    hold: 5000,             // ms a message stays after it has been typed
    sectionStart: 'top 55%',
    sectionEnd: 'bottom 45%',

    pop: { delay: 0.45, duration: 0.7 },       // entrance after the intro / hero
    move: { duration: 0.8, ease: 'power3.out' }, // corner ↔ contact seat
    tiltMax: 4,             // deg: the avatar tilts toward the cursor / a focused field / the carousel
    lookBackMs: 600,        // tilt follows the carousel's direction this long after each guide:look

    mobileBreakpoint: 768,
    // Things the guide must never cover (it lifts itself above them)
    avoid: 'a[href], button, input, textarea, select, [tabindex="0"], .welcome__meta, .certs__learning',
    avoidMargin: 8,
    maxLift: 0.5,           // never lift more than this share of the viewport height

    storageHidden: 'mk-guide-hidden',   // localStorage: user hid the guide
    dwell: 450,             // ms a section must stay in view before its message plays (skips fast scroll-throughs)
    repeatAfter: 4000,      // ms: re-entering the SAME section within this time doesn't repeat its message
  };

  /* ------------------------------------------------------------------------ */

  const root = document.documentElement;
  const el = document.querySelector('[data-guide]');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!el || !gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s) => el.querySelector(s);
  const bubble = $('[data-guide-bubble]');
  const textEl = $('[data-guide-text]');
  const liveEl = $('[data-guide-live]');
  const btn = $('[data-guide-btn]');
  const hideBtn = $('[data-guide-hide]');
  const jumpEl = $('[data-guide-jump]');
  const tiltEl = $('[data-guide-tilt]');
  const showBtn = document.querySelector('[data-guide-show]');
  const seat = document.querySelector('[data-guide-seat]');

  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth < CONFIG.mobileBreakpoint;
  const store = (s) => { try { return window[s]; } catch (e) { return null; } };
  const local = store('localStorage');
  const session = store('sessionStorage');

  let ready = false;
  let userHidden = (() => { try { return local.getItem(CONFIG.storageHidden) === '1'; } catch (e) { return false; } })();
  let current = null;           // current section message
  let seatMode = false;
  let lift = 0;
  let lookEl = null;
  let lookDir = { x: 0, until: 0 };
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  /* ========================================================================
     Mood (movement + badge) and tilt
     ======================================================================== */
  let baseMood = 'neutral';
  const moodMotion = { happy: 'bounce', worried: 'shake', celebrating: 'celebrate' };
  function setMood(m) {
    m = m || baseMood;
    const prev = el.dataset.mood;
    if (m === 'waving' && prev === 'waving') {           // restart the wave animation
      el.dataset.mood = 'neutral';
      void el.offsetWidth;
    }
    el.dataset.mood = m;
    if (m !== prev && moodMotion[m]) react(moodMotion[m]);
  }
  el.dataset.mood = 'neutral';

  // Tilt toward the cursor, a focused field, the screen centre or the carousel's direction
  let tilt = 0;
  function updateTilt() {
    if (el.hidden) return;
    const r = tiltEl.getBoundingClientRect();
    if (!r.width) return;
    const cx = r.left + r.width / 2;
    let tx = mouse.x;
    if (lookEl) {
      const fr = lookEl.getBoundingClientRect();
      tx = fr.left + Math.min(fr.width, 160) / 2;
    } else if (current && current.look === 'center') {
      tx = window.innerWidth / 2;
    }
    let want = Math.max(-1, Math.min(1, (tx - cx) / (window.innerWidth * 0.5))) * CONFIG.tiltMax;
    if (performance.now() < lookDir.until) want = lookDir.x * CONFIG.tiltMax;   // carousel rotating
    if (reduce()) want = 0;
    if (Math.abs(want - tilt) > 0.05) {
      tilt = want;
      el.style.setProperty('--guide-tilt', tilt.toFixed(2) + 'deg');
    }
  }
  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.addEventListener('guide:look', (e) => {
    const dx = (e.detail && e.detail.x) || 0;
    lookDir = { x: Math.sign(dx) * Math.min(1, Math.abs(dx) + 0.4), until: performance.now() + CONFIG.lookBackMs };
  });

  /* ========================================================================
     Reactions
     ======================================================================== */
  function sparkles() {
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('span');
      s.className = 'guide__spark';
      s.setAttribute('aria-hidden', 'true');
      el.appendChild(s);
      const a = (-90 + (i - 2.5) * 32) * (Math.PI / 180);
      const d = 40 + Math.random() * 16;
      gsap.fromTo(s, { x: 0, y: 0, scale: 0.4, opacity: 1 },
        { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 1, opacity: 0, rotation: 45, duration: 0.8, ease: 'power2.out', onComplete: () => s.remove() });
    }
  }
  function react(action, { mood } = {}) {
    if (mood && el.dataset.mood !== mood) el.dataset.mood = mood;   // badge; the motion follows below
    if (reduce()) return;
    if (action === 'bounce') gsap.fromTo(jumpEl, { y: 0 }, { y: -6, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.out', overwrite: 'auto' });
    if (action === 'shake') gsap.fromTo(jumpEl, { x: 0 }, { keyframes: { x: [-7, 7, -5, 5, -2, 0] }, duration: 0.45, ease: 'none', overwrite: 'auto' });
    if (action === 'celebrate') {
      gsap.fromTo(jumpEl, { y: 0 }, { y: -26, duration: 0.28, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: 'auto' });
      sparkles();
    }
  }

  /* ========================================================================
     Speech bubble
     ======================================================================== */
  let typeTimer = 0;
  let hideTimer = 0;
  let swapTimer = 0;
  function say(text, { mood, hold = CONFIG.hold, force = false } = {}) {
    if (userHidden || !text) return;
    if (!ready && !force) return;
    clearInterval(typeTimer);
    clearTimeout(hideTimer);
    clearTimeout(swapTimer);
    setMood(mood);
    const write = () => {
      bubble.classList.add('is-shown');
      liveEl.textContent = '';
      requestAnimationFrame(() => { liveEl.textContent = text; });   // announce the whole message once
      let typed = text.length;
      if (reduce()) {
        textEl.textContent = text;
      } else {
        // time-based, so a busy main thread (e.g. WebGL) can't leave a message half-typed
        textEl.textContent = '';
        const t0 = performance.now();
        typeTimer = setInterval(() => {
          typed = Math.min(text.length, Math.floor((performance.now() - t0) / CONFIG.typeMs) + 1);
          textEl.textContent = text.slice(0, typed);
          if (typed >= text.length) clearInterval(typeTimer);
        }, CONFIG.typeMs);
      }
      hideTimer = setTimeout(hideBubble, (reduce() ? 0 : text.length * CONFIG.typeMs) + hold);
    };
    if (bubble.classList.contains('is-shown')) {           // replace, never stack
      bubble.classList.remove('is-shown');
      swapTimer = setTimeout(write, reduce() ? 0 : 180);
    } else {
      write();
    }
  }
  function hideBubble() {
    clearInterval(typeTimer);
    bubble.classList.remove('is-shown');
    setMood(baseMood);
  }
  const textFor = (m) => (isMobile() && m.short ? m.short : m.text);
  function sayCurrent(force) {
    if (!current) return;
    lastSpoken = current.id;
    lastSpokenAt = performance.now();
    say(textFor(current), { mood: current.mood, force });
  }

  /* ========================================================================
     Position: corner (lifted above obstacles) or the contact seat
     ======================================================================== */
  const moveX = gsap.quickTo(el, 'x', { duration: CONFIG.move.duration, ease: CONFIG.move.ease });
  const moveY = gsap.quickTo(el, 'y', { duration: CONFIG.move.duration, ease: CONFIG.move.ease });
  function goto(x, y) {
    if (reduce()) gsap.set(el, { x, y });
    else { moveX(x); moveY(y); }
  }
  function home() {
    const size = el.offsetWidth;
    const inset = parseFloat(getComputedStyle(el).left) || 24;
    return { size, inset, left: inset, top: window.innerHeight - inset - size };
  }

  function computeLift() {
    const h = home();
    const m = CONFIG.avoidMargin;
    const box = { l: h.left - m, r: h.left + h.size + m, t: h.top - m, b: h.top + h.size + m };
    const rects = [];
    document.querySelectorAll(CONFIG.avoid).forEach((n) => {
      if (el.contains(n)) return;
      const r = n.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) return;                       // hidden / visually hidden
      if (r.height > window.innerHeight * 0.3) return;                 // big blocks (photos, sections) aren't controls
      if (r.right < box.l || r.left > box.r || r.bottom < 0 || r.top > window.innerHeight) return;
      rects.push(r);
    });
    let up = 0;
    for (let k = 0; k < 8; k++) {
      const t = box.t - up;
      const b = box.b - up;
      const hit = rects.find((r) => r.top < b && r.bottom > t);
      if (!hit) break;
      up = box.b - hit.top + m;
    }
    return Math.min(up, window.innerHeight * CONFIG.maxLift);
  }

  function place() {
    if (!ready || el.hidden) return;
    if (seatMode && seat && seat.offsetWidth) {
      const h = home();
      const r = seat.getBoundingClientRect();
      const x = r.left - h.left;
      const y = Math.max(-h.top + 80, Math.min(0, r.top - h.top)); // stay on screen, below the nav
      goto(x, y);
    } else {
      goto(0, -lift);
    }
  }

  let liftTimer = 0;
  function scheduleLift() {
    if (liftTimer) return;
    liftTimer = setTimeout(() => {
      liftTimer = 0;
      lift = computeLift();
      place();
    }, 150);
  }

  // Theme: light body over dark sections (data-nav-theme="dark")
  function updateTheme() {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const dark = Array.from(document.querySelectorAll('[data-nav-theme="dark"]')).some((s) => {
      const b = s.getBoundingClientRect();
      return b.height > 0 && b.top <= y && b.bottom >= y && b.left <= x && b.right >= x;
    });
    el.dataset.theme = dark ? 'dark' : 'light';
  }

  gsap.ticker.add(() => {
    if (!ready || el.hidden) return;
    if (seatMode) place();      // follow the seat while scrolling
    updateTilt();
  });
  window.addEventListener('scroll', () => { scheduleLift(); updateTheme(); }, { passive: true });
  window.addEventListener('resize', () => { scheduleLift(); updateTheme(); });

  /* ========================================================================
     Sections
     ======================================================================== */
  function enterSection(m) {
    current = m;
    baseMood = m.look === 'center' ? 'curious' : 'neutral';
    if (!bubble.classList.contains('is-shown')) setMood(baseMood);
    seatMode = !!m.seat;
    place();
    // Speak automatically every time a new section is reached — after a short pause,
    // so scrolling quickly past several sections doesn't fire a burst of bubbles.
    clearTimeout(sectionTimer);
    sectionTimer = setTimeout(() => {
      if (current !== m) return;              // already moved on
      if (lastSpoken === m.id && performance.now() - lastSpokenAt < CONFIG.repeatAfter) return;
      sayCurrent();
    }, reduce() ? 0 : CONFIG.dwell);
  }
  let sectionTimer = 0;
  let lastSpoken = null;
  let lastSpokenAt = 0;
  function setupSections() {
    CONFIG.messages.forEach((m) => {
      const s = document.getElementById(m.id);
      if (!s) return;
      ScrollTrigger.create({
        trigger: s,
        start: CONFIG.sectionStart,
        end: CONFIG.sectionEnd,
        onToggle: (self) => {
          if (self.isActive) enterSection(m);
          else if (current === m) {
            if (m.seat) { seatMode = false; place(); }
            if (m.look) { baseMood = 'neutral'; if (!bubble.classList.contains('is-shown')) setMood('neutral'); }
          }
        },
      });
    });
  }

  /* ========================================================================
     Appear / hide / show
     ======================================================================== */
  function appear() {
    if (userHidden) {
      if (showBtn) showBtn.hidden = false;
      return;
    }
    el.hidden = false;
    updateTheme();
    lift = computeLift();
    gsap.set(el, { x: 0, y: -lift });
    if (reduce()) gsap.fromTo(jumpEl, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    else gsap.fromTo(jumpEl, { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: CONFIG.pop.duration, ease: 'back.out(1.6)' });
    if (!ready) {
      ready = true;
      setupSections();            // the section triggers speak for the current section
      ScrollTrigger.refresh();
      document.dispatchEvent(new CustomEvent('guide:ready'));
    } else if (current) {
      sayCurrent(true);           // shown again via the footer link
    }
  }

  hideBtn.addEventListener('click', () => {
    userHidden = true;
    try { local.setItem(CONFIG.storageHidden, '1'); } catch (e) {}
    hideBubble();
    gsap.to(jumpEl, {
      opacity: 0, y: reduce() ? 0 : 40, duration: 0.3,
      onComplete: () => {
        el.hidden = true;
        if (showBtn) {
          showBtn.hidden = false;
          showBtn.focus({ preventScroll: true });
        }
      },
    });
  });
  if (showBtn) {
    showBtn.addEventListener('click', () => {
      userHidden = false;
      try { local.removeItem(CONFIG.storageHidden); } catch (e) {}
      showBtn.hidden = true;
      appear();
      btn.focus({ preventScroll: true });
    });
  }
  btn.addEventListener('click', () => sayCurrent(true)); // repeat this section's message

  // Show after the intro has slid away, or once the hero heading starts animating
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    setTimeout(appear, CONFIG.pop.delay * 1000);
  };
  if (root.classList.contains('intro-active')) {
    document.addEventListener('intro:done', start, { once: true });
  } else {
    if (window.Site && window.Site.welcomeRevealed) start();
    else document.addEventListener('welcome:reveal', start, { once: true });
    setTimeout(start, 3000); // fallback
  }

  /* ========================================================================
     Public API (js/contact.js)
     ======================================================================== */
  (window.Site = window.Site || {}).guide = {
    get ready() { return ready && !userHidden; },
    say,
    react,
    lookAt(node) { lookEl = node || null; },
  };
})();
