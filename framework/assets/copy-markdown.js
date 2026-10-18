const button = document.querySelector('[data-copy-markdown]');
const status = document.querySelector('[data-copy-markdown-status]');
const link = document.querySelector('.page-formats a');
if (button && status && link) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    if (button.getAttribute('aria-disabled') === 'true') return;
    button.setAttribute('aria-disabled', 'true');
    status.textContent = 'Copying Markdown…';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard');
      const response = await fetch(link.href);
      if (!response.ok) throw new Error('fetch');
      const markdown = await response.text();
      await navigator.clipboard.writeText(markdown);
      status.textContent = 'Markdown copied.';
      globalThis.shoalrunAnalytics?.track('markdown_copy', {}, button);
    } catch {
      status.textContent = 'Could not copy Markdown. Open Read as Markdown to copy it manually.';
    } finally {
      button.removeAttribute('aria-disabled');
    }
  });
}
