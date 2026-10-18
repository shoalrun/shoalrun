// Temporary site-wide theme switcher, enabled by outputs.html.themeSwitcher. It loads in <head> right after the
// site's theme and palette stylesheets so a saved choice applies before first paint, then adds a small floating
// control once the page loads. The choice lasts across pages in this browser only. In `demo` mode the control
// stays hidden until a page is opened with ?theme-switcher, and ?theme-switcher=off hides it again.
(() => {
  const script = document.currentScript;
  const assetsRoot = new URL('./', script.src);
  const { presets, palettes, demo } = JSON.parse(script.dataset.themes);
  const root = document.documentElement;
  const key = 'shoalrun-theme-switcher';
  const unlockKey = 'shoalrun-theme-switcher-demo';
  const flag = new URLSearchParams(location.search).get('theme-switcher');
  let unlocked = false;
  try {
    if (flag === 'off') { localStorage.removeItem(unlockKey); localStorage.removeItem(key); }
    else if (flag !== null) localStorage.setItem(unlockKey, 'on');
    unlocked = localStorage.getItem(unlockKey) === 'on';
  } catch {}
  // A hidden demo switcher applies nothing, so readers who never unlock it always see the site's own theme.
  if (demo && !unlocked) return;
  const site = { preset: root.dataset.theme ?? 'shoal', palette: root.dataset.palette ?? 'kelp', masthead: root.dataset.masthead };
  const paletteLink = document.querySelector('link[data-theme-link="palette"]');
  let themeLink = document.querySelector('link[data-theme-link="theme"]');
  const siteThemeHref = themeLink?.getAttribute('href');
  const sitePaletteHref = paletteLink?.getAttribute('href');

  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (saved && presets.some(preset => preset.name === saved.preset) && [...palettes, 'custom'].includes(saved.palette)) return saved;
    } catch {}
    return null;
  };
  const write = choice => {
    try { choice ? localStorage.setItem(key, JSON.stringify(choice)) : localStorage.removeItem(key); } catch {}
  };

  // Swap the site's own links in place, so the page's <ThemePreview> treats the switched theme as the site theme.
  const apply = choice => {
    const own = !choice || (choice.preset === site.preset && choice.palette === site.palette);
    const preset = own ? site.preset : choice.preset;
    const themeHref = own ? siteThemeHref : preset === 'shoal' ? undefined : new URL(`themes/${preset}.css`, assetsRoot).pathname;
    if (themeHref) {
      if (!themeLink) {
        themeLink = Object.assign(document.createElement('link'), { rel: 'stylesheet' });
        themeLink.dataset.themeLink = 'theme';
        paletteLink?.before(themeLink);
      }
      themeLink.setAttribute('href', themeHref);
    } else {
      themeLink?.remove();
      themeLink = null;
    }
    if (paletteLink) paletteLink.setAttribute('href', own ? sitePaletteHref : new URL(`themes/palette-${choice.palette}.css`, assetsRoot).pathname);
    root.dataset.theme = preset;
    root.dataset.palette = own ? site.palette : choice.palette;
    const masthead = own ? site.masthead : presets.find(entry => entry.name === preset)?.masthead;
    if (masthead) root.dataset.masthead = masthead; else delete root.dataset.masthead;
  };

  apply(read());

  const build = () => {
    const current = read() ?? { preset: site.preset, palette: site.palette };
    const option = (value, selected, label = value) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`;
    const panel = document.createElement('details');
    panel.className = 'theme-switcher';
    panel.innerHTML = `
      <summary><span class="theme-switcher-dot" aria-hidden="true"></span><span class="theme-switcher-label"></span></summary>
      <form class="theme-switcher-body" aria-label="Theme switcher">
        <p>Preview only. The choice stays in this browser.</p>
        <label>Shape <select name="preset">${presets.map(preset => option(preset.name, current.preset)).join('')}</select></label>
        <label>Palette <select name="palette">${(site.palette === 'custom' ? [...palettes, 'custom'] : palettes).map(name => option(name, current.palette)).join('')}</select></label>
        <button type="button">Reset to site theme</button>
      </form>`;
    const form = panel.querySelector('form');
    const label = panel.querySelector('.theme-switcher-label');
    const show = () => { label.textContent = `${root.dataset.theme} · ${root.dataset.palette}`; };
    const change = choice => {
      write(choice.preset === site.preset && choice.palette === site.palette ? null : choice);
      apply(read());
      show();
    };
    form.elements.preset.addEventListener('change', () => {
      form.elements.palette.value = presets.find(entry => entry.name === form.elements.preset.value).palette;
      change({ preset: form.elements.preset.value, palette: form.elements.palette.value });
    });
    form.elements.palette.addEventListener('change', () => change({ preset: form.elements.preset.value, palette: form.elements.palette.value }));
    form.querySelector('button').addEventListener('click', () => {
      form.elements.preset.value = site.preset;
      form.elements.palette.value = site.palette;
      change(site);
    });
    form.addEventListener('submit', event => event.preventDefault());
    const style = document.createElement('style');
    style.textContent = `
.theme-switcher{position:fixed;left:1rem;bottom:1rem;z-index:50;max-width:calc(100vw - 2rem);border:1px solid var(--color-field-border);border-radius:var(--radius-panel);background:var(--color-surface);color:var(--color-ink);box-shadow:0 12px 32px -14px #0007;font:600 .78rem/1.4 var(--font-body)}
.theme-switcher>summary{display:flex;align-items:center;gap:.5rem;min-height:2.5rem;padding:.45rem .8rem;cursor:pointer;list-style:none}
.theme-switcher>summary::-webkit-details-marker{display:none}
.theme-switcher-dot{width:.75rem;height:.75rem;border-radius:50%;background:var(--color-accent);box-shadow:0 0 0 2px var(--color-surface),0 0 0 3px var(--color-field-border)}
.theme-switcher-body{display:grid;gap:.6rem;width:16rem;max-width:100%;padding:.2rem .8rem .8rem}
.theme-switcher-body p{margin:0;color:var(--color-muted);font-weight:500}
.theme-switcher-body label{display:grid;gap:.25rem;color:var(--color-section-heading)}
.theme-switcher-body select,.theme-switcher-body button{min-height:2.5rem;padding:.35rem .6rem;border:1px solid var(--color-field-border);border-radius:var(--radius-small);background:var(--color-field-surface);color:var(--color-text);font:inherit}
.theme-switcher-body button{background:var(--color-surface);color:var(--color-ink);cursor:pointer}
.theme-switcher-body button:hover{background:var(--color-nav-hover)}
@media print{.theme-switcher{display:none}}`;
    document.head.append(style);
    document.body.append(panel);
    show();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
