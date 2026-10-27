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

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/output.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — See how these files help agents discover and read the site.

`shoalrun build` turns accepted source pages and local OpenAPI files into a static site. A **publication** is one enabled channel, version, and language combination, such as production, v1, and English. The build includes a public page only in publications matching its frontmatter. It makes no model calls or remote requests.

For each included page, the build writes an HTML page for browsing. It also writes a **Markdown twin**, a generated `.md` copy that agents can read as text. The Markdown twin can start with a short YAML header. That header contains only the page metadata selected in project config, so agents get useful context without a long source header or internal notes. Shared content appears in both bodies; authors can also add content to either format alone with [Only](https://www.shoalrun.com/author/components/only.md).

The site also includes a **document manifest**, `documents.json`, which indexes the built pages and their URLs. Projects with an API source can publish operation pages and **focused contracts**, small OpenAPI files containing one operation and the definitions it needs.

## Reader appearance and controls

Choose a [theme preset](https://www.shoalrun.com/styling/themes.md), [palette](https://www.shoalrun.com/styling/palettes.md), and [color mode](https://www.shoalrun.com/styling/color-modes.md) in the `theme` config. For anything else, add a project stylesheet with `site.customCss`; the [CSS reference](https://www.shoalrun.com/author/css.md) lists the tokens and selectors it can override. You don't need to edit the framework's own stylesheets.

The layout uses three columns for endpoint pages on wide screens. At narrower widths the examples follow the article; on small screens navigation becomes a disclosure above the page. Use Enter or Space to open it. Navigation filtering matches labels, ancestors, methods, and paths; Escape clears the filter. The active page remains marked in navigation.

Code blocks scroll horizontally without widening the page. Keyboard users can focus them to scroll, and copy buttons provide success or failure feedback. Copying uses the code text, so syntax-color spans never enter the clipboard. Clipboard access requires browser support and a secure context such as HTTPS or localhost. Without it, readers can select and copy manually. Without JavaScript, code highlighting and native disclosures remain available and mobile navigation starts expanded.

The overview, authoring guide, and endpoint fixture were checked in headless Chrome at desktop and 320 CSS-pixel widths, including navigation keyboard controls and filtering. Clipboard-handler checks verified the exact text passed to the browser API; normal-browser clipboard copying was verified on September 25, 2026. Manual 400% browser zoom was verified on September 26, 2026. The maintainer confirmed completion of manual screen-reader verification on September 30, 2026. See [project status](https://www.shoalrun.com/status.md) for validation evidence and remaining release checks.
