const contactForm = document.querySelector(".contact-form");

if (contactForm) {
  const status = contactForm.querySelector(".contact-status");
  const fields = Array.from(contactForm.querySelectorAll("input[required], textarea[required]"));
  const submitButton = contactForm.querySelector("button[type='submit']");
  let submitting = false;

  fields.forEach((field) => {
    field.addEventListener("input", () => {
      field.setCustomValidity("");
      status.textContent = "";
    });
  });

  contactForm.addEventListener("submit", (event) => {
    if (submitting) {
      event.preventDefault();
      return;
    }
    fields.forEach((field) => {
      field.setCustomValidity(field.value.trim() ? "" : "Please complete this field.");
    });
    if (!contactForm.reportValidity()) {
      event.preventDefault();
      return;
    }

    // Visitor-device submission time; the received email also has a server timestamp.
    const submittedAt = new Date();
    contactForm.elements.namedItem("submitted_at_utc").value = submittedAt.toISOString();
    contactForm.elements.namedItem("submitted_at_uk").value = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: "Europe/London"
    }).format(submittedAt);
    contactForm.elements.namedItem("_subject").value = `Portfolio contact: ${contactForm.elements.namedItem("subject").value.trim()}`;
    submitting = true;
    submitButton.disabled = true;
    status.textContent = "Connecting to FormSubmit. Complete any spam check on the next page to send your message.";
    // Allow the browser to POST to FormSubmit with its spam protection enabled.
  });

  window.addEventListener("pageshow", () => {
    submitting = false;
    submitButton.disabled = false;
    status.textContent = "";
  });
}

const hero = document.querySelector(".hero");
const navLinks = document.querySelectorAll(".navbar a[href^='#']");
const anchorLinks = document.querySelectorAll("a[href^='#']");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const shouldSkipIntro = () => prefersReducedMotion || new URLSearchParams(window.location.search).has("skipIntro");
const canAnimateWithGsap = () => typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

if (canAnimateWithGsap()) {
  gsap.registerPlugin(ScrollTrigger);
}

anchorLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });

    navLinks.forEach((item) => item.classList.remove("active"));
    if (link.closest(".navbar") && !link.classList.contains("nav-logo")) {
      link.classList.add("active");
    }
  });
});

const startFloatingIcons = () => {
  if (!prefersReducedMotion) hero?.classList.add("float-ready");
};

const playTitleImpact = () => {
  if (!hero || typeof gsap === "undefined") {
    return;
  }

  hero.classList.add("hero-impacting");

  gsap.timeline({
    onComplete: () => {
      hero.classList.remove("hero-impacting");
      gsap.set(".hero-stage", { clearProps: "transform" });
    }
  })
    .to(".hero-stage", {
      x: -3,
      y: 2,
      duration: .035,
      ease: "none"
    })
    .to(".hero-stage", {
      x: 3,
      y: -2,
      duration: .035,
      ease: "none"
    })
    .to(".hero-stage", {
      x: -2,
      y: 1,
      duration: .035,
      ease: "none"
    })
    .to(".hero-stage", {
      x: 0,
      y: 0,
      duration: .08,
      ease: "power2.out"
    });

  gsap.timeline()
    .to(".hero-impact-glow", {
      opacity: 1,
      scale: 1.05,
      duration: .12,
      ease: "power2.out"
    })
    .to(".hero-impact-glow", {
      opacity: 0,
      scale: 1.52,
      duration: .42,
      ease: "power3.out"
    });

  gsap.timeline()
    .to(".hero-circle", {
      scale: 1.09,
      duration: .14,
      ease: "power2.out"
    })
    .to(".hero-circle", {
      scale: 1,
      duration: .48,
      ease: "power3.out"
    });

  gsap.timeline({ delay: .1 })
    .to(".hero-shockwave", {
      opacity: .86,
      scale: 1,
      duration: .1,
      ease: "power2.out"
    })
    .to(".hero-shockwave", {
      opacity: 0,
      scale: 2.6,
      duration: .52,
      ease: "power3.out"
    });

  gsap.timeline({ delay: .18 })
    .to(".thor-lightning", {
      opacity: 1,
      duration: .045,
      ease: "none"
    })
    .to(".thor-lightning", {
      opacity: .15,
      duration: .05,
      ease: "none"
    })
    .to(".thor-lightning", {
      opacity: .92,
      duration: .04,
      ease: "none"
    })
    .to(".thor-lightning", {
      opacity: 0,
      duration: .16,
      ease: "power2.out"
    });

};

