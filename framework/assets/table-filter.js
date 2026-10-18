export function matchesTableRow(value, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = value.toLocaleLowerCase();
  return terms.every(term => text.includes(term));
}

for (const [index, tableBlock] of [...(globalThis.document?.querySelectorAll('.doc-table[data-table-filter]') ?? [])].entries()) {
  const controls = tableBlock.querySelector('.doc-table-filter');
  const input = controls?.querySelector('input[type="search"]');
  const status = controls?.querySelector('.doc-table-count');
  const body = tableBlock.querySelector('table tbody');
  if (!controls || !input || !status || !body) continue;
  const rows = [...body.rows];
  body.id ||= `doc-table-body-${index + 1}`;
  input.setAttribute('aria-controls', body.id);
  controls.hidden = false;
  const update = () => {
    let visible = 0;
    for (const row of rows) {
      row.hidden = !matchesTableRow(row.textContent, input.value);
      if (!row.hidden) visible++;
    }
    status.textContent = `Showing ${visible} of ${rows.length} rows`;
  };
  input.addEventListener('input', update);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      update();
    }
  });
  update();
}

for (const [index, block] of [...(globalThis.document?.querySelectorAll('.doc-definition-list-wrap[data-definition-filter]') ?? [])].entries()) {
  const controls = block.querySelector('.doc-definition-filter');
  const input = controls?.querySelector('input[type="search"]');
  const status = controls?.querySelector('.doc-definition-count');
  const list = block.querySelector('dl.doc-definition-list');
  if (!controls || !input || !status || !list) continue;
  const pairs = [...list.children].filter(child => child.tagName === 'DT' && child.nextElementSibling?.tagName === 'DD')
    .map(term => [term, term.nextElementSibling]);
  list.id ||= `doc-definition-list-${index + 1}`;
  input.setAttribute('aria-controls', list.id);
  controls.hidden = false;
  const update = () => {
    let visible = 0;
    for (const [term, definition] of pairs) {
      const matches = matchesTableRow(`${term.textContent} ${definition.textContent}`, input.value);
      term.hidden = definition.hidden = !matches;
      if (matches) visible++;
    }
    status.textContent = `Showing ${visible} of ${pairs.length} terms`;
  };
  input.addEventListener('input', update);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      update();
    }
  });
  update();
}
