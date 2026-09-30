/*
 * Physics playground: DOM elements driven by Matter.js bodies.
 * Uses custom pointer handling (not Matter.MouseConstraint) so the page still
 * scrolls normally on touch devices when you swipe over empty space.
 */
(() => {
  'use strict';

  const container = document.getElementById('pg');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Without Matter (CDN blocked) or with reduced motion, the CSS static layout stays.
  if (!container || !window.Matter || reduceMotion) return;

  const { Engine, Bodies, Body, Composite, Constraint } = Matter;

  const WALL = 400;          // thick walls so fast throws don't tunnel through
  const MAX_SPEED = 45;
  const DRAG_THRESHOLD = 5;  // px; below this a pointer interaction counts as a click
  const SEEN_MS = 1200;      // detection boxes linger this long after a body comes to rest
  const BOX_PAD = 6;
  const INSET = BOX_PAD + 2;
  const mobileQuery = window.matchMedia('(max-width: 767px)');

  const engine = Engine.create({ gravity: { x: 0, y: 1 } });
  engine.positionIterations = 8;
  engine.velocityIterations = 6;

  let W = 0;
  let H = 0;
  let walls = [];
  let items = [];            // { el, body, w, h, box, label, text, seenAt }
  let hovered = null;
  let spawnTimers = [];

  container.classList.add('is-live');

  // ---------- World construction ----------
  const measure = () => {
    W = container.clientWidth;
    H = container.clientHeight;
  };

  const buildWalls = () => {
    Composite.remove(engine.world, walls);
    const opts = { isStatic: true, friction: 0.6, restitution: 0.2 };
    const i = INSET; // keeps the detection boxes from being clipped at the edges
    walls = [
      Bodies.rectangle(W / 2, H - i + WALL / 2, W + WALL * 2, WALL, opts),   // floor
      Bodies.rectangle(W / 2, i - WALL / 2, W + WALL * 2, WALL, opts),       // ceiling
      Bodies.rectangle(i - WALL / 2, H / 2, WALL, H + WALL * 2, opts),       // left
      Bodies.rectangle(W - i + WALL / 2, H / 2, WALL, H + WALL * 2, opts),   // right
    ];
    Composite.add(engine.world, walls);
  };

  const makeBody = (el, x, y) => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const shape = el.dataset.shape;
    const common = {
      restitution: shape === 'rect' ? 0.2 : 0.4,
      friction: 0.5,
      frictionAir: mobileQuery.matches ? 0.02 : 0.01,
      density: shape === 'rect' ? 0.002 : 0.0015,
    };
    let body;
    if (shape === 'circle') {
      body = Bodies.circle(x, y, w / 2, common);
    } else {
      const radius = shape === 'pill' ? h / 2 - 0.5 : 14;
      body = Bodies.rectangle(x, y, w, h, { ...common, chamfer: { radius } });
    }
    Body.setAngle(body, (Math.random() - 0.5) * 0.3);
    return { el, body, w, h };
  };

  const buildItems = () => {
    spawnTimers.forEach(clearTimeout);
    spawnTimers = [];
    items.forEach(({ el, body, box }) => {
      Composite.remove(engine.world, body);
      box.remove();
      el.classList.remove('is-placed');
      el.style.transform = '';
    });

    const els = [...container.querySelectorAll('.pg-item')]
      .filter((el) => el.offsetWidth > 0);          // skip items hidden by CSS on phones

    // Cards drop last so they land on top of the pile and stay readable.
    const order = [...els.filter((el) => el.dataset.shape !== 'rect'), ...els.filter((el) => el.dataset.shape === 'rect')];

    // Spawn below the name and intro so they stay readable while the pile forms.
    const text = container.querySelector('.hero__text');
    const spawnTop = Math.min(text ? text.offsetTop + text.offsetHeight : 0, H * 0.6);

    items = order.map((el, i) => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      // On wide screens the pile gathers on the right, balancing the name on the left.
      const minX = W >= 1024 ? W * 0.5 : INSET;
      const x = minX + w / 2 + Math.random() * Math.max(1, W - INSET - minX - w);
      const y = spawnTop + h / 2 + Math.random() * Math.max(1, (H - spawnTop) * 0.25);
      const item = makeBody(el, x, y);

      // Detection overlay: an axis-aligned box that tracks the body, like a detector + tracker.
      item.box = document.createElement('div');
      item.box.className = 'bbox';
      item.box.setAttribute('aria-hidden', 'true');
      item.label = document.createElement('span');
      item.label.className = 'bbox__label';
      item.text = el.dataset.label || 'object';
      item.label.textContent = item.text;
      item.box.appendChild(item.label);
      container.appendChild(item.box);
      item.id = `id ${String(i + 1).padStart(2, '0')}`;
      item.seenAt = 0;
      return item;
    });

    items.forEach((item, i) => {
      spawnTimers.push(setTimeout(() => {
        Composite.add(engine.world, item.body);
        Body.setAngularVelocity(item.body, (Math.random() - 0.5) * 0.03);
        item.el.classList.add('is-placed');
      }, 150 + i * 90));
    });
  };

  // Keep everything inside the box after a resize.
  const clampBodies = () => {
    items.forEach(({ body, w, h }) => {
      const r = Math.max(w, h) / 2;
      const x = Math.min(Math.max(body.position.x, r), Math.max(r, W - r));
      const y = Math.min(Math.max(body.position.y, r), Math.max(r, H - r));
      if (x !== body.position.x || y !== body.position.y) {
        Body.setPosition(body, { x, y });
        Body.setVelocity(body, { x: 0, y: 0 });
      }
    });
  };

  // ---------- Render loop ----------
  let running = false;
  let visible = false;
  let lastTime = 0;
  let rafId = 0;

  const render = (now = performance.now()) => {
    for (const item of items) {
      const { el, body, w, h, box } = item;
      if (!el.classList.contains('is-placed')) continue;
      const { x, y } = body.position;
      el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${body.angle.toFixed(4)}rad)`;

      const grabbed = drag && drag.item === item;
      if (grabbed || hovered === item || body.speed > 1 || body.angularSpeed > 0.02) item.seenAt = now;
      const seen = now - item.seenAt < SEEN_MS;
      box.classList.toggle('is-seen', seen);
      box.classList.toggle('is-front', grabbed);
      const labelText = grabbed ? item.id : item.text;
      if (item.label.textContent !== labelText) item.label.textContent = labelText;
      const { min, max } = body.bounds;
      box.style.width = `${(max.x - min.x + BOX_PAD * 2).toFixed(1)}px`;
      box.style.height = `${(max.y - min.y + BOX_PAD * 2).toFixed(1)}px`;
      box.style.transform = `translate(${Math.max(0, min.x - BOX_PAD).toFixed(1)}px, ${(min.y - BOX_PAD).toFixed(1)}px)`;
    }
  };

  const tick = (now) => {
    const dt = Math.min(now - (lastTime || now), 32) || 16.67;
    lastTime = now;
    for (const { body } of items) {
      const v = body.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > MAX_SPEED) Body.setVelocity(body, { x: (v.x / speed) * MAX_SPEED, y: (v.y / speed) * MAX_SPEED });
    }
    Engine.update(engine, dt);
    render(now);
    rafId = requestAnimationFrame(tick);
  };

  const updateRunning = () => {
    const shouldRun = visible && !document.hidden;
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) {
      lastTime = 0;
      rafId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafId);
    }
  };

  // ---------- Dragging ----------
  let drag = null; // { item, constraint, pointerId, startX, startY, moved }

  const localPoint = (e) => {
    const rect = container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e) => {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const el = e.target.closest('.pg-item');
    const item = el && items.find((it) => it.el === el);
    if (!item) return;

    e.preventDefault(); // stop text selection / native link drag
    el.setPointerCapture(e.pointerId);
    const p = localPoint(e);
    const constraint = Constraint.create({
      pointA: p,
      bodyB: item.body,
      pointB: { x: p.x - item.body.position.x, y: p.y - item.body.position.y },
      stiffness: 0.2,
      damping: 0.1,
      length: 0,
      render: { visible: false },
    });
    Composite.add(engine.world, constraint);
    el.classList.add('is-grabbed');
    drag = { item, constraint, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
  };

  const onPointerMove = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD) {
      drag.moved = true;
    }
    drag.constraint.pointA = localPoint(e);
  };

  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    Composite.remove(engine.world, drag.constraint);
    drag.item.el.classList.remove('is-grabbed');
    // A real drag should not also trigger the card's link.
    if (drag.moved) {
      const el = drag.item.el;
      const block = (ev) => { ev.preventDefault(); ev.stopImmediatePropagation(); };
      el.addEventListener('click', block, { once: true, capture: true });
      // click (if any) fires right after pointerup; don't swallow a later real click
      setTimeout(() => el.removeEventListener('click', block, true), 0);
    }
    drag = null;
  };

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', endDrag);
  container.addEventListener('pointercancel', endDrag);
  container.addEventListener('dragstart', (e) => e.preventDefault());

  // Hovering an object (mouse only) makes the detector show its box.
  container.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('.pg-item');
    hovered = (el && items.find((it) => it.el === el)) || null;
  });
  container.addEventListener('pointerleave', () => { hovered = null; });

  // ---------- Lifecycle ----------
  measure();
  buildWalls();

  // Keep each body the same size as its element. Sizes can change after the build,
  // e.g. when web fonts arrive late on a slow phone connection or the phone rotates.
  const resyncItem = (item) => {
    const w = item.el.offsetWidth;
    const h = item.el.offsetHeight;
    if (!w || (Math.abs(w - item.w) < 1 && Math.abs(h - item.h) < 1)) return;
    const old = item.body;
    const next = makeBody(item.el, old.position.x, old.position.y).body;
    Body.setAngle(next, old.angle);
    Body.setVelocity(next, old.velocity);
    Body.setAngularVelocity(next, old.angularVelocity);
    if (item.el.classList.contains('is-placed')) {
      Composite.remove(engine.world, old);
      Composite.add(engine.world, next);
    }
    if (drag && drag.item === item) drag.constraint.bodyB = next;
    item.body = next;
    item.w = w;
    item.h = h;
    render();
  };
  const itemObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const item = items.find((it) => it.el === entry.target);
      if (item) resyncItem(item);
    }
  });
  container.querySelectorAll('.pg-item').forEach((el) => itemObserver.observe(el));

  // The hero is on screen at load, so drop the items as soon as the web fonts are in:
  // they decide each object's size and where the intro text ends. Don't wait forever.
  // document.fonts.ready alone can resolve before these faces are even requested,
  // so load the exact ones the objects and the name use.
  const faces = ['300 1em Newsreader', '400 1em Newsreader', '500 1em Newsreader', '400 1em "Hanken Grotesk"'];
  const fontsReady = document.fonts
    ? Promise.race([
      Promise.all(faces.map((f) => document.fonts.load(f))).catch(() => {}),
      new Promise((r) => setTimeout(r, 3000)),
    ])
    : Promise.resolve();
  fontsReady.then(() => {
    measure();
    buildWalls();
    buildItems();
  });
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateRunning();
  }, { threshold: 0 });
  io.observe(container);
  document.addEventListener('visibilitychange', updateRunning);

  let lastW = W;
  new ResizeObserver(() => {
    measure();
    buildWalls();
    // Ignore height-only jitter from mobile URL bars; clamp on real resizes.
    if (Math.abs(W - lastW) > 1) clampBodies();
    lastW = W;
    render();
  }).observe(container);

  // Crossing the phone breakpoint changes item sizes: rebuild the pile.
  mobileQuery.addEventListener('change', () => {
    measure();
    buildWalls();
    buildItems();
  });
})();
