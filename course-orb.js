(() => {
  const canvas = document.querySelector('#course-orb');
  const panel = document.querySelector('.curriculum-panel');
  let context = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !panel || !context) return;

  const courses = [
    '宏观经济学', '微观经济学', '组织行为学', '营销学原理', '消费者行为学',
    '概率与统计', '计量经济学', '高等数学', '线性代数', '管理学原理',
    '商法', '财务管理', '人工智能', '服务管理', '运作管理', '创业基础',
    '社会科学研究方法导论', '人工智能与管理', '商业伦理', '会计学原理', '逻辑导论'
  ];
  const wordHues = [212, 258, 17, 232, 43, 202, 318];

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const points = courses.map((name, index) => {
    const y = 1 - (2 * (index + .5)) / courses.length;
    const ring = Math.sqrt(1 - y * y);
    const angle = goldenAngle * index;
    return { name, index, x: Math.cos(angle) * ring, y, z: Math.sin(angle) * ring };
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rotation = { x: 0, y: .22 };
  let targetRotationY = rotation.y;
  let previousPointer = null;
  let touchStart = null;
  let inView = false;
  const labelOffsets = new Map();
  const measuredWidths = new Map();
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrame = 0;
  let lastDraw = 0;
  let staticLayers = null;

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 760 ? 1.5 : 2);
    if (!width || !height) return;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    labelOffsets.clear();
    measuredWidths.clear();
    renderStaticLayers();
    draw();
  }

  function project(point, cx, cy, radius) {
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const x = point.x * cosY + point.z * sinY;
    const depthY = -point.x * sinY + point.z * cosY;
    const y = point.y * cosX - depthY * sinX;
    const z = point.y * sinX + depthY * cosX;
    const perspective = 2.8 / (2.8 - z * .33);
    return {
      ...point,
      z,
      anchorX: cx + x * radius * perspective,
      anchorY: cy + y * radius * perspective
    };
  }

  function overlaps(a, b, gap) {
    return a.left < b.right + gap && a.right + gap > b.left &&
      a.top < b.bottom + gap && a.bottom + gap > b.top;
  }

  function insideSphere(rect, cx, cy, radius) {
    const limit = radius * .97;
    const corners = [
      [rect.left, rect.top], [rect.right, rect.top],
      [rect.left, rect.bottom], [rect.right, rect.bottom]
    ];
    return corners.every(([x, y]) => Math.hypot(x - cx, y - cy) <= limit);
  }

  function layoutLabels(projected, cx, cy, radius) {
    const placed = [];
    const gap = radius < 200 ? 1.5 : 3;
    const baseSize = Math.max(11.5, Math.min(22, radius * .062));
    // A fixed course order and remembered offsets keep words from trading
    // positions as their depth changes during the single-axis rotation.
    const priority = projected;

    for (const item of priority) {
      const depthSize = item.z < 0 ? .91 : 1 + item.z * .11;
      let chosen = null;

      for (const shrink of [1, .92, .84, .76, .68, .6]) {
        const fontSize = Math.round(baseSize * depthSize * shrink * 2) / 2;
        context.font = `500 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        const widthKey = `${item.index}:${fontSize}`;
        let textWidth = measuredWidths.get(widthKey);
        if (textWidth === undefined) {
          textWidth = context.measureText(item.name).width;
          measuredWidths.set(widthKey, textWidth);
        }
        const textHeight = fontSize * 1.28;

        const previousOffset = labelOffsets.get(item.index);
        if (previousOffset && !chosen) {
          const x = item.anchorX + previousOffset.x;
          const y = item.anchorY + previousOffset.y;
          const rect = {
            left: x - textWidth / 2,
            right: x + textWidth / 2,
            top: y - textHeight / 2,
            bottom: y + textHeight / 2
          };
          if (insideSphere(rect, cx, cy, radius) &&
            !placed.some(other => overlaps(rect, other.rect, gap))) {
            chosen = { ...item, x, y, fontSize, rect };
          }
        }

        // If an old slot is blocked, try its close neighbours first so a word
        // nudges aside rather than jumping to a distant open spot.
        if (previousOffset && !chosen) {
          for (let ring = 1; ring <= 4 && !chosen; ring++) {
            for (let step = 0; step < 8; step++) {
              const angle = step * Math.PI / 4;
              const x = item.anchorX + previousOffset.x + Math.cos(angle) * ring * radius * .025;
              const y = item.anchorY + previousOffset.y + Math.sin(angle) * ring * radius * .025;
              const rect = {
                left: x - textWidth / 2,
                right: x + textWidth / 2,
                top: y - textHeight / 2,
                bottom: y + textHeight / 2
              };
              if (!insideSphere(rect, cx, cy, radius)) continue;
              if (placed.some(other => overlaps(rect, other.rect, gap))) continue;
              chosen = { ...item, x, y, fontSize, rect };
              break;
            }
          }
        }

        for (let ring = 0; ring <= 15 && !chosen; ring++) {
          const count = ring === 0 ? 1 : Math.ceil(7 + ring * 2.2);
          const distance = ring * radius * .052;
          for (let step = 0; step < count; step++) {
            const angle = (step / count) * Math.PI * 2 + item.index * goldenAngle;
            const x = item.anchorX + Math.cos(angle) * distance;
            const y = item.anchorY + Math.sin(angle) * distance;
            const rect = {
              left: x - textWidth / 2,
              right: x + textWidth / 2,
              top: y - textHeight / 2,
              bottom: y + textHeight / 2
            };
            if (!insideSphere(rect, cx, cy, radius)) continue;
            if (placed.some(other => overlaps(rect, other.rect, gap))) continue;
            chosen = { ...item, x, y, fontSize, rect };
            break;
          }
        }
        if (chosen) break;
      }

      if (chosen) {
        labelOffsets.set(item.index, {
          x: chosen.x - item.anchorX,
          y: chosen.y - item.anchorY
        });
        placed.push(chosen);
      }
    }
    return placed.sort((a, b) => a.z - b.z);
  }

  function circle(cx, cy, radius) {
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
  }

  function drawVolume(cx, cy, radius) {
    const halo = context.createRadialGradient(cx, cy, radius * .24, cx, cy, radius * 1.5);
    halo.addColorStop(0, 'rgba(163,210,234,.095)');
    halo.addColorStop(.46, 'rgba(111,114,197,.15)');
    halo.addColorStop(.78, 'rgba(90,128,161,.09)');
    halo.addColorStop(1, 'rgba(86,115,180,0)');
    context.fillStyle = halo;
    circle(cx, cy, radius * 1.5);
    context.fill();

    const body = context.createRadialGradient(
      cx - radius * .44, cy - radius * .52, radius * .08,
      cx + radius * .08, cy + radius * .08, radius * 1.16
    );
    body.addColorStop(0, 'rgba(235,238,255,.22)');
    body.addColorStop(.25, 'rgba(175,198,218,.085)');
    body.addColorStop(.55, 'rgba(119,135,216,.045)');
    body.addColorStop(.83, 'rgba(49,86,119,.09)');
    body.addColorStop(1, 'rgba(229,194,242,.18)');
    context.fillStyle = body;
    circle(cx, cy, radius);
    context.fill();

    context.save();
    circle(cx, cy, radius * .985);
    context.clip();

    const refraction = context.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    refraction.addColorStop(0, 'rgba(247,232,255,.16)');
    refraction.addColorStop(.25, 'rgba(169,194,215,.035)');
    refraction.addColorStop(.52, 'rgba(7,20,43,.055)');
    refraction.addColorStop(.76, 'rgba(255,203,180,.055)');
    refraction.addColorStop(1, 'rgba(223,243,255,.12)');
    context.fillStyle = refraction;
    context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    for (const [x, y, color] of [
      [-.44, -.32, 'rgba(146,176,203,.16)'],
      [.42, -.36, 'rgba(178,151,245,.13)'],
      [.28, .46, 'rgba(252,173,151,.11)']
    ]) {
      const pool = context.createRadialGradient(
        cx + radius * x, cy + radius * y, 0,
        cx + radius * x, cy + radius * y, radius * .62
      );
      pool.addColorStop(0, color);
      pool.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = pool;
      context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    context.save();
    context.translate(cx + radius * .24, cy + radius * .08);
    context.rotate(-.43);
    const caustic = context.createLinearGradient(-radius * .09, 0, radius * .12, 0);
    caustic.addColorStop(0, 'rgba(225,198,255,0)');
    caustic.addColorStop(.48, 'rgba(225,198,255,.105)');
    caustic.addColorStop(1, 'rgba(225,198,255,0)');
    context.fillStyle = caustic;
    context.fillRect(-radius * .1, -radius, radius * .22, radius * 2);
    context.restore();
    context.restore();
  }

  function drawCaustics(cx, cy, radius) {
    context.save();
    circle(cx, cy, radius * .98);
    context.clip();
    context.lineWidth = Math.max(1, radius * .006);
    const colors = ['rgba(193,211,226,.095)', 'rgba(203,176,255,.09)', 'rgba(255,205,171,.075)'];
    const horizontalShift = Math.sin(rotation.y) * radius * .045;
    const tilt = -.32 + Math.sin(rotation.x) * .1;
    for (let i = 0; i < 3; i++) {
      context.strokeStyle = colors[i];
      context.beginPath();
      context.ellipse(cx + horizontalShift + radius * (.12 + i * .035), cy - radius * .06,
        radius * (.57 + i * .1), radius * (.89 + i * .045), tilt, -1.2, 1.35);
      context.stroke();
    }
    context.restore();
  }

  function drawLabels(labels, back) {
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const label of labels) {
      if ((label.z < 0) !== back) continue;
      context.font = `500 ${label.fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      const hue = wordHues[label.index % wordHues.length];
      if (back) {
        context.fillStyle = `hsla(${hue}, 75%, 84%, ${.24 + (label.z + 1) * .1})`;
        context.shadowBlur = 4;
        context.shadowColor = `hsla(${hue}, 80%, 75%, .22)`;
      } else {
        context.fillStyle = `hsla(${hue}, 82%, 88%, ${.78 + label.z * .2})`;
        context.shadowBlur = 8;
        context.shadowColor = `hsla(${hue}, 87%, 74%, .45)`;
      }
      context.fillText(label.name, label.x, label.y);
    }
    context.restore();
  }

  function drawRim(cx, cy, radius) {
    context.save();
    context.shadowBlur = radius * .09;
    context.shadowColor = 'rgba(163,213,250,.32)';
    const rim = context.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    rim.addColorStop(0, 'rgba(238,227,255,.79)');
    rim.addColorStop(.24, 'rgba(176,198,218,.42)');
    rim.addColorStop(.5, 'rgba(120,154,225,.18)');
    rim.addColorStop(.77, 'rgba(255,202,175,.42)');
    rim.addColorStop(1, 'rgba(230,242,255,.72)');
    context.strokeStyle = rim;
    context.lineWidth = Math.max(1.2, radius * .006);
    circle(cx, cy, radius - 1);
    context.stroke();
    context.restore();

    context.save();
    context.lineCap = 'round';
    context.strokeStyle = 'rgba(243,229,255,.61)';
    context.lineWidth = Math.max(1.4, radius * .009);
    context.shadowBlur = radius * .045;
    context.shadowColor = 'rgba(222,196,255,.63)';
    context.beginPath();
    context.arc(cx, cy, radius * .982, Math.PI * 1.12, Math.PI * 1.63);
    context.stroke();
    context.strokeStyle = 'rgba(255,211,184,.25)';
    context.lineWidth = Math.max(1, radius * .004);
    context.beginPath();
    context.arc(cx, cy, radius * .91, -.05, .9);
    context.stroke();
    context.restore();
  }

  function draw() {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    const mobile = window.innerWidth <= 760;
    const cx = width * (mobile ? .5 : .53);
    const cy = height * (mobile ? .51 : .49);
    const radius = Math.min(width * (mobile ? .47 : .413), height * (mobile ? .44 : .402), 365);

    const projected = points.map(point => project(point, cx, cy, radius));
    const labels = layoutLabels(projected, cx, cy, radius);
    context.drawImage(staticLayers.volume, 0, 0, width, height);
    drawLabels(labels, true);
    drawCaustics(cx, cy, radius);
    drawLabels(labels, false);
    context.drawImage(staticLayers.rim, 0, 0, width, height);

  }

  function renderStaticLayers() {
    const mobile = window.innerWidth <= 760;
    const cx = width * (mobile ? .5 : .53);
    const cy = height * (mobile ? .51 : .49);
    const radius = Math.min(width * (mobile ? .47 : .413), height * (mobile ? .44 : .402), 365);
    const mainContext = context;
    const createLayer = painter => {
      const layer = document.createElement('canvas');
      layer.width = canvas.width;
      layer.height = canvas.height;
      context = layer.getContext('2d', { alpha: true });
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      painter(cx, cy, radius);
      return layer;
    };
    staticLayers = {
      volume: createLayer(drawVolume),
      rim: createLayer(drawRim)
    };
    context = mainContext;
  }

  function tick(now) {
    if (!inView || document.hidden) { animationFrame = 0; return; }
    if (now - lastDraw < 30) {
      animationFrame = window.requestAnimationFrame(tick);
      return;
    }
    lastDraw = now;
    const difference = targetRotationY - rotation.y;
    rotation.y = Math.abs(difference) < .001
      ? targetRotationY
      : rotation.y + difference * .15;
    draw();
    animationFrame = Math.abs(targetRotationY - rotation.y) < .001
      ? 0
      : window.requestAnimationFrame(tick);
  }

  function animate() {
    if (!inView || document.hidden) return;
    if (reducedMotion.matches) {
      rotation.y = targetRotationY;
      draw();
    } else if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(tick);
    }
  }

  panel.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY, active: false };
  });
  panel.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') {
      if (!touchStart) return;
      if (!touchStart.active) {
        const dx = event.clientX - touchStart.x;
        const dy = event.clientY - touchStart.y;
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy) * 1.3) return;
        touchStart.active = true;
        previousPointer = event.clientX;
        return;
      }
    }
    if (previousPointer === null) {
      previousPointer = event.clientX;
      return;
    }
    const deltaX = Math.max(-90, Math.min(90, event.clientX - previousPointer));
    previousPointer = event.clientX;
    if (deltaX === 0) return;
    targetRotationY += deltaX * Math.PI * 1.1 / Math.max(panel.clientWidth, 500);
    animate();
  });
  panel.addEventListener('pointerleave', () => { previousPointer = null; });
  const endTouch = () => { touchStart = null; previousPointer = null; };
  panel.addEventListener('pointerup', endTouch);
  panel.addEventListener('pointercancel', endTouch);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) animate();
      else if (animationFrame) { window.cancelAnimationFrame(animationFrame); animationFrame = 0; }
    }, { threshold: .05 }).observe(panel);
  } else inView = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && animationFrame) { window.cancelAnimationFrame(animationFrame); animationFrame = 0; }
    else animate();
  });
  const syncMotion = () => {
    if (reducedMotion.matches) {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      rotation.y = targetRotationY;
      if (inView) draw();
    } else animate();
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', syncMotion);
  else reducedMotion.addListener(syncMotion);
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => { resizeFrame = 0; resize(); });
  });
  resize();
  window.addEventListener('pagehide', () => window.cancelAnimationFrame(animationFrame), { once: true });
})();
