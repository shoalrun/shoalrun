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

## Page formats

Both formats come from the same parsed content. Supported components preserve their documented shared content in Markdown: tab choices, disclosure bodies, reader-marked branches, table rows, resolved snippets, and API examples retain readable content and relevant labels. Unknown components and unsupported dynamic MDX fail compilation. Explicit format-specific branches follow author selection; authors must review equivalent task guidance and completeness. Rendering checks do not prove semantic equivalence or that a reader has every prerequisite. [Tabs](https://www.shoalrun.com/author/components/tabs.md) become labeled sections in Markdown. [OpenAPI examples and schemas](https://www.shoalrun.com/author/components/api-embeds.md) are expanded during the build, so their values and field details appear as readable text in the twin. A [filtered or sticky table](https://www.shoalrun.com/author/components/tables.md) keeps every row as a plain table in Markdown.

Write links in page content as `doc:` IDs, site paths, or relative paths such as `[Next](./next)` and `[Overview](../overview)`. Shoalrun resolves relative paths against the current page's published route. For a page at `/guides/setup`, `./next` resolves to `/guides/next`. HTML links use site paths, so local previews stay local; links to known pages in Markdown twins point to their `.md` routes. Set `site.origin` to publish full HTTPS links in Markdown twins and `/llms.txt`, so a fetched Markdown page keeps working outside the site's browser context. Fragment-only links such as `#options` stay local to the page. Explicit external URLs keep their original host.

`<Only format="html">` adds content to the HTML page alone; `<Only format="markdown">` adds it to the twin alone. For example, an HTML instruction to choose an interactive tab can be replaced with a Markdown instruction to read the labeled sections. An agent fetching the `.md` URL or negotiating Markdown receives the shared content and the Markdown-only instruction. See the [Only component guide](https://www.shoalrun.com/author/components/only.md) for a live example and the exact Markdown line it produces.

The HTML page links to its Markdown twin. The [Markdown metadata guide](https://www.shoalrun.com/author/markdown-metadata.md) explains how to choose the metadata in its YAML header.

See [agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) for how agents discover and use these outputs, including `/llms.txt` and the API catalog.
