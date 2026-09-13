const designerCardTemplate = document.querySelector('#designer-card-template');

document.querySelectorAll('[data-card-count]').forEach((container) => {
  const count = Number(container.dataset.cardCount);
  const cards = Array.from({ length: count }, () => designerCardTemplate.content.cloneNode(true));
  container.append(...cards);
});
