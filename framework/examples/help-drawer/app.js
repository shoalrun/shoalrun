// The application owns presentation and routing. Exported HTML comes from this
// project's trusted build, not arbitrary user input or a third-party URL.
const manifest = await fetch('/help/manifest.json').then(response => {
  if (!response.ok) throw new Error('Build and mount the help export first.');
  return response.json();
}).then(manifest => {
  if (manifest.kind !== 'shoalrun-content-export' || manifest.schemaVersion !== 1) throw new Error('Unsupported help export.');
  if (manifest.review.status !== 'ok') throw new Error('Approve API content before using this export.');
  return manifest;
});
const drawer = document.querySelector('#drawer');
const content = document.querySelector('#content');
let current;
let request = 0;
async function openHelp(id, fragment) {
  const document = manifest.documents.find(document => document.id === id);
  if (!document?.representations.html) throw new Error(`No HTML help for ${id}`);
  const ticket = ++request;
  const response = await fetch(manifest.publicBase + document.representations.html.path);
  if (!response.ok) throw new Error(`Cannot load help for ${id}`);
  const html = await response.text();
  if (ticket !== request) return;
  current = document;
  content.innerHTML = html;
  drawer.hidden = false;
  if (fragment) {
    const anchor = document.representations.html.anchors.find(anchor => anchor.id === fragment || anchor.exportedId === fragment);
    if (anchor) content.querySelector(`#${CSS.escape(anchor.exportedId)}`)?.scrollIntoView();
  } else drawer.scrollTop = 0;
}
document.querySelectorAll('[data-help]').forEach(button => button.addEventListener('click', () => openHelp(button.dataset.help).catch(showError)));
content.addEventListener('click', event => {
  const anchor = event.target.closest('a[data-export-link]');
  if (!anchor) return;
  const link = current?.representations.html.links.find(link => link.key === anchor.dataset.exportLink);
  if (link?.kind !== 'document') return; // Canonical fallbacks open as ordinary links.
  event.preventDefault();
  openHelp(link.documentId, link.fragment).catch(showError);
});
document.querySelector('#close').addEventListener('click', () => { request++; drawer.hidden = true; });
function showError(error) { content.textContent = error.message; drawer.hidden = false; }
