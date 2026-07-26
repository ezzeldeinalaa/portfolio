/* ============================================================
   3D MOLECULE — hero backdrop
   A stylised biochemical molecule (ring + branching atoms),
   rendered with Three.js, slowly rotating and reacting to
   mouse movement + scroll.
   ============================================================ */
(function initMolecule(){
  const container = document.getElementById('molecule-canvas');
  if (!container || typeof THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = container.clientWidth;
  let height = container.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 13);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // Lighting
  const ambient = new THREE.AmbientLight(0x445544, 1.2);
  scene.add(ambient);
  const key = new THREE.PointLight(0x7fff9e, 2.2, 40);
  key.position.set(6, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(0xff8a3d, 1.4, 40);
  rim.position.set(-8, -4, -6);
  scene.add(rim);

  const molecule = new THREE.Group();
  scene.add(molecule);

  // Atom node positions — a hexagonal ring (benzene-like) plus
  // branching substituents, echoing a biochemical structure.
  const ringCount = 6;
  const ringRadius = 3.2;
  const nodes = [];

  for (let i = 0; i < ringCount; i++){
    const angle = (i / ringCount) * Math.PI * 2;
    nodes.push({
      pos: new THREE.Vector3(Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius, 0),
      type: 'ring'
    });
  }
  // Branch atoms off alternating ring atoms
  const branchOffsets = [
    { from: 0, dir: new THREE.Vector3(1.4, 1.6, 1.2) },
    { from: 2, dir: new THREE.Vector3(-1.2, 1.8, -1.4) },
    { from: 4, dir: new THREE.Vector3(0.6, -2.0, 1.6) },
    { from: 1, dir: new THREE.Vector3(2.0, -0.4, -1.8) },
  ];
  branchOffsets.forEach(b => {
    const base = nodes[b.from].pos;
    nodes.push({ pos: base.clone().add(b.dir), type: 'branch' });
  });

  const atomGeo = new THREE.IcosahedronGeometry(1, 2);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x7fff9e, emissive: 0x1a4d2c, roughness: 0.25, metalness: 0.35
  });
  const branchMat = new THREE.MeshStandardMaterial({
    color: 0xff8a3d, emissive: 0x4d2410, roughness: 0.3, metalness: 0.3
  });

  const atomMeshes = [];
  nodes.forEach(n => {
    const scale = n.type === 'ring' ? 0.34 : 0.24;
    const mesh = new THREE.Mesh(atomGeo, n.type === 'ring' ? ringMat : branchMat);
    mesh.position.copy(n.pos);
    mesh.scale.setScalar(scale);
    molecule.add(mesh);
    atomMeshes.push(mesh);
  });

  // Bonds: ring-ring
  const bondMat = new THREE.MeshBasicMaterial({ color: 0x3a4a40, transparent: true, opacity: 0.55 });
  function addBond(a, b){
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(0.045, 0.045, len, 6);
    const mesh = new THREE.Mesh(geo, bondMat);
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    molecule.add(mesh);
  }
  for (let i = 0; i < ringCount; i++){
    addBond(nodes[i].pos, nodes[(i + 1) % ringCount].pos);
  }
  branchOffsets.forEach((b, idx) => {
    addBond(nodes[b.from].pos, nodes[ringCount + idx].pos);
  });

  // Ambient orbit ring (electron shell hint)
  const shellGeo = new THREE.TorusGeometry(4.6, 0.012, 8, 96);
  const shellMat = new THREE.MeshBasicMaterial({ color: 0x7fff9e, transparent: true, opacity: 0.18 });
  const shell1 = new THREE.Mesh(shellGeo, shellMat);
  shell1.rotation.x = Math.PI / 2.3;
  molecule.add(shell1);
  const shell2 = new THREE.Mesh(shellGeo, shellMat.clone());
  shell2.rotation.x = Math.PI / 1.7;
  shell2.rotation.y = Math.PI / 4;
  shell2.scale.setScalar(1.15);
  molecule.add(shell2);

  molecule.position.set(3.2, 0, 0);
  molecule.scale.setScalar(window.innerWidth < 992 ? 0.7 : 1);

  let targetRotX = 0, targetRotY = 0;
  let mouseX = 0, mouseY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  let scrollFactor = 0;
  window.addEventListener('scroll', () => {
    scrollFactor = Math.min(window.scrollY / window.innerHeight, 1.4);
  }, { passive: true });

  const clock = new THREE.Clock();

  function animate(){
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (!reduceMotion){
      targetRotY += (mouseX * 0.5 - targetRotY) * 0.03;
      targetRotX += (mouseY * 0.3 - targetRotX) * 0.03;

      molecule.rotation.y = t * 0.15 + targetRotY;
      molecule.rotation.x = Math.sin(t * 0.1) * 0.1 + targetRotX;
      molecule.rotation.z = scrollFactor * 0.6;
      molecule.position.y = -scrollFactor * 2.2;
      molecule.position.x = 3.2 + scrollFactor * 1.5;

      atomMeshes.forEach((m, i) => {
        m.position.y += Math.sin(t * 1.4 + i) * 0.0009;
      });

      shell1.rotation.z = t * 0.1;
      shell2.rotation.z = -t * 0.08;
    }

    renderer.render(scene, camera);
  }
  animate();

  function onResize(){
    width = container.clientWidth;
    height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    molecule.scale.setScalar(window.innerWidth < 992 ? 0.7 : 1);
  }
  window.addEventListener('resize', onResize);
})();

