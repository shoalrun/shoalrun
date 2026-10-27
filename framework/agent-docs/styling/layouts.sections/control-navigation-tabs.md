---
id: guide.layouts
title: Page layouts, landing pages, and splash pages
summary: Configure wide, landing, and splash pages with Hero and Sections.
type: reference
area: appearance
subarea: appearance-layouts
canonical: /styling/layouts
---

# Page layouts, landing pages, and splash pages

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Configure and customize > Page layouts, landing pages, and splash pages

**Updated: 2026-10-27.**

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

## Control navigation tabs

The built-in layouts are `docs`, `wide`, `landing`, and `splash`. There is no `custom` layout value; use landing or splash for a custom entry page and style it with project CSS.

When the site config defines navigation tabs, docs and wide pages show the section bar by default. Landing and splash pages hide it by default. Override that choice on any page:

```yaml title="Frontmatter"
layout: splash
showNavigationTabs: false
```

Set `showNavigationTabs: true` to include the tab bar on a landing or splash page. Set it to `false` to suppress it on a docs or wide page. The value must be a boolean and can also come from frontmatter defaults or enforced values. With no configured tabs, neither value creates a bar.

This setting affects the HTML section bar only. It does not change the page's sidebar, tab membership, breadcrumbs, Markdown, search records, or agent indexes. An agent can still discover and read every published section without visiting the homepage.
