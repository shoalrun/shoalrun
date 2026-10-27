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

**Updated: 2026-10-25.**

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

## Status, code, and callout tokens

Use these tokens to style status messages, code examples, and callouts.

| Token                                                             | Controls                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--color-presence-bg`, `--color-presence-text`                    | Required field badge.                                                                                                                                                                                                                                              |
| `--color-optional-bg`, `--color-optional-text`                    | Optional field badge.                                                                                                                                                                                                                                              |
| `--color-deprecated-bg`, `--color-deprecated-text`                | Deprecated subject lifecycle badge.                                                                                                                                                                                                                                |
| `--color-beta-bg`, `--color-beta-text`                            | Beta subject lifecycle badge.                                                                                                                                                                                                                                      |
| `--color-development-bg`, `--color-development-text`              | In-development subject lifecycle badge.                                                                                                                                                                                                                            |
| `--color-experimental-bg`, `--color-experimental-text`            | Experimental subject lifecycle badge.                                                                                                                                                                                                                              |
| `--color-code-bg`                                                 | Inline code background.                                                                                                                                                                                                                                            |
| `--color-code-text`                                               | Plain code text on dark blocks.                                                                                                                                                                                                                                    |
| `--color-code-muted`                                              | Code toolbar label.                                                                                                                                                                                                                                                |
| `--color-code-border`                                             | Code toolbar and button border.                                                                                                                                                                                                                                    |
| `--color-code-block`                                              | Code block background. It takes effect only when the build writes `palette.css`: any palette or mode other than the default `kelp` in light mode. Otherwise, code blocks use `--color-ink`; to change them there, style `.code-block` and `.content pre` directly. |
| `--color-callout-line`                                            | Callout left rule.                                                                                                                                                                                                                                                 |
| `--color-callout-bg`                                              | Callout background.                                                                                                                                                                                                                                                |
| `--color-callout-{note,tip,important,warning,caution}-line`       | Left rule for each typed callout.                                                                                                                                                                                                                                  |
| `--color-callout-{note,tip,important,warning,caution}-bg`         | Background for each typed callout.                                                                                                                                                                                                                                 |
| `--color-callout-{note,tip,important,warning,caution}-text`       | Label text for each typed callout.                                                                                                                                                                                                                                 |
| `--callout-dark-line`, `--callout-dark-bg`, `--callout-dark-text` | Dark-mode colors for a [custom callout tone](https://www.shoalrun.com/author/components/callout.md) with a `dark` block. The build sets them on the callout along with a `data-callout-dark` attribute.                                                            |

### Preset-specific tokens

Some [presets](https://www.shoalrun.com/styling/themes.md) define extra tokens in their own stylesheet. They apply only when that preset is active:

| Preset   | Token            | Controls                                                |
| -------- | ---------------- | ------------------------------------------------------- |
| `ledger` | `--font-ui`      | Interface labels; defaults to `--font-code`.            |
| `ledger` | `--font-heading` | Set to `--font-ui`, so headings use the monospace font. |
| `vice`   | `--font-display` | Display type for the site title, headings, and labels.  |
| `vice`   | `--font-heading` | Set to `--font-display`.                                |
| `vice`   | `--sunset`       | The gradient used for accents.                          |
| `reef`   | `--shadow-panel` | Panel and card shadow.                                  |

The default `site` code theme colors code text with `--code-foreground` and tokens with `--code-token-keyword`, `--code-token-string`, `--code-token-string-expression`, `--code-token-constant`, `--code-token-function`, `--code-token-parameter`, `--code-token-link`, `--code-token-comment`, and `--code-token-punctuation`. Palettes set the token colors from their dark set; `--code-foreground` and the comment and punctuation colors follow `--color-code-text` and `--color-code-muted`. Project CSS can override any of them. A named Shiki theme puts its colors directly on highlighted tokens instead. A light Shiki theme also sets the code block background; a dark theme leaves it to `--color-code-block`. To change those colors, set `outputs.html.highlighting.theme` to another bundled theme or use a custom highlighting adapter. The [code highlighting guide](https://www.shoalrun.com/author/components/code-blocks.md) documents those settings.
