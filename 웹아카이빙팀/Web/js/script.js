document.querySelectorAll('.menu-toggle').forEach((menuToggle) => {
  const header = menuToggle.closest('header');
  if (!header) return;

  menuToggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('menu-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
  });
});

// PC에서는 하나의 고정 메뉴만 사용해 페이지 상단에서도 메뉴 교체가 없도록 합니다.
(() => {
  const desktop = window.matchMedia('(min-width: 1101px)');
  const sourceNav = document.querySelector('.site-nav');
  const sourceLogo = document.querySelector('.site-logo');
  if (!sourceNav || !sourceLogo) return;

  const bar = document.createElement('header');
  // 첫 화면에서는 등장 애니메이션 없이 초기 위치를 표시합니다.
  bar.className = 'scroll-navigation is-initializing';
  const logo = document.createElement('a');
  logo.className = 'site-logo';
  logo.href = sourceLogo.matches('a') ? sourceLogo.getAttribute('href') : '../index.html';
  logo.setAttribute('aria-label', 'Button Up home');
  logo.append(sourceLogo.querySelector('img').cloneNode(true));
  const nav = sourceNav.cloneNode(true);
  // 복제 메뉴의 ID 충돌을 방지합니다.
  nav.removeAttribute('id');
  nav.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
  bar.append(logo, nav);
  document.body.append(bar);

  let shown = false;
  let anchorY = window.scrollY;
  let queued = false;
  const setVisible = (visible) => {
    shown = visible;
    bar.classList.toggle('is-visible', visible);
    bar.inert = !visible;
    bar.setAttribute('aria-hidden', String(!visible));
  };
  const syncDesktop = () => {
    const enabled = desktop.matches;
    // 원래 요소의 공간은 유지하고, PC에서는 공통 메뉴만 노출합니다.
    sourceNav.classList.toggle('desktop-nav-source', enabled);
    sourceLogo.classList.toggle('desktop-nav-source', enabled);
    sourceNav.inert = enabled;
    sourceLogo.inert = enabled;
    if (enabled) {
      const rect = sourceLogo.getBoundingClientRect();
      bar.style.setProperty('--nav-logo-left', `${rect.left}px`);
      bar.style.setProperty('--nav-logo-top', `${rect.top + window.scrollY}px`);
    }
  };
  setVisible(false);
  syncDesktop();

  const update = () => {
    queued = false;
    const y = Math.max(0, window.scrollY);
    bar.classList.toggle('is-at-top', y <= 1);
    if (!desktop.matches || y <= 120) {
      setVisible(desktop.matches);
      anchorY = y;
      return;
    }
    // 작은 스크롤 흔들림은 무시하고, 키보드로 사용 중인 메뉴는 유지합니다.
    if (Math.abs(y - anchorY) >= 8) {
      setVisible(y < anchorY || (shown && bar.contains(document.activeElement)));
      anchorY = y;
    }
  };
  window.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  const refresh = () => { syncDesktop(); update(); };
  window.addEventListener('resize', refresh);
  desktop.addEventListener('change', refresh);
  update();
  // 초기 상태를 먼저 그린 뒤 스크롤 애니메이션을 활성화합니다.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => bar.classList.remove('is-initializing'));
  });
})();

// 일반 콘텐츠의 우클릭·드래그만 제한하고 입력 영역의 편집 기능은 유지합니다.
(() => {
  const isEditable = (target) => target instanceof Element && Boolean(
    target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')
  );
  document.addEventListener('contextmenu', (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  });
  document.addEventListener('dragstart', (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  });
})();

