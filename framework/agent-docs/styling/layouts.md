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

**Updated: 2026-10-26.**

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

## Hero

`Hero` opens a landing page with a large title, a tagline, and up to three action buttons. It can also show an image or a code block beside the text.

| Attribute  | Required     | Meaning                                                                                     |
| ---------- | ------------ | ------------------------------------------------------------------------------------------- |
| `tagline`  | Yes          | One or two sentences under the title.                                                       |
| `title`    | No           | The large title. Defaults to the page `title`.                                              |
| `align`    | No           | `center` (default) or `start`, which aligns the title, tagline, and buttons to the left.    |
| `image`    | No           | An https URL, or a local `.png`, `.jpg`, `.webp`, or `.svg` file relative to the page file. |
| `imageAlt` | With `image` | What the image shows. Use `imageAlt=""` when the image is decorative.                       |

Put the actions in the body as ordinary Markdown links, one per line or as a list. The first link is the primary button. `doc:` links resolve by page ID, like everywhere else.

### Show an image or code

Add `image` and `imageAlt` to show a picture beside the text. The build copies a local image to `/assets/pages/<page path>/`.

```mdx
<Hero tagline="Payments in five lines of code." image="./images/dashboard.png" imageAlt="The payments dashboard showing today's volume">
  [Get started](doc:guide.start)
</Hero>
```

Or put one fenced code block in the body. It appears in an editor-style window with its title and a Copy button, and keeps the site's code colors. The home page of this site uses one.

````mdx
<Hero tagline="Build API documentation from Markdown, MDX, and OpenAPI.">
  [Start building](doc:guide.overview)

  ```sh title="Build and preview this site"
  npm ci --prefix framework
  npm run docs:dev
  ```
</Hero>
````

With an image or code block, the hero splits into two columns, text first, and aligns to the left. Below `60rem` wide, the visual moves under the text. A hero can show an image or a code block, not both.

### Rules

- `Hero` needs `layout: landing` or `layout: splash`, and it replaces the page header, including the **Read as Markdown** link. Put it first on the page.
- Attributes are literal text. The body can contain only action links and one code block; other content fails the build.
- In the Markdown twin, `Hero` becomes the tagline, a list of its links, then its image (when `imageAlt` isn't empty) or its code block. A custom `title` that differs from the page title appears in bold before the tagline.

Landing pages are centered and at most `76rem` wide, and the masthead lines up with them. On a phone, the hero stacks its buttons.

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

## Customize the hero

Each preset styles the hero its own way. `shoal` adds a soft accent glow, and `reef` uses a tinted panel with pill buttons. `ledger` sets it in an inked band, and `vice` in a night sky with a sunset stripe.

To change it for your site, use [project CSS](https://www.shoalrun.com/author/css.md). The hero is a `section.hero` containing `.hero-title`, `.hero-tagline`, and `.hero-actions`. Its buttons are `.hero-primary` and `.hero-secondary`. Set `--landing-width` to change the landing page width:

```css title="styles/project.css"
:root { --landing-width: 64rem; }
.content .hero { background: linear-gradient(135deg, #0b3d2e, #14532d); }
.content .hero-title, .content .hero-tagline { color: #fff; }
```

Keep text readable against any background you choose. The build checks palette colors for contrast, but not project CSS.

## Related reading

### Reference while working

- [CSS and theme reference](https://www.shoalrun.com/author/css.md) — Look up the width tokens and layout selectors.
