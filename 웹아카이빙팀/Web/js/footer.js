(() => {
  const footer = document.querySelector('footer#footer, footer#news');
  if (!footer) return;

  const isHome = footer.id === 'news';
  const assetPrefix = isHome ? '' : '../';
  const homeHref = isHome ? '#top' : '../';
  const linkClass = 'footer-link type-footer';
  const addressClass = 'footer-address type-footer';
  const addressContent = `
      <span>209, Neungdong-ro, Gwangjin-gu, Seoul, Korea</span>
      <a href="mailto:iddpt@sejong.ac.kr">iddpt@sejong.ac.kr</a>
      <span>+82 2 3408 3323</span>
    `;

  footer.classList.add('site-footer');

  footer.innerHTML = `
    <a class="footer-symbol" href="${homeHref}" aria-label="Button Up home">
      <picture><source media="(min-width: 701px)" srcset="${assetPrefix}img/home/sdi-logo.svg"><img src="${assetPrefix}img/${isHome ? 'home/sdi-logo.svg' : 'footer-logo.png'}" alt="Design Innovation"></picture>
    </a>
    <div class="${linkClass}"><a href="https://www.instagram.com/sdi.graduate/" target="_blank" rel="noopener noreferrer">INSTAGRAM</a></div>
    <div class="${linkClass}"><a href="https://www.behance.net/digitalsejong?locale=ko_KR" target="_blank" rel="noopener noreferrer">BEHANCE</a></div>
    <div class="${linkClass}"><a href="https://vimeo.com/sejongdesigninnovation" target="_blank" rel="noopener noreferrer">VIMEO</a></div>
    <address class="${addressClass}" lang="en">${addressContent}</address>
    <p class="copyright">&copy;2026. SEJONG UNIVERSITY DESIGN INNOVATION. ALL RIGHTS RESERVED.</p>
  `;
})();
