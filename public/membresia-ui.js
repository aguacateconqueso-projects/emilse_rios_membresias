/* =============================================================================
   MEMBRESÍA — Comportamiento compartido de la capa de diseño (aula · panel · entrar)
   Trae las animaciones de la CARTA de ventas al resto de la app:
     · Botón: relleno de tinta que crece DESDE el cursor (--mx/--my) + magnético.
     · Notas musicales de colores al pasar el cursor por un botón.
     · Fundido al entrar en viewport (.reveal), con red de seguridad.
   Funciona también con botones creados dinámicamente (tabla del panel, foro):
   un MutationObserver "mejora" (inyecta .btn__fill) los .btn que van apareciendo.
   Respeta prefers-reduced-motion. Sin dependencias.
   ============================================================================= */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;

  // --- Botones: garantiza el .btn__fill que necesita el relleno desde el cursor ---
  // Es idempotente: si el botón ya lo tiene, no hace nada. Se vuelve a llamar
  // cuando un botón pierde sus hijos (p. ej. btn.textContent = '…' lo borra).
  function ensureFill(btn) {
    if (!btn || !btn.classList || !btn.classList.contains('btn')) return;
    btn.dataset.uiUpgraded = '1';
    if (!btn.querySelector(':scope > .btn__fill')) {
      var fill = document.createElement('span');
      fill.className = 'btn__fill';
      fill.setAttribute('aria-hidden', 'true');
      btn.insertBefore(fill, btn.firstChild);
    }
  }
  function upgradeAll(root) {
    (root || document).querySelectorAll('.btn').forEach(ensureFill);
  }
  upgradeAll(document);

  // Botones que aparecen después (paneles dinámicos, foro, filas de tabla…) y
  // botones cuyo texto se reemplaza en caliente (btn.textContent = '…', que borra
  // el relleno): en ambos casos volvemos a asegurar el .btn__fill.
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.target && m.target.classList && m.target.classList.contains('btn')) ensureFill(m.target);
        m.addedNodes && m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.classList && n.classList.contains('btn')) ensureFill(n);
          if (n.querySelectorAll) upgradeAll(n);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // --- Relleno desde el cursor (--mx/--my) + magnético sutil (delegado) ---
  document.addEventListener('pointermove', function (e) {
    var btn = e.target.closest && e.target.closest('.btn');
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    btn.style.setProperty('--mx', x + 'px');
    btn.style.setProperty('--my', y + 'px');
    if (fine && !reduce && !btn.disabled) {
      var dx = (x - r.width / 2) / r.width, dy = (y - r.height / 2) / r.height;
      btn.style.transform = 'translate(' + (dx * 7).toFixed(1) + 'px,' + (dy * 5).toFixed(1) + 'px)';
    }
  }, { passive: true });
  document.addEventListener('pointerout', function (e) {
    var btn = e.target.closest && e.target.closest('.btn');
    if (btn && !(e.relatedTarget && btn.contains(e.relatedTarget))) btn.style.transform = '';
  });

  // --- Notas musicales de colores que salen del botón al hacer hover ---
  if (!reduce && fine) {
    var GLYPHS = ['♪', '♫', '♩', '♬'];
    var COLORS = ['#a94f2b', '#6b3f2a', '#c9a24a', '#7a8b5a', '#4a6d8c', '#b5504a'];
    function pop(btn) {
      if (btn.disabled) return;
      var r = btn.getBoundingClientRect();
      var count = 2 + Math.floor(Math.random() * 2);
      for (var i = 0; i < count; i++) {
        var s = document.createElement('span');
        s.className = 'note-pop';
        s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        s.style.left = (r.left + 12 + Math.random() * Math.max(1, r.width - 24)) + 'px';
        s.style.top = (r.top + r.height * 0.3) + 'px';
        s.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        s.style.fontSize = (14 + Math.random() * 12) + 'px';
        s.style.setProperty('--dx', ((Math.random() * 2 - 1) * 44).toFixed(0) + 'px');
        s.style.setProperty('--rot', ((Math.random() * 2 - 1) * 40).toFixed(0) + 'deg');
        document.body.appendChild(s);
        s.addEventListener('animationend', function () { this.remove(); });
      }
    }
    var timers = new WeakMap();
    document.addEventListener('pointerenter', function (e) {
      var btn = e.target.closest && e.target.closest('.btn');
      if (!btn || timers.has(btn)) return;
      pop(btn);
      timers.set(btn, setInterval(function () { pop(btn); }, 460));
    }, true);
    document.addEventListener('pointerleave', function (e) {
      var btn = e.target.closest && e.target.closest('.btn');
      if (!btn) return;
      var t = timers.get(btn);
      if (t) { clearInterval(t); timers.delete(btn); }
    }, true);
  }

  // --- Fundido al entrar en viewport (.reveal) + red de seguridad ---
  function revealAll() {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }
  var revs = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    revs.forEach(function (el) { io.observe(el); });
    // Red de seguridad: si algo queda oculto (paneles con hidden, cambios de
    // pestaña, IO que no dispara), revélalo a los 1.4 s para no esconder contenido.
    setTimeout(revealAll, 1400);
  }
})();
