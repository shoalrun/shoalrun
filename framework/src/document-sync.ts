import { createHash } from 'node:crypto';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
// JSON semantics, with object keys sorted so metadata insertion order is irrelevant.
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}
export type SyncDocument = {
  id: string;
  variant: { channel: string; version: string; language: string };
  url: string;
  markdownUrl: string;
  digest: string;
  contentDigest: string;
  recordDigest: string;
};
export type DocumentSnapshot = { schemaVersion: 1; buildId: string; metadataDigest: string; documents: SyncDocument[] };
const key = (doc: SyncDocument) => JSON.stringify([doc.id, doc.variant.channel, doc.variant.version, doc.variant.language]);

export function documentSnapshot(manifest: { documents: unknown; [key: string]: unknown }, buildId: string): DocumentSnapshot {
  const { documents, dependencies, buildId: _buildId, ...metadata } = manifest;
  const records = (documents as SyncDocument[]).map(doc => ({ id: doc.id, variant: doc.variant, url: doc.url, markdownUrl: doc.markdownUrl,
    digest: doc.digest, contentDigest: doc.contentDigest, recordDigest: hash(canonicalJson(doc)) }));
  records.sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  return { schemaVersion: 1, buildId, metadataDigest: hash(canonicalJson(metadata)), documents: records };
}

// Hash the complete assembled publication before adding the buildId stamps and sync snapshot.
// Length framing makes paths and arbitrary binary asset bytes unambiguous.
export function publicationBuildId(artifacts: Map<string, string | Buffer>): string {
  const digest = createHash('sha256');
  for (const route of [...artifacts.keys()].sort()) {
    const bytes = Buffer.from(artifacts.get(route)!);
    digest.update(`${Buffer.byteLength(route)}:`).update(route).update(`${bytes.length}:`).update(bytes);
  }
  return digest.digest('hex');
}

export function parseDocumentSnapshot(value: unknown): DocumentSnapshot {
  const hex = (item: unknown) => typeof item === 'string' && /^[a-f0-9]{64}$/.test(item);
  const object = (item: unknown): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item);
  const route = (item: unknown) => typeof item === 'string' && item.startsWith('/') && !item.startsWith('//') && !/[\\?#\x00-\x20]/.test(item) && !item.split('/').includes('..');
  if (!object(value) || value.schemaVersion !== 1 || !hex(value.buildId) || !hex(value.metadataDigest) || !Array.isArray(value.documents)) throw new Error('Invalid document sync snapshot');
  const seen = new Set<string>();
  for (const doc of value.documents) {
    const variant = object(doc) && object(doc.variant) ? doc.variant : {};
    if (!object(doc) || typeof doc.id !== 'string' || !doc.id.trim() || !object(doc.variant) || ['channel', 'version', 'language'].some(field => typeof variant[field] !== 'string' || !(variant[field] as string).trim()) || !route(doc.url) || !route(doc.markdownUrl) || !(doc.markdownUrl as string).endsWith('.md') || !hex(doc.digest) || !hex(doc.contentDigest) || !hex(doc.recordDigest)) throw new Error('Invalid document sync record');
    const identity = key(doc as SyncDocument);
    if (seen.has(identity)) throw new Error('Duplicate document sync identity');
    seen.add(identity);
  }
  return value as DocumentSnapshot;
}

export function compareDocumentSnapshots(previous: unknown, current: unknown) {
  const before = parseDocumentSnapshot(previous), after = parseDocumentSnapshot(current);
  const oldRecords = new Map(before.documents.map(doc => [key(doc), doc]));
  const newRecords = new Map(after.documents.map(doc => [key(doc), doc]));
  return {
    schemaVersion: 1,
    fromBuildId: before.buildId,
    buildId: after.buildId,
    buildChanged: before.buildId !== after.buildId,
    metadataChanged: before.metadataDigest !== after.metadataDigest,
    added: after.documents.filter(doc => !oldRecords.has(key(doc))),
    changed: after.documents.filter(doc => { const old = oldRecords.get(key(doc)); return old && canonicalJson(old) !== canonicalJson(doc); }),
    removed: before.documents.filter(doc => !newRecords.has(key(doc)))
  };
}
