(() => {
  'use strict';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------- Section titles get "detected" as they scroll into view ----------
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-detected');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -25% 0px' });
    document.querySelectorAll('.section__title').forEach((el) => io.observe(el));
  }

  // ---------- Avatar: pupils follow the pointer, click = "ouch" ----------
  const avatar = document.getElementById('avatar');
  const pupils = avatar.querySelector('#pupils');
  const pupilsPath = avatar.querySelector('#pupils path');
  const mouthPath = avatar.querySelector('#mouth path');

  const mouthCalm = mouthPath.getAttribute('d');
  const mouthOuch = 'M108.5 80.5a50 88 0 0 0 42 0 30 25 0 0 0 -43 0';
  const pupilsCalm = pupilsPath.getAttribute('d');
  const pupilsX = 'M28 33 L39 42 M37 33 L28 42 M83 31 L92 40 M92 31 L83 40';

  // Pupils look toward the pointer relative to the avatar itself, since it moves around.
  pupils.setAttribute('transform', 'translate(75,125)');
  let lookFrame = 0;
  window.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(lookFrame);
    lookFrame = requestAnimationFrame(() => {
      const r = avatar.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 400));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 400));
      pupils.setAttribute('transform', `translate(${(75.5 + dx * 4.5).toFixed(2)},${(126 + dy * 4).toFixed(2)})`);
    });
  }, { passive: true });

  // playground.js swallows this click when the avatar was dragged rather than tapped.
  avatar.addEventListener('click', async () => {
    avatar.classList.remove('is-ouch');
    void avatar.offsetWidth; // restart the CSS animation
    avatar.classList.add('is-ouch');
    mouthPath.setAttribute('d', mouthOuch);
    pupilsPath.setAttribute('d', pupilsX);
    await sleep(260);
    mouthPath.setAttribute('d', mouthCalm);
    pupilsPath.setAttribute('d', pupilsCalm);
  });
})();
