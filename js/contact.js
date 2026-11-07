/* ==========================================================================
   Section: Contact (#contact)
   - Copy-email button with a "Copied" confirmation
   - Form validation with specific, kind messages (linked via aria-describedby)
   - FormSubmit: _next sends the visitor back here with ?sent=1 → success state
   - Talks to the guide (js/guide.js) when it exists: hints, typing bounces,
     worried shake on errors, celebration on success
   Without JS the form still posts to FormSubmit with native browser validation.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------------ */
  const CONFIG = {
    copiedMs: 2000,            // how long "Copied" stays
    bounceEvery: 4,            // guide bounces every N keystrokes
    minName: 2,
    minMessage: 10,
    // Field hints the guide says on focus
    hints: {
      name: 'Your name, so I know who’s writing.',
      email: 'I’ll reply to this address.',
      subject: 'A few words on what it’s about.',
      message: 'Tell me about your idea. Don’t worry about it being perfect.',
    },
    // Validation messages (shown under the field and said by the guide)
    errors: {
      nameMissing: 'I need this one to get back to you.',
      nameShort: 'That name looks a little short. Could you add your full name?',
      emailMissing: 'I need this one to get back to you.',
      emailInvalid: 'Hmm, that email looks off. Try something like name@gmail.com.',
      subjectMissing: 'I need this one to get back to you.',
      messageMissing: 'I need this one to get back to you.',
      messageShort: 'Could you write a little more? A sentence or two helps me reply.',
    },
    sent: 'Got it, thank you! I’ll get back to you soon.',
    copied: 'Email copied',
  };

  /* ------------------------------------------------------------------------ */

  const section = document.getElementById('contact');
  if (!section) return;
  const guide = () => window.Site && window.Site.guide;

  /* ---------- Copy email ---------- */
  const copyBtn = section.querySelector('[data-copy-email]');
  const copyLabel = section.querySelector('[data-copy-label]');
  const copyStatus = section.querySelector('[data-copy-status]');
  let copyTimer = 0;
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const email = copyBtn.dataset.copyEmail;
      let ok = false;
      try {
        await navigator.clipboard.writeText(email);
        ok = true;
      } catch (e) {
        // Fallback for older browsers / insecure contexts
        const ta = document.createElement('textarea');
        ta.value = email;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
      }
      if (!ok) {
        window.location.href = 'mailto:' + email;
        return;
      }
      copyBtn.classList.add('is-copied');
      copyLabel.textContent = 'Copied';
      copyStatus.textContent = CONFIG.copied;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copyBtn.classList.remove('is-copied');
        copyLabel.textContent = 'Copy';
        copyStatus.textContent = '';
      }, CONFIG.copiedMs);
    });
  }

  /* ---------- Form ---------- */
  const form = section.querySelector('[data-contact-form]');
  const success = section.querySelector('[data-contact-success]');
  const again = section.querySelector('[data-contact-again]');
  if (!form) return;

  form.noValidate = true; // JS validates with friendlier messages
  const nextInput = form.querySelector('[data-contact-next]');
  const fields = ['name', 'email', 'subject', 'message'].map((name) => ({
    name,
    el: form.elements[name],
    err: form.querySelector(`[data-error-for="${name}"]`),
  }));
  const touched = new Set();

  function check(name, value) {
    const v = value.trim();
    const E = CONFIG.errors;
    if (name === 'name') return !v ? E.nameMissing : v.length < CONFIG.minName ? E.nameShort : '';
    if (name === 'email') return !v ? E.emailMissing : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : E.emailInvalid;
    if (name === 'subject') return !v ? E.subjectMissing : '';
    if (name === 'message') return !v ? E.messageMissing : v.length < CONFIG.minMessage ? E.messageShort : '';
    return '';
  }

  function show(field, message) {
    field.err.textContent = message;
    if (message) field.el.setAttribute('aria-invalid', 'true');
    else field.el.removeAttribute('aria-invalid');
  }

  let keys = 0;
  fields.forEach((field) => {
    field.el.addEventListener('focus', () => {
      const g = guide();
      if (!g) return;
      g.lookAt(field.el);
      // a field with an error repeats its error; otherwise the hint
      const err = field.err.textContent;
      g.say(err || CONFIG.hints[field.name], { mood: err ? 'worried' : 'curious', hold: 6000 });
    });
    field.el.addEventListener('blur', () => {
      const g = guide();
      if (g) g.lookAt(null);
      touched.add(field.name);
      if (field.el.value.trim()) show(field, check(field.name, field.el.value));
    });
    field.el.addEventListener('input', () => {
      if (field.err.textContent) show(field, check(field.name, field.el.value)); // clear as soon as it's fixed
      keys += 1;
      const g = guide();
      if (g && keys % CONFIG.bounceEvery === 0) g.react('bounce', { mood: 'attentive' });
    });
  });

  form.addEventListener('submit', (e) => {
    if (form.elements._honey && form.elements._honey.value) { // bot: drop silently
      e.preventDefault();
      return;
    }
    let first = null;
    fields.forEach((field) => {
      const msg = check(field.name, field.el.value);
      show(field, msg);
      if (msg && !first) first = { field, msg };
    });
    if (first) {
      e.preventDefault();
      first.field.el.focus({ preventScroll: false });
      const g = guide();
      if (g) {
        g.react('shake', { mood: 'worried' });
        g.say(first.msg, { mood: 'worried', hold: 7000 });
      }
      return;
    }
    // Valid: let the browser post to FormSubmit, which redirects back here
    const back = new URL(window.location.href);
    back.hash = 'contact';
    back.searchParams.set('sent', '1');
    nextInput.value = back.toString();
  });

  /* ---------- Back from FormSubmit: success state ---------- */
  const params = new URLSearchParams(window.location.search);
  if (params.get('sent') === '1') {
    form.hidden = true;
    success.hidden = false;
    // clean the URL so a reload doesn't show it again
    params.delete('sent');
    const clean = window.location.pathname + (params.toString() ? '?' + params : '') + '#contact';
    history.replaceState(null, '', clean);
    const celebrate = () => {
      const g = guide();
      if (g) {
        g.react('celebrate', { mood: 'celebrating' });
        g.say(CONFIG.sent, { mood: 'celebrating', hold: 6000, force: true });
      }
    };
    if (guide() && guide().ready) celebrate();
    else document.addEventListener('guide:ready', celebrate, { once: true });
    window.addEventListener('load', () => success.focus({ preventScroll: true }), { once: true });
  }
  if (again) {
    again.addEventListener('click', () => {
      success.hidden = true;
      form.hidden = false;
      form.reset();
      fields.forEach((f) => show(f, ''));
      fields[0].el.focus();
    });
  }
})();
