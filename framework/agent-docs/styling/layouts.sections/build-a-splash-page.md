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

## Build a splash page

A splash page is a marketing page. Set `layout: splash`, open with a `Hero`, then build the rest from `Section` blocks. The layout removes the sidebar, the outline, and the content padding, so the hero and each section run edge to edge. This site's home page is a working example.

```mdx title="content/home.mdx"
---
id: guide.home
title: Acme
summary: Payments for small teams.
type: overview
slug: /
layout: splash
access: { policy: public }
---

<Hero tagline="Take your first payment in five lines of code.">
  [Start building](doc:guide.overview)
</Hero>

<Section id="features">

## Why Acme

Fast, simple, and built for small teams.

</Section>

<Section id="pricing" variant="raised">

## Pricing

<DocCards docs={["guide.pricing"]} />

</Section>
```

`Section` wraps ordinary page content, such as headings, paragraphs, cards, tabs, tables, and code blocks. It centers that content in a column at most `--landing-width` wide, and its background runs the full width of the page.

| Attribute | Required | Meaning                                                                                                                                                                                                                                                     |
| --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`      | No       | An anchor for the section. Use lowercase letters, numbers, and dashes. It can't match a heading anchor on the page.                                                                                                                                         |
| `variant` | No       | A name for the section's look, in lowercase letters, numbers, and dashes. It becomes `data-variant` in the HTML. `raised` is built in and gives the section a tinted band. Style any other name with [project CSS](https://www.shoalrun.com/author/css.md). |

Two rules keep the page predictable:

- `Section` needs `layout: splash`, and it can't contain another `Section`.
- Content that sits outside a `Section` runs edge to edge, so put page content in a section.

In the Markdown twin, a `Section` disappears and its content stays in order. Your styling, and any script you add, changes the HTML page only.

Each section is a `section.splash-section` holding a `div.splash-inner`. To restyle a section, target `.splash-section[data-variant="pricing"]` in project CSS. The layout gives you a blank, full-width canvas, so backgrounds, spacing, and motion are yours to design.
