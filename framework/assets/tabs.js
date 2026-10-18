const groups = new Map();
const synchronize = (source, value) => {
  const key = source.dataset.tabSync;
  if (!key) return;
  for (const [root, group] of groups) {
    if (root === source || root.dataset.tabSync !== key) continue;
    const index = group.tabs.findIndex(tab => tab.dataset.tabValue === value);
    if (index >= 0) group.activate(index);
  }
};

for (const root of document.querySelectorAll('.doc-tabs[data-tabs]')) {
  const list = root.querySelector(':scope > .doc-tablist');
  const tabs = [...(list?.querySelectorAll(':scope > a') ?? [])];
  const panels = [...root.querySelectorAll(':scope > .doc-tabpanel')];
  if (!list || tabs.length < 2 || tabs.length !== panels.length) continue;

  list.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.id = `${panels[index].id}-tab`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
  });

  let current = -1;
  const activate = (index, focus = false, interaction = false) => {
    const changed = current !== index;
    tabs.forEach((tab, at) => {
      const selected = at === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[at].hidden = !selected;
    });
    if (focus) tabs[index].focus();
    current = index;
    if (interaction) {
      synchronize(root, tabs[index].dataset.tabValue);
      if (changed) globalThis.shoalrunAnalytics?.track('content_tab_change', { tabIndex: index, tabId: panels[index].id }, root);
    }
  };

  root.classList.add('is-enhanced');
  groups.set(root, { tabs, panels, activate });
  activate(0);
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => {
      event.preventDefault();
      activate(index, false, true);
    });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      activate(next, true, true);
    });
  });
}

const revealHash = () => {
  if (!location.hash) return;
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target) return;
  const panel = target.closest('.doc-tabpanel');
  const group = panel && groups.get(panel.closest('.doc-tabs'));
  if (group) group.activate(group.panels.indexOf(panel));
  for (const disclosure of document.querySelectorAll('.doc-accordion, .doc-collapsible, .file-tree-branch')) if (disclosure.contains(target)) disclosure.open = true;
  requestAnimationFrame(() => target.scrollIntoView({ block: 'nearest' }));
};

revealHash();
window.addEventListener('hashchange', revealHash);
