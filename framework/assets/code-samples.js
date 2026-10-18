// Language switcher for API request samples. The build renders every language and
// leaves only the first (cURL) visible; this reveals the selector, switches the
// visible sample, and remembers the reader's choice across pages. Without
// JavaScript the cURL sample stays visible, matching the Markdown twin.
const key = 'shoalrun-code-language';
const read = () => { try { return localStorage.getItem(key); } catch { return null; } };
const write = value => { try { localStorage.setItem(key, value); } catch { /* storage may be blocked */ } };
const widgets = [...document.querySelectorAll('[data-code-samples]')];

if (widgets.length) {
  const apply = value => {
    if (!value) return;
    for (const widget of widgets) {
      const panes = [...widget.querySelectorAll('[data-code-language]')];
      const chosen = panes.some(pane => pane.dataset.codeLanguage === value) ? value : panes[0]?.dataset.codeLanguage;
      for (const pane of panes) pane.hidden = pane.dataset.codeLanguage !== chosen;
      const select = widget.querySelector('select');
      if (select) select.value = chosen;
    }
  };
  apply(read());
  for (const widget of widgets) {
    const select = widget.querySelector('select');
    if (!select || widget.querySelectorAll('[data-code-language]').length < 2) continue;
    select.hidden = false;
    select.addEventListener('change', () => { apply(select.value); write(select.value); });
  }
}
