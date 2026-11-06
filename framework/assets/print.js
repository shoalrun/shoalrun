import { populatePrintView } from './print-view.js';

const buttons = document.querySelectorAll('[data-print-page]');
const status = document.querySelector('[data-print-status]');
let opened = [];
let printing = false;

const prepare = () => {
  if (printing) return;
  printing = true;
  opened = [...document.querySelectorAll('main details:not([open]), .examples details:not([open])')];
  for (const details of opened) details.open = true;
};
const restore = () => {
  for (const details of opened) details.open = false;
  opened = [];
  printing = false;
};
window.addEventListener('beforeprint', prepare);
window.addEventListener('afterprint', restore);
for (const button of buttons) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    if (status) status.textContent = '';
    let view;
    try { view = window.open('', '_blank'); } catch { /* Browser policy may refuse the new view. */ }
    if (!view) {
      button.disabled = false;
      if (status) status.textContent = 'Allow the print view to open, or use your browser’s Print command.';
      return;
    }
    const controller = new AbortController();
    let timer;
    try {
      view.document.title = 'Print preview';
      view.document.body.textContent = 'Preparing document…';
      const settingsUrl = new URL(button.dataset.printSettings, document.location.href);
      if (settingsUrl.origin !== document.location.origin) throw new Error('Print settings must be local');
      const work = async () => {
        const response = await fetch(settingsUrl.href, { credentials: 'same-origin', signal: controller.signal });
        if (!response.ok) throw new Error('Print theme could not load');
        const text = await response.text();
        if (text.length > 65536) throw new Error('Print settings are too large');
        const settings = JSON.parse(text);
        if (settings.schemaVersion !== 1 || typeof settings.stylesheet !== 'string') throw new Error('Invalid print settings');
        const metadata = JSON.parse(document.querySelector('[data-print-page-meta]').textContent);
        return populatePrintView(view, document, metadata, settings, controller.signal);
      };
      const print = await Promise.race([work(), new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('Print preparation timed out')); }, 20000);
      })]);
      clearTimeout(timer); timer = undefined;
      print();
    } catch {
      restore();
      const message = 'Could not prepare the print view. Use your browser’s Print command, or try again.';
      if (status) status.textContent = message;
      try { if (!view.closed) view.document.body.append(view.document.createTextNode(message)); } catch { /* The reader may have navigated away. */ }
    } finally { clearTimeout(timer); button.disabled = false; }
  });
}
