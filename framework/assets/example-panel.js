const panel = document.querySelector('.examples');

if (panel) {
  const expandButton = panel.querySelector('.examples-expand');
  const setExpanded = expanded => {
    panel.classList.toggle('is-expanded', expanded);
    panel.closest('.page-rail')?.classList.toggle('has-expanded-examples', expanded);
    expandButton?.setAttribute('aria-pressed', String(expanded));
    if (expandButton) expandButton.textContent = expanded ? 'Close wide view' : 'Expand';
  };
  expandButton?.addEventListener('click', () => setExpanded(!panel.classList.contains('is-expanded')));
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('is-expanded')) {
      setExpanded(false);
      expandButton?.focus();
    }
  });
  const chooser = panel.querySelector('.api-view-control');
  const select = panel.querySelector('#api-view-select');
  const views = [...panel.querySelectorAll('[data-api-view]')];
  const showView = value => {
    for (const view of views) view.hidden = view.dataset.apiView !== value;
    if (select) select.value = value;
  };
  if (chooser && select) {
    showView('examples');
    chooser.hidden = false;
    select.addEventListener('change', () => showView(select.value));
  }
  const scenarios = [...panel.querySelectorAll('details[name]')];
  const show = (selected, focus = false, scroll = true) => {
    for (const scenario of scenarios) {
      if (scenario.name === selected.name && scenario !== selected) scenario.open = false;
    }
    const group = selected.closest('.example-group[data-compact]');
    if (group) {
      for (const scenario of group.querySelectorAll('details[name]')) scenario.hidden = scenario !== selected;
      const picker = group.querySelector('.example-picker select');
      if (picker) picker.value = selected.id;
    }
    selected.open = true;
    if (scroll) selected.scrollIntoView({ block: 'nearest' });
    if (focus) selected.querySelector('summary')?.focus({ preventScroll: true });
  };

  for (const group of panel.querySelectorAll('.example-group[data-compact]')) {
    const picker = group.querySelector('.example-picker');
    const select = picker?.querySelector('select');
    const entries = [...group.querySelectorAll('details[name]')];
    if (!picker || !select || !entries.length) continue;
    picker.hidden = false;
    show(entries.find(entry => entry.open) ?? entries[0], false, false);
    select.addEventListener('change', () => {
      const selected = entries.find(entry => entry.id === select.value);
      if (selected) show(selected);
    });
  }

  for (const scenario of scenarios) {
    scenario.addEventListener('toggle', () => {
      if (scenario.open && (!chooser || select.value === 'examples')) show(scenario);
    });
  }

  const revealHash = () => {
    if (!location.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch { return; }
    if (target instanceof HTMLDetailsElement && panel.contains(target)) {
      if (chooser) showView('examples');
      show(target, true);
    }
  };
  addEventListener('hashchange', revealHash);
  revealHash();
}
