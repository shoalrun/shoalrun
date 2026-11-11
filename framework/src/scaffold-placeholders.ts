import { parse } from './semantic-markdown.js';
import { sourceCommentRanges } from './source-comments.js';

/** Fenced code are teaching examples, not scaffold prose. */
export function hasScaffoldPlaceholders(body: string, file?: string): boolean {
  const placeholder = /\[\[TODO:[\s\S]*?\]\]/;
  if (!placeholder.test(body)) return false;
  const ranges: Array<[number, number]> = [];
  const visit = (node: any) => {
    if (node.type === 'code' && node.position) ranges.push([node.position.start.offset, node.position.end.offset]);
    else for (const child of node.children ?? []) visit(child);
  };
  const tree = parse.parse({ value: body, path: file });
  visit(tree);
  ranges.push(...sourceCommentRanges(tree));
  for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) body = body.slice(0, start) + ' '.repeat(end - start) + body.slice(end);
  return placeholder.test(body);
}
