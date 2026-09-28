const categories = document.querySelectorAll('.work-category');
const panels = document.querySelectorAll('.work-section');

function showWork(targetId) {
  panels.forEach((panel) => {
    panel.hidden = panel.id !== targetId;
  });
  categories.forEach((category) => {
    const isActive = category.getAttribute('href') === `#${targetId}`;
    category.classList.toggle('active', isActive);
    category.querySelector('.disc img').src = isActive
      ? '../img/work-img.png'
      : '../img/work-img2.png';
  });
}

categories.forEach((category) => {
  category.addEventListener('click', (event) => {
    event.preventDefault();
    const targetId = category.getAttribute('href').slice(1);
    showWork(targetId);
    history.replaceState(null, '', `#${targetId}`);
    document.getElementById(targetId).scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  });
});

const initialId = location.hash.slice(1);
if (initialId && document.getElementById(initialId)) {
  showWork(initialId);
}

document.querySelectorAll('.project-card').forEach((card, index) => {
  const title = card.querySelector('span')?.textContent?.trim() || 'PROJECT NAME';
  card.setAttribute('role', 'link');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${title} 상세 페이지 보기`);

  const openDetail = () => {
    const panel = card.closest('.work-section');
    const category = panel?.id || 'identity';
    const params = new URLSearchParams({
      project: title,
      category,
      index: String(index),
    });
    location.href = `work-detail.html?${params.toString()}`;
  };

  card.addEventListener('click', openDetail);
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetail();
    }
  });
});
