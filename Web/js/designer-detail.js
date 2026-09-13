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

const detailNumber = Number(new URLSearchParams(location.search).get('designer'));

loadDesigners().then((data) => {
  const designers = [...data.industrial, ...data.visual];
  const designer = designers.find((item) => item.id === detailNumber) || designers[0];
  if (!designer) return;

  document.title = `${designer.nameEn.toUpperCase()} — BUTTON UP!`;
  document.querySelector('#profile-name-ko').textContent = designer.nameKo;
  document.querySelector('#profile-name-en').textContent = designer.nameEn.toUpperCase();
  document.querySelector('.profile-links a[href^="mailto:"]').href = `mailto:${designer.email}`;
  document.querySelector('.profile-links a[href^="mailto:"]').textContent = designer.email;
  document.querySelector('.profile-links a:last-child').href = designer.instagram.startsWith('@')
    ? `https://instagram.com/${designer.instagram.slice(1)}`
    : designer.instagram;
  document.querySelector('.profile-links a:last-child').textContent = designer.instagram;

  if (designer.profileImage) {
    const profile = document.querySelector('.profile-photo');
    profile.style.backgroundImage = `url(${designer.profileImage})`;
    profile.textContent = '';
  }
});
