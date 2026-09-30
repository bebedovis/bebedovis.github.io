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
  const DRAG_THRESHOLD = 5;  // px — below this a pointer interaction counts as a click
  const mobileQuery = window.matchMedia('(max-width: 767px)');

  const engine = Engine.create({ gravity: { x: 0, y: 1 } });
  engine.positionIterations = 8;
  engine.velocityIterations = 6;

  let W = 0;
  let H = 0;
  let walls = [];
  let items = [];            // { el, body, w, h }
  let spawnTimers = [];

  container.classList.add('is-live');

  // ---------- World construction ----------
  const measure = () => {
    W = container.clientWidth;
    H = container.clientHeight;
  };

  const buildWalls = () => {
    Composite.remove(engine.world, walls);
    const opts = { isStatic: true, friction: 0.3, restitution: 0.3 };
    walls = [
      Bodies.rectangle(W / 2, H + WALL / 2, W + WALL * 2, WALL, opts),   // floor
      Bodies.rectangle(W / 2, -WALL / 2, W + WALL * 2, WALL, opts),      // ceiling
      Bodies.rectangle(-WALL / 2, H / 2, WALL, H + WALL * 2, opts),      // left
      Bodies.rectangle(W + WALL / 2, H / 2, WALL, H + WALL * 2, opts),   // right
    ];
    Composite.add(engine.world, walls);
  };

  const makeBody = (el, x, y) => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const shape = el.dataset.shape;
    const common = {
      restitution: 0.5,
      friction: 0.05,
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
    Body.setAngle(body, (Math.random() - 0.5) * 0.6);
    return { el, body, w, h };
  };

  const buildItems = () => {
    spawnTimers.forEach(clearTimeout);
    spawnTimers = [];
    items.forEach(({ el, body }) => {
      Composite.remove(engine.world, body);
      el.classList.remove('is-placed');
      el.style.transform = '';
    });

    const els = [...container.querySelectorAll('.pg-item')]
      .filter((el) => el.offsetWidth > 0);          // skip items hidden by CSS on phones

    // Cards drop last so they land on top of the pile and stay readable.
    const order = [...els.filter((el) => el.dataset.shape !== 'rect'), ...els.filter((el) => el.dataset.shape === 'rect')];

    items = order.map((el) => {
      const w = el.offsetWidth;
      const x = w / 2 + Math.random() * Math.max(1, W - w);
      const y = el.offsetHeight / 2 + Math.random() * H * 0.3;
      return makeBody(el, x, y);
    });

    items.forEach((item, i) => {
      spawnTimers.push(setTimeout(() => {
        Composite.add(engine.world, item.body);
        Body.setAngularVelocity(item.body, (Math.random() - 0.5) * 0.08);
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

  const render = () => {
    for (const { el, body, w, h } of items) {
      if (!el.classList.contains('is-placed')) continue;
      const { x, y } = body.position;
      el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${body.angle.toFixed(4)}rad)`;
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
    render();
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
      const block = (ev) => ev.preventDefault();
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

  // Hover-to-dim siblings (mouse only).
  container.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'mouse') container.classList.toggle('is-hovering', !!e.target.closest('.pg-item'));
  });
  container.addEventListener('pointerleave', () => container.classList.remove('is-hovering'));

  // ---------- Lifecycle ----------
  measure();
  buildWalls();

  let built = false;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    // Drop the items the first time the playground scrolls into view.
    if (visible && !built) { built = true; buildItems(); }
    updateRunning();
  }, { threshold: 0.15 });
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
    if (!built) return;
    measure();
    buildWalls();
    buildItems();
  });
})();
