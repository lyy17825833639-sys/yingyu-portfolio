/* v2 交互：打字机 · 计数 · 鼠标光斑 · 粒子 · 3D 环绕画廊 */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- 打字机 ---------- */
  var typeEl = document.getElementById('hero-type-text');
  if (typeEl) {
    var phrases = [
      '以商业为底，向交叉处探索。',
      '用 AI 拓展研究与表达。',
      '把想法推进为可验证的方案。',
      '从洞察，到行动。'
    ];
    var pi = 0, ci = 0, deleting = false;
    var typeTimer = 0;
    function tick() {
      var word = phrases[pi];
      if (!deleting) {
        ci++;
        typeEl.textContent = word.slice(0, ci);
        if (ci === word.length) {
          deleting = true;
          typeTimer = window.setTimeout(tick, 1500);
          return;
        }
        typeTimer = window.setTimeout(tick, 68 + Math.random() * 60);
      } else {
        ci--;
        typeEl.textContent = word.slice(0, ci);
        if (ci === 0) {
          deleting = false;
          pi = (pi + 1) % phrases.length;
          typeTimer = window.setTimeout(tick, 320);
          return;
        }
        typeTimer = window.setTimeout(tick, 32);
      }
    }
    if (reduced.matches) { typeEl.textContent = phrases[0]; }
    else { typeTimer = window.setTimeout(tick, 500); }
  }

  /* ---------- 计数（滚动进入时从 0 递增） ---------- */
  var counters = [].slice.call(document.querySelectorAll('.count'));
  if (counters.length && 'IntersectionObserver' in window) {
    function runCount(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var dur = parseInt(el.getAttribute('data-duration') || '1300', 10);
      if (reduced.matches) { el.textContent = target.toFixed(decimals); return; }
      var start = performance.now();
      function step(now) {
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(decimals);
      }
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCount(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: .5 });
    counters.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Hero 鼠标光斑 ---------- */
  var hero = document.querySelector('.hero');
  var glow = document.getElementById('hero-cursor-glow');
  if (hero && glow) {
    var raf = 0, tx = 0, ty = 0;
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = hero.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      hero.classList.add('has-pointer');
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0;
        glow.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-50%)';
      });
    });
    hero.addEventListener('pointerleave', function () { hero.classList.remove('has-pointer'); });
  }

  /* ---------- Hero 粒子 ---------- */
  var particles = document.getElementById('hero-particles');
  if (particles && !reduced.matches) {
    var html = '';
    for (var i = 0; i < 16; i++) {
      var left = (Math.random() * 100).toFixed(1);
      var top = (Math.random() * 100).toFixed(1);
      var delay = (Math.random() * 7).toFixed(1);
      var dur = (5 + Math.random() * 4).toFixed(1);
      html += '<i style="left:' + left + '%;top:' + top + '%;animation-delay:-' + delay + 's;animation-duration:' + dur + 's"></i>';
    }
    particles.innerHTML = html;
  }

  /* ---------- 经历速览：滚动揭示 + 进行中标记 ---------- */
  var strip = document.querySelector('.experience-strip');
  if (strip) {
    var items = [].slice.call(strip.querySelectorAll('.experience-item'));
    if ('IntersectionObserver' in window) {
      var stripIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            stripIO.unobserve(entry.target);
          }
        });
      }, { threshold: .35 });
      items.forEach(function (item, i) {
        item.classList.add('reveal-pending');
        item.style.transitionDelay = (i * 90) + 'ms';
        stripIO.observe(item);
      });
    }
  }

  /* ---------- 3D 环绕画廊 ---------- */
  var stage = document.getElementById('ring-stage');
  var track = document.getElementById('ring-track');
  if (stage && track) {
    var cards = [].slice.call(track.querySelectorAll('.ring-card'));
    var N = cards.length;
    if (N) {
      var step = 360 / N;
      var rotY = -step / 2; /* 让第一张卡正对前方 */
      var dragging = false, moved = false, lastX = 0, vel = 0;
      var tween = null, inView = false, loopRaf = 0;

      /* 错落参数（随卡片数确定性生成，避免硬编码长度） */
      var staggerY = cards.map(function (_, i) { return Math.round(Math.sin(i * 1.7) * 42); });
      var staggerR = cards.map(function (_, i) { return Math.round(Math.cos(i * 2.1) * 30); });
      var staggerT = cards.map(function (_, i) { return Math.round(Math.sin(i * 1.3) * 4); });

      function radius() {
        var w = stage.clientWidth;
        if (w <= 480) return 168;
        if (w <= 760) return 205;
        return 300;
      }

      function apply() {
        var R = radius();
        track.style.transform = 'rotateY(' + rotY + 'deg)';
        cards.forEach(function (c, i) {
          var ang = rotY + i * step;
          var rad = ang * Math.PI / 180;
          var depth = Math.cos(rad), vis = (depth + 1) / 2;
          var ty = staggerY[i], r = R + staggerR[i], tz = staggerT[i];
          c.style.transform = 'translate(-50%,-50%) translateY(' + ty + 'px) rotateY(' + (i * step) + 'deg) translateZ(' + r + 'px) rotateZ(' + tz + 'deg)';
          c.style.zIndex = String(1000 + Math.round(depth * 100));
          c.style.opacity = (0.35 + 0.65 * vis).toFixed(2);
          c.style.filter = (1 - vis) < 0.02 ? 'none' : 'blur(' + ((1 - vis) * 2.2).toFixed(2) + 'px)';
        });
      }

      function normalizeDelta(target) {
        var diff = target - rotY;
        return ((diff % 360) + 540) % 360 - 180;
      }
      function animateTo(target, dur) {
        if (tween) cancelAnimationFrame(tween.raf);
        var delta = normalizeDelta(target);
        if (reduced.matches) { rotY += delta; apply(); return; }
        var start = rotY, t0 = performance.now();
        function f(now) {
          var t = Math.min(1, (now - t0) / (dur || 460));
          var eased = 1 - Math.pow(1 - t, 3);
          rotY = start + delta * eased;
          apply();
          if (t < 1) tween = { raf: requestAnimationFrame(f) };
          else tween = null;
        }
        tween = { raf: requestAnimationFrame(f) };
      }

      function loop() {
        if (!inView || document.hidden) { loopRaf = 0; return; }
        if (tween || dragging) { /* 交给 tween / 拖拽 */ }
        else {
          if (Math.abs(vel) > 0.05) { rotY += vel; vel *= 0.94; }
          else if (!reduced.matches) { rotY += 0.12; }
          apply();
        }
        loopRaf = requestAnimationFrame(loop);
      }
      function ensureLoop() { if (!loopRaf) loopRaf = requestAnimationFrame(loop); }
      function stopLoop() { if (loopRaf) { cancelAnimationFrame(loopRaf); loopRaf = 0; } }

      function onDragMove(e) {
        if (!dragging) return;
        var dx = e.clientX - lastX; lastX = e.clientX;
        if (!moved && Math.abs(dx) < 6) return;
        moved = true;
        vel = dx * 0.5;
        rotY += dx * 0.5;
        apply();
      }
      function onDragUp() {
        if (!dragging) return;
        dragging = false;
        window.removeEventListener('pointermove', onDragMove);
        if (moved) {
          var clickSuppressor = function (ev) { ev.stopImmediatePropagation(); ev.preventDefault(); };
          stage.addEventListener('click', clickSuppressor, { once: true, capture: true });
        }
      }
      stage.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        dragging = true; moved = false; lastX = e.clientX; vel = 0;
        if (tween) { cancelAnimationFrame(tween.raf); tween = null; }
        window.addEventListener('pointermove', onDragMove, { passive: true });
        window.addEventListener('pointerup', onDragUp, { once: true });
        window.addEventListener('pointercancel', onDragUp, { once: true });
      });

      var prevBtn = document.querySelector('.ring-prev');
      var nextBtn = document.querySelector('.ring-next');
      if (prevBtn) prevBtn.addEventListener('click', function () { animateTo(rotY - step); });
      if (nextBtn) nextBtn.addEventListener('click', function () { animateTo(rotY + step); });

      /* 供项目地图链接调用：把某张卡转到正前方 */
      function rotateTo(projectId) {
        var idx = -1;
        cards.forEach(function (c, i) { if (c.id === projectId) idx = i; });
        if (idx < 0) return;
        animateTo(-idx * step);
      }
      window.portfolioV2 = { rotateTo: rotateTo };

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting;
          if (inView) ensureLoop(); else stopLoop();
        }, { threshold: .15 }).observe(stage);
      } else { inView = true; ensureLoop(); }

      window.addEventListener('resize', function () { apply(); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopLoop(); else if (inView) ensureLoop();
      });
      apply();
      ensureLoop();
    }
  }
})();