const runIntroAnimation = () => {
  if (shouldSkipIntro()) {
    startFloatingIcons();
    return;
  }

  if (!hero || typeof gsap === "undefined") {
    startFloatingIcons();
    return;
  }

  gsap.set([".navbar", ".hero-title", ".hero-impact", ".hero-impact-glow", ".hero-shockwave", ".hero-circle", ".hero-image", ".thor-lightning", ".tech-icon"], {
    willChange: "transform, opacity"
  });
  gsap.set([".hero-impact-glow", ".hero-shockwave", ".thor-lightning"], { opacity: 0 });

  const intro = gsap.timeline({
    defaults: {
      duration: 1,
      ease: "power3.out"
    },
    onComplete: () => {
      gsap.set([".navbar", ".hero-title", ".hero-impact", ".hero-impact-glow", ".hero-shockwave", ".hero-circle", ".hero-image", ".thor-lightning", ".tech-icon"], {
        clearProps: "willChange"
      });
      startFloatingIcons();
    }
  });

  intro
    .from(".navbar", {
      xPercent: -50,
      y: -100,
      opacity: 0,
      duration: .8
    })
    .fromTo(".hero-title", {
      y: -500,
      opacity: 0,
      rotation: -12,
      scaleX: 1.37,
      scaleY: 1.2
    }, {
      y: 0,
      opacity: 1,
      rotation: 0,
      scaleX: 1.14,
      scaleY: 1,
      duration: 1.5,
      ease: "power3.in",
      onComplete: playTitleImpact
    }, "-=.25")
    .to(".hero-title", {
      y: -15,
      duration: .18,
      ease: "power2.out"
    })
    .to(".hero-title", {
      y: 0,
      duration: .4,
      ease: "back.out(1.4)"
    })
    .from(".hero-circle", {
      x: 500,
      opacity: 0,
      duration: 1
    }, "-=.15")
    .from(".hero-image", {
      y: 400,
      opacity: 0,
      duration: 1
    }, "-=.25")
    .from(".tech-icon", {
      scale: 0,
      opacity: 0,
      stagger: .15,
      duration: 1,
      ease: "back.out(1.8)"
    }, "-=.1");
};

const initStatCounters = () => {
  const grid = document.querySelector(".stats-grid");
  if (!grid || prefersReducedMotion ||
      !("IntersectionObserver" in window)) return;

  const counters = Array.from(grid.querySelectorAll("strong[data-count]"));
  counters.forEach((counter) => {
    counter.setAttribute("aria-label", counter.textContent);
    counter.textContent = "0+";
  });

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    const started = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - started) / 2400, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counters.forEach((counter) => {
        counter.textContent = `${Math.floor(Number(counter.dataset.count) * eased)}+`;
      });
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: .25, rootMargin: "0px 0px -40% 0px" });
  observer.observe(grid);
};

const initAboutAnimations = () => {
  if (shouldSkipIntro()) {
    return;
  }

  if (!canAnimateWithGsap()) {
    return;
  }

  const aboutSection = document.querySelector(".about-section");

  if (!aboutSection) {
    return;
  }

  // Reveal each piece at its own position, rather than the entire text column.
  const reveal = (element, motion, trigger = element) => {
    if (!element) return;
    gsap.from(element, {
      ...motion,
      opacity: 0,
      duration: 1.6,
      ease: "power2.out",
      scrollTrigger: {
        trigger,
        start: "top 60%",
        toggleActions: "play none none reset"
      }
    });
  };

  const visual = aboutSection.querySelector(".about-visual");
  reveal(visual?.querySelector(".about-image"), { x: -65, scale: .96 }, visual);
  reveal(aboutSection.querySelector("h2"), { y: 45 });
  aboutSection.querySelectorAll(".about-copy p").forEach((paragraph) => {
    reveal(paragraph, { y: 40 });
  });
  aboutSection.querySelectorAll(".stat-card").forEach((card) => {
    reveal(card, { y: 35, scale: .94 });
  });
};

const initEducationAnimations = () => {
  if (shouldSkipIntro()) {
    return;
  }

  if (!canAnimateWithGsap()) {
    return;
  }

  const educationSection = document.querySelector(".education-section");
  const timelineTrack = document.querySelector(".timeline-track");
  const timelineOrb = document.querySelector(".timeline-orb");
  const timelineProgress = document.querySelector(".timeline-progress");
  const educationItems = gsap.utils.toArray(".education-item");

  if (!educationSection || !timelineTrack || !timelineOrb || !timelineProgress || !educationItems.length) {
    return;
  }

  const revealEducationCard = (item) => {
    const card = item.querySelector(".education-card");

    if (!card || item.dataset.revealed === "true") {
      return;
    }

    item.dataset.revealed = "true";

    gsap.fromTo(card, {
      y: 34,
      scale: .95,
      opacity: 0
    }, {
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 1.5,
      ease: "power3.out",
      overwrite: "auto",
      onComplete: () => {
        gsap.set(card, {
          clearProps: "transform,opacity"
        });
      }
    });
  };

  let previousActiveIndex = -1;
  const setEducationState = (activeIndex) => {
    if (activeIndex === previousActiveIndex) return;
    previousActiveIndex = activeIndex;
    educationItems.forEach((item, index) => {
      item.classList.toggle("is-completed", index < activeIndex);
      item.classList.toggle("is-active", index === activeIndex);

    });
  };

  setEducationState(0);
  educationItems.forEach((item) => {
    ScrollTrigger.create({
      trigger: item,
      start: "top 70%",
      once: true,
      onEnter: () => revealEducationCard(item)
    });
  });

  gsap.timeline({
    scrollTrigger: {
      trigger: educationSection,
      start: "top 70%",
      end: "bottom 30%",
      scrub: .45,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const activeIndex = Math.min(
          educationItems.length - 1,
          Math.floor(self.progress * educationItems.length)
        );

        setEducationState(activeIndex);
      }
    }
  })
    .to(timelineProgress, {
      scaleY: 1,
      ease: "none"
    }, 0)
    .to(timelineOrb, {
      y: () => Math.max(0, timelineTrack.offsetHeight - timelineOrb.offsetHeight),
      ease: "none"
    }, 0);

};