/* ============================================================
   AMBIENT BACKGROUND CANVAS — faint drifting particles
   (dissolved "reagent" specks)
   ============================================================ */
(function initAmbientCanvas(){
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w, h, particles;

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = document.documentElement.scrollHeight;
  }
  function makeParticles(){
    const count = Math.min(60, Math.floor((w * h) / 60000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.4,
      vy: -(Math.random() * 0.15 + 0.03),
      vx: (Math.random() - 0.5) * 0.08,
      hue: Math.random() > 0.7 ? 'amber' : 'signal',
      alpha: Math.random() * 0.35 + 0.08
    }));
  }
  resize();
  makeParticles();
  window.addEventListener('resize', () => { resize(); makeParticles(); });

  function draw(){
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.fillStyle = p.hue === 'amber'
        ? `rgba(255,138,61,${p.alpha})`
        : `rgba(127,255,158,${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (!reduceMotion){
        p.y += p.vy;
        p.x += p.vx;
        if (p.y < -10) p.y = h + 10;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
      }
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
(function initReveal(){
  const items = document.querySelectorAll('.reveal-up');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  items.forEach(el => io.observe(el));
})();

/* ============================================================
   NAVBAR SCROLL STATE
   ============================================================ */
(function initNav(){
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  function onScroll(){
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Close mobile menu on link click
  document.querySelectorAll('#navMenu .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const menu = document.getElementById('navMenu');
      if (menu.classList.contains('show')){
        bootstrap.Collapse.getOrCreateInstance(menu).hide();
      }
    });
  });
})();

/* ============================================================
   COUNT-UP STATS
   ============================================================ */
(function initCounters(){
  const counters = document.querySelectorAll('.stat-num');
  if (!counters.length) return;

  function animateCounter(el){
    const target = parseFloat(el.dataset.count);
    const isDecimal = el.dataset.count.includes('.');
    const duration = 1400;
    const start = performance.now();

    function tick(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = isDecimal ? value.toFixed(2) : Math.round(value);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = isDecimal ? target.toFixed(2) : target;
    }
    requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        animateCounter(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => io.observe(c));
})();

/* ============================================================
   GPA RING FILL
   ============================================================ */
(function initGpaRing(){
  const circle = document.getElementById('gpaCircle');
  if (!circle) return;
  const circumference = 326.7;
  const gpa = 3.10, maxGpa = 4.0;
  const target = circumference - (gpa / maxGpa) * circumference;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        circle.style.strokeDashoffset = target;
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  io.observe(circle);
})();

/* ============================================================
   LANGUAGE BARS
   ============================================================ */
(function initLangBars(){
  const bars = document.querySelectorAll('.lang-fill');
  if (!bars.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        const bar = entry.target;
        bar.style.width = bar.dataset.width + '%';
        io.unobserve(bar);
      }
    });
  }, { threshold: 0.4 });
  bars.forEach(b => io.observe(b));
})();

/* ============================================================
   CURSOR GLOW (desktop only)
   ============================================================ */
(function initCursorGlow(){
  const glow = document.getElementById('cursorGlow');
  if (!glow || window.matchMedia('(max-width: 991px)').matches) return;
  window.addEventListener('mousemove', (e) => {
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  }, { passive: true });
})();
