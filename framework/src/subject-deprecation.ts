import type { Document } from './content-source.js';
import { link, paragraph, root, text } from './semantic-markdown.js';

export type SubjectDeprecation = { deprecatedOn?: string; sunsetOn?: string; replacement?: string; migration?: string };
type Target = { id: string; title: string; url: string; markdownUrl: string };
export type ResolvedSubjectDeprecation = Omit<SubjectDeprecation, 'replacement' | 'migration'> & { replacement?: Target; migration?: Target };

export function validateSubjectDeprecation(value: unknown, file: string): asserts value is SubjectDeprecation | undefined {
  if (value === undefined) return;
  const fail = (message: string): never => { throw new Error(`${file}: subjectDeprecation ${message}`); };
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length) fail('must be a nonempty mapping');
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!['deprecatedOn', 'sunsetOn', 'replacement', 'migration'].includes(key)) fail(`has unknown field ${key}`);
    if (typeof item !== 'string' || !item.trim() || item !== item.trim()) fail(`${key} must be nonempty, trimmed text`);
    if (key === 'deprecatedOn' || key === 'sunsetOn') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item as string) || Number.isNaN(Date.parse(`${item}T00:00:00Z`)) || new Date(`${item}T00:00:00Z`).toISOString().slice(0, 10) !== item) fail(`${key} must be a real YYYY-MM-DD calendar date`);
    }
  }
  const dates = value as SubjectDeprecation;
  if (dates.deprecatedOn && dates.sunsetOn && dates.sunsetOn < dates.deprecatedOn) fail('sunsetOn must not precede deprecatedOn');
}

// Called after API materialization so authoritative OpenAPI deprecation is available.
export function resolveSubjectDeprecation(doc: Document, docs: Map<string, Document>): ResolvedSubjectDeprecation | undefined {
  const value = doc.frontmatter.subjectDeprecation;
  if (!value) return;
  if (doc.frontmatter.subjectLifecycle !== 'deprecated') throw new Error(`${doc.file}: subjectDeprecation requires subjectLifecycle: deprecated (authored or inferred from OpenAPI)`);
  const result: ResolvedSubjectDeprecation = {};
  for (const key of ['deprecatedOn', 'sunsetOn'] as const) if (value[key]) result[key] = value[key];
  for (const key of ['replacement', 'migration'] as const) {
    const id = value[key];
    if (!id) continue;
    const target = docs.get(`${id}|${doc.variant.channel}|${doc.variant.version}|${doc.variant.language}`);
    if (id === doc.frontmatter.id || !target || target.frontmatter.access?.policy !== 'public') throw new Error(`${doc.file}: subjectDeprecation.${key} must name another public document in the same publication: ${id}`);
    result[key] = { id, title: target.frontmatter.title, url: target.route, markdownUrl: target.markdownRoute };
  }
  return result;
}

export function subjectDeprecationNotice(value: ResolvedSubjectDeprecation | undefined, format: 'html' | 'markdown') {
  if (!value) return root([]);
  return root([{ type: 'blockquote', children: [
    paragraph({ type: 'strong', children: [text('Subject deprecation')] }, text(': The documented API or feature is deprecated.')),
    ...(value.deprecatedOn ? [paragraph(text(`Deprecation date: ${value.deprecatedOn}.`))] : []),
    ...(value.sunsetOn ? [paragraph(text(`Sunset date: ${value.sunsetOn}.`))] : []),
    ...(['replacement', 'migration'] as const).flatMap(key => {
      const target = value[key];
      return target ? [paragraph(text(key === 'replacement' ? 'Replacement: ' : 'Migration guide: '), link(format === 'html' ? target.url : target.markdownUrl, target.title), text('.'))] : [];
    }),
    paragraph(text('These details describe the documented subject, not the availability of this documentation page.'))
  ] }]);
}
