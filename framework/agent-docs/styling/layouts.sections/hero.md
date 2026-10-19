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
