const params = new URLSearchParams(location.search);
const projectName = params.get('project') || 'PROJECT NAME';
const categoryName = params.get('category') || 'identity';

const title = document.getElementById('project-name');
const heroTitle = document.getElementById('project-hero-title');
const authors = document.getElementById('project-authors');

const authorByCategory = {
  identity: ['홍길동'],
  digital: ['홍길동', '홍길동'],
  product: ['홍길동', '홍길동', '홍길동'],
  system: ['홍길동'],
};

if (title) {
  title.textContent = projectName;
}

if (heroTitle) {
  heroTitle.textContent = projectName === 'PROJECT NAME' ? 'Single-Use Planters' : projectName;
}

if (authors) {
  const authorList = authorByCategory[categoryName] || authorByCategory.identity;
  authors.dataset.count = String(authorList.length);
  authors.replaceChildren(...authorList.map((name) => {
    const block = document.createElement('div');
    block.className = 'work-detail-author-block';

    const author = document.createElement('p');
    author.className = 'work-detail-author';
    author.textContent = name;

    const links = document.createElement('p');
    links.className = 'work-detail-links';
    links.textContent = 'EMAIL   INSTAGRAM';

    block.append(author, links);
    return block;
  }));
}

const backButton = document.querySelector('.work-detail-back');
if (backButton) {
  backButton.href = `work.html#${categoryName}`;
}
