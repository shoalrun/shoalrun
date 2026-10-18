const status = document.createElement('span');
status.className = 'copy-status';
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
document.body.append(status);

function initializeCode(root) {
for (const pre of root.querySelectorAll('article pre, .examples pre, .cookbook-chooser-result pre')) {
  if (pre.dataset.copyReady) continue;
  pre.dataset.copyReady = 'true';
  const code = pre.querySelector('code');
  if (!code) continue;
  const language = [...code.classList].find(name => name.startsWith('language-'))?.slice(9);
  const label = language ? language.toUpperCase() : 'Code';
  const existing = pre.parentElement?.classList.contains('code-block');
  const block = existing ? pre.parentElement : document.createElement('div');
  const toolbar = existing ? block.querySelector(':scope > .code-toolbar') : document.createElement('div');
  if (!existing) {
    block.className = 'code-block';
    toolbar.className = 'code-toolbar';
    const title = document.createElement('span');
    title.textContent = label;
    toolbar.append(title);
  }
  pre.tabIndex = 0;
  const heading = [...toolbar.querySelectorAll('.code-block-title, .code-block-filename')].map(item => item.textContent).filter(Boolean).join(' — ');
  pre.setAttribute('aria-label', `${heading || label} example; scroll to read`);
  if (!existing) {
    pre.before(block);
    block.append(toolbar, pre);
  }

  if (!navigator.clipboard?.writeText) continue;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'code-copy';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy code example');
  let reset;
  button.addEventListener('click', async () => {
    clearTimeout(reset);
    status.textContent = '';
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      button.textContent = 'Copied';
      status.textContent = 'Code example copied.';
      globalThis.shoalrunAnalytics?.track('code_copy', { language: language ?? 'text' }, block);
    } catch {
      button.textContent = 'Try again';
      status.textContent = 'Could not copy. Select the code and copy it manually.';
    }
    reset = setTimeout(() => { button.textContent = 'Copy'; }, 2500);
  });
  toolbar.append(button);
}

}
initializeCode(document);
document.addEventListener('shoalrun:content', event => initializeCode(event.detail.root));

// Mark the section being read in "On this page": the last heading above the top quarter of the window.
const tocLinks = [...document.querySelectorAll('.page-toc a[href^="#"]')];
const sections = tocLinks.map(link => [document.getElementById(decodeURIComponent(link.hash.slice(1))), link]).filter(([heading]) => heading);
let frame = 0;
let current;
const markSection = () => {
  frame = 0;
  const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
  let active = atEnd ? sections.at(-1)?.[1] : undefined;
  if (!active) for (const [heading, link] of sections) {
    if (heading.getBoundingClientRect().top > innerHeight / 4) break;
    active = link;
  }
  if (active === current) return;
  current?.removeAttribute('aria-current');
  active?.setAttribute('aria-current', 'location');
  current = active;
};
if (sections.length) {
  addEventListener('scroll', () => { frame ||= requestAnimationFrame(markSection); }, { passive: true });
  addEventListener('resize', () => { frame ||= requestAnimationFrame(markSection); }, { passive: true });
  markSection();
}

// Section links: an icon beside each heading copies the section's URL. Without clipboard access it is an ordinary link.
const linkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
for (const heading of document.querySelectorAll('article :is(h2, h3, h4)[id]')) {
  if (heading.closest('.doc-tabs, .examples')) continue;
  const link = document.createElement('a');
  link.className = 'heading-anchor';
  link.href = `#${encodeURIComponent(heading.id)}`;
  link.setAttribute('aria-label', `Copy link to section: ${heading.textContent.trim()}`);
  link.innerHTML = linkIcon;
  let reset;
  link.addEventListener('click', async event => {
    if (!navigator.clipboard?.writeText) return;
    event.preventDefault();
    history.replaceState(null, '', link.hash);
    clearTimeout(reset);
    try {
      await navigator.clipboard.writeText(location.href);
      link.dataset.copied = '';
      status.textContent = 'Link to section copied.';
      globalThis.shoalrunAnalytics?.track('section_link_copy', { targetHeadingId: heading.id }, heading);
    } catch {
      status.textContent = 'Could not copy. The link is in the address bar.';
    }
    reset = setTimeout(() => { delete link.dataset.copied; status.textContent = ''; }, 2000);
  });
  heading.append(link);
}
