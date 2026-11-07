/** Browser-safe delivery contracts. These types do not import the compiler. */
/** Exact documentation publication selected by a content source. */
export type ContentPublication = { channel: string; version: string; language: string; product?: string };
/** Portable representations a content client can request. */
export type ContentFormat = 'html' | 'markdown';
/** Stable identity of a page, a section within a page, or a named snippet instance.
 * A reference is scoped to the publication and revision of the opened snapshot.
 */
export type ContentRef = { kind: 'page'; documentId: string } | { kind: 'section'; documentId: string; sectionId: string } | { kind: 'snippet'; id: string };
/** Export-relative file path, byte length, and SHA-256 digest. */
export type ContentFile = { path: string; bytes: number; digest: string };
/** A content-addressed file with its declared media type. */
export type ContentAsset = ContentFile & { mediaType: string };
/** Mapping from a canonical document fragment to its exported HTML ID. */
export type ContentAnchor = { id: string; exportedId: string; title?: string };
/** Classified link and optional resource identity for application routing. */
export type ContentLink = { key: string; kind: 'resource' | 'canonical' | 'external' | 'asset'; href: string; ref?: ContentRef; fragment?: string; query?: string; asset?: string };
/** One portable format, including its file metadata, anchors, and typed links. */
export type ContentRepresentation = ContentAsset & { anchors: ContentAnchor[]; links: ContentLink[] };
/** Inventory entry describing one exported document, section, or snippet instance. */
export type ContentResource = {
  /** Stable identity used by ContentSnapshot.get. */
  ref: ContentRef;
  /** Exact product, channel, version, and documentation language. */
  publication: ContentPublication;
  /** Human-readable resource title. */
  title: string;
  /** Short explanation of the resource's purpose. */
  summary: string;
  /** Authored document type, or section/snippet for a selected resource. */
  type: string;
  canonicalUrl?: string; source?: { documentId?: string; snippetId?: string; valuesDigest?: string };
  /** Available portable formats and their files, anchors, and typed links. */
  representations: Partial<Record<ContentFormat, ContentRepresentation>>;
  assets: string[]; externalDependencies: Array<{ url: string; kind: 'image' }>;
};
/** One validated, content-addressed export inventory. */
export type ContentManifest = {
  schemaVersion: 1 | 2; kind: 'shoalrun-content-export'; digest: string; publicBase: string;
  publication: ContentPublication; review: { status: 'ok' | 'required'; apis: Array<{ apiId: string; digest: string }> };
  resources: ContentResource[]; assets: ContentAsset[]; files: ContentFile[];
  diagnostics: Array<{ code: string; documentId?: string; message: string }>;
};
/** A fetched representation together with the metadata needed to render or route it. */
export type ContentResult = {
  /** Inventory entry that was selected by the requested reference. */
  resource: Readonly<ContentResource>;
  /** File, media type, anchors, and typed links for the selected format. */
  representation: Readonly<ContentRepresentation>;
  /** Representation actually returned by the source. */
  format: ContentFormat;
  /** Validated UTF-8 HTML or Markdown text. */
  content: string;
  /** Revision shared by this response and its opened content snapshot. */
  revision: string;
};
/** A client pinned to one immutable inventory revision and publication. */
export interface ContentSnapshot {
  /** Content digest identifying this inventory revision. */
  readonly revision: string;
  /** Publication shared by every resource available from this snapshot. */
  readonly publication: Readonly<ContentPublication>;
  /** List the resources in the opened inventory without fetching their bodies.
   * @returns Read-only resource entries for this publication and revision.
   */
  list(): readonly Readonly<ContentResource>[];
  /** Fetch one available representation of a stable content reference.
   * @param ref Page, section, or named snippet instance in this snapshot.
   * @param options Required format and an optional signal for this read.
   * @returns Validated representation text with its routing and revision metadata.
   */
  get(ref: ContentRef, options: { format: ContentFormat; signal?: AbortSignal }): Promise<ContentResult>;
  /** Cancel pending requests and prevent subsequent reads or inventory access. */
  dispose(): void;
}
/** Stable error categories raised by content-source validation and reads. */
export type ContentErrorCode = 'invalid_manifest' | 'not_found' | 'unsupported_format' | 'stale_revision' | 'network_error' | 'invalid_content' | 'disposed';
/** Delivery failure with a machine-readable code and a human-readable message. */
export class ContentDeliveryError extends Error {
  constructor(readonly code: ContentErrorCode, message: string) { super(message); this.name = 'ContentDeliveryError'; }
}
/** Serialize a reference to a deterministic key without including publication scope. */
export function contentRefKey(ref: ContentRef): string {
  switch (ref.kind) {
    case 'page': return JSON.stringify(['page', ref.documentId]);
    case 'section': return JSON.stringify(['section', ref.documentId, ref.sectionId]);
    case 'snippet': return JSON.stringify(['snippet', ref.id]);
  }
}
