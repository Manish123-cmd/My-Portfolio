/* ==========================================================================
   Stepper — "one scroll gesture = one step" for pinned sections, via Lenis.
   Used by js/welcome.js (2 stops) and js/certifications.js (6 stops).

   Behaviour
   - Wheel / trackpad: the first event of a gesture inside a section's zone
     scrolls (eased) to the next/previous stop; the rest of that gesture,
     including trackpad momentum, is swallowed.
   - Fast intent is never queued: a NEW gesture (after a short pause) or a lot
     of extra scroll during a step advances the target immediately; going past
     the last stop releases the pin (scrolls to exitDown / exitUp).
   - Keyboard, scrollbar drag, touch, nav links: never blocked. Only if
     scrolling comes to rest *between* two stops does it settle on one.
   - If a step is interrupted (another scrollTo, resize), a timer always
     releases it, so the page can never get stuck.

   API: const stepper = window.Site.createStepper({
          stops: () => [y0, y1, …],      // ascending scroll positions
          exitDown: () => y,             // where a fast "past the end" goes
          exitUp: () => y,               // where a fast "past the start" goes (optional)
          isBlocked: () => bool,         // e.g. intro/menu/lightbox open
          releaseStep: false,            // true: the gesture after the last stop scrolls to exitDown
        });
        stepper.goTo(index) · stepper.destroy()
   ========================================================================== */
