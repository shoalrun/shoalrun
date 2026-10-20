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

Parent page: [Full Markdown page](/publish/output.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — See how these files help agents discover and read the site.

`shoalrun build` turns accepted source pages and local OpenAPI files into a static site. A **publication** is one enabled channel, version, and language combination, such as production, v1, and English. The build includes a public page only in publications matching its frontmatter. It makes no model calls or remote requests.

For each included page, the build writes an HTML page for browsing. It also writes a **Markdown twin**, a generated `.md` copy that agents can read as text. The Markdown twin can start with a short YAML header. That header contains only the page metadata selected in project config, so agents get useful context without a long source header or internal notes. Shared content appears in both bodies; authors can also add content to either format alone with [Only](https://www.shoalrun.com/author/components/only.md).

The site also includes a **document manifest**, `documents.json`, which indexes the built pages and their URLs. Projects with an API source can publish operation pages and **focused contracts**, small OpenAPI files containing one operation and the definitions it needs.

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
