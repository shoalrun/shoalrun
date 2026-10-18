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

## API contracts

Each endpoint has its own HTML and `.md` URL. Set `source.focused: true` to publish a small OpenAPI JSON contract for each operation. `source.publish: true` also publishes the full versioned source.

A focused contract contains one path and method plus the local schemas, named examples, and security schemes it needs. Its internal references remain usable, including recursive schemas. The endpoint Markdown stays readable; the JSON provides exact machine-readable shapes.

The document manifest reports each focused contract's URL, byte size, and digest. To check a built site, run:

```sh
node dist/cli.js api focused-audit <site-directory>
```

`source.publish: true` publishes a versioned OpenAPI download. Add an HTTPS `discovery.endpoint` and `site.origin` to also produce `/.well-known/api-catalog`. This documentation site declares no API service. The example project uses a reserved `.test` domain.
