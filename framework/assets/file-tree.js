// Native disclosures work without this enhancement; arrows add convenient navigation.
for (const root of document.querySelectorAll('[data-file-tree]')) {
  const branches = [...root.querySelectorAll('.file-tree-branch')];
  const controls = root.querySelector('.file-tree-controls');
  if (controls && branches.length) {
    controls.hidden = false;
    controls.querySelector('[data-tree-expand]').addEventListener('click', () => branches.forEach(branch => { branch.open = true; }));
    controls.querySelector('[data-tree-collapse]').addEventListener('click', () => branches.forEach(branch => { branch.open = false; }));
  }
  // Keep regular links and disclosure semantics rather than claiming an ARIA tree widget.
  for (const label of root.querySelectorAll('.file-tree-file > .file-tree-label')) {
    if (!label.querySelector('a')) label.tabIndex = 0;
  }
  const visibleNodes = () => [...root.querySelectorAll('summary, .file-tree-file > .file-tree-label > a, .file-tree-file > .file-tree-label[tabindex]')].filter(node => node.getClientRects().length);
  let prefix = '', typedAt = 0;
  root.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || (event.shiftKey && event.key.length !== 1)) return;
    const target = event.target;
    const nodes = visibleNodes();
    const index = nodes.indexOf(target);
    if (index < 0) return;
    const branch = target.matches('summary') ? target.parentElement : null;
    let next;
    if (event.key === 'ArrowDown') next = nodes[Math.min(index + 1, nodes.length - 1)];
    else if (event.key === 'ArrowUp') next = nodes[Math.max(index - 1, 0)];
    else if (event.key === 'Home') next = nodes[0];
    else if (event.key === 'End') next = nodes.at(-1);
    else if (event.key === 'ArrowRight' && branch) {
      if (!branch.open) branch.open = true;
      else next = nodes[index + 1];
    } else if (event.key === 'ArrowLeft') {
      if (branch?.open) branch.open = false;
      else next = (branch?.parentElement ?? target).parentElement.closest('.file-tree-branch')?.querySelector(':scope > summary');
    } else if (event.key === '*') {
      const siblings = target.closest('li')?.parentElement;
      siblings?.querySelectorAll(':scope > li > .file-tree-branch').forEach(folder => { folder.open = true; });
    } else if (event.key.length === 1 && event.key !== ' ') {
      const now = Date.now();
      prefix = now - typedAt > 700 ? event.key.toLocaleLowerCase() : prefix + event.key.toLocaleLowerCase();
      typedAt = now;
      const find = value => [...nodes.slice(index + 1), ...nodes.slice(0, index + 1)].find(node => node.textContent.trim().toLocaleLowerCase().startsWith(value));
      next = find(prefix);
      if (!next && prefix.length > 1) { prefix = event.key.toLocaleLowerCase(); next = find(prefix); }
      if (!next) return;
    } else return;
    event.preventDefault();
    next?.focus();
  });
}
