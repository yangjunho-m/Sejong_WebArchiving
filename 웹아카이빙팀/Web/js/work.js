const categories = document.querySelectorAll('.work-category');
const panels = document.querySelectorAll('.work-section');

function showWork(targetId) {
  panels.forEach((panel) => {
    panel.hidden = panel.id !== targetId;
  });
  categories.forEach((category) => {
    const isActive = category.getAttribute('href') === `#${targetId}`;
    category.classList.toggle('active', isActive);
    category.setAttribute('aria-current', isActive ? 'true' : 'false');
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

showWork('identity');

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

// Replace design placeholders with the submitted course records.
fetch('../data/projects.json').then((response) => {
  if (!response.ok) throw new Error('Project data could not be loaded.');
  return response.json();
}).then(({ projects }) => {
  panels.forEach((panel) => {
    const courseProjects = projects.filter((project) => (project.category === panel.id || project.workCategories?.includes(panel.id)) && project.thumbnail);
    // Shuffle each course once per page load, keeping its order while switching tabs.
    for (let index = courseProjects.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [courseProjects[index], courseProjects[randomIndex]] = [courseProjects[randomIndex], courseProjects[index]];
    }
    const cards = courseProjects.map((project) => {
      const card = document.createElement('a');
      card.className = 'project-card';
      card.href = `work-detail.html?id=${encodeURIComponent(project.id)}${project.workCategories ? `&category=${encodeURIComponent(panel.id)}` : ''}`;
      card.setAttribute('aria-label', `${project.title || project.sourceTeam} 작품 상세 보기`);
      const image = document.createElement('img');
      image.src = project.thumbnail;
      image.alt = project.title || `${project.sourceTeam} 작품 썸네일`;
      image.loading = 'lazy';
      const wrapper = document.createElement('div');
      wrapper.className = 'project-image';
      wrapper.append(image);
      card.append(wrapper);
      return card;
    });
    panel.querySelector('.project-grid').replaceChildren(...cards);
  });
}).catch((error) => console.error(error));
