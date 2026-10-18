---
id: guide.output
title: Publishing and agent representations
summary: Read the published-output contract for HTML, Markdown, manifests, and
  incremental sync.
type: reference
canonical: /publish/output
---

# Publishing and agent representations

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Generated outputs

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/publish/output.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — See how these files help agents discover and read the site.

`shoalrun build` turns accepted source pages and local OpenAPI files into a static site. A **publication** is one enabled channel, version, and language combination, such as production, v1, and English. The build includes a public page only in publications matching its frontmatter. It makes no model calls or remote requests.

For each included page, the build writes an HTML page for browsing. It also writes a **Markdown twin**, a generated `.md` copy that agents can read as text. The Markdown twin can start with a short YAML header. That header contains only the page metadata selected in project config, so agents get useful context without a long source header or internal notes. Shared content appears in both bodies; authors can also add content to either format alone with [Only](https://www.shoalrun.com/author/components/only.md).

The site also includes a **document manifest**, `documents.json`, which indexes the built pages and their URLs. Projects with an API source can publish operation pages and **focused contracts**, small OpenAPI files containing one operation and the definitions it needs.

## Manifest records and sections

Every document record includes identity, publication, title, summary, page type, HTML/Markdown routes, `demo`, `subjectLifecycle`, `indexable`, `contentDigest`, `digest`, Markdown sizes, `sections`, breadcrumbs, dependency records, and focused-contract fields. The schemas define their exact shapes. `cardTargets` and `snippets` are arrays of document and snippet ID strings, respectively; card queries and API embeds are structured objects. API source `endpoint` can be null when no service endpoint is declared. A missing focused contract is represented by null URL, byte count, and digest.

`markdownBytes` counts the complete twin's UTF-8 bytes. `markdownTokens` counts the same content using the named `markdownTokenEncoding`, currently `cl100k_base`; special-token spellings in documentation count as ordinary text. These fields and `digest` are required producer output. Consumers can skip byte verification without treating the fields as optional.

Each record has a `sections` array, possibly empty. Each section has `id`, `title`, `depth: 2`, `markdownUrl`, `parentMarkdownUrl`, `parentDigest`, `digest`, and the three size/token fields. `standalone` is present as `true` only for an explicit author declaration. Its absence means no such declaration, not that a section has been proved incomplete.

Section files preserve the parent preamble, nested reader content, and applicable page reading paths. Generation requires a parent of at least 2,000 tokens and a section no larger than half the parent in both tokens and bytes. An empty array does not imply a page has no headings. Heading-derived IDs can change after renaming, insertion, or reordering; there are no permanent section IDs or automatic section redirects. See [section retrieval and citations](https://www.shoalrun.com/author/markdown-metadata.md) for the exact policy and full-page fallback.

Optional `subjectDeprecation` requires a deprecated subject and contains supplied dates or resolved replacement/migration targets. It does not require every deprecated subject to have dates or a replacement. Optional `change` requires a changelog entry, one of `editorial`, `procedure`, `behavior`, or `breaking`, a nonempty unique affected-ID list, and an optional migration target. Published targets include `id`, `title`, `url`, and `markdownUrl`, resolved to other public documents in the same publication. The build checks references and dates; it does not verify authored classification or retirement. See [page metadata](https://www.shoalrun.com/author/frontmatter.md) and [release notes](https://www.shoalrun.com/author/release-notes.md).
