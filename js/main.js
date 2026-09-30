(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------- Mobile nav ----------
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.getElementById('nav-menu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // ---------- Word-by-word blur reveal ----------
  const splitWords = (el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.style.setProperty('--i', i++);
            w.textContent = part;
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
  };

  const reveals = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    reveals.forEach((el) => { splitWords(el); io.observe(el); });
  }

  // ---------- Avatar: pupils follow cursor, click = "ouch" ----------
  const avatar = document.getElementById('avatar');
  const pupils = avatar.querySelector('#pupils');
  const pupilsPath = avatar.querySelector('#pupils path');
  const mouthPath = avatar.querySelector('#mouth path');

  const mouthStates = [
    'M110.5 80.5a88 88 0 0 0 36.2 0',
    'M108.5 80.5 a70 88 0 0 0 42 0 33 25 0 0 0 -43 0',
    'M108.5 80.5a50 88 0 0 0 42 0 30 25 0 0 0 -43 0',
  ];
  const pupilsCalm = pupilsPath.getAttribute('d');
  const pupilsX = 'M28 33 L39 42 M37 33 L28 42 M83 31 L92 40 M92 31 L83 40';
  const setMouth = (i) => mouthPath.setAttribute('d', mouthStates[i]);

  pupils.setAttribute('transform', 'translate(75,125)');
  const lookAt = (clientX, clientY) => {
    const x = 71 + (clientX / window.innerWidth) * (80 - 71);
    const y = 122 + (clientY / window.innerHeight) * (130 - 122);
    pupils.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`);
  };
  let lookFrame = 0;
  window.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(lookFrame);
    lookFrame = requestAnimationFrame(() => lookAt(e.clientX, e.clientY));
  }, { passive: true });

  let typing = false;
  avatar.addEventListener('click', async () => {
    avatar.classList.remove('is-ouch');
    void avatar.offsetWidth; // restart the CSS animation
    avatar.classList.add('is-ouch');
    setMouth(2);
    pupilsPath.setAttribute('d', pupilsX);
    await sleep(260);
    if (!typing) setMouth(0);
    pupilsPath.setAttribute('d', pupilsCalm);
  });

  // ---------- Typewriter — mouth moves while "speaking" ----------
  const roleEl = document.getElementById('role');
  const roles = [
    'AI / ML Engineer',
    'Backend Engineer',
    'Computer vision in production',
    'LLM agents & RAG pipelines',
    'Physicist who ships',
  ];
  if (!reduceMotion) {
    (async () => {
      let ri = 0;
      await sleep(1200);
      for (;;) {
        const text = roles[ri % roles.length];
        if (ri > 0) {
          typing = true;
          for (let i = 0; i <= text.length; i++) {
            roleEl.textContent = text.slice(0, i);
            setMouth(i % 2 === 0 ? 2 : 1);
            await sleep(58);
          }
          typing = false;
          setMouth(0);
        }
        await sleep(1800);
        for (let i = text.length; i >= 0; i--) {
          roleEl.textContent = text.slice(0, i);
          await sleep(26);
        }
        await sleep(280);
        ri++;
      }
    })();
  }
})();
