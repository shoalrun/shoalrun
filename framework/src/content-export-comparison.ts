import { contentRefKey, type ContentPublication, type ContentRef } from './content-delivery-contract.js';

export type ContentReference = { publication: ContentPublication; ref: ContentRef };
export type ContentExportComparison = {
  status: 'no-baseline' | 'compared';
  added: ContentReference[];
  removed: ContentReference[];
  diagnostics: Array<{ code: 'no-reference-baseline' | 'removed-content-reference'; message: string }>;
};
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.trim() === value;
const keyFor = ({ publication, ref }: ContentReference) => JSON.stringify([publication.channel, publication.version, publication.language, contentRefKey(ref)]);

/** Validate the public identity surface, without reading files or executing source. */
function references(manifest: unknown, label: string, requireReviewed: boolean): Map<string, ContentReference> {
  const fail = (): never => { throw new Error(`${label} must be a content export manifest with valid, unique public resource references`); };
  if (!object(manifest) || manifest.schemaVersion !== 1 || manifest.kind !== 'shoalrun-content-export' || !Array.isArray(manifest.resources) || !manifest.resources.length) return fail();
  const publication = manifest.publication;
  if (!object(publication) || Object.keys(publication).length !== 3 || !['channel', 'version', 'language'].every(key => nonempty(publication[key]))) return fail();
  if (!object(manifest.review) || !['ok', 'required'].includes(String(manifest.review.status))) return fail();
  if (requireReviewed && manifest.review.status !== 'ok') throw new Error(`${label} must be a reviewed export, not a review candidate`);
  const result = new Map<string, ContentReference>();
  for (const resource of manifest.resources) {
    if (!object(resource) || !object(resource.ref) || !object(resource.publication)) return fail();
    if (Object.keys(resource.publication).length !== 3 || !['channel', 'version', 'language'].every(key => resource.publication && (resource.publication as Record<string, unknown>)[key] === publication[key])) return fail();
    const ref = resource.ref;
    const keys = ref.kind === 'page' ? ['kind', 'documentId'] : ref.kind === 'section' ? ['kind', 'documentId', 'sectionId'] : ref.kind === 'snippet' ? ['kind', 'id'] : [];
    if (!keys.length || Object.keys(ref).length !== keys.length || !keys.every(key => nonempty(ref[key]))) return fail();
    const entry: ContentReference = { publication: { channel: publication.channel as string, version: publication.version as string, language: publication.language as string }, ref: { ...ref } as ContentRef };
    const key = keyFor(entry);
    if (result.has(key)) return fail();
    result.set(key, entry);
  }
  return result;
}

/** Titles, ordering and content edits do not change a public reference. */
export function compareContentManifests(previous: unknown | undefined, current: unknown): ContentExportComparison {
  const next = references(current, 'Current manifest', false);
  const sorted = (values: Iterable<ContentReference>) => [...values].sort((a, b) => keyFor(a) < keyFor(b) ? -1 : keyFor(a) > keyFor(b) ? 1 : 0);
  if (previous === undefined) return {
    status: 'no-baseline', added: sorted(next.values()), removed: [],
    diagnostics: [{ code: 'no-reference-baseline', message: 'No previous manifest supplied; removed public references were not checked.' }],
  };
  const prior = references(previous, 'Previous manifest', true);
  const removed = sorted([...prior].filter(([key]) => !next.has(key)).map(([, value]) => value));
  const added = sorted([...next].filter(([key]) => !prior.has(key)).map(([, value]) => value));
  return { status: 'compared', added, removed, diagnostics: removed.length ? [{ code: 'removed-content-reference', message: `${removed.length} previously exported public reference(s) are missing. Review removed references before publishing.` }] : [] };
}
