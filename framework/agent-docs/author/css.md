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

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Output and presentation > CSS and theme reference

**Updated: 2026-10-27.**

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

## Typography, shape, and width tokens

Use these tokens to adjust text, corner shapes, and content widths.

| Token                                   | Controls                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `--font-body`                           | Body and interface font stack.                                                                                                        |
| `--font-code`                           | Inline code, blocks, and small technical labels.                                                                                      |
| `--font-heading`                        | Page titles and section headings. Defaults to `--font-body`.                                                                          |
| `--radius-small`                        | Inputs, small panels, code, tabs, and disclosures.                                                                                    |
| `--radius-panel`                        | Larger cards and example panels.                                                                                                      |
| `--shadow-edge`                         | A faint outline and top highlight on code blocks and `reef` panels. Empty in light mode; palettes set it in dark mode.                |
| `--width-site`                          | Maximum width of the page shell, whether or not a right rail is present.                                                              |
| `--width-reference`                     | Maximum width of the masthead.                                                                                                        |
| `--landing-width`                       | Maximum width of a `landing` page, a `splash` section, and their masthead. Defaults to `76rem`.                                       |
| `--nav-item-height`, `--nav-item-pad-y` | Height and vertical padding of navigation rows. Rows are 44px tall for touch and 32px tall with a mouse or trackpad on wider screens. |

Each preset's font stack starts with its bundled font, followed by a matching fallback face named after it, such as `"Inter Fallback"`. The fallback is a local system font resized to the bundled font's metrics, so text keeps its place while the font loads. `fonts.css` defines these faces; with `theme.fonts: system`, the build omits them and the stacks fall through to system fonts.

The root text size is `16px` and line height is `1.65` in `site.css`. Override `:root` in the project stylesheet if the whole site needs different type scale. Article paragraphs, headings, and code blocks also have local sizes that can be overridden by their selectors.

## Core color tokens

These tokens control the main surface, text, and accent colors.

| Token                                           | Controls                                                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `--color-text`                                  | Default body text.                                                                                                           |
| `--color-page`                                  | Page background.                                                                                                             |
| `--color-surface`                               | Panels and masthead background.                                                                                              |
| `--color-ink`                                   | Strong headings and controls.                                                                                                |
| `--color-link`                                  | Links at rest.                                                                                                               |
| `--color-link-hover`                            | Hovered links.                                                                                                               |
| `--color-focus`                                 | Keyboard focus outline.                                                                                                      |
| `--color-accent`                                | Brand mark and active navigation accent.                                                                                     |
| `--color-accent-contrast`                       | Text on accent fills, such as a primary header link. Defaults to `#fff`.                                                     |
| `--color-strong-surface`, `--color-strong-text` | Inked bands and their text, such as the `ledger` masthead and selected tabs. Default to `--color-ink` and `--color-surface`. |
| `--color-muted`                                 | Secondary text and markers.                                                                                                  |
| `--color-emphasis`                              | Eyebrows, markers, and card icons.                                                                                           |
| `--color-summary`                               | Page summary text.                                                                                                           |
| `--color-section-heading`                       | Smaller headings and tab labels.                                                                                             |

## Borders, fields, and navigation tokens

These tokens control boundaries, input fields, and navigation states.

| Token                     | Controls                               |
| ------------------------- | -------------------------------------- |
| `--color-header-muted`    | Publication label text.                |
| `--color-header-border`   | Publication label border.              |
| `--color-border`          | Main outlines and dividers.            |
| `--color-border-soft`     | Quiet separators within content.       |
| `--color-border-nested`   | Nested navigation and lists.           |
| `--color-field-surface`   | Tables, tabs, and input surfaces.      |
| `--color-field-border`    | Active disclosure and input border.    |
| `--color-field-accent`    | Card hover and field accent.           |
| `--color-nav-heading`     | Left navigation group heading.         |
| `--color-nav-text`        | Left navigation links.                 |
| `--color-nav-hover`       | Hovered navigation and format control. |
| `--color-nav-active`      | Current-page navigation background.    |
| `--color-nav-active-text` | Current-page navigation text.          |

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

## Layout and component selectors

Use these selectors when a change needs to target a specific region or component state.

