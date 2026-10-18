const navigation = document.querySelector('.side');
const tree = navigation?.querySelector('.nav-tree');
const search = navigation?.querySelector('.nav-search');
const filter = navigation?.querySelector('#nav-filter');
if (filter) filter.placeholder = 'Find a page…';
const mobile = matchMedia('(max-width: 72rem)');
const sections = document.querySelector('.section-disclosure');
if (sections) {
  const updateSections = () => { sections.open = !mobile.matches; };
  updateSections();
  mobile.addEventListener('change', updateSections);
}
// On phones the menu and "On this page" start closed so the article is on the first screen.
for (const disclosure of document.querySelectorAll('.nav-disclosure, .toc-disclosure')) {
  const updateLayout = () => { disclosure.open = !mobile.matches; };
  updateLayout();
  mobile.addEventListener('change', updateLayout);
}

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
