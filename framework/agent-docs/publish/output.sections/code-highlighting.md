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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Generated outputs

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/publish/output.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — See how these files help agents discover and read the site.

`shoalrun build` turns accepted source pages and local OpenAPI files into a static site. A **publication** is one enabled channel, version, and language combination, such as production, v1, and English. The build includes a public page only in publications matching its frontmatter. It makes no model calls or remote requests.

For each included page, the build writes an HTML page for browsing. It also writes a **Markdown twin**, a generated `.md` copy that agents can read as text. The Markdown twin can start with a short YAML header. That header contains only the page metadata selected in project config, so agents get useful context without a long source header or internal notes. Shared content appears in both bodies; authors can also add content to either format alone with [Only](https://www.shoalrun.com/author/components/only.md).

The site also includes a **document manifest**, `documents.json`, which indexes the built pages and their URLs. Projects with an API source can publish operation pages and **focused contracts**, small OpenAPI files containing one operation and the definitions it needs.

## Code highlighting

Fenced code and OpenAPI examples use build-time highlighting. Shiki with the `site` theme, which follows the palette, is the default; plain code and project-local adapters are also supported. See [code highlighting with Shiki](https://www.shoalrun.com/author/components/code-blocks.md) for configuration, theme selection, supported grammars, and custom adapter requirements.
