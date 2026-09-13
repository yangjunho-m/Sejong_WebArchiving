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
