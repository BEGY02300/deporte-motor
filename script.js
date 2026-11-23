(() => {
  'use strict';

  const W = 1280;
  const H = 720;
  const NAME_KEY = 'deporte-motor:nombre';

  const $ = (id) => document.getElementById(id);
  const viewport = $('viewport');
  const frame = $('frame');
  const stage = $('stage');
  const slides = Array.from(stage.querySelectorAll('.slide'));
  const total = slides.length;
  const lap = $('lap');
  const laps = $('laps');
  const bar = $('bar');
  const count = $('count');
  const dots = $('dots');
  const prevBtn = $('prev');
  const nextBtn = $('next');
  const fullBtn = $('btn-full');
  const nameEl = $('name');

  const pad = (n) => String(n).padStart(2, '0');
  let current = 0;

  function fit() {
    const cs = getComputedStyle(viewport);
    const w = viewport.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = viewport.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.max(0.1, Math.min(w / W, h / H));
    frame.style.width = W * s + 'px';
    frame.style.height = H * s + 'px';
    stage.style.transform = 'scale(' + s + ')';
  }

  function fitContent() {
    slides.forEach((s) => {
      const body = s.querySelector('.body');
      if (!body) return;
      const cs = getComputedStyle(s);
      const avail = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let k = 1;
      s.style.setProperty('--k', '1');
      let guard = 0;
      while ((body.offsetHeight > avail || body.scrollWidth > body.clientWidth + 1) && k > 0.5 && guard < 40) {
        k = Math.round((k - 0.03) * 100) / 100;
        s.style.setProperty('--k', String(k));
        guard++;
      }
    });
  }

  stage.querySelectorAll('img.real').forEach((img) => {
    const drop = () => img.remove();
    img.addEventListener('error', drop);
    if (img.complete && img.naturalWidth === 0) drop();
  });

  function go(n, updateHash = true) {
    current = Math.max(0, Math.min(total - 1, n));
    slides.forEach((el, i) => {
      el.classList.toggle('is-active', i === current);
      el.classList.toggle('is-past', i < current);
      el.setAttribute('aria-hidden', i === current ? 'false' : 'true');
    });
    lap.textContent = pad(current + 1);
    bar.style.width = (total > 1 ? (current / (total - 1)) * 100 : 100) + '%';
    count.textContent = current + 1 + ' / ' + total;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
    Array.from(dots.querySelectorAll('button')).forEach((b, i) => {
      if (i === current) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    if (updateHash) {
      try { history.replaceState(null, '', '#' + (current + 1)); } catch (e) {}
    }
  }

  const next = () => go(current + 1);
  const prev = () => go(current - 1);

  function fromHash() {
    const n = parseInt(location.hash.slice(1), 10);
    return Number.isFinite(n) ? n - 1 : 0;
  }

  laps.textContent = pad(total);
  slides.forEach((_, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Aller à la diapositive ' + (i + 1));
    b.addEventListener('click', () => go(i));
    li.appendChild(b);
    dots.appendChild(li);
  });

  const canFull = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  if (!canFull) fullBtn.hidden = true;

  function toggleFull() {
    try {
      if (document.fullscreenElement) {
        const p = document.exitFullscreen();
        if (p && p.catch) p.catch(() => {});
      } else {
        const p = document.documentElement.requestFullscreen();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {}
  }

  const controls = document.querySelector('.controls');
  const IDLE_MS = 2500;
  let idleTimer = 0;
  let blockClicksUntil = 0;

  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const busy = controls.matches(':hover') || controls.querySelector(':focus-visible');
      if (busy) armIdle();
      else document.body.classList.add('idle');
    }, IDLE_MS);
  }

  function showUI() {
    document.body.classList.remove('idle');
    armIdle();
  }

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') showUI();
  }, { passive: true });

  document.addEventListener('pointerdown', (e) => {
    const touch = e.pointerType === 'touch';
    if (touch && e.clientY < window.innerHeight * 0.75) return;
    if (touch && document.body.classList.contains('idle')) blockClicksUntil = performance.now() + 450;
    showUI();
  }, { passive: true });

  document.addEventListener('keydown', (e) => { if (e.key === 'Tab') showUI(); });

  controls.addEventListener('click', (e) => {
    if (performance.now() < blockClicksUntil) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  document.addEventListener('fullscreenchange', () => {
    fullBtn.textContent = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran';
    showUI();
    fit();
  });

  try {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) nameEl.textContent = saved;
  } catch (e) {}

  nameEl.addEventListener('input', () => {
    try { localStorage.setItem(NAME_KEY, nameEl.textContent.trim() || '___'); } catch (e) {}
  });
  nameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
  });
  nameEl.addEventListener('blur', () => {
    if (!nameEl.textContent.trim()) nameEl.textContent = '___';
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && t.isContentEditable) return;
    const onButton = t && t.tagName === 'BUTTON';
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault(); next(); break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        e.preventDefault(); prev(); break;
      case ' ':
      case 'Enter':
        if (onButton) return;
        e.preventDefault(); next(); break;
      case 'Home':
        e.preventDefault(); go(0); break;
      case 'End':
        e.preventDefault(); go(total - 1); break;
      case 'f':
      case 'F':
        if (canFull) toggleFull();
        break;
      default:
        if (/^[1-9]$/.test(e.key)) go(parseInt(e.key, 10) - 1);
    }
  });

  frame.addEventListener('click', (e) => {
    if (e.target.closest('[contenteditable], a, button')) return;
    const sel = window.getSelection && window.getSelection().toString();
    if (sel) return;
    const r = frame.getBoundingClientRect();
    if ((e.clientX - r.left) / r.width < 0.25) prev();
    else next();
  });

  let startX = 0;
  let startY = 0;
  viewport.addEventListener('touchstart', (e) => {
    const p = e.changedTouches[0];
    startX = p.clientX;
    startY = p.clientY;
  }, { passive: true });
  viewport.addEventListener('touchend', (e) => {
    const p = e.changedTouches[0];
    const dx = p.clientX - startX;
    const dy = p.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  fullBtn.addEventListener('click', toggleFull);

  window.addEventListener('hashchange', () => go(fromHash(), false));
  window.addEventListener('resize', fit);
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(viewport);

  fit();
  fitContent();
  go(fromHash(), false);
  armIdle();

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitContent);
  window.addEventListener('load', fitContent);
})();
