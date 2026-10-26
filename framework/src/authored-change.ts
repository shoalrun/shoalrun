import type { Document, Frontmatter } from './content-source.js';
import { link, list, paragraph, root, text } from './semantic-markdown.js';

export const changeKinds = ['editorial', 'procedure', 'behavior', 'breaking'] as const;
export type AuthoredChange = { kind: typeof changeKinds[number]; affects: string[]; migration?: string };
type Target = { id: string; title: string; url: string; markdownUrl: string };
export type ResolvedChange = { kind: AuthoredChange['kind']; affects: Target[]; migration?: Target };
const labels = { editorial: 'Editorial correction', procedure: 'Procedure change', behavior: 'Behavior change', breaking: 'Breaking change' };

export function validateAuthoredChange(frontmatter: Frontmatter, file: string): void {
  const value = frontmatter.change;
  if (value === undefined) return;
  const fail = (message: string): never => { throw new Error(`${file}: change ${message}`); };
  if (frontmatter.type !== 'changelog-entry') fail('is supported only on changelog-entry pages');
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('must be a mapping');
  for (const key of Object.keys(value)) if (!['kind', 'affects', 'migration'].includes(key)) fail(`has unknown field ${key}`);
  if (!changeKinds.includes(value.kind)) fail(`kind must be ${changeKinds.join(', ')}`);
  const id = (item: unknown) => typeof item === 'string' && !!item.trim() && item === item.trim();
  if (!Array.isArray(value.affects) || !value.affects.length || value.affects.some(item => !id(item)) || new Set(value.affects).size !== value.affects.length) fail('affects must be a nonempty list of unique, trimmed document IDs');
  if (value.migration !== undefined && !id(value.migration)) fail('migration must be a nonempty, trimmed document ID');
}

export function resolveAuthoredChange(doc: Document, docs: Map<string, Document>): ResolvedChange | undefined {
  const value = doc.frontmatter.change;
  if (!value) return;
  const target = (id: string, field: string): Target => {
    const found = docs.get(`${id}|${doc.variant.channel}|${doc.variant.version}|${doc.variant.language}`);
    if (id === doc.frontmatter.id || !found || found.frontmatter.access?.policy !== 'public') throw new Error(`${doc.file}: change.${field} must name another public document in the same publication: ${id}`);
    return { id, title: found.frontmatter.title, url: found.route, markdownUrl: found.markdownRoute };
  };
  return { kind: value.kind, affects: value.affects.map(id => target(id, 'affects')), ...(value.migration ? { migration: target(value.migration, 'migration') } : {}) };
}

export function authoredChangeNotice(value: ResolvedChange | undefined, format: 'html' | 'markdown') {
  if (!value) return root([]);
  const targetLink = (target: Target) => ({ ...link(format === 'html' ? target.url : target.markdownUrl, target.title), exportDocumentId: target.id });
  return root([{ type: 'blockquote', children: [
    paragraph({ type: 'strong', children: [text('Authored change')] }, text(`: ${labels[value.kind]}.`)),
    paragraph(text('Affected pages:')),
    list(value.affects.map(target => [paragraph(targetLink(target))])),
    ...(value.migration ? [paragraph(text('Migration guide: '), targetLink(value.migration), text('.'))] : []),
    paragraph(text('Classification and scope are declared by the author. Read this entry for details.'))
  ] }]);
}
