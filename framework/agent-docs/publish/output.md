---
id: guide.output
title: Publishing and agent representations
summary: Read the published-output contract for HTML, Markdown, manifests, and
  incremental sync.
type: reference
area: publishing
subarea: publishing-builds
canonical: /publish/output
---

# Publishing and agent representations

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Generated outputs

**Updated: 2026-10-19.**

`shoalrun build` turns accepted source pages and local OpenAPI files into a static site. A **publication** is one enabled channel, version, and language combination, such as production, v1, and English. The build includes a public page only in publications matching its frontmatter. It makes no model calls or remote requests.

For each included page, the build writes an HTML page for browsing. It also writes a **Markdown twin**, a generated `.md` copy that agents can read as text. The Markdown twin can start with a short YAML header. That header contains only the page metadata selected in project config, so agents get useful context without a long source header or internal notes. Shared content appears in both bodies; authors can also add content to either format alone with [Only](https://www.shoalrun.com/author/components/only.md).

The site also includes a **document manifest**, `documents.json`, which indexes the built pages and their URLs. Projects with an API source can publish operation pages and **focused contracts**, small OpenAPI files containing one operation and the definitions it needs.

## Published-output contract

This page is the consumer reference for Shoalrun's current published output. It describes the existing producer, not a general format that other generators must implement. The manifest and sync snapshot use `schemaVersion: 1`. Editorial revisions to this reference do not change that wire version.

The repository maintains JSON Schema 2020-12 definitions at `framework/schemas/manifest.schema.json` and `framework/schemas/sync.schema.json`. They specify required fields and known value shapes; this reference explains their meaning. Schema identifiers are stable names for local resolution, not a promise that a site hosts the schema files. Register both schemas together when validating a sync snapshot. They remain repository validation resources and are not added to site output.

Consumers must tolerate unknown properties. Optional fields may be absent; absence is not evidence of a negative claim. Removing a required field, changing a field's meaning, or making existing valid output incompatible requires a new wire version. Adding optional fields can retain version 1. Changes to a constrained value set also need compatibility review; accepting unknown properties does not mean a consumer accepts unknown enum values.

| Capability                                                                                                        | Availability                                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| HTML and Markdown pages                                                                                           | Every included public page has both representations.                                                |
| Manifest, sync snapshot, build information, response headers, redirect inventory, and both text discovery indexes | Emitted by the build. Empty inventories are allowed.                                                |
| Search indexes                                                                                                    | Both full and compact indexes are emitted when search indexing is enabled.                          |
| Section resources                                                                                                 | Emitted only for eligible sections of sufficiently long pages.                                      |
| Focused contracts and published API sources                                                                       | Emitted when configured for an API source.                                                          |
| Sitemap                                                                                                           | Requires a site origin and enabled indexing.                                                        |
| Markdown negotiation, redirect responses, caching, and HTTP 404 status                                            | Hosting behavior; the Node server and Vercel adapter implement it. Other hosts need matching rules. |

Routes include the configured base path and publication prefixes. Start at `llms.min.txt` under that base path, choose a page by its ID, title, and summary, then fetch its Markdown URL. Fetch the manifest when you need structured metadata. Discovery cost depends on the corpus and tokenizer; the budget measured for this site is not a guarantee for every site.

A document's identity is `(id, channel, version, language)`, not its title, URL, or array position. The same ID in two publications identifies two records. That tuple must be unique in both the manifest and sync snapshot. Cite it with the resource URL; for sections, also retain section identity and parent/section digests. A manifest array pointer is a link into that snapshot, not a permanent document identifier.

`indexable` describes indexing, not access. `demo: false` means unmarked, not a verified service. Missing or null `subjectLifecycle` does not mean stable. `verified` is an author's review date, not compiler or independent verification. `updated` records content freshness and can be a calendar date or a timestamp with a timezone. Reader filters control presentation, not authorization.

## Page formats

Both formats come from the same parsed content. Supported components preserve their documented shared content in Markdown: tab choices, disclosure bodies, reader-marked branches, table rows, resolved snippets, and API examples retain readable content and relevant labels. Unknown components and unsupported dynamic MDX fail compilation. Explicit format-specific branches follow author selection; authors must review equivalent task guidance and completeness. Rendering checks do not prove semantic equivalence or that a reader has every prerequisite. [Tabs](https://www.shoalrun.com/author/components/tabs.md) become labeled sections in Markdown. [OpenAPI examples and schemas](https://www.shoalrun.com/author/components/api-embeds.md) are expanded during the build, so their values and field details appear as readable text in the twin. A [filtered or sticky table](https://www.shoalrun.com/author/components/tables.md) keeps every row as a plain table in Markdown.

Write links in page content as `doc:` IDs, site paths, or relative paths such as `[Next](./next)` and `[Overview](../overview)`. Shoalrun resolves relative paths against the current page's published route. For a page at `/guides/setup`, `./next` resolves to `/guides/next`. HTML links use site paths, so local previews stay local; links to known pages in Markdown twins point to their `.md` routes. Set `site.origin` to publish full HTTPS links in Markdown twins and `/llms.txt`, so a fetched Markdown page keeps working outside the site's browser context. Fragment-only links such as `#options` stay local to the page. Explicit external URLs keep their original host.

`<Only format="html">` adds content to the HTML page alone; `<Only format="markdown">` adds it to the twin alone. For example, an HTML instruction to choose an interactive tab can be replaced with a Markdown instruction to read the labeled sections. An agent fetching the `.md` URL or negotiating Markdown receives the shared content and the Markdown-only instruction. See the [Only component guide](https://www.shoalrun.com/author/components/only.md) for a live example and the exact Markdown line it produces.

The HTML page links to its Markdown twin. The [Markdown metadata guide](https://www.shoalrun.com/author/markdown-metadata.md) explains how to choose the metadata in its YAML header.

See [agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) for how agents discover and use these outputs, including `/llms.txt` and the API catalog.

## Where files go

`shoalrun build <config> <output>` writes the site to the output directory. It builds in a temporary directory, then **deletes the output directory and replaces it**, so point it at a directory that holds only build output. To protect other folders, it replaces a directory only when it is new, empty, or an earlier build. Otherwise the build stops before deleting anything.

| Output                     | Path                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML page                  | `<route>/index.html`                                                                                                                                     |
| Markdown twin              | `<route>.md`; a page at `/` gets `/index.md`                                                                                                             |
| Framework and theme assets | `/assets/`: `site.css`, `tokens.css`, `header.css`, scripts, `themes/`, and, when used, `theme.css`, `palette.css`, `project.css`, and `theme-preview.*` |
| Diagram images             | `/assets/diagrams/<engine>-<hash>-light.svg` and `-dark.svg`, named by a hash of the source so identical diagrams share a file                           |
| Published OpenAPI source   | `/api/<apiId>/<channel>/<version>/<file>`, plus the local files it references                                                                            |
| Focused contracts          | `/api/operations/<channel>/<version>/<language>/<name>-<hash>.json`                                                                                      |

The `/api` and `/.well-known` paths are reserved for these files, so page slugs cannot use them. A [diagram](https://www.shoalrun.com/author/components/diagrams.md) in the Markdown twin keeps its title, summary, a link to the light SVG, and its fenced source.

## Site files

- `documents.json` is the document manifest. Its top-level keys are `schemaVersion`, `buildId`, `configDigest`, `dependencies`, `documents`, `operations`, `relationships`, `redirects`, and `apiSources`. Each entry in `documents` describes one page variant. `contentDigest` fingerprints resolved article content for freshness; `digest` is the SHA-256 of the complete generated Markdown bytes. Use `digest` to check a fetched Markdown twin for changes, and pair the stable ID with its publication variant when comparing records. A page with an author-set `verified` date exposes it independently of `updated`. It has the stable ID, type, title, summary, subjectLifecycle, publication variant, and HTML and Markdown URLs. Optional `subjectDeprecation` carries author-declared `deprecatedOn` and `sunsetOn` dates and resolved `replacement` and `migration` targets, each with `id`, `title`, `url`, and `markdownUrl`. A changelog entry can also expose optional `change` with an author-declared `kind`, an `affects` target list, and a `migration` target when supplied. Change targets use the same `id`, `title`, `url`, and `markdownUrl` shape; absence means unclassified. Deprecation guidance appears in HTML, full Markdown, and section Markdown; it describes the subject rather than retirement of the documentation resource. Every record has a boolean `demo`, set from `outputs.llms.fictionalPrefixes`. A true value identifies an author-declared fictional example. False means unmarked; it does not verify that an API is live. The full and compact search indexes carry the same flag. Optional `product`, `area`, and `subarea` categories appear when set. It also lists card targets and queries, snippet and API embed uses, focused contract details, and a content digest. When reader views are configured, the manifest also has top-level `readerFacets` and a resolved `readerFilters` map on each page. An empty map means the page is shared. `dependencies` lists the source files the build read, without local paths. Project files are relative to `docs.config.yaml`, framework files start with `shoalrun:`, and installed packages start with `package:`.

- `documents.sync.json` contains the build ID and compact page signatures for comparing saved snapshots. See **Incremental sync** below.

- `build-info.json` records the build ID, resolved config digest and, when supplied by the build command, the source commit and release label. It is public build provenance, not a version archive. See [use Git branches for separate docs sites](https://www.shoalrun.com/publish/revisions.md).

- `404.html` and `404.md` provide concise recovery links for missing pages. Node serving and Vercel routing preserve HTTP `404`; another static host needs an error-page rule. These files are omitted from the document manifest, sitemap, and search index.

- `redirects.json` lists each [redirect](https://www.shoalrun.com/config.md) as `from`, `to`, `markdownFrom`, `markdownTo`, and `status`. `markdownFrom` is the old page's `.md` URL, and it redirects to `markdownTo`. `shoalrun serve` and the Vercel build apply them; other hosts need their own rules.

- `resource-headers.json` declares MIME types for page and discovery routes, Markdown alternate links for HTML, and canonical HTML links for Markdown.

- `/llms.txt` points agents to pages, contracts, and manifests. Every Markdown twin links back to the compact `/llms.min.txt` index and `/documents.json`; the compact index links to the detailed `/llms.txt` index.

- `llms.min.txt` is the compact starting point for agents: one entry per published page variant with its stable ID, title, summary, and Markdown URL. Fictional examples retain their labels. Fetch a matching Markdown page next; a cold reader does not need the full manifest or search index. This site tests a discovery budget of 6,000 tokens with the `cl100k_base` tokenizer, excluding the selected page. Other sites and tokenizers can differ.

- `search-index.min.json` adds page headings to titles, summaries, IDs, types, publication variants, and URLs. It omits article text and reader segments. It is generated whenever the full search index is enabled. Both are static files, not query endpoints.

- `search-index.json` lists page IDs, HTML and Markdown URLs, titles, summaries, headings, and text for the [search box](https://www.shoalrun.com/author/search.md) and local search command. The default lexical provider needs it; a custom provider can opt in.

- `/assets/search-provider.js` is the search provider module, built-in or custom.

When `site.origin` is set and indexing is enabled, the build writes `/sitemap.xml` with canonical HTML page URLs, `/llms.txt`, and optional page `lastmod` values. Markdown twins are alternate representations; their HTTP `Link` header names the HTML page as canonical. They are omitted from the sitemap. `/robots.txt` advertises it. Both derive from the same published pages as `documents.json`; `seo.noindex` pages are omitted. Large sitemaps are split into direct child URL sitemaps under a single index. The manifest records `sitemap`, and each document records `indexable` and optional `updated`.

The local frontmatter inventory and JSON Schema are build outputs in `.shoalrun/` beside `docs.config.yaml`. They are available to authors and agents in the repository. A site can also publish its current field inventory on an authored page with `<FrontmatterReference />`, as [this documentation site does](https://www.shoalrun.com/author/frontmatter-reference.md).

After publishing, run the [deployment checker](https://www.shoalrun.com/publish/deployment-check.md) against the live origin to verify the host serves these formats and discovery files with the expected response headers.

## Manifest records and sections

Every document record includes identity, publication, title, summary, page type, HTML/Markdown routes, `demo`, `subjectLifecycle`, `indexable`, `contentDigest`, `digest`, Markdown sizes, `sections`, breadcrumbs, dependency records, and focused-contract fields. The schemas define their exact shapes. `cardTargets` and `snippets` are arrays of document and snippet ID strings, respectively; card queries and API embeds are structured objects. API source `endpoint` can be null when no service endpoint is declared. A missing focused contract is represented by null URL, byte count, and digest.

`markdownBytes` counts the complete twin's UTF-8 bytes. `markdownTokens` counts the same content using the named `markdownTokenEncoding`, currently `cl100k_base`; special-token spellings in documentation count as ordinary text. These fields and `digest` are required producer output. Consumers can skip byte verification without treating the fields as optional.

Each record has a `sections` array, possibly empty. Each section has `id`, `title`, `depth: 2`, `markdownUrl`, `parentMarkdownUrl`, `parentDigest`, `digest`, and the three size/token fields. `standalone` is present as `true` only for an explicit author declaration. Its absence means no such declaration, not that a section has been proved incomplete.

Section files preserve the parent preamble, nested reader content, and applicable page reading paths. Generation requires a parent of at least 2,000 tokens and a section no larger than half the parent in both tokens and bytes. An empty array does not imply a page has no headings. Heading-derived IDs can change after renaming, insertion, or reordering; there are no permanent section IDs or automatic section redirects. See [section retrieval and citations](https://www.shoalrun.com/author/markdown-metadata.md) for the exact policy and full-page fallback.

Optional `subjectDeprecation` requires a deprecated subject and contains supplied dates or resolved replacement/migration targets. It does not require every deprecated subject to have dates or a replacement. Optional `change` requires a changelog entry, one of `editorial`, `procedure`, `behavior`, or `breaking`, a nonempty unique affected-ID list, and an optional migration target. Published targets include `id`, `title`, `url`, and `markdownUrl`, resolved to other public documents in the same publication. The build checks references and dates; it does not verify authored classification or retirement. See [page metadata](https://www.shoalrun.com/author/frontmatter.md) and [release notes](https://www.shoalrun.com/author/release-notes.md).

## Navigation section indexes

When top-level navigation groups use `tab: true`, both global text indexes link to a scoped text index per tab and publication. These indexes live under `/.well-known/shoalrun/navigation/`, with any site base path prepended. Follow their published URLs instead of constructing filenames. Each lists its member pages by title, stable ID, summary, and Markdown URL, and links back to the global index. Global discovery and search still include every published page, including shared and unlisted pages.

The manifest adds `navigationTabs`, an array of records with `id`, `label`, `variant`, `url` (the landing page), `markdownUrl` (that page's twin), and `indexUrl` (the scoped index). A member document carries the same record as `navigationTab`; a shared or unlisted page omits it. Both search indexes preserve that membership. The page and its section Markdown identify the tab and link to its index. Breadcrumbs include the tab, using the same resolved navigation as HTML.

An index belongs to one publication and contains all of its tab's public pages, regardless of browser reader choices. Changing tabs neither changes page URLs nor removes Markdown content. The generated agent documentation bundle retains the scoped indexes. Existing sites without tabs omit these fields and files. See [configure navigation tabs](https://www.shoalrun.com/author/navigation.md).

## Response identity

Markdown responses link to their current manifest array entry with `rel="describedby"` and a JSON Pointer fragment. The Node server uses the exact Markdown digest as a strong ETag. A CDN can substitute its own validator; use the returned ETag for conditional requests and the manifest digest for byte verification. Focused contracts use their full content digest in the filename, so their responses can be cached as immutable for one year. Markdown and mutable JSON metadata require revalidation. The [HTTP reference](https://www.shoalrun.com/publish/content-negotiation.md) explains the response headers and conditional requests.

## Incremental sync

`buildId` is a SHA-256 fingerprint of the assembled publication: HTML, Markdown, contracts, assets, and metadata. The compiler hashes route names and bytes in sorted route order before adding the build ID stamps and derived sync snapshot. Identical assembled output produces the same ID. A page edit changes it even when `configDigest` stays the same. Changing an asset or supplied release label also changes it. This identity does not promise byte-identical rendering across platforms.

`documents.json`, `build-info.json`, and `documents.sync.json` carry the same build ID. The sync snapshot contains one record per stable ID and publication variant:

| Field                | Meaning                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `id`, `variant`      | Page identity, including channel, version, and language.               |
| `url`, `markdownUrl` | Current HTML and Markdown routes.                                      |
| `digest`             | SHA-256 of the exact Markdown bytes.                                   |
| `contentDigest`      | Resolved content fingerprint used for freshness.                       |
| `recordDigest`       | SHA-256 of the canonical JSON manifest record, including its metadata. |

`contentDigest` is an opaque resolved-content change token, not a Markdown byte hash or a semantic-change classification. `recordDigest` hashes the full manifest record, not the smaller sync record. Do not reconstruct it from the sync fields alone. `buildId` is also opaque to consumers: hashing the final output directory does not reproduce the pre-stamp build calculation.

The snapshot's top-level `metadataDigest` covers manifest fields outside the document records, excluding build ID and dependency paths. A changed value tells a client to refresh the full manifest if it needs relationships, operations, redirects, or other global metadata. Canonical JSON sorts object keys and preserves array order.

A client can synchronize without downloading the full manifest on every build:

1. Save `/documents.sync.json` outside the site's output directory. The next build replaces that directory.
2. Poll `/build-info.json`. When its build ID is unchanged, keep the saved snapshot.
3. When the ID changes, fetch `/documents.sync.json`. Compare complete records by ID and publication variant, including routes, `recordDigest`, and `digest`; comparing only `contentDigest` misses changes. Refresh affected metadata when `recordDigest` changes, and fetch added or changed Markdown representations. If `metadataDigest` changes, refresh the manifest when your client uses global metadata. Remove deleted records from the local cache.
4. Verify fetched Markdown bytes against each record's `digest`. A match establishes agreement with the expected representation, not unique membership in one build: identical bytes can occur in multiple builds. A mismatch indicates disagreement; a deployment race is one possible cause. Discard the incomplete update and retry against a matching snapshot. Save the new baseline only after the required resources and metadata have been updated successfully.

The CLI compares two downloaded snapshots:

```sh
shoalrun docs changes current-sync.json --since previous-sync.json
```

It returns `fromBuildId`, `buildId`, `buildChanged`, `metadataChanged`, and `added`, `changed`, and `removed` record arrays. A route move is a change; a removed publication variant is a removal. Metadata-only page changes also appear in `changed`, even if the Markdown digest is unchanged. Asset-only changes can change the build ID with empty page arrays.

These are static files. The host retains no snapshot history and does not interpret `documents.json?since=...`. Clients retain their own baseline. Without one, use the current snapshot as a full initial inventory. A build ID identifies output; it does not archive earlier page bytes or record a build timestamp.

## Validate an existing build locally

From a repository checkout with development dependencies installed and the framework compiled, run:

```sh
node framework/scripts/check-output-contract.mjs docs/dist
```

Replace `docs/dist` with an already-built site's directory. The checker loads both schemas locally and makes no network requests. It checks field shapes, unique document identities, manifest/sync correspondence, build/config identity agreement, record and metadata hashes, same-publication change/deprecation targets, section parent linkage, and exact Markdown byte counts, token counts, and digests. It also verifies referenced focused-contract bytes. Unknown fields remain allowed and participate in the applicable record or metadata hash.

The report has `status`, `findings`, and document/section counts. A failure exits nonzero. The command never rebuilds, writes output, evaluates model tasks, or checks live hosting. The existing repository built-site check includes this check, so run either path rather than duplicating it for unchanged output. Use the [deployment checker](https://www.shoalrun.com/publish/deployment-check.md) separately for HTTP behavior.

Passing checks establish the specified structure and consistency, not authored truth, semantic completeness, or a fresh evaluation grade. The build identity is compared across files, not recomputed from final stamped artifacts. This contract does not add `llms-full.txt`, a public evaluation report, signatures, or an offline release archive.

## API contracts

Each endpoint has its own HTML and `.md` URL. Set `source.focused: true` to publish a small OpenAPI JSON contract for each operation. `source.publish: true` also publishes the full versioned source.

A focused contract contains one path and method plus the local schemas, named examples, and security schemes it needs. Its internal references remain usable, including recursive schemas. The endpoint Markdown stays readable; the JSON provides exact machine-readable shapes.

The document manifest reports each focused contract's URL, byte size, and digest. To check a built site, run:

```sh
node dist/cli.js api focused-audit <site-directory>
```

`source.publish: true` publishes a versioned OpenAPI download. Add an HTTPS `discovery.endpoint` and `site.origin` to also produce `/.well-known/api-catalog`. This documentation site declares no API service. The example project uses a reserved `.test` domain.

## Current limits

Focused export supports local OpenAPI 3.0.x and 3.1.x files, including multi-file references. JSON Schema IDs and anchors that change the base URI need a separate adapter. Remote sources still need a pinned local snapshot.

For config provenance, run `node framework/dist/cli.js config explain site.title docs/docs.config.yaml` from the repository root. The [CLI reference](https://www.shoalrun.com/cli.md) covers this and the other inspection commands.

## Code highlighting

Fenced code and OpenAPI examples use build-time highlighting. Shiki with the `site` theme, which follows the palette, is the default; plain code and project-local adapters are also supported. See [code highlighting with Shiki](https://www.shoalrun.com/author/components/code-blocks.md) for configuration, theme selection, supported grammars, and custom adapter requirements.

## Reader appearance and controls

Choose a [theme preset](https://www.shoalrun.com/styling/themes.md), [palette](https://www.shoalrun.com/styling/palettes.md), and [color mode](https://www.shoalrun.com/styling/color-modes.md) in the `theme` config. For anything else, add a project stylesheet with `site.customCss`; the [CSS reference](https://www.shoalrun.com/author/css.md) lists the tokens and selectors it can override. You don't need to edit the framework's own stylesheets.

The layout uses three columns for endpoint pages on wide screens. At narrower widths the examples follow the article; on small screens navigation becomes a disclosure above the page. Use Enter or Space to open it. Navigation filtering matches labels, ancestors, methods, and paths; Escape clears the filter. The active page remains marked in navigation.

Code blocks scroll horizontally without widening the page. Keyboard users can focus them to scroll, and copy buttons provide success or failure feedback. Copying uses the code text, so syntax-color spans never enter the clipboard. Clipboard access requires browser support and a secure context such as HTTPS or localhost. Without it, readers can select and copy manually. Without JavaScript, code highlighting and native disclosures remain available and mobile navigation starts expanded.

The overview, authoring guide, and endpoint fixture were checked in headless Chrome at desktop and 320 CSS-pixel widths, including navigation keyboard controls and filtering. Clipboard-handler checks verified the exact text passed to the browser API; normal-browser clipboard copying was verified on September 25, 2026. Manual 400% browser zoom was verified on September 26, 2026. The maintainer confirmed completion of manual screen-reader verification on September 30, 2026. See [project status](https://www.shoalrun.com/status.md) for validation evidence and remaining release checks.

## Related reading

### Next steps

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — See how these files help agents discover and read the site.
