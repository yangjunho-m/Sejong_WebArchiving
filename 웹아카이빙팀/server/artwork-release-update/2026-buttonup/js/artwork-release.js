(() => {
  const releaseAt = Date.parse('2026-10-30T18:00:00+09:00');
  const artworkSelector = '.project-card, .detail-work-card a, .project-detail-article';
  const lockedElements = new Set();
  let timer;
  let pending;
  const syncInteraction = () => {
    if (pending) {
      document.querySelectorAll(artworkSelector).forEach(element => {
        if (!element.inert) {
          element.inert = true;
          lockedElements.add(element);
        }
      });
    } else {
      lockedElements.forEach(element => { element.inert = false; });
      lockedElements.clear();
    }
  };
  // Artwork cards are populated asynchronously after this head script runs.
  const observer = new MutationObserver(syncInteraction);
  // Visibility follows the visitor's clock, as in the original release schedule.
  const update = () => {
    clearTimeout(timer);
    const remaining = releaseAt - Date.now();
    pending = remaining > 0;
    document.documentElement.classList.toggle('artwork-pending', pending);
    if (pending) observer.observe(document.documentElement, { childList:true, subtree:true });
    else observer.disconnect();
    syncInteraction();
    if (pending) timer = setTimeout(update, Math.min(remaining, 2147483647));
  };
  update();
  window.addEventListener('pageshow', update);
  window.addEventListener('focus', update);
  document.addEventListener('visibilitychange', update);
})();
