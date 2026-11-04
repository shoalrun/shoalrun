const stopWords = new Set('a an the i me my we our you your how do does can could would should will is are was were be to of in on for with please what where when why which and or it this that have has after before'.split(' '));

export function searchSnippetFromParagraphs(choices: string[], query: string, pageSummary = ''): string {
  const terms = [...new Set((query.toLocaleLowerCase().match(/[\p{L}\p{N}_$.-]+/gu) ?? []).map(t => t.replace(/^[.-]+|[.-]+$/g, '')).filter(t => t && !stopWords.has(t)))];
  const matches = (text: string) => terms.filter(term => new RegExp(`(?<![\\p{L}\\p{N}_])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'iu').test(text));
  const ranked = choices.map((text, at) => ({ text, at, terms: matches(text) })).sort((a, b) => b.terms.length - a.terms.length || a.at - b.at);
  const selected = ranked[0];
  const text = (selected?.text ?? pageSummary).replace(/\s+/g, ' ').trim();
  if (text.length <= 180) return text;
  const first = selected?.terms.length ? Math.min(...selected.terms.map(t => text.toLocaleLowerCase().indexOf(t))) : 0;
  const start = Math.max(0, first - 50);
  const length = 180 - (start ? 1 : 0) - 1;
  return `${start ? '…' : ''}${text.slice(start, start + length).trim()}…`;
}
