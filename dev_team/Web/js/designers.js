const designerCardTemplate = document.querySelector('#designer-card-template');

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
    return {
      industrial: prototypeData.industrial.map((designer) => data.industrial.find((item) => item.id === designer.id) || designer),
      visual: prototypeData.visual.map((designer) => data.visual.find((item) => item.id === designer.id) || designer),
    };
  } catch {
    return prototypeData;
  }
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
    container.append(...data[container.dataset.designerGroup].map(createCard));
  });
});
