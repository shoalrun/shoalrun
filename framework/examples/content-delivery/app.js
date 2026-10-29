import { openManifestContentSource, openRestContentSource, mountContent } from '/shoalrun/content-delivery.js';

// The app owns interaction. A future server-backed source can supply this same
// snapshot interface; the drawer does not depend on manifest layout or filenames.
const lifetime = new AbortController();
const source = new URLSearchParams(location.search).get('delivery') === 'rest'
  ? openRestContentSource({ baseUrl: '/content/v1', publication: { channel: 'production', version: 'current', language: 'en' }, signal: lifetime.signal })
  : openManifestContentSource({ manifestUrl: '/help/releases/demo/manifest.json', signal: lifetime.signal });
const drawer = document.querySelector('#drawer');
const container = document.querySelector('#help-content');
let generation = 0;
let pending;
let mounted;
let opener;
let snapshot;
let disposed = false;
const notes = [];

async function openHelp(ref, fragment) {
  if (disposed) return;
  const ticket = ++generation;
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  try {
    const content = await source;
    if (ticket !== generation) return;
    const result = await content.get(ref, { format: 'html', signal: controller.signal });
    if (ticket !== generation) return;
    mounted?.unmount();
    mounted = mountContent(container, result);
    drawer.hidden = false;
    const anchor = fragment && mounted.anchors.find(item => item.id === fragment || item.exportedId === fragment);
    const target = anchor ? container.querySelector(`#${CSS.escape(anchor.exportedId)}`) : container.querySelector('h1,h2,h3') ?? container;
    // Stable aliases precede the visible heading. Focus the heading rather than
    // an empty aria-hidden alias so keyboard and screen-reader users get context.
    const focus = target?.getAttribute('aria-hidden') === 'true' && target.nextElementSibling?.matches('h1,h2,h3,h4,h5,h6')
      ? target.nextElementSibling : target;
    if (focus) { focus.tabIndex = -1; focus.focus({ preventScroll: true }); }
    if (anchor) focus?.scrollIntoView();
    else drawer.scrollTop = 0;
  } catch (error) {
    if (ticket !== generation || controller.signal.aborted) return;
    mounted?.unmount();
    mounted = undefined;
    container.textContent = `Help could not be loaded: ${error.message}`;
    drawer.hidden = false;
    document.querySelector('#close').focus();
  }
}
function closeHelp() {
  ++generation;
  pending?.abort();
  mounted?.unmount();
  mounted = undefined;
  drawer.hidden = true;
  opener?.focus();
}
for (const [id, ref] of [
  ['page-help', { kind: 'page', documentId: 'guide.billing' }],
  ['section-help', { kind: 'section', documentId: 'guide.billing', sectionId: 'refunds' }],
]) document.getElementById(id).addEventListener('click', event => { opener = event.currentTarget; openHelp(ref); });
container.addEventListener('click', event => {
  const anchor = event.target.closest('a[data-export-link]');
  const link = anchor && mounted?.links.find(item => item.key === anchor.dataset.exportLink);
  if (link?.kind !== 'resource') return;
  event.preventDefault();
  openHelp(link.ref, link.fragment);
});
document.querySelector('#close').addEventListener('click', closeHelp);
drawer.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeHelp(); } });

source.then(async content => {
  if (disposed) { content.dispose(); return; }
  snapshot = content;
  const result = await content.get({ kind: 'snippet', id: 'billing.refund-window' }, { format: 'html', signal: lifetime.signal });
  if (disposed) return;
  for (const id of ['plan-note', 'invoice-note']) notes.push(mountContent(document.getElementById(id), result));
}).catch(error => { if (!disposed) document.querySelector('#status').textContent = `Help could not be loaded: ${error.message}`; });
window.addEventListener('pagehide', event => {
  // A back/forward-cache entry resumes this same module and snapshot. Preserve
  // its state while the browser freezes it; only tear down a discarded page.
  if (event.persisted) return;
  disposed = true;
  ++generation;
  lifetime.abort();
  pending?.abort();
  mounted?.unmount();
  notes.forEach(note => note.unmount());
  snapshot?.dispose();
});
