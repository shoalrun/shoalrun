---
id: guide.layouts
title: Page layouts, landing pages, and splash pages
summary: Give a page more width, or build a landing or full-bleed splash page
  with a Hero and Sections, using the layout frontmatter field.
type: reference
canonical: /styling/layouts
---

# Page layouts, landing pages, and splash pages

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Page layouts, landing pages, and splash pages

**Updated: 2026-10-17.**

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

## Build a landing page

Set `layout: landing`, then open the page with a `Hero`. To serve the page at the site root, give it `slug: /`. When a page has `slug: /`, the site title in the masthead links to it. This example is a small landing page:

```mdx title="content/home.mdx"
---
id: guide.home
title: Shoalrun
summary: Payments for small teams, in five lines of code.
type: overview
slug: /
layout: landing
access: { policy: public }
---

<Hero tagline="Take your first payment in five lines of code.">
  [Start building](doc:guide.overview)
  [See how it works](doc:guide.concepts)
</Hero>

## Start here

<DocCards docs={["guide.overview", "guide.concepts", "guide.api-references"]} />
```
