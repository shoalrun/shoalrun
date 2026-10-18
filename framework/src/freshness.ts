import { createHash, randomUUID } from 'node:crypto';
import { readFile, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Document } from './content-source.js';

type RecordEntry = { contentDigest: string; updated: string };
type History = { schemaVersion: 1; documents: Record<string, RecordEntry> };
// Position data, section-only annotations, and verification dates do not change the published article content.
function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).filter(key => key !== 'position' && key !== 'sectionReadingPath').sort().map(key => [key, stable(value[key])]));
  return value;
}
export function contentDigest(doc: Document, htmlTree: unknown, markdownTree: unknown): string {
  const fields = ['id', 'title', 'summary', 'description', 'type', 'slug', 'date', 'releaseVersion', 'subjectLifecycle', 'audiences', 'readerFilters', 'product', 'area', 'subarea', 'operations', 'displayText'];
  return createHash('sha256').update(JSON.stringify(stable({ metadata: Object.fromEntries(fields.map(key => [key, doc.frontmatter[key]])), html: htmlTree, markdown: markdownTree }))).digest('hex');
}
export async function loadFreshness(value: unknown, base: string, today = new Date().toISOString().slice(0, 10)) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => key !== 'history') || typeof (value as any).history !== 'string' || !(value as any).history.trim()) throw new Error('site.freshness must be a mapping with history: <local JSON file>');
  const file = path.resolve(base, (value as any).history);
  const project = await realpath(base);
  const parent = await realpath(path.dirname(file));
  if (parent !== project && !parent.startsWith(`${project}${path.sep}`)) throw new Error('site.freshness.history must stay inside the project');
  let original: string | undefined;
  try {
    const actual = await realpath(file);
    if (!actual.startsWith(`${project}${path.sep}`)) throw new Error('site.freshness.history must stay inside the project');
    original = await readFile(file, 'utf8');
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const history: History = original ? JSON.parse(original) : { schemaVersion: 1, documents: {} };
  if (history?.schemaVersion !== 1 || !history.documents || typeof history.documents !== 'object' || Array.isArray(history.documents) || Object.values(history.documents).some(entry => !entry || !/^[a-f0-9]{64}$/.test(entry.contentDigest) || typeof entry.updated !== 'string' || Number.isNaN(Date.parse(entry.updated)))) throw new Error('Invalid content freshness history');
  const current: Record<string, RecordEntry> = {};
  return {
    resolve(doc: Document, digest: string, fallback?: string) {
      const key = JSON.stringify([doc.frontmatter.id, doc.variant.channel, doc.variant.version, doc.variant.language]);
      const previous = history.documents[key];
      const updated = previous ? previous.contentDigest === digest ? previous.updated : today : doc.frontmatter.updated ?? fallback ?? today;
      current[key] = { contentDigest: digest, updated };
      return updated;
    },
    async commit() {
      const output = JSON.stringify({ schemaVersion: 1, documents: Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b))) }, null, 2) + '\n';
      if (output === original) return;
      const temporary = `${file}.${randomUUID()}.tmp`;
      await writeFile(temporary, output, { flag: 'wx' });
      await rename(temporary, file);
    }
  };
}
export type Freshness = Awaited<ReturnType<typeof loadFreshness>>;
