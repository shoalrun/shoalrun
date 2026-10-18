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

## Navigation section indexes

When top-level navigation groups use `tab: true`, both global text indexes link to a scoped text index per tab and publication. These indexes live under `/.well-known/shoalrun/navigation/`, with any site base path prepended. Follow their published URLs instead of constructing filenames. Each lists its member pages by title, stable ID, summary, and Markdown URL, and links back to the global index. Global discovery and search still include every published page, including shared and unlisted pages.

The manifest adds `navigationTabs`, an array of records with `id`, `label`, `variant`, `url` (the landing page), `markdownUrl` (that page's twin), and `indexUrl` (the scoped index). A member document carries the same record as `navigationTab`; a shared or unlisted page omits it. Both search indexes preserve that membership. The page and its section Markdown identify the tab and link to its index. Breadcrumbs include the tab, using the same resolved navigation as HTML.

An index belongs to one publication and contains all of its tab's public pages, regardless of browser reader choices. Changing tabs neither changes page URLs nor removes Markdown content. The generated agent documentation bundle retains the scoped indexes. Existing sites without tabs omit these fields and files. See [configure navigation tabs](https://www.shoalrun.com/author/navigation.md).
