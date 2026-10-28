/** Browser-safe delivery contracts. These types do not import the compiler. */
export type ContentPublication = { channel: string; version: string; language: string };
export type ContentFormat = 'html' | 'markdown';
export type ContentRef = { kind: 'page'; documentId: string } | { kind: 'section'; documentId: string; sectionId: string } | { kind: 'snippet'; id: string };
export type ContentFile = { path: string; bytes: number; digest: string };
export type ContentAsset = ContentFile & { mediaType: string };
export type ContentAnchor = { id: string; exportedId: string; title?: string };
export type ContentLink = { key: string; kind: 'resource' | 'canonical' | 'external' | 'asset'; href: string; ref?: ContentRef; fragment?: string; query?: string; asset?: string };
export type ContentRepresentation = ContentAsset & { anchors: ContentAnchor[]; links: ContentLink[] };
export type ContentResource = {
  ref: ContentRef; publication: ContentPublication; title: string; summary: string; type: string;
  canonicalUrl?: string; source?: { documentId?: string; snippetId?: string; valuesDigest?: string };
  representations: Partial<Record<ContentFormat, ContentRepresentation>>;
  assets: string[]; externalDependencies: Array<{ url: string; kind: 'image' }>;
};
export type ContentManifest = {
  schemaVersion: 1; kind: 'shoalrun-content-export'; digest: string; publicBase: string;
  publication: ContentPublication; review: { status: 'ok' | 'required'; apis: Array<{ apiId: string; digest: string }> };
  resources: ContentResource[]; assets: ContentAsset[]; files: ContentFile[];
  diagnostics: Array<{ code: string; documentId?: string; message: string }>;
};
export type ContentResult = {
  resource: Readonly<ContentResource>; representation: Readonly<ContentRepresentation>;
  format: ContentFormat; content: string; revision: string;
};
export interface ContentSnapshot {
  readonly revision: string;
  readonly publication: Readonly<ContentPublication>;
  list(): readonly Readonly<ContentResource>[];
  get(ref: ContentRef, options: { format: ContentFormat; signal?: AbortSignal }): Promise<ContentResult>;
  dispose(): void;
}
export type ContentErrorCode = 'invalid_manifest' | 'not_found' | 'unsupported_format' | 'stale_revision' | 'network_error' | 'invalid_content' | 'disposed';
export class ContentDeliveryError extends Error {
  constructor(readonly code: ContentErrorCode, message: string) { super(message); this.name = 'ContentDeliveryError'; }
}
export function contentRefKey(ref: ContentRef): string {
  switch (ref.kind) {
    case 'page': return JSON.stringify(['page', ref.documentId]);
    case 'section': return JSON.stringify(['section', ref.documentId, ref.sectionId]);
    case 'snippet': return JSON.stringify(['snippet', ref.id]);
  }
}
