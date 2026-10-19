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

## Page transitions

In browsers that support cross-document view transitions, the reading column fades between pages while the masthead and sidebar stay in place. Other browsers load pages as usual. The fade is off when the reader's system asks for reduced motion. To turn it off for every reader, add this rule to project CSS:

```css title="styles/project.css"
@view-transition { navigation: none; }
```

The publication label adjusts automatically. A single channel, version, and language leaves the top-right spot empty. When one dimension varies, only that dimension appears. Set `site.editionBadge: always` to show all three values or `site.editionBadge: never` to hide the label. `auto` is the default.
