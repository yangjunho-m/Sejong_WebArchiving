const prototypeDesigners = (count, start) => Array.from({ length: count }, (_, index) => ({
  id: start + index,
  nameKo: '김나윤',
  nameEn: 'Kim Nayun',
  instagram: '@kimnayun',
  email: 'nayun@naver.com',
  profileImage: '',
  works: [],
}));

const prototypeData = {
  industrial: prototypeDesigners(22, 1),
  visual: prototypeDesigners(44, 23),
};

async function loadDesigners() {
  try {
    const response = await fetch('../data/designers.json');
    if (!response.ok) throw new Error('Designer JSON was not found.');
    const data = await response.json();
    if (!Array.isArray(data.industrial) || !Array.isArray(data.visual)) throw new Error('Invalid designer data.');
    return groupDesignersByMajor([...data.industrial, ...data.visual]);
  } catch {
    return prototypeData;
  }
}

function groupDesignersByMajor(designers) {
  return designers.reduce((groups, designer) => {
    const major = String(designer.major || '').toLowerCase();
    if (major.includes('industrial')) {
      groups.industrial.push(designer);
    } else if (major.includes('visual')) {
      groups.visual.push(designer);
    }
    return groups;
  }, { industrial: [], visual: [] });
}

const detailNumber = Number(new URLSearchParams(location.search).get('designer'));

loadDesigners().then(async (data) => {
  const designers = [...data.industrial, ...data.visual];
  const designer = designers.find((item) => item.id === detailNumber) || designers[0];
  if (!designer) return;

  document.title = `${designer.nameEn || designer.nameKo} — BUTTON UP!`;
  document.querySelector('#profile-name-ko').textContent = designer.nameKo;
  document.querySelector('#profile-name-en').textContent = designer.nameEn.toUpperCase();
  const emailLink = document.querySelector('.profile-links a[href^="mailto:"]');
  emailLink.hidden = !designer.email;
  emailLink.href = `mailto:${designer.email}`;
  emailLink.textContent = 'EMAIL';
  document.querySelector('.profile-links a:last-child').hidden = !designer.instagram;
  document.querySelector('.profile-links a:last-child').href = designer.instagram.startsWith('@')
    ? `https://instagram.com/${designer.instagram.slice(1)}`
    : designer.instagram;
  document.querySelector('.profile-links a:last-child').textContent = 'INSTAGRAM';

  const projectResponse = await fetch('../data/projects.json');
  if (projectResponse.ok) {
    const { projects } = await projectResponse.json();
    const container = document.querySelector('.designer-works');
    container.replaceChildren(...projects.filter(p => designer.works.includes(p.id)).map(project => {
      const card = document.createElement('article'); card.className = 'detail-work-card';
      const link = document.createElement('a'); link.href = `work-detail.html?id=${encodeURIComponent(project.id)}`;
      const image = document.createElement('img'); image.src = project.thumbnail; image.alt = project.title || project.sourceTeam; image.loading = 'lazy';
      link.append(image);
      const tags = document.createElement('div'); tags.className = 'detail-tags';
      tags.append(...project.tags.map(text => { const span = document.createElement('span'); span.textContent = text; return span; }));
      const copy = document.createElement('div'); copy.className = 'detail-work-copy';
      if (project.title) { const heading = document.createElement('h2'); heading.textContent = project.title; copy.append(heading); }
      copy.append(tags);
      card.append(link, copy);
      if (project.description) { const description = document.createElement('p'); description.textContent = project.description; copy.append(description); }
      return card;
    }));
  }

  if (designer.profileImage) {
    const profile = document.querySelector('.profile-photo');
    profile.style.backgroundImage = `url(${designer.profileImage})`;
    profile.textContent = '';
  }
});
