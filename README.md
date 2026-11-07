# Manish Kafle — Portfolio

Static site (HTML, CSS, vanilla JS) for GitHub Pages. GSAP + ScrollTrigger and Lenis load from jsDelivr with pinned versions.

## Structure

| File | What it does |
| --- | --- |
| `index.html` | Page shell and all sections |
| `css/base.css` | Colour tokens, spacing scale, buttons |
| `css/nav.css`, `js/nav.js` | Floating pill navigation + mobile menu |
| `css/intro.css`, `js/intro.js` | Full-screen intro video + slide-in |
| `css/welcome.css`, `js/welcome.js` | "Welcome to my World" hero → split |
| `css/certifications.css`, `js/certifications.js` | Certifications collage + lightbox |
| `js/smooth-scroll.js` | Lenis smooth scrolling, synced with ScrollTrigger |
| `js/stepper.js` | Shared "one scroll gesture = one step" logic for pinned sections |

Every animated section has a `CONFIG` object at the top of its JS file.

## TODO

- [ ] **Final cleanup:** delete the old `Assests/` folder from the repo. The new site doesn't use anything in it
      (everything it needs lives in `assets/`). Note: `Assests/Certifications/` also holds the original Lloyds/Forage PDF.
- [ ] Replace the placeholder About, Work and Contact sections.
- [ ] Certifications: add the GeeksforGeeks completion date, the IBM badge date and its Credly URL.
- [ ] Add the CV at `assets/cv/Manish-Kafle-CV.pdf` (the button appears automatically).
- [ ] Replace the "MK" placeholder logo (`assets/logo/logo.svg`).
- [ ] Replace the intro video with a version without the "Manish Kafle" text, then re-export `assets/video/intro.*`.
