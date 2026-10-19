---
id: guide.css
title: CSS and theme reference
summary: Customize colors, typography, layout, navigation, code, and component
  styles with one project stylesheet.
type: reference
area: appearance
subarea: appearance-themes
canonical: /author/css
---

# CSS and theme reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > CSS and theme reference

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/css.md)

The built site loads `/assets/site.css`, which imports `/assets/tokens.css`. To customize a project, set `site.customCss` to a local stylesheet. The build copies it to `/assets/project.css` and links it after the framework CSS on every HTML page. Paths resolve from the config file that declares them, including imported config fragments. The stylesheet is a build dependency, so changes are picked up on rebuild.

```yaml title="docs.config.yaml"
site:
  title: Example documentation
  customCss: ./styles/project.css
```

```css title="styles/project.css"
:root {
  --font-body: Inter, ui-sans-serif, system-ui, sans-serif;
  --color-accent: #2458a6;
  --color-link: #2458a6;
  --width-site: 92rem;
}
.page-head h1 { letter-spacing: -.02em; }
```

Pages link these stylesheets in order, and later files win: `/assets/site.css` (which imports `tokens.css` and `header.css`), a preset's `/assets/theme.css`, the generated `/assets/palette.css`, the generated `/assets/fonts.css`, then `/assets/project.css`. [Themes](https://www.shoalrun.com/styling/themes.md) lists when each one is present.

To use your own font files, set [`theme.fonts`](https://www.shoalrun.com/styling/themes.md) instead of writing `@font-face` rules here. The build then copies the files, preloads the body font, and sets `--font-body`, `--font-heading`, and `--font-code` for you.

Use tokens for broad changes and the generated classes below for a particular region. The project stylesheet is copied as one file; relative images or `@import` files are not copied automatically. Use site-root URLs for separately hosted assets. Markdown twins contain content, not CSS.

Before writing CSS, check whether a [theme preset](https://www.shoalrun.com/styling/themes.md), [palette](https://www.shoalrun.com/styling/palettes.md), or [color mode](https://www.shoalrun.com/styling/color-modes.md) already covers the change. Project CSS loads after all three, so the tokens below override them. The build checks palette colors for contrast. It does not check colors set here.

Inline [badges](https://www.shoalrun.com/author/components/badge.md) use `--color-field-surface`, `--color-ink`, and `--color-border` for `neutral`; `info`, `success`, `warning`, and `new` use the matching callout note, tip, warning, and important tokens. Register a color in `badges.variants` to add or override a variant with checked light and dark text contrast. The generated `/assets/badges.css` loads after palette CSS and before project CSS.

## Responsive behavior

Above `72rem`, every page reserves the same right column so the article stays in place when moving between pages with and without a ToC. A ToC appears there as a sticky outline, and the API data panel shares that rail. At `72rem` and below, the rail moves below the article column. At `48rem` and below, the navigation and the outline become two compact buttons, **Menu** and **On this page**, side by side above the article. Each opens to the full width, and both start closed so the page title is on the first screen. The page's `tocDepth` frontmatter controls which headings appear in the outline, and `0` hides it. See the [frontmatter guide](https://www.shoalrun.com/author/frontmatter.md) for examples.

As the reader scrolls, the outline marks the current section with `aria-current="location"`. Style it with `.page-toc a[aria-current]`.

The reader script adds a link icon beside each article heading from level two to four. Selecting it copies the section URL and puts it in the address bar. Without clipboard access, the icon works as an ordinary link. The icon isn't part of the page source, so it doesn't appear in Markdown twins or search results.
