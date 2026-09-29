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
