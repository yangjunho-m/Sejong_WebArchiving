const categories = document.querySelectorAll('.work-category');
const panels = document.querySelectorAll('.work-section');

function shuffleCards(panel) {
  const grid = panel.querySelector('.project-grid');
  const original = [...grid.children];
  if (original.length < 2) return;
  const cards = [...original];
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
  }
  // Make every return visibly different, even if the shuffle repeats its order.
  if (cards.every((card, index) => card === original[index])) {
    cards.push(cards.shift());
  }
  grid.replaceChildren(...cards);
}

function showWork(targetId) {
  panels.forEach((panel) => {
    panel.hidden = panel.id !== targetId;
    if (!panel.hidden) shuffleCards(panel);
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

// Back/forward cache restores the DOM without running the initial fetch again.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) panels.forEach(shuffleCards);
});

showWork('identity');

const initialId = location.hash.slice(1);
if (initialId && document.getElementById(initialId)) {
  showWork(initialId);
}

fetch('../data/projects.json?v=20261020-mobile-webp').then((response) => {
  if (!response.ok) throw new Error('Project data could not be loaded.');
  return response.json();
}).then(({ projects }) => {
  panels.forEach((panel) => {
    const courseProjects = projects.filter((project) => (project.category === panel.id || project.workCategories?.includes(panel.id)) && project.thumbnail);
    // Start each fresh visit with a random order; returns and selections reshuffle it.
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
      const picture = document.createElement('picture');
      if (project.thumbnailMobile) {
        const source = document.createElement('source');
        source.media = '(max-width: 700px)';
        source.srcset = project.thumbnailMobile;
        picture.append(source);
      }
      picture.append(image);
      wrapper.append(picture);
      const overlay = document.createElement('div');
      overlay.className = 'project-hover';
      overlay.setAttribute('aria-hidden', 'true');
      const info = document.createElement('div');
      info.className = 'project-hover-info';
      const title = document.createElement('p');
      title.className = 'project-hover-title';
      title.textContent = project.title || project.sourceTeam;
      const names = document.createElement('div');
      names.className = 'project-hover-names';
      (project.designerNames || []).forEach((name) => {
        const person = document.createElement('p');
        person.textContent = name;
        names.append(person);
      });
      info.append(title, names);
      overlay.append(info);
      card.append(wrapper, overlay);
      return card;
    });
    panel.querySelector('.project-grid').replaceChildren(...cards);
  });
}).catch((error) => console.error(error));
