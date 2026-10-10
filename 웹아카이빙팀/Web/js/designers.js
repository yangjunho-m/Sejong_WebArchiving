const designerCardTemplate = document.querySelector('#designer-card-template');

async function loadDesigners() {
  try {
    const response = await fetch('../data/designers.json');
    if (!response.ok) throw new Error('Designer JSON was not found.');
    const data = await response.json();
    if (!Array.isArray(data.industrial) || !Array.isArray(data.visual)) throw new Error('Invalid designer data.');
    return groupDesignersByMajor([...data.industrial, ...data.visual]);
  } catch (error) {
    console.error(error);
    return { industrial: [], visual: [] };
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

function shuffleDesigners(designers) {
  const shuffled = [...designers];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

function createCard(designer) {
  const card = designerCardTemplate.content.cloneNode(true);
  const link = card.querySelector('.designer-card');
  const [nameKo, nameEn] = link.querySelectorAll('strong, small');
  const [instagram, email] = link.querySelectorAll('b');

  link.href = `designer-detail.html?designer=${designer.id}`;
  nameKo.textContent = designer.nameKo;
  nameEn.textContent = designer.nameEn;
  instagram.textContent = designer.instagram;
  email.textContent = designer.email;
  return card;
}

loadDesigners().then((data) => {
  document.querySelectorAll('[data-designer-group]').forEach((container) => {
    const designers = data[container.dataset.designerGroup] || [];
    container.replaceChildren(...shuffleDesigners(designers).map(createCard));
  });
});
