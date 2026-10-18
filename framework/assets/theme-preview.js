// Theme previewer: re-themes this page in place by swapping the preset and palette stylesheets.
// Nothing is saved; leaving the page or pressing Reset restores the site's own theme.
const widget = document.querySelector('[data-theme-preview]');
const assetsRoot = new URL('./', import.meta.url);

if (widget) {
  const { presets, palettes } = JSON.parse(widget.dataset.themePreview);
  const root = document.documentElement;
  const scheme = document.querySelector('meta[name="color-scheme"]')?.content ?? 'light';
  const site = { preset: root.dataset.theme ?? 'shoal', palette: root.dataset.palette ?? 'kelp', mode: scheme === 'light dark' ? 'system' : scheme };
  const attributes = { theme: root.dataset.theme, palette: root.dataset.palette, masthead: root.dataset.masthead, mode: root.dataset.mode };
  const originals = [...document.querySelectorAll('link[data-theme-link]')];
  // Preview stylesheets go before the site's fonts and project CSS, so its own fonts and overrides still apply.
  const anchor = document.querySelector('link[href$="/assets/fonts.css"], link[href$="/assets/project.css"]');
  const stylesheet = () => Object.assign(document.createElement('link'), { rel: 'stylesheet' });
  const themeLink = stylesheet();
  const paletteLink = stylesheet();
  const paletteNames = site.palette === 'custom' ? [...palettes, 'custom'] : palettes;
  const option = (value, label = value) => `<option value="${value}">${label}</option>`;

  const form = document.createElement('form');
  form.className = 'theme-preview-controls';
  form.setAttribute('aria-label', 'Theme previewer');
  form.innerHTML = `
    <p class="theme-preview-title">Try a theme on this page</p>
    <div class="theme-preview-fields">
      <label>Shape <select name="preset">${presets.map(preset => option(preset.name)).join('')}</select></label>
      <label>Palette <select name="palette">${paletteNames.map(name => option(name, name === 'custom' ? 'custom (this site)' : name)).join('')}</select></label>
      <label>Mode <select name="mode">${option('system')}${option('light')}${option('dark')}</select></label>
      <button type="button" data-action="reset">Reset</button>
    </div>
    <div class="theme-preview-config">
      <pre><code></code></pre>
      <button type="button" data-action="copy">Copy config</button>
    </div>
    <p class="theme-preview-status" role="status"></p>`;
  widget.prepend(form);
  const { preset: presetField, palette: paletteField, mode: modeField } = form.elements;
  const config = form.querySelector('code');
  const status = form.querySelector('.theme-preview-status');

  const yaml = ({ preset, palette, mode }) => {
    const lines = [];
    if (preset !== 'shoal') lines.push(`  preset: ${preset}`);
    if (palette === 'custom') lines.push('  # palette: keep your current custom palette');
    else if (palette !== presets.find(entry => entry.name === preset).palette) lines.push(`  palette: ${palette}`);
    if (mode !== 'light') lines.push(`  mode: ${mode}`);
    return lines.length ? `theme:\n${lines.join('\n')}` : '# The default theme needs no setting.';
  };

  // Keep the header's dark mode toggle, when present, in step with the previewed mode.
  const syncToggle = () => {
    const mode = root.dataset.mode ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.querySelector('.mode-toggle')?.setAttribute('aria-pressed', String(mode === 'dark'));
  };
  const show = (values, message) => {
    config.textContent = yaml(values);
    status.textContent = message;
    syncToggle();
  };

  // The header toggle (mode.js) can change data-mode at any time. Restore the reader's latest saved choice,
  // not the value from page load, and track which data-mode values this script set itself.
  let previewing = false;
  let expectedMode = root.dataset.mode;
  const readerMode = () => {
    try {
      const saved = localStorage.getItem('shoalrun-color-mode');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return attributes.mode;
  };

  const restore = announce => {
    themeLink.remove();
    paletteLink.remove();
    for (const link of originals) link.disabled = false;
    for (const [name, value] of Object.entries({ ...attributes, mode: readerMode() })) {
      if (value === undefined) delete root.dataset[name]; else root.dataset[name] = value;
    }
    expectedMode = root.dataset.mode;
    previewing = false;
    presetField.value = site.preset;
    paletteField.value = site.palette;
    modeField.value = site.mode;
    show(site, announce ? "Showing this site's own theme." : '');
  };

  const apply = () => {
    const values = { preset: presetField.value, palette: paletteField.value, mode: modeField.value };
    if (values.preset === site.preset && values.palette === site.palette && values.mode === site.mode) return restore(true);
    for (const link of originals) link.disabled = true;
    // Insert in cascade order, before project CSS so the site's own overrides still apply.
    if (values.preset === 'shoal') themeLink.remove();
    else { themeLink.href = new URL(`themes/${values.preset}.css`, assetsRoot).pathname; document.head.insertBefore(themeLink, anchor); }
    paletteLink.href = new URL(`themes/palette-${values.palette}.css`, assetsRoot).pathname;
    document.head.insertBefore(paletteLink, anchor);
    root.dataset.theme = values.preset;
    root.dataset.palette = values.palette;
    const masthead = presets.find(preset => preset.name === values.preset)?.masthead;
    if (masthead) root.dataset.masthead = masthead; else delete root.dataset.masthead;
    if (values.mode === 'system') delete root.dataset.mode; else root.dataset.mode = values.mode;
    expectedMode = root.dataset.mode;
    previewing = true;
    const modeLabel = values.mode === 'system' ? 'following your system setting' : `in ${values.mode} mode`;
    show(values, `Showing the ${values.preset} shape with the ${values.palette} palette, ${modeLabel}.`);
  };

  // When the reader uses the header toggle during a preview, follow it in the Mode menu and config.
  new MutationObserver(() => {
    if (root.dataset.mode === expectedMode) return;
    expectedMode = root.dataset.mode;
    if (!previewing) return;
    modeField.value = root.dataset.mode ?? 'system';
    show({ preset: presetField.value, palette: paletteField.value, mode: modeField.value }, `Switched to ${modeField.value} mode.`);
  }).observe(root, { attributes: true, attributeFilter: ['data-mode'] });

  presetField.addEventListener('change', () => {
    paletteField.value = presets.find(entry => entry.name === presetField.value).palette;
    apply();
  });
  paletteField.addEventListener('change', apply);
  modeField.addEventListener('change', apply);
  form.addEventListener('submit', event => event.preventDefault());
  form.querySelector('[data-action="reset"]').addEventListener('click', () => restore(true));
  form.querySelector('[data-action="copy"]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(config.textContent);
      status.textContent = 'Copied the theme config.';
    } catch {
      status.textContent = 'Copy failed. Select the config text and copy it manually.';
    }
  });
  restore(false);
}
