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
  logo.href = sourceLogo.matches('a') ? sourceLogo.getAttribute('href') : '../';
  logo.setAttribute('aria-label', 'Button Up home');
  const logoImage = sourceLogo.querySelector('img').cloneNode(true);
  logoImage.src = new URL('../img/home/nav-logo.svg', document.currentScript.src).href;
  logo.append(logoImage);
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
    }
  };
  setVisible(false);
  syncDesktop();

  // Read the content beneath each link so split backgrounds remain legible.
  const updateMenuContrast = () => {
    if (!desktop.matches) return;
    nav.querySelectorAll('a').forEach((link) => {
      const rect = link.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
      let element = document.elementsFromPoint(x, y).find((item) => !bar.contains(item));
      let color = [255, 255, 255];
      while (element) {
        const style = getComputedStyle(element);
        const background = style.backgroundColor.match(/[\d.]+/g)?.map(Number);
        if (background && (background[3] ?? 1) > 0.5) {
          color = background;
          break;
        }
        // The page gradients start with their light surface color.
        const gradient = style.backgroundImage.match(/rgba?\(([^)]+)\)/);
        if (gradient) {
          color = gradient[1].match(/[\d.]+/g).map(Number);
          break;
        }
        element = element.parentElement;
      }
      const brightness = (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000;
      link.style.setProperty('--nav-text-color', brightness < 140 ? '#e4e4e4' : '#141414');
    });
  };

  const update = () => {
    queued = false;
    updateMenuContrast();
    const y = Math.max(0, window.scrollY);
    const wasInTopRegion = bar.classList.contains('is-at-top');
    const inTopRegion = desktop.matches && y <= bar.offsetHeight;
    bar.classList.toggle('is-at-top', inTopRegion);
    if (!desktop.matches || inTopRegion) {
      // 첫 화면에서는 문서와 같은 속도로 올라가며 배경 레이어를 숨깁니다.
      bar.style.transform = inTopRegion ? `translateY(${-y}px)` : '';
      setVisible(desktop.matches);
      anchorY = y;
      return;
    }
    bar.style.removeProperty('transform');
    if (wasInTopRegion) {
      setVisible(false);
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
