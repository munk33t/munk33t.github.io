// unphiltered.dev — hero + gallery interactions.
// Vanilla JS, no build step. Runs on DOMContentLoaded (script is `defer`-ed).

(function () {
  'use strict';

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Type-in: types the [data-typein] string into a [.typein-text] span,
  //    then fades the caret out.
  function typeIn() {
    const el = document.querySelector('.oneliner[data-typein]');
    if (!el) return;
    const target = el.querySelector('.typein-text');
    const caret = el.querySelector('.type-caret');
    const text = el.dataset.typein || '';
    if (reduceMotion) {
      target.textContent = text;
      if (caret) caret.classList.replace('on', 'off');
      return;
    }
    const delay = 1200;     // ms before typing starts (fade-ins finish first)
    const duration = 1300;  // ms to type the full string
    const total = text.length;
    setTimeout(() => {
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / duration);
        target.textContent = text.slice(0, Math.floor(t * total));
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          target.textContent = text;
          setTimeout(() => caret && caret.classList.replace('on', 'off'), 900);
        }
      }
      requestAnimationFrame(step);
    }, delay);
  }

  // ── Cursor chevron: tail-less arrowhead trails the cursor inside #hero,
  //    rotates to point in the direction of motion, leads by 30px so it
  //    doesn't sit under the native crosshair, and fades when idle.
  function cursorChevron() {
    if (reduceMotion) return;
    const hero = document.getElementById('hero');
    const arrow = hero && hero.querySelector('.cursor-arrow');
    if (!hero || !arrow) return;

    const state = { x: 0, y: 0, tx: 0, ty: 0, last: 0, visible: false };

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      // No CSS transform on the live page, but division is safe + future-proof.
      const sx = r.width / hero.offsetWidth || 1;
      const sy = r.height / hero.offsetHeight || 1;
      state.tx = (e.clientX - r.left) / sx;
      state.ty = (e.clientY - r.top) / sy;
      if (!state.visible) {
        state.visible = true;
        state.x = state.tx;
        state.y = state.ty;
      }
    });

    hero.addEventListener('pointerleave', () => {
      state.visible = false;
      arrow.style.opacity = '0';
    });

    function tick() {
      // inertia toward target
      state.x += (state.tx - state.x) * 0.18;
      state.y += (state.ty - state.y) * 0.18;
      const dx = state.tx - state.x;
      const dy = state.ty - state.y;
      const speed = Math.hypot(dx, dy);
      if (speed > 0.5) state.last = Math.atan2(dy, dx);

      const lead = 30;
      const lx = state.x + Math.cos(state.last) * lead;
      const ly = state.y + Math.sin(state.last) * lead;
      arrow.style.transform =
        `translate3d(${lx - 7}px, ${ly - 7}px, 0) rotate(${state.last}rad)`;
      if (state.visible) {
        // ramp opacity with movement: 0 idle, ~0.7 moving briskly
        arrow.style.opacity = String(Math.min(0.7, speed * 0.12));
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── Click-to-shoot: click anywhere in #hero (except links) and an arrow
  //    arcs in from off-screen to the click point (with ±5px jitter).
  function clickToShoot() {
    if (reduceMotion) return;
    const hero = document.getElementById('hero');
    const layer = hero && hero.querySelector('.click-shoot-layer');
    if (!hero || !layer) return;

    // The layer is an inline SVG; size it to match the hero box.
    function sizeLayer() {
      const r = hero.getBoundingClientRect();
      layer.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      layer.setAttribute('width', r.width);
      layer.setAttribute('height', r.height);
    }
    sizeLayer();
    window.addEventListener('resize', sizeLayer);

    hero.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input')) return;
      const r = hero.getBoundingClientRect();
      const sx = r.width / hero.offsetWidth || 1;
      const sy = r.height / hero.offsetHeight || 1;
      const jx = (Math.random() - 0.5) * 10;
      const jy = (Math.random() - 0.5) * 10;
      const x = (e.clientX - r.left) / sx + jx;
      const y = (e.clientY - r.top) / sy + jy;

      const startX = -40;
      const startY = Math.max(40, y - 80);
      const cx = (startX + x) / 2;
      const cy = (startY + y) / 2 - 60;
      const d = `M ${startX} ${startY} Q ${cx} ${cy} ${x} ${y}`;

      const NS = 'http://www.w3.org/2000/svg';
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.4');
      path.setAttribute('pathLength', '1');
      path.setAttribute('class', 'click-shoot-path');
      layer.appendChild(path);
      setTimeout(() => path.remove(), 1600);
    });
  }

  // ── Reveal-on-scroll: gallery figures fade up when they enter the viewport.
  function revealOnScroll() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    items.forEach((el) => obs.observe(el));
  }

  // ── Trace overlay: the SVG shot-path over the trace screenshot draws
  //    itself in once the trace tile enters the viewport.
  function traceOverlay() {
    const overlay = document.querySelector('.trace-overlay');
    const tile = document.querySelector('.mantis-tile--trace');
    if (!overlay || !tile) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      overlay.classList.add('is-active');
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            overlay.classList.add('is-active');
            obs.disconnect();
          }
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(tile);
  }

  // ── Magnetic: each .magnetic span leans toward the cursor when within
  //    `radius` px of its center.
  function magnetic() {
    if (reduceMotion) return;
    const items = document.querySelectorAll('.magnetic');
    if (!items.length) return;
    const radius = 70;
    const strength = 0.3;
    function onMove(e) {
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < radius) {
          const k = strength * (1 - dist / radius);
          el.style.transform = `translate3d(${dx * k}px, ${dy * k}px, 0)`;
        } else {
          el.style.transform = 'translate3d(0, 0, 0)';
        }
      });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerleave', () => {
      items.forEach((el) => { el.style.transform = 'translate3d(0, 0, 0)'; });
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────────
  function boot() {
    typeIn();
    cursorChevron();
    clickToShoot();
    revealOnScroll();
    traceOverlay();
    magnetic();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
