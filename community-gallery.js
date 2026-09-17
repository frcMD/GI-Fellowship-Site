// Continuous photo loop. Only the original photos are exposed to readers.
(() => {
  const banner = document.querySelector('[data-photo-banner]');
  if (!banner) return;
  const viewport = banner.querySelector('.polaroid-viewport');
  const track = banner.querySelector('.polaroid-track');
  const original = banner.querySelector('.polaroid-set');
  const controls = banner.querySelector('.photo-banner-controls');
  const previous = banner.querySelector('[data-photo-prev]');
  const next = banner.querySelector('[data-photo-next]');
  const toggle = banner.querySelector('[data-photo-motion]');
  if (!viewport || !track || !original || !controls || !previous || !next || !toggle) return;
  const cards = Array.from(original.querySelectorAll('.polaroid'));
  const images = Array.from(original.querySelectorAll('img'));
  if (!cards.length) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let paused = motion.matches;
  let hovered = false;
  let inView = !('IntersectionObserver' in window);
  let cycle = 0;
  let base = 0;
  let position = 0;
  let frame = 0;
  let lastTime = null;
  let runStarted = 0;
  let manual = null;
  let settleTimer;
  let copies = [];
  let layoutSignature = '';

  const wrap = value => cycle ? base + ((value - base) % cycle + cycle) % cycle : value;

  function normalize() {
    position = wrap(viewport.scrollLeft);
    // Copies are visually identical, so this recentering is invisible.
    if (Math.abs(viewport.scrollLeft - position) > 0.01) viewport.scrollLeft = position;
    return position;
  }

  const canDrift = () => !paused && !hovered && inView && !document.hidden && cycle > 0;
  const canAnimate = () => !document.hidden && (manual !== null || canDrift());

  function animate(time) {
    frame = 0;
    if (!canAnimate()) { lastTime = null; return; }
    if (manual) {
      if (manual.start === null) manual.start = time;
      const progress = Math.min(1, (time - manual.start) / 420);
      const eased = 1 - Math.pow(1 - progress, 3);
      viewport.scrollLeft = manual.from + (manual.to - manual.from) * eased;
      if (progress === 1) { manual = null; normalize(); }
      lastTime = null;
    } else {
      if (lastTime === null) {
        lastTime = time;
        runStarted = time;
        normalize();
      }
      const elapsed = Math.min(time - lastTime, 64) / 1000;
      lastTime = time;
      const ramp = Math.min(1, Math.max(0, (time - runStarted) / 800));
      position = wrap(position + 14 * elapsed * ramp);
      viewport.scrollLeft = position;
    }
    if (canAnimate()) frame = window.requestAnimationFrame(animate);
  }

  function sync() {
    const label = paused ? 'Play photo motion' : 'Pause photo motion';
    toggle.textContent = paused ? '▶' : 'Ⅱ';
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
    if (!canAnimate()) {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
    } else if (!frame) {
      lastTime = null;
      frame = window.requestAnimationFrame(animate);
    }
  }

  function pauseForBrowsing() {
    paused = true;
    manual = null;
    clearTimeout(settleTimer);
    sync();
  }

  function moveTo(target) {
    if (motion.matches) {
      viewport.scrollLeft = target;
      normalize();
    } else {
      manual = { from: viewport.scrollLeft, to: target, start: null };
    }
    sync();
  }

  function browse(step) {
    if (!cycle) return;
    pauseForBrowsing();
    const left = normalize();
    const stops = cards.map(card => base + card.offsetLeft);
    const target = step > 0
      ? stops.find(value => value > left + 0.5) ?? base + cycle
      : stops.slice().reverse().find(value => value < left - 0.5) ?? base - cycle + cards[cards.length - 1].offsetLeft;
    moveTo(target);
  }

  function makeCopy(widths) {
    const copy = original.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('data-polaroid-copy', '');
    copy.removeAttribute('id');
    copy.querySelectorAll('img').forEach((image, index) => {
      image.alt = '';
      // Matching widths keep the seam exact even while a replacement loads.
      image.style.width = widths[index];
    });
    return copy;
  }

  function measure() {
    const newCycle = original.getBoundingClientRect().width;
    if (newCycle <= 0) return;
    const widths = images.map(image => window.getComputedStyle(image).width);
    // Keep enough copies to fill even an unusually wide viewport at the seam.
    const count = Math.max(1, Math.ceil(viewport.clientWidth / newCycle));
    const signature = [newCycle, count, ...widths].join('|');
    if (signature === layoutSignature) { sync(); return; }
    const phase = cycle ? ((viewport.scrollLeft - base) % cycle + cycle) % cycle / cycle : 0;
    manual = null;
    copies.forEach(copy => copy.remove());
    copies = [];
    for (let i = 0; i < count; i++) {
      const before = makeCopy(widths);
      const after = makeCopy(widths);
      track.insertBefore(before, original);
      track.append(after);
      copies.push(before, after);
    }
    cycle = newCycle;
    base = cycle * count;
    position = base + phase * cycle;
    viewport.scrollLeft = position;
    layoutSignature = signature;
    lastTime = null;
    previous.disabled = false;
    next.disabled = false;
    controls.hidden = false;
    sync();
  }

  previous.addEventListener('click', () => browse(-1));
  next.addEventListener('click', () => browse(1));
  toggle.addEventListener('click', () => {
    manual = null;
    normalize();
    paused = !paused;
    sync();
  });
  viewport.addEventListener('mouseenter', () => { hovered = true; sync(); });
  viewport.addEventListener('mouseleave', () => { hovered = false; sync(); });
  viewport.addEventListener('pointerdown', pauseForBrowsing, { passive: true });
  viewport.addEventListener('touchstart', pauseForBrowsing, { passive: true });
  viewport.addEventListener('wheel', event => {
    if (Math.abs(event.deltaX) > 0) pauseForBrowsing();
  }, { passive: true });
  viewport.addEventListener('scroll', () => {
    if (manual || canDrift()) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { if (!manual) normalize(); }, 120);
  }, { passive: true });
  banner.addEventListener('focusin', event => {
    if (event.target !== toggle) pauseForBrowsing();
  });
  viewport.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      browse(event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      pauseForBrowsing();
      normalize();
      moveTo(base + (event.key === 'Home' ? 0 : cards[cards.length - 1].offsetLeft));
    }
  });
  document.addEventListener('visibilitychange', sync);
  const preferenceChanged = () => {
    if (motion.matches) pauseForBrowsing();
    else sync();
  };
  if (motion.addEventListener) motion.addEventListener('change', preferenceChanged);
  else if (motion.addListener) motion.addListener(preferenceChanged);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.1 });
    observer.observe(viewport);
  }
  // Replacement photos may have new dimensions; recalculate after each loads.
  images.forEach(image => image.addEventListener('load', measure));
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(viewport);
  else window.addEventListener('resize', measure);
  measure();
})();
