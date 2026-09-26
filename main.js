const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.primary-nav');

if (menuButton && navigation) {
  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '打开导航菜单');
    navigation.classList.remove('is-open');
  };
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? '打开导航菜单' : '关闭导航菜单');
    navigation.classList.toggle('is-open', !isOpen);
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 940) closeMenu(); });
}

const educationMap = document.querySelector('.education-map');
if (educationMap) {
  const desktopSvg = educationMap.querySelector('.education-path-desktop');
  const mobileSvg = educationMap.querySelector('.education-path-mobile');
  const nodeButtons = [...educationMap.querySelectorAll('.education-node')];
  const desktopStops = [90, 390, 700, 1100];
  const mobileStops = [65, 285, 478, 690];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pathCache = new WeakMap();
  let progressFraction = 0;
  let pointerFrame = 0;
  let travelFrame = 0;
  let resizeFrame = 0;
  let pendingCoordinate = null;
  let bounds = null;

  const currentSvg = () => window.matchMedia('(max-width: 700px)').matches ? mobileSvg : desktopSvg;
  const pathInfo = svg => {
    if (pathCache.has(svg)) return pathCache.get(svg);
    const path = svg.querySelector('.education-path-base');
    const progress = svg.querySelector('.education-path-progress');
    const plane = svg.querySelector('.education-plane');
    const total = path.getTotalLength();
    const axis = svg === mobileSvg ? 'y' : 'x';
    const samples = Array.from({ length: 241 }, (_, index) => {
      const distance = total * index / 240;
      return { coordinate: path.getPointAtLength(distance)[axis], distance };
    });
    progress.style.strokeDasharray = String(total);
    const info = { path, progress, plane, total, samples };
    pathCache.set(svg, info);
    return info;
  };

  const placePlane = (svg, distance) => {
    const { path, progress, plane, total } = pathInfo(svg);
    const position = Math.max(0, Math.min(total, distance));
    const point = path.getPointAtLength(position);
    const before = path.getPointAtLength(Math.max(0, position - 3));
    const after = path.getPointAtLength(Math.min(total, position + 3));
    const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
    plane.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
    progress.style.strokeDashoffset = String(total - position);
    progressFraction = total ? position / total : 0;
  };

  const distanceAtCoordinate = (svg, coordinate) => {
    const { samples } = pathInfo(svg);
    let low = 0;
    let high = samples.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (samples[middle].coordinate < coordinate) low = middle;
      else high = middle;
    }
    const before = samples[low];
    const after = samples[high];
    const span = after.coordinate - before.coordinate;
    const ratio = span ? Math.max(0, Math.min(1, (coordinate - before.coordinate) / span)) : 0;
    return before.distance + (after.distance - before.distance) * ratio;
  };

  const animateToCoordinate = (svg, coordinate) => {
    window.cancelAnimationFrame(travelFrame);
    const startDistance = pathInfo(svg).total * progressFraction;
    const endDistance = distanceAtCoordinate(svg, coordinate);
    if (reducedMotion.matches) { placePlane(svg, endDistance); return; }
    const started = performance.now();
    const step = now => {
      const t = Math.min(1, (now - started) / 320);
      const eased = 1 - Math.pow(1 - t, 3);
      placePlane(svg, startDistance + (endDistance - startDistance) * eased);
      if (t < 1) travelFrame = window.requestAnimationFrame(step);
    };
    travelFrame = window.requestAnimationFrame(step);
  };

  educationMap.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const svg = currentSvg();
    if (!bounds) bounds = svg.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const isMobile = svg === mobileSvg;
    const viewSize = isMobile ? 760 : 1200;
    const pointer = isMobile ? event.clientY - bounds.top : event.clientX - bounds.left;
    pendingCoordinate = pointer / (isMobile ? bounds.height : bounds.width) * viewSize;
    if (pointerFrame) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      window.cancelAnimationFrame(travelFrame);
      placePlane(svg, distanceAtCoordinate(svg, pendingCoordinate));
    });
  });
  educationMap.addEventListener('pointerenter', () => { bounds = currentSvg().getBoundingClientRect(); });
  window.addEventListener('scroll', () => { bounds = null; }, { passive: true });

  nodeButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const svg = currentSvg();
      animateToCoordinate(svg, svg === mobileSvg ? mobileStops[index] : desktopStops[index]);
    });
  });

  window.addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      bounds = null;
      const svg = currentSvg();
      placePlane(svg, pathInfo(svg).total * progressFraction);
    });
  });
  placePlane(currentSvg(), 0);
}

