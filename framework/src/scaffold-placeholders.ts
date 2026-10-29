import { parse } from './semantic-markdown.js';

/** Fenced code are teaching examples, not scaffold prose. */
export function hasScaffoldPlaceholders(body: string): boolean {
  const placeholder = /\[\[TODO:[\s\S]*?\]\]/;
  if (!placeholder.test(body)) return false;
  const ranges: Array<[number, number]> = [];
  const visit = (node: any) => {
    if (node.type === 'code' && node.position) ranges.push([node.position.start.offset, node.position.end.offset]);
    else for (const child of node.children ?? []) visit(child);
  };
  visit(parse.parse(body));
  for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) body = body.slice(0, start) + ' '.repeat(end - start) + body.slice(end);
  return placeholder.test(body);
}
