(() => {
  const releaseAt = Date.parse('2026-10-30T18:00:00+09:00');
  let timer;
  // shortcut: CSS and the visitor's clock control visibility; use server-side asset access for a confidential embargo.
  const update = () => {
    clearTimeout(timer);
    const remaining = releaseAt - Date.now();
    document.documentElement.classList.toggle('artwork-pending', remaining > 0);
    if (remaining > 0) timer = setTimeout(update, Math.min(remaining, 2147483647));
  };
  update();
  window.addEventListener('pageshow', update);
  window.addEventListener('focus', update);
  document.addEventListener('visibilitychange', update);
})();
