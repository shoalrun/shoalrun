import { createHash } from 'node:crypto';
import { markdownTokens } from './markdown-size.js';
import { heading, link, list, paragraph, renderMarkdown, root, text } from './semantic-markdown.js';

export const compactDiscoveryTokenLimit = 2000;
export type DiscoveryEntry = { key: string; title: string; topic: string; topicLabel: string; markdown: string };
type Item = { key: string; title: string; markdown: string };

// All child routes are root-relative. Never infer membership from navigation:
// callers supply the complete set of published pages for this scope.
export function boundedDiscovery(options: {
  route: string;
  directory: string;
  intro: string;
  flat: string;
  entries: DiscoveryEntry[];
}): Map<string, string> {
  const { route, directory, intro, flat, entries } = options;
  const artifacts = new Map<string, string>();
  if (markdownTokens(flat) <= compactDiscoveryTokenLimit) return new Map([[route, flat]]);
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const short = (label: string) => [...label].slice(0, 100).join('');
  const preamble = (label: string) => renderMarkdown(root([
    heading(1, short(label)),
    paragraph(link(route, 'Index overview'), text('. Follow a matching page or a narrower index. All pages in this scope remain reachable.')),
    paragraph(text('Prefer the full page. Use a standalone section only for its stated topic; follow Full page for broader questions or missing context. Standalone is an author declaration, not proof of completeness.')),
  ])).trimEnd();
  const body = (header: string, items: Item[]) => `${header}\n\n${items.map(item => item.markdown.trim()).join('\n\n')}\n`;
  const range = (items: Item[]) => items.length === 1 ? short(items[0].title) : `${short(items[0].title)} … ${short(items.at(-1)!.title)}`;
  const child = (key: string, label: string, content: string): Item => {
    const url = `${directory}/${createHash('sha256').update(key).digest('hex').slice(0, 24)}.txt`;
    if (artifacts.has(url)) throw new Error(`Duplicate compact discovery index: ${url}`);
    artifacts.set(url, content);
    return { key, title: label, markdown: renderMarkdown(root([list([[paragraph(link(url, label), text(': scoped index.'))]])])).trimEnd() };
  };
  const partition = (items: Item[], header: string): Item[][] => {
    const chunks: Item[][] = [];
    let chunk: Item[] = [];
    for (const item of items) {
      if (markdownTokens(body(header, [item])) > compactDiscoveryTokenLimit)
        throw new Error(`Compact discovery entry ${item.key} exceeds ${compactDiscoveryTokenLimit} tokens. Shorten its title or summary.`);
      if (chunk.length && markdownTokens(body(header, [...chunk, item])) > compactDiscoveryTokenLimit) {
        chunks.push(chunk); chunk = [];
      }
      chunk.push(item);
    }
    if (chunk.length) chunks.push(chunk);
    return chunks;
  };
  const branches = (items: Item[], label: string, key: string): Item => {
    const header = preamble(label);
    let level = items;
    let depth = 0;
    while (markdownTokens(body(header, level)) > compactDiscoveryTokenLimit) {
      const chunks = partition(level, header);
      if (chunks.length >= level.length) throw new Error('Compact discovery cannot fit index links within its token budget');
      level = chunks.map(chunk => child(JSON.stringify([key, depth, chunk[0].key, chunk.at(-1)!.key]), range(chunk), body(header, chunk)));
      depth++;
    }
    return child(key, label, body(header, level));
  };
  const groups = new Map<string, DiscoveryEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.topic) ?? [];
    group.push(entry); groups.set(entry.topic, group);
  }
  let topics: Item[] = [...groups].sort(([a], [b]) => compare(a, b)).map(([key, group]) => {
    group.sort((a, b) => compare(a.title, b.title) || compare(a.key, b.key));
    return branches(group, group[0].topicLabel, JSON.stringify(['topic', key]));
  });
  const rootIntro = `${intro}\n\nChoose a topic index below, then follow a matching page or narrower index. All published pages in this scope remain reachable, including pages outside navigation.\n`;
  let depth = 0;
  while (markdownTokens(body(rootIntro, topics)) > compactDiscoveryTokenLimit) {
    const chunks = partition(topics, rootIntro);
    if (chunks.length >= topics.length) throw new Error('Compact discovery introduction exceeds its token budget');
    topics = chunks.map(chunk => branches(chunk, range(chunk), JSON.stringify(['overview', depth, chunk[0].key, chunk.at(-1)!.key])));
    depth++;
  }
  artifacts.set(route, body(rootIntro, topics));
  return artifacts;
}