(function () {
  'use strict';

  const DEFAULTS = {
    duration: 1.1,     // s per step
    tolerance: 2,      // px
    absorbMs: 200,     // trailing momentum (same direction) is swallowed this long after a step
    gestureGap: 160,   // ms of wheel silence that marks the start of a new gesture
    fastDelta: 1400,   // px of extra wheel delta during one step that counts as "advance again"
    commit: 0.08,      // non-wheel scrolls: fraction past a stop that commits the next one
  };

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function createStepper(options) {
    const S = Object.assign({}, DEFAULTS, options);
    const Site = (window.Site = window.Site || {});
    const lenis = Site.lenis;
    const ScrollTrigger = window.ScrollTrigger;
    const tol = S.tolerance;
    const isBlocked = S.isBlocked || (() => false);

    let stepping = false;
    let targetIndex = -1;     // stop index being animated to (-1 none, 'down'/'up' = exiting)
    let lastDir = 0;
    let absorbUntil = 0;
    let lastWheel = 0;
    let extra = 0;            // swallowed delta during the current step
    let releaseTimer = 0;
    let token = 0;

    const stops = () => S.stops();
    const currentY = () => (lenis ? lenis.animatedScroll : window.scrollY);

    function scrollTo(y, onDone) {
      const my = ++token;
      stepping = true;
      const finish = () => {
        if (my !== token) return;          // superseded by a newer step
        clearTimeout(releaseTimer);
        stepping = false;
        absorbUntil = performance.now() + S.absorbMs;
        if (onDone) onDone();
      };
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(finish, S.duration * 1000 + 250); // safety net
      if (lenis) lenis.scrollTo(y, { duration: S.duration, easing: easeInOutCubic, lock: true, force: true, onComplete: finish });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }

    function goTo(index, dir) {
      const list = stops();
      lastDir = dir || Math.sign(index - targetIndex) || 1;
      extra = 0;
      if (index >= list.length) {
        targetIndex = 'down';
        if (S.exitDown) scrollTo(S.exitDown(), () => { targetIndex = -1; });
        return;
      }
      if (index < 0) {
        targetIndex = 'up';
        if (S.exitUp) scrollTo(S.exitUp(), () => { targetIndex = -1; });
        return;
      }
      targetIndex = index;
      scrollTo(list[index], () => { targetIndex = -1; });
    }

    // index of the stop at/after (dir > 0) or at/before (dir < 0) position y
    function nextIndex(y, dir) {
      const list = stops();
      if (dir > 0) {
        for (let i = 0; i < list.length; i++) if (list[i] > y + tol) return i;
        return list.length;
      }
      for (let i = list.length - 1; i >= 0; i--) if (list[i] < y - tol) return i;
      return -1;
    }

    /* ---------- Wheel / trackpad ---------- */
    function wheelGuard({ deltaY, event }) {
      if (!event || event.type !== 'wheel' || event.ctrlKey || deltaY === 0) return true;
      if (isBlocked()) return true; // Lenis is stopped in that case and swallows it

      const now = performance.now();
      const newGesture = now - lastWheel > S.gestureGap;
      lastWheel = now;
      const dir = Math.sign(deltaY);
      const swallow = () => {
        if (event.cancelable) event.preventDefault();
        return false;
      };

      // During a step (or its trailing momentum): never queue — advance at once on fast intent
      if (stepping || now < absorbUntil) {
        if (dir === lastDir) {
          extra += Math.abs(deltaY);
          if (stepping && (newGesture || extra > S.fastDelta) && typeof targetIndex === 'number' && targetIndex >= 0) {
            goTo(targetIndex + dir, dir);
          } else if (!stepping) {
            absorbUntil = now + S.absorbMs; // still the same gesture's momentum
          }
          return swallow();
        }
        if (stepping) return swallow(); // opposite direction mid-step: ignore until it lands
        absorbUntil = 0;
      }

      const list = stops();
      if (!list.length) return true;
      const target = lenis ? lenis.targetScroll : window.scrollY;
      const next = target + deltaY;
      const first = list[0];
      const last = list[list.length - 1];

      // Optional: from the last stop, the next gesture releases the pin (and comes back to it on the way up)
      if (S.releaseStep && S.exitDown) {
        const exit = S.exitDown();
        if (dir > 0 && target >= last - tol && target < exit - tol) {
          goTo(list.length, 1);
          return swallow();
        }
        if (dir < 0 && target > last + tol && target <= exit + tol) {
          goTo(list.length - 1, -1);
          return swallow();
        }
      }
      if (dir > 0 && target < last - tol && next > first + tol) {
        goTo(nextIndex(target, 1), 1);
        return swallow();
      }
      if (dir < 0 && target > first + tol && next < last - tol) {
        goTo(nextIndex(target, -1), -1);
        return swallow();
      }
      return true;
    }

    /* ---------- Keyboard / scrollbar / touch: settle only if resting between stops ---------- */
    function onScrollEnd() {
      if (stepping || isBlocked()) return;
      const list = stops();
      const y = currentY();
      if (list.length < 2 || y <= list[0] + tol || y >= list[list.length - 1] - tol) return;
      let i = 0;
      while (i < list.length - 1 && list[i + 1] <= y) i++;
      const a = list[i];
      const b = list[i + 1];
      if (Math.abs(y - a) <= tol || Math.abs(y - b) <= tol) return;
      const p = (y - a) / (b - a);
      const dir = (lenis && lenis.direction) || 1;
      const toB = dir > 0 ? p > S.commit : p > 1 - S.commit;
      goTo(toB ? i + 1 : i, toB ? 1 : -1);
    }

    if (lenis) {
      Site.wheelGuards = Site.wheelGuards || [];
      Site.wheelGuards.push(wheelGuard);
    }
    if (ScrollTrigger) ScrollTrigger.addEventListener('scrollEnd', onScrollEnd);
    requestAnimationFrame(onScrollEnd); // a restored scroll position may land between stops

    return {
      goTo: (index) => goTo(index, 1),
      isStepping: () => stepping,
      destroy() {
        token++;
        clearTimeout(releaseTimer);
        if (Site.wheelGuards) {
          const i = Site.wheelGuards.indexOf(wheelGuard);
          if (i > -1) Site.wheelGuards.splice(i, 1);
        }
        if (ScrollTrigger) ScrollTrigger.removeEventListener('scrollEnd', onScrollEnd);
      },
    };
  }

  (window.Site = window.Site || {}).createStepper = createStepper;
})();
