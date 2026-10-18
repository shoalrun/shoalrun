---
id: guide.themes
title: Themes
summary: Pick a site shape, pair it with a color palette, and choose how light
  and dark mode behave.
type: reference
canonical: /styling/themes
---

# Themes

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Themes

**Updated: 2026-09-30.**

The `theme` setting controls how the HTML site looks. It has five keys, and each has a default:

```yaml title="docs.config.yaml"
theme:
  preset: reef      # site shape
  palette: harbor   # colors
  mode: system      # light, dark, or system
  toggle: true      # reader switch for light and dark mode
  fonts: system     # optional: turn off the preset's bundled fonts
```

Omit `theme` to keep the default: the `shoal` preset, the `kelp` palette, the preset's fonts, and light mode only. An unknown value fails the build.

To see every combination on a real page, open [Try a theme](https://www.shoalrun.com/styling/try.md).

Start with a preset. Change the [palette](https://www.shoalrun.com/styling/palettes.md) if its colors don't fit your brand. Set the [mode](https://www.shoalrun.com/styling/color-modes.md) if readers need dark mode. Use [project CSS](https://www.shoalrun.com/author/css.md) for anything else.

## Presets

A preset sets the shape of the site. It controls layout, corner radii, and type, and how panels, navigation, and cards look. Each preset has a default palette. Any palette works with any preset.

| Preset   | Shape                                                                                                                    | Default palette |
| -------- | ------------------------------------------------------------------------------------------------------------------------ | --------------- |
| `shoal`  | Flat page with a ruled sidebar and square-cornered controls.                                                             | `kelp`          |
| `reef`   | Rounded panels float on a tinted page. Navigation items and controls are pills.                                          | `coral`         |
| `ledger` | A technical manual with an inked masthead, serif body text, monospace headings, numbered sections, and hard-edged cards. | `ink`           |
| `vice`   | A night masthead with a sunset stripe, bold italic display type, neon section rules, and cards that glow on hover.       | `vice`          |

Presets change CSS only. Page markup, URLs, and Markdown twins stay the same.

## Fonts

Each preset ships its own fonts, so the site looks the same on every operating system:

| Preset   | Body           | Headings       | Code             |
| -------- | -------------- | -------------- | ---------------- |
| `shoal`  | Inter          | Inter          | System monospace |
| `reef`   | Figtree        | Figtree        | System monospace |
| `ledger` | Source Serif 4 | JetBrains Mono | JetBrains Mono   |
| `vice`   | Figtree        | Jost           | System monospace |

The fonts are Latin variable fonts under the SIL Open Font License. The build copies them to `/assets/fonts/` with their license files. A browser downloads only the faces a page uses, and the page preloads its body font. Characters outside the Latin set use the system fallback. Until a font arrives, the page uses a local font resized to match it. Text doesn't shift when the bundled font loads. Agents read the Markdown twins, which load no fonts.

To use system fonts only, set `fonts: system`. Each preset then falls back to its system font stack.

### Use your own fonts

Set any of `body`, `headings`, and `code`. A role you leave out keeps the preset's font. `headings` defaults to the body font.

```yaml title="docs.config.yaml"
theme:
  preset: reef
  fonts:
    body:
      family: Acme Sans
      files:
        - ./fonts/AcmeSans.woff2
        - { file: ./fonts/AcmeSans-Italic.woff2, style: italic }
    headings: Acme Display
    code:
      family: Berkeley Mono
      files: [./fonts/BerkeleyMono.woff2]
```

- `family` is the name CSS uses. A plain string, such as `headings: Acme Display`, names a font without shipping files. Use it for a font that [project CSS](https://www.shoalrun.com/author/css.md) loads, or one installed on readers' machines.
- `files` lists local `.woff2`, `.woff`, `.ttf`, or `.otf` files, relative to the config file that declares them. The build copies them to `/assets/fonts/project/`. File names can use letters, numbers, dots, dashes, and underscores, and two files can't share a name.
- Each file can set `style` (`normal` or `italic`) and `weight`, such as `400` or `"100 900"`. The default weight, `"100 900"`, suits variable fonts; give each static file its own weight.

A missing file, an unsupported format, or an unknown key fails the build. Check that your font license allows web embedding.

Fonts set here become the `--font-body`, `--font-heading`, and `--font-code` [CSS tokens](https://www.shoalrun.com/author/css.md), each followed by a system fallback.

## Load order

The HTML page links stylesheets in this order. Later files override earlier ones.

1. `/assets/site.css`, which imports the base tokens and header styles.
   - `/assets/theme-preview.css` follows it, on pages that use the [theme previewer](https://www.shoalrun.com/styling/try.md).
2. `/assets/theme.css`, for a preset other than `shoal`.
3. `/assets/palette.css`, generated for any palette or mode other than `kelp` in light mode.
4. `/assets/fonts.css`, generated from `theme.fonts`, unless it's `system` and sets nothing.
5. `/assets/project.css`, from `site.customCss`.

When a site uses a non-default preset, palette, or mode, the `html` element carries `data-theme` and `data-palette`. The `ledger` and `vice` presets also set `data-masthead="inked"`, which switches header tools to light text on a dark masthead. Project CSS can target one combination:

```css title="styles/project.css"
[data-theme="ledger"] .page-head h1 { letter-spacing: 0; }
```

## Related reading

### Next steps

- [Color palettes](https://www.shoalrun.com/styling/palettes.md) — Choose the colors the preset uses.

- [Light and dark mode](https://www.shoalrun.com/styling/color-modes.md) — Decide whether readers get light mode, dark mode, or a toggle.

### Go deeper

- [CSS and theme reference](https://www.shoalrun.com/author/css.md) — Customize tokens and selectors beyond what presets and palettes offer.

### Related topics

- [Try a theme](https://www.shoalrun.com/styling/try.md) — Preview every preset, palette, and color mode on a live page.
