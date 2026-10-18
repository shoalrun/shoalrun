const escapeHtml = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);

function pieces(value, terms) {
  const text = String(value);
  const alternatives = [...new Set(terms.filter(Boolean))]
    .sort((left, right) => right.length - left.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!alternatives.length) return [{ value: text, matched: false }];
  const matches = new RegExp(alternatives.join('|'), 'gi');
  const result = [];
  let position = 0;
  for (const match of text.matchAll(matches)) {
    if (match.index > position) result.push({ value: text.slice(position, match.index), matched: false });
    result.push({ value: match[0], matched: true });
    position = match.index + match[0].length;
  }
  if (position < text.length) result.push({ value: text.slice(position), matched: false });
  return result;
}

export function highlight(value, terms) {
  return pieces(value, terms).map(piece => piece.matched ? `<mark>${escapeHtml(piece.value)}</mark>` : escapeHtml(piece.value)).join('');
}

export function appendHighlighted(target, value, terms) {
  const document = target.ownerDocument;
  for (const piece of pieces(value, terms)) {
    const node = piece.matched ? document.createElement('mark') : document.createTextNode(piece.value);
    if (piece.matched) node.textContent = piece.value;
    target.append(node);
  }
}