const projectDetails = {
  moodbox: {
    category: '04 / PRODUCT CONCEPT · 2026',
    title: 'MoodBox',
    lede: '给情绪一个空间，让生活多一点从容。',
    video: true,
    facts: [
      ['我的角色', '项目负责人 / 小程序 MVP 独立开发'],
      ['项目阶段', '概念与体验版，校园试点准备中'],
      ['核心产出', 'MVP 体验版 / 40 页商业计划书']
    ],
    body: '项目从大学生对独处、休息与私密表达的需求出发，提出约一平方米的情绪舒缓空间。小程序体验版围绕查询、预约、使用和反馈构建服务路径，并将 AI 陪伴放入完整体验中。当前呈现的是概念验证与 MVP，不代表实体舱已投入运营。'
  },
  research: {
    category: '03 / GENERATIVE AI RESEARCH · 2025—2026',
    title: 'AI 与医患互动',
    lede: '当生成式 AI 进入在线问诊，人与人的交流会发生什么变化？',
    facts: [
      ['我的角色', '项目主持人 / 5 人团队组织与研究设计'],
      ['研究基础', '5 份政策文件 / 47 篇中外文献'],
      ['核心产出', '研究框架 / 访谈提纲 / 患者问卷']
    ],
    body: '研究基于可供性视角，关注生成式 AI 如何影响在线健康社区中的患者参与和医患互动质量。我主导建立包含两类 AI 可供性、六维互动质量指标与五项假设的理论模型。项目已获校级立项，目前处于研究与实证准备阶段。',
    highlights: [
      '主持 5 人团队完成项目申报与研究设计，获得校级立项。',
      '梳理 5 份政策文件和 47 篇中外文献；主导构建含 2 类 AI 可供性、1 项中介变量、6 维互动质量指标及 5 项假设的模型。',
      '交付研究框架、医患访谈提纲和患者问卷，为预调研与实证检验提供工具。'
    ]
  },
  strategy: {
    category: '01 / STRATEGY RESEARCH · 2026',
    title: '明阳智能出海策略',
    lede: '把复杂市场信息整理成可比较、可讨论的进入路径。',
    facts: [
      ['我的角色', '战略分析负责人'],
      ['研究范围', '沙特 / 埃塞俄比亚 / 埃及 / 摩洛哥'],
      ['项目结果', '差异化进入方案 / 团队获最佳市场潜力奖']
    ],
    body: '基于战略管理理论搭建海外市场进入分析框架，系统研究沙特、埃塞俄比亚、埃及与摩洛哥的市场准入、本地化适配和进入模式。负责四国的定性与定量分析，并建立经济模型，测算不同进入模式下的订单规模、投资需求、收益表现与风险敏感性。团队最终形成差异化进入路径和本地化方案，完成 15 分钟英文路演。',
    highlights: [
      '搭建海外市场进入分析框架，研究沙特、埃塞俄比亚、埃及与摩洛哥四国。',
      '结合政策、产业链和市场机会建立经济模型，测算订单规模、投资需求、收益及风险敏感性。',
      '形成差异化进入路径，参与 15 分钟英文路演；团队获“最佳市场潜力奖”。'
    ]
  },
  case: {
    category: '02 / CASE ANALYSIS · 2025',
    title: '致景科技案例分析',
    lede: '从一段创始人访谈出发，理解数据如何改变传统产业的协作方式。',
    facts: [
      ['我的角色', '队长 / 行业 PEST 与信息流分析'],
      ['研究材料', '149 分钟创始人访谈 / 多源二手资料'],
      ['项目成果', '20 页报告 / 优秀案例并收录案例册']
    ],
    body: '带领五人团队研究致景科技的数据要素赋能路径，聚焦传统纺织业的信息不对称与产能协同低效。结合约 4.5 万字访谈记录和多源二手资料，拆解五类数字化方案、提炼行业转型机制，并整合形成 20 页案例报告。项目获第三届“岭南杯”中国经济发展案例分析大赛“优秀案例”。',
    highlights: [
      '带领 5 人团队，负责行业 PEST 分析与商业模式信息流分析。',
      '结合 149 分钟、约 4.5 万字创始人访谈和多源资料，拆解 5 类数字化方案并整合成 20 页报告。',
      '案例获评“优秀案例”，收录于大赛案例册。'
    ]
  }
};

