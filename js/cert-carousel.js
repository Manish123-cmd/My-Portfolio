/* ==========================================================================
   Certificates carousel — WebGL (Three.js), loaded on demand by js/certifications.js.

   Geometry (like the reference: a curved cinema screen seen from your seat):
   - every card is a flat plane bent in the vertex shader into a CONCAVE arc,
     so its edges curve toward the viewer;
   - the cards sit side by side on a ring that turns AWAY from the viewer, so the
     neighbours recede at the sides and hint that there is more.

   createCarousel(options) → Promise<api>
     options.container  element to fill (the canvas is appended, aria-hidden)
     options.items      [{ src }]  certificate images (the lightbox files)
     options.config     tuning (see DEFAULTS)
     options.onPick(i)  click on card i
     options.onLost()   WebGL context lost → caller switches to the flat carousel
     options.onLook(dx) fired while rotating (dx = −1 … 1, direction of travel)
   api: setPosition(float index) · start() · stop() · renderOnce() · resize() · destroy()
   ========================================================================== */
import * as THREE from 'three';

const DEFAULTS = {
  cardWidthFrac: 0.44,   // active card ≈ this share of the viewport width…
  cardHeightFrac: 0.8,   // …but never taller than this share of the canvas height
  ring: 2.4,             // radius of the ring the cards sit on (× card width); smaller = sides recede more
  cardBend: 1.5,         // radius of each card's own concave bend (× card width); smaller = more curved
  gap: 0.07,             // gap between neighbouring cards (× card width)
  fov: 40,               // vertical field of view
  dimSide: 0.42,         // brightness of the cards next to the active one
  dimFar: 0.22,          // brightness of cards further away
  bendSpeed: 0.06,       // extra bend per unit of rotation speed (cards/second), × card width
  bendMax: 0.12,
  bendSettle: 0.12,      // how fast the extra bend settles (0–1 per frame)
  tiltDeg: 2.5,          // mouse parallax tilt
  tiltEase: 0.06,
  texSize: 2048,         // texture width (max)
  aspect: 1.5,           // card aspect ratio
  padding: 0.04,         // card padding around the certificate (× card height)
  cardColor: '#1a1a1a',
  maxDpr: 2,
};

const W = 4; // card width in world units (everything else scales from it)

