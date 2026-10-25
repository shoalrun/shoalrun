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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Page layouts, landing pages, and splash pages

**Updated: 2026-10-24.**

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

## Customize the hero

Each preset styles the hero its own way. `shoal` adds a soft accent glow, and `reef` uses a tinted panel with pill buttons. `ledger` sets it in an inked band, and `vice` in a night sky with a sunset stripe.

To change it for your site, use [project CSS](https://www.shoalrun.com/author/css.md). The hero is a `section.hero` containing `.hero-title`, `.hero-tagline`, and `.hero-actions`. Its buttons are `.hero-primary` and `.hero-secondary`. Set `--landing-width` to change the landing page width:

```css title="styles/project.css"
:root { --landing-width: 64rem; }
.content .hero { background: linear-gradient(135deg, #0b3d2e, #14532d); }
.content .hero-title, .content .hero-tagline { color: #fff; }
```

Keep text readable against any background you choose. The build checks palette colors for contrast, but not project CSS.