const dialog = document.querySelector('#project-dialog');
if (dialog) {
  const content = dialog.querySelector('.dialog-content');
  const closeButton = dialog.querySelector('.dialog-close');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let previousFocus = null;
  let closeTimer = 0;
  document.querySelectorAll('[data-project]').forEach(button => {
    button.addEventListener('click', () => {
      const project = projectDetails[button.dataset.project];
      if (!project) return;
      previousFocus = button;
      content.innerHTML = `
        <p class="eyebrow">${project.category}</p>
        <h2 id="dialog-title">${project.title}</h2>
        <p class="dialog-lede">${project.lede}</p>
        ${project.video ? '<video src="assets/moodbox-demo.mp4" poster="assets/moodbox-poster.svg" controls playsinline preload="metadata" aria-label="MoodBox 小程序 MVP 演示视频"></video>' : ''}
        <div class="dialog-grid">${project.facts.map(([label, value]) => `<div><strong>${label}</strong><p>${value}</p></div>`).join('')}</div>
        <h3>项目概述</h3>
        <p>${project.body}</p>
        ${project.highlights ? `<h3>关键工作与成果</h3><ul class="dialog-highlights">${project.highlights.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}
      `;
      window.clearTimeout(closeTimer);
      dialog.showModal();
      document.querySelector('.project-compact-moodbox video')?.pause();
      window.requestAnimationFrame(() => dialog.classList.add('is-visible'));
      closeButton.focus();
    });
  });
  const closeDialog = () => {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    dialog.querySelector('video')?.pause();
    dialog.classList.add('is-closing');
    dialog.classList.remove('is-visible');
    if (motionPreference.matches) dialog.close();
    else closeTimer = window.setTimeout(() => dialog.close(), 280);
  };
  closeButton.addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  dialog.addEventListener('close', () => {
    window.clearTimeout(closeTimer);
    dialog.classList.remove('is-visible', 'is-closing');
    dialog.querySelector('video')?.pause();
    previousFocus?.focus();
  });
}

const projectCarousel = document.querySelector('.project-carousel-viewport');
if (projectCarousel) {
  const track = projectCarousel.querySelector('.project-compact-grid');
  const previousButton = document.querySelector('.project-carousel-prev');
  const nextButton = document.querySelector('.project-carousel-next');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pointerStart = null;
  let suppressClick = false;
  let scrollFrame = 0;
  let controlFrame = 0;
  let pendingScrollLeft = 0;

  const cardStep = () => {
    const card = track.querySelector('.project-compact-card');
    const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
    return card ? card.getBoundingClientRect().width + gap : projectCarousel.clientWidth;
  };

  const updateControls = () => {
    const lastPosition = projectCarousel.scrollWidth - projectCarousel.clientWidth;
    previousButton.disabled = projectCarousel.scrollLeft <= 2;
    nextButton.disabled = projectCarousel.scrollLeft >= lastPosition - 2;
  };

  const scheduleControls = () => {
    if (controlFrame) return;
    controlFrame = window.requestAnimationFrame(() => { controlFrame = 0; updateControls(); });
  };

  const move = direction => projectCarousel.scrollBy({
    left: direction * cardStep(),
    behavior: reducedMotion.matches ? 'auto' : 'smooth'
  });

  previousButton.addEventListener('click', () => move(-1));
  nextButton.addEventListener('click', () => move(1));
  projectCarousel.addEventListener('scroll', scheduleControls, { passive: true });
  window.addEventListener('resize', scheduleControls);

  projectCarousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });

  projectCarousel.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: projectCarousel.scrollLeft, moved: false };
  });

  projectCarousel.addEventListener('pointermove', event => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const distance = event.clientX - pointerStart.x;
    if (!pointerStart.moved) {
      if (Math.abs(distance) < 7 || Math.abs(distance) < Math.abs(event.clientY - pointerStart.y)) return;
      pointerStart.moved = true;
      projectCarousel.classList.add('is-dragging');
      projectCarousel.setPointerCapture(event.pointerId);
    }
    pendingScrollLeft = pointerStart.scrollLeft - distance;
    if (!scrollFrame) {
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        projectCarousel.scrollLeft = pendingScrollLeft;
      });
    }
    event.preventDefault();
  });

  const endDrag = () => {
    if (pointerStart?.moved) {
      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
        scrollFrame = 0;
        projectCarousel.scrollLeft = pendingScrollLeft;
      }
      suppressClick = true;
      window.setTimeout(() => { suppressClick = false; }, 260);
      const step = cardStep();
      const nearest = Math.round(projectCarousel.scrollLeft / step) * step;
      projectCarousel.classList.remove('is-dragging');
      projectCarousel.scrollTo({ left: nearest, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
    pointerStart = null;
    projectCarousel.classList.remove('is-dragging');
  };
  projectCarousel.addEventListener('pointerup', endDrag);
  projectCarousel.addEventListener('pointercancel', endDrag);
  projectCarousel.addEventListener('click', event => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }, true);

  updateControls();
}

const projectMap = document.querySelector('.project-map');
if (projectMap) {
  const nodes = [...projectMap.querySelectorAll('.project-map-node')];
  let activeNode = null;

  const setActiveNode = node => {
    activeNode = node;
    projectMap.classList.toggle('has-active', Boolean(node));
    nodes.forEach(item => {
      const selected = item === node;
      const button = item.querySelector('button');
      const popover = item.querySelector('.project-map-popover');
      item.classList.toggle('is-active', selected);
      button.setAttribute('aria-expanded', String(selected));
      popover.setAttribute('aria-hidden', String(!selected));
      popover.toggleAttribute('inert', !selected);
    });
  };

  nodes.forEach(node => {
    const button = node.querySelector('button');
    button.addEventListener('click', () => setActiveNode(node));
    node.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') setActiveNode(node);
    });
    node.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && !node.contains(document.activeElement)) setActiveNode(null);
    });
    node.addEventListener('focusin', () => setActiveNode(node));
    node.addEventListener('focusout', event => {
      if (!node.contains(event.relatedTarget)) setActiveNode(null);
    });
    node.querySelectorAll('.project-map-popover a').forEach(link => {
      link.addEventListener('click', event => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        setActiveNode(null);
        const viewport = target.closest('.project-carousel-viewport');
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
        const revealPage = () => {
          const offset = Math.max(130, (window.innerHeight - target.offsetHeight) / 2);
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: motion });
        };
        if (!viewport) { revealPage(); return; }
        const left = viewport.scrollLeft + target.getBoundingClientRect().left - viewport.getBoundingClientRect().left;
        if (Math.abs(viewport.scrollLeft - left) < 2) { revealPage(); return; }
        viewport.scrollTo({ left, behavior: motion });
        if (motion === 'auto') { revealPage(); return; }
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          viewport.removeEventListener('scrollend', finish);
          revealPage();
        };
        viewport.addEventListener('scrollend', finish, { once: true });
        window.setTimeout(finish, 450);
      });
    });
  });

  document.addEventListener('pointerdown', event => {
    if (!projectMap.contains(event.target)) setActiveNode(null);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeNode) {
      activeNode.querySelector('button').focus();
      setActiveNode(null);
    }
  });
}

const backgroundVideo = document.querySelector('.project-compact-moodbox video');
if (backgroundVideo) {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData || false;
  let videoVisible = false;
  const syncVideo = () => {
    const shouldPlay = videoVisible && !document.hidden && !motionPreference.matches && !saveData && !dialog?.open;
    if (shouldPlay) backgroundVideo.play().catch(() => {});
    else backgroundVideo.pause();
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      videoVisible = entries[0].isIntersecting;
      syncVideo();
    }, { threshold: .3 }).observe(backgroundVideo);
  }
  document.addEventListener('visibilitychange', syncVideo);
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', syncVideo);
  else motionPreference.addListener(syncVideo);
  dialog?.addEventListener('close', syncVideo);
}
