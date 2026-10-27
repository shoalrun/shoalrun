const navigation = document.querySelector('.side');
const tree = navigation?.querySelector('.nav-tree');
const search = navigation?.querySelector('.nav-search');
const filter = navigation?.querySelector('#nav-filter');
if (filter) filter.placeholder = 'Find a page…';
const mobile = matchMedia('(max-width: 72rem)');
const sections = document.querySelector('.section-nav');
const outline = document.querySelector('.page-toc');
const outlineSlot = document.querySelector('.mobile-outline-slot');
const outlineHome = outline ? document.createComment('Page outline') : null;
outline?.before(outlineHome);
const menuLink = document.querySelector('.mobile-menu');
let openMenu;

// Keep one copy of each navigation region. The static document stays readable
// without scripts; only the enhanced mobile UI moves navigation into a dialog.
if (menuLink && typeof HTMLDialogElement !== 'undefined' && HTMLDialogElement.prototype.showModal) {
  const regions = [sections, navigation].filter(Boolean).map(node => {
    const home = document.createComment('Navigation region');
    node.before(home);
    return { node, home };
  });
  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = menuLink.className;
  menu.textContent = 'Menu';
  menu.setAttribute('aria-haspopup', 'dialog');
  menu.setAttribute('aria-controls', 'documentation-menu');
  menu.setAttribute('aria-expanded', 'false');
  menuLink.replaceWith(menu);
  const dialog = document.createElement('dialog');
  dialog.id = 'documentation-menu';
  dialog.className = 'navigation-dialog';
  dialog.setAttribute('aria-label', 'Documentation navigation');
  const header = document.createElement('div');
  header.className = 'navigation-dialog-header';
  const title = document.createElement('strong');
  title.textContent = 'Documentation';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.setAttribute('aria-label', 'Close navigation');
  close.autofocus = true;
  header.append(title, close);
  dialog.append(header);
  document.body.append(dialog);
  let readingPosition;
  let opener;
  const finishClose = (restoreFocus = true) => {
    if (!readingPosition) return;
    document.documentElement.classList.remove('navigation-open');
    menu.setAttribute('aria-expanded', 'false');
    if (restoreFocus) (opener?.isConnected ? opener : menu).focus({ preventScroll: true });
    window.scrollTo({ ...readingPosition, behavior: 'instant' });
    readingPosition = null;
    opener = null;
  };
  const closeMenu = (restoreFocus = true) => {
    if (dialog.open) dialog.close();
    finishClose(restoreFocus);
  };
  openMenu = (trigger = menu) => {
    if (!mobile.matches || dialog.open) return;
    readingPosition = { left: scrollX, top: scrollY };
    opener = trigger;
    document.documentElement.classList.add('navigation-open');
    menu.setAttribute('aria-expanded', 'true');
    dialog.showModal();
    // Reveal the current page without moving the underlying article.
    const current = tree?.querySelector('[aria-current="page"]');
    if (current) {
      const top = header.getBoundingClientRect().bottom;
      const rect = current.getBoundingClientRect();
      if (rect.top < top || rect.bottom > innerHeight) dialog.scrollTop += rect.top - top - 16;
    }
  };
  menu.addEventListener('click', () => openMenu(menu));
  close.addEventListener('click', () => closeMenu());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  dialog.addEventListener('close', () => { if (!dialog.open) finishClose(); });
  dialog.addEventListener('keydown', event => {
    // Filtering consumes the first Escape; the next closes navigation.
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      closeMenu();
    }
  });
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom);
  };
  let backdropPress = false;
  dialog.addEventListener('pointerdown', event => { backdropPress = outside(event); });
  dialog.addEventListener('click', event => {
    if (backdropPress && outside(event)) closeMenu();
    backdropPress = false;
  });
  const updateMenu = () => {
    const active = document.activeElement;
    const inRegion = regions.some(({ node }) => node.contains(active));
    if (mobile.matches) {
      for (const { node } of regions) {
        dialog.append(node);
        const disclosure = node.querySelector(':scope > details');
        if (disclosure) disclosure.open = true;
      }
      // Do not hide a focused desktop control when shrinking the viewport.
      if (inRegion) {
        openMenu(menu);
        const target = active.matches('.nav-disclosure > summary') ? close : active;
        target.focus({ preventScroll: true });
      }
    } else {
      closeMenu(false);
      for (const { node, home } of regions) {
        home.after(node);
        const disclosure = node.querySelector(':scope > details');
        if (disclosure) disclosure.open = true;
      }
      if (inRegion) active.focus({ preventScroll: true });
      else if (active === menu || dialog.contains(active)) (navigation ?? sections).focus({ preventScroll: true });
    }
  };
  updateMenu();
  mobile.addEventListener('change', updateMenu);
}

