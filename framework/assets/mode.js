// Loaded in <head> without defer so a saved choice applies before first paint.
// data-mode on <html> overrides the reader's OS preference; without it, prefers-color-scheme decides.
(() => {
  const key = 'shoalrun-color-mode';
  const root = document.documentElement;
  const read = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const saved = read();
  if (saved === 'light' || saved === 'dark') root.dataset.mode = saved;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.mode ? root.dataset.mode === 'dark' : system.matches;

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.mode-toggle');
    if (!toggle) return;
    const sync = () => toggle.setAttribute('aria-pressed', String(isDark()));
    toggle.hidden = false;
    sync();
    system.addEventListener('change', sync);
    toggle.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.mode = next;
      try { localStorage.setItem(key, next); } catch {}
      sync();
    });
  });
})();
