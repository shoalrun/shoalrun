// Links remain normal original-image links when modal dialogs are unavailable.
if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function') {
  let dialog, image, caption, origin;
  const prepare = () => {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'doc-image-viewer';
    dialog.setAttribute('aria-label', 'Expanded image');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'image-viewer-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close image');
    close.title = 'Close image';
    close.addEventListener('click', () => dialog.close());
    image = document.createElement('img');
    caption = document.createElement('p');
    caption.className = 'image-viewer-caption';
    dialog.append(close, image, caption);
    document.body.append(dialog);
    dialog.addEventListener('close', () => { if (origin?.isConnected) origin.focus(); });
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
  };
  for (const link of document.querySelectorAll('a[data-image-expand]')) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      prepare();
      origin = link;
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt ?? '';
      caption.textContent = link.closest('figure')?.querySelector('figcaption')?.textContent ?? image.alt;
      caption.hidden = !caption.textContent;
      dialog.showModal();
    });
  }
}
