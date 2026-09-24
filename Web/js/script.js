document.querySelectorAll('.menu-toggle').forEach((menuToggle) => {
  const header = menuToggle.closest('header');
  if (!header) return;

  menuToggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('menu-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
  });
});