| Selector                                                                                                                                                                                                                 | Region or state                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.mast`, `.mast-inner`, `.brand`, `.edition`, `.publication-switcher`                                                                                                                                                    | Header, site name, publication label, and version menu. `.brand` is a link to `/` when the site has a page with `slug: /`; otherwise it's plain text.                                                                                        |
| `.mast-tools`, `.header-actions`, `.header-link`, `.header-button`, `.header-primary`                                                                                                                                    | [Header links](https://www.shoalrun.com/styling/header.md) and their styles.                                                                                                                                                                 |
| `.mode-toggle`, `.mode-toggle-label`, `.mode-icon-light`, `.mode-icon-dark`                                                                                                                                              | [Light and dark mode](https://www.shoalrun.com/styling/color-modes.md) toggle.                                                                                                                                                               |
| `.site-search`, `#site-search-input`, `.site-search-label`, `.site-search-key`, `.site-search-status`, `.site-search-results`, `.search-hit-title`, `.search-hit-section`, `.search-hit-summary`, `.site-search-empty`   | [Search box](https://www.shoalrun.com/author/search.md), its shortcut hint, status text, and result list.                                                                                                                                    |
| `.skip`                                                                                                                                                                                                                  | Keyboard skip link to main content.                                                                                                                                                                                                          |
| `.site-footer`, `.footer-inner`, `.footer-columns`, `.footer-column`, `.footer-title`, `.footer-bottom`, `.footer-text`, `.footer-links`                                                                                 | The [site footer](https://www.shoalrun.com/styling/footer.md), its link columns and titles, and the bottom row with its text line and links.                                                                                                 |
| `.layout`, `.layout.has-rail`, `.layout.has-examples`                                                                                                                                                                    | Main grid and its right-rail variants.                                                                                                                                                                                                       |
| `.layout.layout-wide`, `.layout.layout-landing`, `.layout.layout-splash`                                                                                                                                                 | The `wide`, `landing`, and `splash` [page layouts](https://www.shoalrun.com/styling/layouts.md).                                                                                                                                             |
| `.splash-section`, `.splash-inner`, `[data-variant]`                                                                                                                                                                     | A [Section](https://www.shoalrun.com/styling/layouts.md) on a splash page, the centered column inside it, and the author's variant name. `data-variant="raised"` is built in.                                                                |
| `.side`, `.nav-disclosure`, `.nav-body`, `.nav-tree`, `.nav-group`, `.nav-entry`                                                                                                                                         | Left navigation and group disclosures.                                                                                                                                                                                                       |
| `.heading-anchor`, `.heading-anchor[data-copied]`                                                                                                                                                                        | The link icon added beside article headings. It copies the section URL and carries `data-copied` for two seconds afterward.                                                                                                                  |
| `.nav-tools`, `.nav-count`                                                                                                                                                                                               | Navigation controls and group counts.                                                                                                                                                                                                        |
| `.nav-search`, `#nav-filter`, `.nav-filter-status`                                                                                                                                                                       | Navigation filter and result count.                                                                                                                                                                                                          |
| `.reader-filter-slot`, `.reader-filter-control`, `.reader-filter-controls`, `.reader-filter-field`, `.reader-filter-actions`, `.reader-outside-view`, `.reader-choice`                                                   | [Reader view](https://www.shoalrun.com/author/reader-views.md) controls, direct-link notice, and choice buttons. `[data-reader-hidden]` marks filtered navigation entries; `hidden` marks filtered cards and sections.                       |
| `.page-rail`, `.page-toc`, `.toc-disclosure`, `.toc-depth-2`, `.toc-depth-3`, `.toc-depth-4`, `.toc-depth-5`, `.toc-depth-6`                                                                                             | Right-side heading outline and depth indentation.                                                                                                                                                                                            |
| `.content`, `.page-head`, `.eyebrow`, `.summary`, `.formats`, `.content article`                                                                                                                                         | Reading column and page header.                                                                                                                                                                                                              |
| `.api-reference`, `.endpoint-route`, `.endpoint-method`                                                                                                                                                                  | API reference layout and method/path header. The method gets a `method-<verb>` class.                                                                                                                                                        |
| `.api-provenance`, `.api-operation-heading`, `.api-operation-summary`, `.api-deprecated-note`                                                                                                                            | Generated endpoint intro. The provenance and download lines render as a quiet note. The method-and-path heading is visually hidden, and the summary is hidden when it repeats the title.                                                     |
| `.api-parameter`, `.api-parameter-in`, `.api-parameter-presence`, `.api-body-presence`                                                                                                                                   | Parameter rows, the parameter location, and required or optional labels. `data-required` holds `true` or `false`.                                                                                                                            |
| `.api-schema-constraints`, `.api-constraint`, `.api-schema-label`, `.api-enum-options`, `.api-enum-label`, `.api-media-heading`, `.api-field-type`, `.api-field-path`                                                    | Type and constraint tags, schema labels such as "Array items", enum values, content-type headings, field types, and the field path hint.                                                                                                     |
| `.api-schema-disclosure`, `.api-properties-disclosure`, `.api-schema-variant`, `.api-schema-variant-title`, `.api-variant-count`                                                                                         | Collapsible property lists and `oneOf`, `anyOf`, or `allOf` shape cards.                                                                                                                                                                     |
| `.api-response`, `[data-status]`, `.api-response-header`, `.api-status-code`, `.api-response-media`                                                                                                                      | Response sections. `data-status` is `2xx` through `5xx` or `default`; set `--status-bg` and `--status-text` on `.api-response` to recolor the status tag.                                                                                    |
| `.api-separator`                                                                                                                                                                                                         | Visually hidden punctuation that keeps copied text and search text readable, such as `200: OK`.                                                                                                                                              |
| `.subject-lifecycle-badge`, `.subject-lifecycle-beta`, `.subject-lifecycle-deprecated`, `.subject-lifecycle-in-development`, `.subject-lifecycle-experimental`                                                           | Content status badges.                                                                                                                                                                                                                       |
| `.code-block`, `.code-toolbar`, `.code-block-meta`, `.code-block-title`, `.code-block-filename`, `.code-copy`, `.copy-status`                                                                                            | Fenced code metadata, Copy control, and status text.                                                                                                                                                                                         |
| `.callout`, `.callout-neutral`, `.callout-note`, `.callout-tip`, `.callout-important`, `.callout-warning`, `.callout-caution`, `.callout-icon`                                                                           | Labeled callout tones and decorative icons. Registered types use their configured tone class and a `data-callout-type` attribute; custom tone colors set `--callout-line`, `--callout-bg`, and `--callout-text` on the callout.              |
| `li[data-field]`, `li[data-presence]`, `.nullability-badge`                                                                                                                                                              | Field rows, presence badges, and nullable labels for OpenAPI schemas. Authored `Fields` use the same field rows and presence badges.                                                                                                         |
| `.examples`, `.api-view-control`, `#api-view-select`, `.api-data-view`, `.shape-group`, `.example-group`, `.example-picker`, `.example-body`, `.example-context`, `.example-key`, `.example-provenance`, `.example-link` | OpenAPI JSON-shape and named-example panel.                                                                                                                                                                                                  |
| `.doc-cards`, `.doc-card`, `.doc-card-title`, `.doc-card-eyebrow`, `.doc-card-reason`, `.doc-card-icon`, `.doc-cards-empty`                                                                                              | Cards and empty collection state.                                                                                                                                                                                                            |
| `.hero`, `.hero-copy`, `.hero-title`, `.hero-tagline`, `.hero-actions`, `.hero-action`, `.hero-primary`, `.hero-secondary`                                                                                               | [Hero](https://www.shoalrun.com/styling/layouts.md) panel, its text, and its action buttons. `.hero-primary` is the first link.                                                                                                              |
| `.hero.has-visual`, `.hero-visual`, `.hero-visual-code`, `[data-hero]`, `[data-align="start"]`                                                                                                                           | A hero with an image or code block, its visual column, and left alignment. `.hero-copy` wraps the text only when a visual is present.                                                                                                        |
| `.doc-collapsible`, `.collapsible-body`                                                                                                                                                                                  | Authored collapsibles.                                                                                                                                                                                                                       |
| `.doc-steps`, `.doc-steps-rail`, `.doc-steps-cards`, `.doc-steps-plain`, `.doc-step-head`, `.doc-step-heading-toc-ignore`, `.doc-step-body`, `.doc-step-icon`                                                            | Numbered [Steps](https://www.shoalrun.com/author/components/steps.md), their three styles, headings, and decorative icons.                                                                                                                   |
| `.doc-timeline`, `.doc-timeline-summary`, `.doc-timeline-progress`, `.doc-timeline-list`, `.doc-milestone-head`, `.doc-milestone-status`, `.doc-milestone-body`                                                          | [Timeline](https://www.shoalrun.com/author/components/timeline.md) progress bar, milestone states, and content.                                                                                                                              |
| `.doc-tabs`, `[data-tabs]`, `.doc-tablist`, `.doc-tabpanel`, `.tab-fallback-heading`                                                                                                                                     | Authored tabs, panels, and no-script headings.                                                                                                                                                                                               |
| `[data-equal-height]`                                                                                                                                                                                                    | A `Tabs` group with `equalHeight`. Once scripts run, its panels share one grid cell, and hidden panels keep their space with `visibility: hidden`.                                                                                           |
| `.walkthrough`, `[data-walkthrough]`, `[data-mode]`, `[data-layout]`, `.walkthrough-title`, `.walkthrough-steps`, `.walkthrough-step`, `.walkthrough-step-title`                                                         | [Walkthrough](https://www.shoalrun.com/author/components/walkthroughs.md) frame and steps. `data-mode` is `separate` or `unified`; `data-layout` is `scroll` or `spotlight`.                                                                 |
| `.walkthrough-step-number`, `.walkthrough-lines`, `.walkthrough-code`, `.line`, `.line.is-highlighted`, `pre[data-focus]`                                                                                                | Step labels, walkthrough code, and highlighted lines. Set `--walkthrough-highlight`, `--walkthrough-highlight-edge`, and `--walkthrough-dim` on `.walkthrough` to change the highlight color, its left edge, and the opacity of other lines. |
| `.walkthrough.is-split`, `.walkthrough-step.is-active`, `.walkthrough-pane`, `.walkthrough-bar`, `.walkthrough-status`, `.walkthrough-stage`, `[data-k]`, `.walkthrough-ghost`, `.walkthrough-step-button`               | The side-by-side layout the walkthrough script adds on wide screens. It covers the active step, the sticky code pane and its toolbar, the moving tokens, and spotlight step buttons.                                                         |
| `.related-reading`                                                                                                                                                                                                       | [RelatedReading](https://www.shoalrun.com/author/components/related-reading.md) wrapper.                                                                                                                                                     |
| `.example-choices`                                                                                                                                                                                                       | Example selector in the API panel.                                                                                                                                                                                                           |
| `.doc-diagram`, `.doc-diagram-svg`, `.pele`, `.diagram-light`, `.diagram-dark`, `.doc-diagram figcaption`                                                                                                                | [Diagram](https://www.shoalrun.com/author/components/diagrams.md) frame, inline Pele SVG, D2 color-mode images, and caption.                                                                                                                 |

The navigation filter appears when JavaScript runs; without it, the navigation tree still works. Tabs use `.is-enhanced` after their script adds selection behavior. Walkthroughs use `.is-split` when their script shows the code pane. The default `--walkthrough-dim`, `0.84`, keeps 4.5:1 contrast in every built-in palette. The CSS includes focus-visible styles, forced-color adjustments, reduced-motion handling, and print rules. Keep those states usable when overriding component styles.

## Page attributes

The `html` element carries attributes that project CSS can use to target one theme, mode, or layout:

| Attribute                    | Set when                                                                                              | Values                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| `data-theme`, `data-palette` | The site uses a preset, palette, or mode other than the defaults.                                     | Preset and palette names.      |
| `data-mode`                  | A reader chose light or dark with the [mode toggle](https://www.shoalrun.com/styling/color-modes.md). | `light` or `dark`.             |
| `data-masthead`              | The preset has an inked masthead: `ledger` and `vice`.                                                | `inked`                        |
| `data-layout`                | The page sets `layout: wide`, `landing`, or `splash`.                                                 | `wide`, `landing`, or `splash` |

`shoal` is the default preset, so a default site has no `data-theme`. To target `shoal` either way, use `:root:is(:not([data-theme]), [data-theme="shoal"])`:

```css title="styles/project.css"
:root:is(:not([data-theme]), [data-theme="shoal"]) .mast { border-top-color: #7c3aed; }
[data-masthead="inked"] .brand { letter-spacing: .12em; }
[data-layout="landing"] .content .hero { min-height: 28rem; }
```

## Responsive behavior

Above `72rem`, every page reserves the same right column so the article stays in place when moving between pages with and without a ToC. A ToC appears there as a sticky outline, and the API data panel shares that rail. At `72rem` and below, the rail moves below the article column. At `48rem` and below, the navigation and the outline become two compact buttons, **Menu** and **On this page**, side by side above the article. Each opens to the full width, and both start closed so the page title is on the first screen. The page's `tocDepth` frontmatter controls which headings appear in the outline, and `0` hides it. See the [frontmatter guide](https://www.shoalrun.com/author/frontmatter.md) for examples.

As the reader scrolls, the outline marks the current section with `aria-current="location"`. Style it with `.page-toc a[aria-current]`.

The reader script adds a link icon beside each article heading from level two to four. Selecting it copies the section URL and puts it in the address bar. Without clipboard access, the icon works as an ordinary link. The icon isn't part of the page source, so it doesn't appear in Markdown twins or search results.

## Page transitions

In browsers that support cross-document view transitions, the reading column fades between pages while the masthead and sidebar stay in place. Other browsers load pages as usual. The fade is off when the reader's system asks for reduced motion. To turn it off for every reader, add this rule to project CSS:

```css title="styles/project.css"
@view-transition { navigation: none; }
```

The publication label adjusts automatically. A single channel, version, and language leaves the top-right spot empty. When one dimension varies, only that dimension appears. Set `site.editionBadge: always` to show all three values or `site.editionBadge: never` to hide the label. `auto` is the default.

## HTML, Markdown, and agents

Project CSS changes the HTML presentation. It is not included in Markdown twins, and a text-reading agent does not apply selectors, pseudo-elements, or responsive rules. Put essential instructions and labels in authored content rather than CSS-generated text. Hiding an element with CSS does not remove its content from the published Markdown or protect it from access.
