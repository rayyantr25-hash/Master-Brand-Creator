/* ============================================
   MASTER BRAND CREATORS — HERO THREE.JS SCENE
   The eagle mark is the scene: thousands of particles are sampled
   directly from logo.webp's alpha channel and assembled into the
   eagle silhouette, then allowed to breathe outward into a loose
   cloud and re-assemble — a continuous morph/rotate/glow loop.
   A translucent, additively-blended copy of the logo floats behind
   the particles as a glowing 3D "sculpture" layer with wireframe
   rings orbiting it. Mouse + scroll reactive. Degrades gracefully:
   skipped on reduced-motion, lighter sample count on small viewports.
   ============================================ */

(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) { canvas.style.display = 'none'; return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) { return; }

  const isSmall = window.innerWidth < 900;
  const dpr = Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  const accent = new THREE.Color(0x7dff9b);
  const accentDeep = new THREE.Color(0x145a32);

  const group = new THREE.Group();
  scene.add(group);

  /* ---------- Sample the eagle mark into a point cloud ---------- */
  const SAMPLE = isSmall ? 90 : 140;              // sampling grid resolution
  const MAX_POINTS = isSmall ? 2200 : 4200;
  const SPAN = 8.6;                                // world-space width the logo occupies

  function buildFromLogo(img) {
    const off = document.createElement('canvas');
    off.width = SAMPLE; off.height = SAMPLE;
    const ctx = off.getContext('2d');
    ctx.clearRect(0, 0, SAMPLE, SAMPLE);
    // letterbox the (roughly square) logo into the sample canvas
    ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
    const data = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;

    const shapePts = [];
    for (let y = 0; y < SAMPLE; y++) {
      for (let x = 0; x < SAMPLE; x++) {
        const idx = (y * SAMPLE + x) * 4;
        const a = data[idx + 3];
        if (a > 80) {
          const nx = (x / SAMPLE - 0.5) * SPAN;
          const ny = -(y / SAMPLE - 0.5) * SPAN;
          shapePts.push(nx, ny, (Math.random() - 0.5) * 0.9);
        }
      }
    }

    // downsample/pad to a fixed count so the geometry buffer is stable
    const count = Math.min(MAX_POINTS, Math.max(400, shapePts.length / 3));
    const shape = new Float32Array(count * 3);
    const scatter = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const total = shapePts.length / 3;

    for (let i = 0; i < count; i++) {
      const src = total ? Math.floor((i / count) * total) : 0;
      shape[i * 3] = shapePts[src * 3] || 0;
      shape[i * 3 + 1] = shapePts[src * 3 + 1] || 0;
      shape[i * 3 + 2] = shapePts[src * 3 + 2] || 0;

      // scattered "exploded" position each point drifts out to mid-cycle
      const r = 6 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      scatter[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      scatter[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
      scatter[i * 3 + 2] = r * Math.cos(phi) * 0.6 - 2;

      speeds[i] = 0.4 + Math.random() * 0.9;
    }

    const positions = shape.slice();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 64; spriteCanvas.height = 64;
    const sctx = spriteCanvas.getContext('2d');
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(120,255,170,0.65)');
    grad.addColorStop(1, 'rgba(90,255,140,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(spriteCanvas);

    const mat = new THREE.PointsMaterial({
      size: isSmall ? 0.075 : 0.06,
      map: sprite,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: accent,
      opacity: 0.92
    });

    const points = new THREE.Points(geo, mat);
    group.add(points);

    return { points, geo, shape, scatter, speeds, count };
  }

  /* ---------- Glowing logo "sculpture" plane behind the particles ---------- */
  function buildSculpture(texture, aspect) {
    const h = 6.2, w = h * aspect;
    const planeGeo = new THREE.PlaneGeometry(w, h);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.z = -1.6;
    group.add(plane);

    // faint ghost duplicate, offset, for depth/chromatic-glow feel
    const ghost = plane.clone();
    ghost.material = planeMat.clone();
    ghost.material.opacity = 0.10;
    ghost.position.z = -2.6;
    ghost.position.x = 0.18;
    group.add(ghost);

    return { plane, ghost };
  }

  /* ---------- Orbiting wireframe rings (echo the sculpture's presence) ---------- */
  function buildRings() {
    const rings = [];
    const radii = [4.6, 5.6, 6.6];
    radii.forEach((r, i) => {
      const g = new THREE.TorusGeometry(r, 0.008, 8, 90);
      const m = new THREE.MeshBasicMaterial({ color: i % 2 ? accent : accentDeep, transparent: true, opacity: 0.14 });
      const ring = new THREE.Mesh(g, m);
      ring.rotation.x = Math.PI / 2 + i * 0.35;
      ring.rotation.y = i * 0.5;
      group.add(ring);
      rings.push(ring);
    });
    return rings;
  }

  /* ---------- Ambient light blobs ---------- */
  const blobGeo = new THREE.PlaneGeometry(1, 1);
  function makeGlow(color, size, x, y, z, opacity) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const cx = c.getContext('2d');
    const g = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(blobGeo, m);
    mesh.scale.set(size, size, 1);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  }
  const blob1 = makeGlow('rgba(90,255,140,0.85)', 9, 4.5, 2, -6, 0.4);
  const blob2 = makeGlow('rgba(8,80,35,0.9)', 7, -5, -1.8, -5, 0.4);

  /* ---------- Load the eagle mark and assemble the scene ---------- */
  let cloud = null, sculpture = null, rings = [];
  const loader = new THREE.TextureLoader();
  loader.load('logo.webp', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace || texture.colorSpace;
    const img = texture.image;
    cloud = buildFromLogo(img);
    sculpture = buildSculpture(texture, img.width / img.height);
    rings = buildRings();
  });

  /* ---------- Mouse / scroll reactivity ---------- */
  let mouseX = 0, mouseY = 0, targetRotX = 0, targetRotY = 0;
  let scrollT = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  window.addEventListener('scroll', () => {
    scrollT = Math.min(window.scrollY / (window.innerHeight * 0.9), 1);
  }, { passive: true });

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- Animate ---------- */
  const clock = new THREE.Clock();
  let raf;
  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  // Pause the heavy per-frame particle/render work once the hero has
  // scrolled out of view — this was running full-speed for the entire
  // page's lifetime regardless of scroll position, which is a major
  // source of scroll jank on longer pages.
  let inView = true;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(canvas);
  }

  // morph cycle: 0 = fully assembled eagle, 1 = fully scattered cloud
  const CYCLE = 9; // seconds per breathe-out/breathe-in

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!visible || !inView) return;
    const t = clock.getElapsedTime();

    targetRotX += (mouseY * 0.16 - targetRotX) * 0.04;
    targetRotY += (mouseX * 0.2 - targetRotY) * 0.04;

    group.rotation.x = targetRotX * 0.35 + Math.sin(t * 0.05) * 0.05;
    group.rotation.y = targetRotY * 0.35 + t * 0.012;

    if (cloud) {
      // morph amount: mostly assembled, drifts into a loose cloud and back
      const phase = (Math.sin(t * (Math.PI * 2 / CYCLE)) + 1) / 2; // 0..1
      const morph = Math.pow(phase, 1.6) * 0.55; // cap so the eagle stays legible
      const posAttr = cloud.geo.attributes.position;
      for (let i = 0; i < cloud.count; i++) {
        const wob = Math.sin(t * cloud.speeds[i] + i) * 0.05;
        posAttr.array[i * 3] = cloud.shape[i * 3] + (cloud.scatter[i * 3] - cloud.shape[i * 3]) * morph;
        posAttr.array[i * 3 + 1] = cloud.shape[i * 3 + 1] + (cloud.scatter[i * 3 + 1] - cloud.shape[i * 3 + 1]) * morph + wob;
        posAttr.array[i * 3 + 2] = cloud.shape[i * 3 + 2] + (cloud.scatter[i * 3 + 2] - cloud.shape[i * 3 + 2]) * morph;
      }
      posAttr.needsUpdate = true;
      cloud.points.material.opacity = 0.75 + (1 - morph) * 0.2;
    }

    if (sculpture) {
      const pulse = 0.18 + Math.sin(t * 0.6) * 0.06;
      sculpture.plane.material.opacity = pulse;
      sculpture.plane.rotation.y = Math.sin(t * 0.15) * 0.25;
      sculpture.ghost.rotation.y = sculpture.plane.rotation.y;
      sculpture.ghost.material.opacity = pulse * 0.5;
    }

    rings.forEach((ring, i) => {
      ring.rotation.z = t * (0.05 + i * 0.02) * (i % 2 ? 1 : -1);
    });

    blob1.position.x = 4.5 + Math.sin(t * 0.15) * 0.6 - mouseX * 0.8;
    blob1.position.y = 2 + Math.cos(t * 0.12) * 0.4 - mouseY * 0.5;
    blob2.position.x = -5 + Math.cos(t * 0.18) * 0.7 + mouseX * 0.6;
    blob2.position.y = -1.5 + Math.sin(t * 0.14) * 0.5 + mouseY * 0.4;

    camera.position.x = mouseX * 0.6;
    camera.position.y = -mouseY * 0.35 - scrollT * 1.6;
    camera.lookAt(0, -scrollT * 1.6, 0);

    renderer.render(scene, camera);
  }
  tick();

  window.addEventListener('beforeunload', () => cancelAnimationFrame(raf));
})();