const initCertificationAnimations = () => {
  if (shouldSkipIntro()) {
    return;
  }

  if (!canAnimateWithGsap()) {
    return;
  }

  const certificationsSection = document.querySelector(".certifications-section");

  if (!certificationsSection) {
    return;
  }

  gsap.from(".certifications-title", {
    y: 46,
    opacity: 0,
    duration: 1.1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: certificationsSection,
      start: "top 70%",
      once: true
    }
  });

  gsap.utils.toArray(".achievement-board").forEach((board) => {
    const boardReveal = gsap.timeline({
      scrollTrigger: { trigger: board, start: "top 70%", once: true }
    });
    const nail = board.querySelector(".board-nail");
    const string = board.querySelector(".board-string");
    const plaque = board.querySelector(".board-plaque");
    const plaqueText = plaque.querySelectorAll(".certification-icon, h4, p, button");
    const startAt = 0;

    boardReveal
      .from(nail, {
        scale: 0,
        opacity: 0,
        duration: .6,
        ease: "power4.out"
      }, startAt)
      .from(string, {
        scaleY: 0,
        opacity: 0,
        duration: .7,
        transformOrigin: "top center",
        ease: "power3.out"
      }, startAt + .22)
      .from(plaque, {
        y: -72,
        rotate: -4,
        opacity: 0,
        duration: 1.35,
        ease: "elastic.out(1, .62)"
      }, startAt + .58)
      .to(plaque, {
        rotate: 1.15,
        duration: .6,
        ease: "power3.out"
      }, startAt + 1.45)
      .to(plaque, {
        rotate: -.55,
        duration: .65,
        ease: "power3.out"
      }, startAt + 1.95)
      .to(plaque, {
        rotate: 0,
        duration: .72,
        ease: "power4.out"
      }, startAt + 2.48)
      .from(plaqueText, {
        y: 12,
        opacity: 0,
        stagger: .08,
        duration: .82,
        ease: "power3.out"
      }, startAt + 1.5);
  });

  const learningStage = document.querySelector(".learning-phone-stage");

  if (!learningStage || prefersReducedMotion) {
    return;
  }

  learningStage.querySelectorAll(".learning-phone").forEach((phone) => {
    gsap.from(phone.querySelector(".phone-frame"), {
      y: 75,
      opacity: 0,
      duration: 1.5,
      ease: "power2.out",
      clearProps: "transform,opacity",
      scrollTrigger: {
        trigger: phone,
        start: "top 70%",
        once: true
      }
    });
  });

};

const initFooterAnimations = () => {
  if (shouldSkipIntro()) {
    return;
  }

  if (!canAnimateWithGsap()) {
    return;
  }

  const footer = document.querySelector(".site-footer");

  if (!footer) {
    return;
  }

  footer.querySelectorAll(".footer-left, .footer-center, .footer-right, .footer-bottom").forEach((element) => {
    gsap.from(element, {
      y: 40,
      opacity: 0,
      duration: 1.5,
      ease: "power2.out",
      scrollTrigger: {
        trigger: element,
        start: "clamp(top 80%)",
        once: true
      }
    });
  });
};

document.addEventListener("DOMContentLoaded", () => {
  runIntroAnimation();
  initAboutAnimations();
  initStatCounters();
  initEducationAnimations();
  initCertificationAnimations();
  initFooterAnimations();
});


// Stop decorative motion when the hero is offscreen or the tab is hidden.
if (hero && "IntersectionObserver" in window) {
  let heroVisible = false;
  const updateMotion = () => {
    hero.classList.toggle("motion-paused", !heroVisible || document.hidden);
  };
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    updateMotion();
  }).observe(hero);
  document.addEventListener("visibilitychange", updateMotion);
}