const vertexShader = /* glsl */ `
  uniform float uAngle;      // this card's angle on the ring (0 = facing the camera)
  uniform float uRing;       // ring radius
  uniform float uBendR;      // card's own concave bend radius
  uniform float uBend;       // extra bend while rotating
  uniform float uHalfW;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float t = position.x / uHalfW;                     // −1 … 1 across the card
    float b = position.x / uBendR;
    vec3 lp = vec3(uBendR * sin(b), position.y, uBendR * (1.0 - cos(b)) + uBend * t * t);
    lp.z += uRing;                                     // out to the ring
    float ca = cos(uAngle), sa = sin(uAngle);
    vec3 p = vec3(lp.x * ca + lp.z * sa, lp.y, -lp.x * sa + lp.z * ca);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uBright;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    gl_FragColor = vec4(c.rgb * uBright, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Certificate centred on a neutral card, so every card has the same aspect ratio
function cardCanvas(img, C) {
  const w = C.texSize;
  const h = Math.round(w / C.aspect);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = C.cardColor;
  ctx.fillRect(0, 0, w, h);
  const pad = C.padding * h;
  const s = Math.min((w - 2 * pad) / img.naturalWidth, (h - 2 * pad) / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return cv;
}

export async function createCarousel({ container, items, config = {}, onPick, onLost, onLook }) {
  const C = Object.assign({}, DEFAULTS, config);
  const N = items.length;
  const H = W / C.aspect;
  const ringR = C.ring * W;
  const bendR = C.cardBend * W;
  const step = (W * (1 + C.gap)) / ringR; // angle between neighbouring cards

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, C.maxDpr));
  const canvas = renderer.domElement;
  canvas.className = 'certs__canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(C.fov, 1, 0.1, 200);
  const group = new THREE.Group();
  scene.add(group);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const images = await Promise.all(items.map((it) => loadImage(it.src)));

  const geometry = new THREE.PlaneGeometry(W, H, 64, 1);
  const cards = images.map((img) => {
    const tex = new THREE.CanvasTexture(cardCanvas(img, C));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uMap: { value: tex },
        uAngle: { value: 0 },
        uRing: { value: ringR },
        uBendR: { value: bendR },
        uBend: { value: 0 },
        uHalfW: { value: W / 2 },
        uBright: { value: 1 },
      },
    });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.frustumCulled = false; // vertices are moved in the shader
    group.add(mesh);
    return { mesh, mat, tex };
  });

  container.appendChild(canvas);

  /* ---------- Layout: camera distance so the active card hits its size targets ---------- */
  function layout() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const tanV = Math.tan(THREE.MathUtils.degToRad(C.fov / 2));
    const tanH = tanV * camera.aspect;
    // the card's edges are bent toward the camera by e; use the edge for both checks
    const e = bendR * (1 - Math.cos(W / 2 / bendR));
    const ex = bendR * Math.sin(W / 2 / bendR);
    const byWidth = ex / (C.cardWidthFrac * tanH) + e;     // distance from the card centre plane
    const byHeight = H / 2 / (C.cardHeightFrac * tanV) + e;
    camera.position.set(0, 0, ringR + Math.max(byWidth, byHeight));
    camera.lookAt(0, 0, ringR);
  }

  /* ---------- State ---------- */
  let target = 0;
  let lastPos = 0;
  let bend = 0;
  let lastTime = performance.now();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let running = false;
  let raf = 0;
  let lookTimer = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastTime) / 1000) || 0.016;
    lastTime = now;

    const pos = target;              // the scroll (Lenis + stepper) already eases the motion
    const speed = (pos - lastPos) / dt;
    lastPos = pos;
    const wantBend = Math.min(C.bendMax, Math.abs(speed) * C.bendSpeed) * W;
    bend += (wantBend - bend) * (wantBend > bend ? 0.35 : C.bendSettle);

    if (Math.abs(speed) > 0.05 && onLook && now - lookTimer > 120) {
      lookTimer = now;
      onLook(Math.max(-1, Math.min(1, speed)));
    }

    mouse.x += (mouse.tx - mouse.x) * C.tiltEase;
    mouse.y += (mouse.ty - mouse.y) * C.tiltEase;
    const tilt = THREE.MathUtils.degToRad(C.tiltDeg);
    group.rotation.y = mouse.x * tilt;
    group.rotation.x = mouse.y * tilt;

    cards.forEach(({ mat }, i) => {
      mat.uniforms.uAngle.value = (i - pos) * step;
      mat.uniforms.uBend.value = bend;
      const d = Math.abs(i - pos);
      mat.uniforms.uBright.value = d <= 1
        ? THREE.MathUtils.lerp(1, C.dimSide, d)
        : THREE.MathUtils.lerp(C.dimSide, C.dimFar, Math.min(1, d - 1));
    });
    renderer.render(scene, camera);
  }

  /* ---------- Picking: ray vs. each card's plane (bend ignored: tiny error at the edges) ---------- */
  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const inv = new THREE.Quaternion();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    inv.copy(group.quaternion).invert();
    const o = ray.ray.origin.clone().applyQuaternion(inv);
    const d = ray.ray.direction.clone().applyQuaternion(inv);
    let best = -1;
    let bestT = Infinity;
    cards.forEach(({ mat }, i) => {
      const a = mat.uniforms.uAngle.value;
      const n = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));     // card normal (faces outward)
      const c = n.clone().multiplyScalar(ringR);                       // card centre
      const denom = d.dot(n);
      if (Math.abs(denom) < 1e-6) return;
      const t = c.clone().sub(o).dot(n) / denom;
      if (t <= 0 || t >= bestT) return;
      const p = o.clone().add(d.clone().multiplyScalar(t)).sub(c);
      const lx = p.x * Math.cos(a) - p.z * Math.sin(a);              // back to the card's local x
      if (Math.abs(lx) <= W / 2 && Math.abs(p.y) <= H / 2) {
        best = i;
        bestT = t;
      }
    });
    return best;
  }
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    canvas.style.cursor = pick(e.clientX, e.clientY) >= 0 ? 'pointer' : '';
  }
  function onLeave() {
    mouse.tx = 0;
    mouse.ty = 0;
    canvas.style.cursor = '';
  }
  function onClick(e) {
    const i = pick(e.clientX, e.clientY);
    if (i >= 0 && onPick) onPick(i);
  }
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('click', onClick);

  function onContextLost(e) {
    e.preventDefault();
    api.stop();
    if (onLost) onLost();
  }
  canvas.addEventListener('webglcontextlost', onContextLost);

  const ro = new ResizeObserver(() => { layout(); if (!running) renderer.render(scene, camera); });
  ro.observe(container);
  layout();

  const api = {
    canvas,
    setPosition(p) { target = Math.max(0, Math.min(N - 1, p)); },
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    resize: layout,
    renderOnce() { frame(performance.now()); cancelAnimationFrame(raf); },
    destroy() {
      api.stop();
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      geometry.dispose();
      cards.forEach(({ mat, tex }) => {
        mat.dispose();
        tex.dispose();
      });
      renderer.dispose();
      canvas.remove();
    },
  };
  return api;
}
