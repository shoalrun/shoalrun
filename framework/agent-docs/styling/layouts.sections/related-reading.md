---
id: guide.layouts
title: Page layouts, landing pages, and splash pages
summary: Give a page more width, or build a landing or full-bleed splash page
  with a Hero and Sections, using the layout frontmatter field.
type: reference
area: appearance
subarea: appearance-layouts
canonical: /styling/layouts
---

# Page layouts, landing pages, and splash pages

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Page layouts, landing pages, and splash pages

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/styling/layouts.md)

Every page uses the `docs` layout unless its frontmatter sets `layout`. Layouts change the HTML page only. The Markdown twin, search, and `llms.txt` stay the same.

| Layout    | Sidebar | On this page | Use it for                                                                                                               |
| --------- | ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `docs`    | Yes     | Yes          | Guides and reference pages. This is the default.                                                                         |
| `wide`    | Yes     | No           | Wide tables, diagrams, and API overviews that need the full content width.                                               |
| `landing` | No      | No           | Home pages and product entry points. A `Hero` replaces the page header.                                                  |
| `splash`  | No      | No           | Marketing pages built from full-width bands. A `Hero` replaces the page header, and `Section` blocks stack edge to edge. |

```yaml title="Frontmatter"
layout: wide
```

An unknown value fails the build. Each preset styles all four layouts, and project CSS can target one through `html[data-layout="wide"]`, `html[data-layout="landing"]`, or `html[data-layout="splash"]`.

## Related reading

### Reference while working

- [CSS and theme reference](https://www.shoalrun.com/author/css.md) — Look up the width tokens and layout selectors.