const updateOutline = () => {
  if (!outline || !outlineSlot) return;
  const active = document.activeElement;
  const focused = outline.contains(active);
  if (mobile.matches) outlineSlot.append(outline);
  else outlineHome.after(outline);
  outline.querySelector('details').open = !mobile.matches || focused;
  if (focused) active.focus({ preventScroll: true });
};
updateOutline();
mobile.addEventListener('change', updateOutline);

// Real fragment links remain the no-script fallback. Desktop skip links reveal
// individually on focus, without inserting a new row into the reading layout.
for (const link of document.querySelectorAll('[data-region-jump], [data-region-return]')) {
  link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const region = document.getElementById(link.hash.slice(1));
    if (!region) return;
    if (region === navigation && mobile.matches && openMenu) {
      event.preventDefault();
      openMenu(link);
      return;
    }
    const disclosure = region.querySelector(':scope > details');
    if (disclosure) disclosure.open = true;
    region.focus({ preventScroll: true });
  });
}
outline?.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || event.defaultPrevented || !mobile.matches) return;
  const disclosure = outline.querySelector('details');
  if (!disclosure.open) return;
  event.preventDefault();
  disclosure.querySelector('summary').focus({ preventScroll: true });
  disclosure.open = false;
});
outline?.addEventListener('click', event => {
  const link = event.target.closest('li a[href^="#"]');
  if (!link || !mobile.matches || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (!heading) return;
  // Collapse before the native anchor scroll, so the destination does not move.
  outline.querySelector('details').open = false;
  if (!heading.hasAttribute('tabindex')) {
    heading.tabIndex = -1;
    heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
  }
  heading.focus({ preventScroll: true });
});

if (tree && search && filter) {
  search.hidden = false;
  const entries = [...tree.querySelectorAll('.nav-entry')];
  const groups = [...tree.querySelectorAll('.nav-group')];
  const status = search.querySelector('.nav-filter-status');
  let beforeFilter = null;

  const current = tree.querySelector('[aria-current="page"]');
  if (current && !mobile.matches) {
    const visibleTop = navigation.querySelector('.nav-tools').getBoundingClientRect().bottom + 8;
    const visibleBottom = navigation.getBoundingClientRect().bottom - 8;
    const position = current.getBoundingClientRect();
    const group = current.closest('.nav-group')?.querySelector(':scope > details > summary');
    const groupTop = group?.getBoundingClientRect().top ?? position.top;
    const canShowGroup = position.bottom - groupTop <= visibleBottom - visibleTop;
    if (position.top < visibleTop || position.bottom > visibleBottom || (canShowGroup && groupTop < visibleTop)) {
      const targetTop = canShowGroup ? groupTop : position.bottom > visibleBottom ? position.bottom - (visibleBottom - visibleTop) : position.top;
      navigation.scrollTop += targetTop - visibleTop;
    }
  }

  const update = () => {
    const terms = filter.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length && !beforeFilter) beforeFilter = new Map(groups.map(group => [group, group.querySelector(':scope > details').open]));
    let found = 0;
    for (const entry of entries) {
      const haystack = entry.dataset.search.toLocaleLowerCase();
      const match = entry.dataset.readerHidden !== 'true' && terms.every(term => haystack.includes(term));
      entry.hidden = !match;
      if (match) found += 1;
    }
    for (const group of [...groups].reverse()) {
      const count = [...group.querySelectorAll('.nav-entry')].filter(entry => !entry.hidden).length;
      group.hidden = count === 0;
      const countLabel = group.querySelector(':scope > details > summary .nav-count');
      if (countLabel) countLabel.textContent = String(count);
      const details = group.querySelector(':scope > details');
      if (terms.length) details.open = count > 0;
      else if (beforeFilter) details.open = beforeFilter.get(group);
    }
    if (!terms.length) beforeFilter = null;
    status.textContent = terms.length ? `${found} ${found === 1 ? 'result' : 'results'}` : '';
  };

  filter.addEventListener('input', update);
  document.addEventListener('reader-view-change', update);
  update();
  filter.addEventListener('keydown', event => {
    if (event.key === 'Escape' && filter.value) {
      filter.value = '';
      update();
      event.preventDefault();
    }
  });
}
