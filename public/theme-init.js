// Theme guard — apply saved mode before first paint to prevent FOUC
(function () {
  var mode = 'dark';
  try {
    mode = localStorage.getItem('veo-theme-mode') || 'dark';
  } catch {
    // Fallback safely to dark theme if storage is restricted
  }
  document.documentElement.setAttribute('data-theme', mode);
})();