// 마우스가 지나간 궤적을 짧고 매끈한 실로 표시합니다.
(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  // 실 효과 설정: 숫자를 바꾼 뒤 저장하고 브라우저를 새로고침하세요.
  const threadSettings = {
    thickness: 3, // 두께(px): 1 = 가늘게, 2 = 보통, 3 = 두껍게
    length: 200,    // 최대 길이(px)
    color: '#E4E4E4',
    outlineColor: '#B3B7C9', // 실 외곽선 색
    outlineWidth: 3, // 한쪽 외곽선 두께(px): 0이면 외곽선 없음
    smoothing: 28, // 곡선 보정 범위(px): 12 = 약하게, 28 = 기본, 45 = 더 둥글게
    hold: 200,     // 마우스를 멈춘 뒤 모양을 유지하는 시간(ms)
    fade: 500,     // 서서히 사라지는 시간(ms)
  };
  let canvas, ctx, points = [], frame = 0, lastMove = 0;
  let width = 0, height = 0;

  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    points = [];
    if (ctx) ctx.clearRect(0, 0, width, height);
  };
  const resize = () => {
    reset();
    if (!canvas) return;
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  // 이동 거리를 기준으로 주변 궤적을 평균내 작은 떨림과 급한 모서리를 완화합니다.
  // 시간에 따른 힘을 가하지 않아 마우스를 멈추면 곡선도 그대로 유지됩니다.
  const smoothPath = () => {
    const distances = [0];
    for (let i = 1; i < points.length; i++) {
      distances[i] = distances[i - 1] + Math.hypot(
        points[i].x - points[i - 1].x, points[i].y - points[i - 1].y
      );
    }
    const total = distances[distances.length - 1];
    // 균등한 간격으로 다시 샘플링해 마우스 이벤트 빈도에 따른 차이를 줄입니다.
    const samples = [];
    const steps = Math.max(1, Math.ceil(total / 4));
    let segment = 1;
    for (let i = 0; i <= steps; i++) {
      const distance = total * i / steps;
      while (segment < points.length - 1 && distances[segment] < distance) segment++;
      const a = points[segment - 1], b = points[segment] || a;
      const span = (distances[segment] || 0) - distances[segment - 1];
      const t = span > 0 ? (distance - distances[segment - 1]) / span : 0;
      samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    return samples.map((point, i) => {
      // 양 끝점을 고정하고 끝에 가까울수록 보정 범위를 줄입니다.
      const radius = Math.min(threadSettings.smoothing, total * i / steps, total * (steps - i) / steps);
      if (radius <= 0) return point;
      let x = 0, y = 0, weight = 0;
      samples.forEach((sample, j) => {
        const w = Math.max(0, 1 - Math.abs(j - i) * total / steps / radius);
        x += sample.x * w;
        y += sample.y * w;
        weight += w;
      });
      return { x: x / weight, y: y / weight };
    });
  };
  const draw = (now) => {
    frame = 0;
    const idle = now - lastMove;
    if (idle >= threadSettings.hold + threadSettings.fade || document.hidden) {
      reset();
      return;
    }
    // 모양은 실제 마우스 이동으로만 바뀝니다. 정지 후에는 수축하거나 꿈틀대지 않습니다.
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, idle - threadSettings.hold) / threadSettings.fade);
    const curve = smoothPath();
    ctx.beginPath();
    ctx.moveTo(curve[0].x, curve[0].y);
    for (let i = 1; i < curve.length - 1; i++) {
      const point = curve[i], next = curve[i + 1];
      ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    const tail = curve[curve.length - 1];
    ctx.lineTo(tail.x, tail.y);
    // 같은 둥근 경로를 넓은 외곽선 → 기존 안쪽 색 순서로 그립니다.
    if (threadSettings.outlineWidth > 0) {
      ctx.strokeStyle = threadSettings.outlineColor;
      ctx.lineWidth = threadSettings.thickness + threadSettings.outlineWidth * 2;
      ctx.stroke();
    }
    ctx.strokeStyle = threadSettings.color;
    ctx.lineWidth = threadSettings.thickness;
    ctx.stroke();
    frame = requestAnimationFrame(draw);
  };
  const sync = () => {
    reset();
    if (motion.matches || !pointer.matches) {
      canvas?.remove();
      canvas = ctx = null;
      return;
    }
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'cursor-thread';
      canvas.setAttribute('aria-hidden', 'true');
      ctx = canvas.getContext('2d');
      if (!ctx) { canvas = null; return; }
      document.body.append(canvas);
    }
    resize();
  };
  window.addEventListener('pointermove', (event) => {
    if (!ctx || event.pointerType !== 'mouse') return;
    const point = { x: event.clientX, y: event.clientY };
    const head = points[0];
    if (head && Math.hypot(point.x - head.x, point.y - head.y) < 2) return;
    points.unshift(point);
    // 오래된 궤적을 거리 기준으로 잘라 속도가 달라도 최대 길이를 일정하게 유지합니다.
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1], current = points[i];
      const segment = Math.hypot(current.x - previous.x, current.y - previous.y);
      if (distance + segment >= threadSettings.length) {
        const ratio = (threadSettings.length - distance) / segment;
        points[i] = {
          x: previous.x + (current.x - previous.x) * ratio,
          y: previous.y + (current.y - previous.y) * ratio,
        };
        points.length = i + 1;
        break;
      }
      distance += segment;
    }
    lastMove = performance.now();
    if (!frame) frame = requestAnimationFrame(draw);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  window.addEventListener('resize', resize);
  motion.addEventListener('change', sync);
  pointer.addEventListener('change', sync);
  sync();
})();


// Native cursor images can lose detail when rasterized; render the SVG at display resolution.
(() => {
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cursor = document.createElement('img');
  cursor.className = 'graphic-cursor';
  cursor.alt = '';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.draggable = false;
  let ready = false;
  const hide = () => {
    cursor.classList.remove('is-visible');
    document.body.classList.remove('has-graphic-cursor');
  };
  cursor.addEventListener('load', () => { ready = true; });
  cursor.addEventListener('error', () => { ready = false; hide(); });
  cursor.src = new URL('../img/Cursor_graphic.svg', document.currentScript.src).href;
  document.body.append(cursor);
  window.addEventListener('pointermove', (event) => {
    if (!ready || !pointer.matches || event.pointerType !== 'mouse') { hide(); return; }
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, [contenteditable]:not([contenteditable="false"]), :disabled')) {
      hide();
      return;
    }
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    cursor.classList.add('is-visible');
    document.body.classList.add('has-graphic-cursor');
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', hide);
  pointer.addEventListener('change', hide);
})();
