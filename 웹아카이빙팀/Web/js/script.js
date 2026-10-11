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

  // Sample the rendered image crop, then choose one color for the whole menu.
  const imageSamples = new WeakMap();
  let lastContrastCheck = -Infinity;
  let contrastTimer;
  const colorValues = (value) => value.match(/[\d.]+/g)?.map(Number);
  const offset = (position, space) => {
    if (position.endsWith('%')) return space * parseFloat(position) / 100;
    if (position === 'center') return space / 2;
    if (position === 'right' || position === 'bottom') return space;
    return parseFloat(position) || 0;
  };
  const imageColorAt = (image, x, y) => {
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) return null;
    const source = image.currentSrc || image.src;
    let sample = imageSamples.get(image);
    if (!sample || sample.source !== source) {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        sample = { source, width:canvas.width, height:canvas.height,
          data:context.getImageData(0, 0, canvas.width, canvas.height).data };
      } catch {
        // If pixels are unavailable, fall back to the existing surface-color reading.
        sample = { source, data:null };
      }
      imageSamples.set(image, sample);
    }
    if (!sample.data) return null;
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const style = getComputedStyle(image);
    let width = rect.width, height = rect.height;
    if (style.objectFit !== 'fill') {
      let scale = style.objectFit === 'cover'
        ? Math.max(width / image.naturalWidth, height / image.naturalHeight)
        : Math.min(width / image.naturalWidth, height / image.naturalHeight);
      if (style.objectFit === 'none') scale = 1;
      if (style.objectFit === 'scale-down') scale = Math.min(1, scale);
      width = image.naturalWidth * scale;
      height = image.naturalHeight * scale;
    }
    const [px = '50%', py = '50%'] = style.objectPosition.split(' ');
    const u = (x - rect.left - offset(px, rect.width - width)) / width;
    const v = (y - rect.top - offset(py, rect.height - height)) / height;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
    const index = (Math.floor(v * sample.height) * sample.width + Math.floor(u * sample.width)) * 4;
    return [sample.data[index], sample.data[index + 1], sample.data[index + 2], sample.data[index + 3] / 255];
  };
  const backdropAt = (x, y) => {
    const layers = [];
    const stack = document.elementsFromPoint(x, y).filter((element) =>
      !bar.contains(element) && !element.closest('.graphic-cursor'));
    for (const element of stack) {
      if (element instanceof HTMLImageElement) {
        const pixel = imageColorAt(element, x, y);
        if (pixel) layers.push(pixel);
      }
      const style = getComputedStyle(element);
      const gradient = style.backgroundImage.match(/rgba?\(([^)]+)\)/);
      if (gradient) layers.push(colorValues(gradient[0]));
      const background = colorValues(style.backgroundColor);
      if (background && (background[3] ?? 1) > 0) layers.push(background);
      if (layers.some((color) => (color[3] ?? 1) >= 1)) break;
    }
    return layers.reduceRight((back, front) => {
      const alpha = front[3] ?? 1;
      return front.slice(0, 3).map((value, i) => value * alpha + back[i] * (1 - alpha));
    }, [255, 255, 255]);
  };
  const updateMenuContrast = (force = false) => {
    if (!desktop.matches || !shown) return;
    const now = performance.now();
    if (!force && now - lastContrastCheck < 80) return;
    lastContrastCheck = now;
    const luminances = [];
    nav.querySelectorAll('a').forEach((link) => {
      const rect = link.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= innerHeight) return;
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 5; column++) {
          const rgb = backdropAt(rect.left + rect.width * (column + .5) / 5,
            Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height * (row + .5) / 3)));
          const linear = rgb.map((value) => {
            const channel = value / 255;
            return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
          });
          luminances.push(linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722);
        }
      }
    });
    if (!luminances.length) return;
    // The median favors the predominant surface instead of a few bright highlights.
    luminances.sort((a, b) => a - b);
    const representative = luminances[Math.floor(luminances.length / 2)];
    const threshold = nav.dataset.contrast ? (nav.dataset.contrast === 'light' ? .20 : .14) : .17;
    const light = representative < threshold;
    nav.dataset.contrast = light ? 'light' : 'dark';
    // All links share the decision, including hover/current-page states.
    nav.querySelectorAll('a').forEach((link) => link.style.setProperty('--nav-text-color', light ? '#e4e4e4' : '#141414'));
  };

  const update = () => {
    queued = false;
    const y = Math.max(0, window.scrollY);
    const wasInTopRegion = bar.classList.contains('is-at-top');
    const inTopRegion = desktop.matches && y <= bar.offsetHeight;
    bar.classList.toggle('is-at-top', inTopRegion);
    if (!desktop.matches || inTopRegion) {
      // 첫 화면에서는 문서와 같은 속도로 올라가며 배경 레이어를 숨깁니다.
      bar.style.transform = inTopRegion ? `translateY(${-y}px)` : '';
      setVisible(desktop.matches);
      anchorY = y;
      updateMenuContrast();
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
    updateMenuContrast();
  };
  window.addEventListener('scroll', () => {
    clearTimeout(contrastTimer);
    contrastTimer = setTimeout(() => updateMenuContrast(true), 120);
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  const refresh = () => { lastContrastCheck = -Infinity; syncDesktop(); update(); };
  document.addEventListener('load', () => updateMenuContrast(true), true);
  bar.addEventListener('transitionend', () => updateMenuContrast(true));
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

// One shared mobile header, including both detail screens.
(() => {
  const source = document.querySelector('.site-nav');
  if (!source) return;
  const prefix = new URL('../', document.currentScript.src);
  const header = document.createElement('header');
  header.className = 'mobile-global-header';
  const logo = document.createElement('a');
  logo.className = 'mobile-global-logo';
  logo.href = prefix.href;
  logo.setAttribute('aria-label', 'Button Up home');
  const image = document.createElement('img');
  image.src = new URL('img/mobile/nav-logo.svg', prefix).href;
  image.alt = 'BUTTON UP!';
  logo.append(image);
  const button = document.createElement('button');
  button.className = 'mobile-global-toggle';
  button.type = 'button';
  button.setAttribute('aria-label', '메뉴 열기');
  button.setAttribute('aria-expanded', 'false');
  const icon = document.createElement('img');
  icon.src = new URL('img/mobile/menu.svg', prefix).href;
  icon.alt = '';
  button.append(icon);
  const nav = source.cloneNode(true);
  nav.className = 'mobile-global-nav';
  nav.removeAttribute('id');
  nav.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  nav.hidden = true;
  nav.inert = false;
  button.addEventListener('click', () => {
    const open = nav.hidden;
    nav.hidden = !open;
    header.classList.toggle('mobile-menu-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });
  header.append(logo, button, nav);
  document.body.append(header);
})();
