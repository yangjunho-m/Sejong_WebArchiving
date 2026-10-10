const params = new URLSearchParams(location.search);
const title = document.getElementById('project-name');
const authors = document.getElementById('project-authors');
const submittedProjectId = params.get('id');
  Promise.all([
    fetch('../data/projects.json').then((response) => response.json()),
    fetch('../data/designers.json').then((response) => response.json()),
  ]).then(([{ projects }, data]) => {
    const project = submittedProjectId
      ? projects.find((item) => item.id === submittedProjectId)
      : projects.find((item) => item.category === (params.get('category') || 'identity'));
    if (!project) return;
    const designers = [...data.industrial, ...data.visual];
    const displayTitle = project.title || project.sourceTeam;
    title.textContent = displayTitle;
    document.title = `${displayTitle} — BUTTON UP!`;
    const sourceCategory = project.workCategories?.includes(params.get('category')) ? params.get('category') : project.workCategories?.[0] || project.category;
    document.querySelector('.work-detail-back').href = sourceCategory === 'fusion' ? 'designers.html' : `work.html#${sourceCategory}`;
    document.querySelector('.work-detail-tags').replaceChildren(...project.tags.map((tag) => {
      const span = document.createElement('span'); span.textContent = tag; return span;
    }));
    const description = document.querySelector('.work-detail-desc');
    description.textContent = project.description;
    description.hidden = !project.description;
    authors.dataset.count = String(project.designerNames.length);
    authors.replaceChildren(...project.designerNames.map((name) => {
      const designer = designers.find((d) => project.designerIds.includes(d.id) && d.nameKo === name);
      const block = document.createElement('div'); block.className = 'work-detail-author-block';
      const author = document.createElement(designer ? 'a' : 'p');
      author.className = 'work-detail-author'; author.textContent = name;
      if (designer) author.href = `designer-detail.html?designer=${designer.id}`;
      const links = document.createElement('p'); links.className = 'work-detail-links';
      if (designer?.email) { const link = document.createElement('a'); link.href = `mailto:${designer.email}`; link.textContent = 'EMAIL'; links.append(link); }
      if (designer?.instagram?.startsWith('@')) { const link = document.createElement('a'); link.href = `https://www.instagram.com/${designer.instagram.slice(1)}/`; link.textContent = 'INSTAGRAM'; link.target = '_blank'; link.rel = 'noopener noreferrer'; links.append(link); }
      block.append(author, links); return block;
    }));
    const article = document.querySelector('.project-detail-article');
    article.classList.add('submitted-project');
    article.replaceChildren(...project.images.map((src, index) => {
      const image = document.createElement('img'); image.src = src; image.alt = `${displayTitle} 작품 상세 이미지 ${index + 1}`; image.loading = index ? 'lazy' : 'eager'; return image;
    }), ...project.videos.map((src) => {
      const video = document.createElement('video'); video.src = src; video.controls = true; video.preload = 'metadata'; video.playsInline = true;
      if (project.videoPlayback) {
        video.controls = project.videoPlayback.controls !== false;
        video.muted = Boolean(project.videoPlayback.muted);
        video.defaultMuted = video.muted;
        video.loop = Boolean(project.videoPlayback.loop);
        video.autoplay = Boolean(project.videoPlayback.autoplay);
      }
      return video;
    }));
  }).catch((error) => console.error(error));
