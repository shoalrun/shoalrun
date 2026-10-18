---
id: guide.palettes
title: Color palettes
summary: Use a built-in palette or extend one with your brand colors. The build
  checks every palette against WCAG contrast.
type: reference
canonical: /styling/palettes
---

# Color palettes

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Color palettes

**Updated: 2026-10-17.**

A palette sets every color token on the site, with one set for light mode and one for dark mode. Choose a built-in palette by name, or extend one with your own colors.

## Built-in palettes

Choose a built-in palette as the starting point for your site colors.

| Palette    | Colors                                                                     |
| ---------- | -------------------------------------------------------------------------- |
| `kelp`     | Sea green on white. The light set matches the base tokens in `tokens.css`. |
| `coral`    | Coral accent over cool blue-gray neutrals.                                 |
| `ink`      | Black ink on warm paper with a vermilion accent.                           |
| `harbor`   | Navy ink, blue links, and a yellow callout rule.                           |
| `amethyst` | Violet accents over lavender neutrals.                                     |
| `vice`     | Flamingo pink and aqua by day, and neon on a night-purple sky after dark.  |

```yaml title="docs.config.yaml"
theme:
  palette: amethyst
```

Each [preset](https://www.shoalrun.com/styling/themes.md) has a default palette, so you only need `palette` to change it.

## Add brand colors

Extend a built-in palette and override only the tokens you need. Write token names without the `--color-` prefix:

```yaml title="docs.config.yaml"
theme:
  palette:
    extends: harbor
    light:
      accent: "#0a6a48"
      link: "#0a6a48"
      emphasis: "#0a6a48"
    dark:
      accent: "#4fd6a4"
      accent-contrast: "#06231a"
      link: "#7fe0bd"
```

`extends` defaults to the preset's palette. `light` and `dark` are both optional. Values must be three- or six-digit hex colors such as `"#0a6a48"`. Quote them, because YAML treats `#` as the start of a comment.

To keep the colors in their own files, include each mode's token map and keep `extends` in the main config:

```yaml title="docs.config.yaml"
theme:
  palette:
    extends: harbor
    light: { $include: ./styles/brand-light.yaml }
    dark: { $include: ./styles/brand-dark.yaml }
```

```yaml title="styles/brand-light.yaml"
accent: "#0a6a48"
link: "#0a6a48"
```

Don't include a file that sets `extends` at its top level. The config loader reads a top-level `extends` in any config file as a list of [config presets](https://www.shoalrun.com/config.md), so `extends: harbor` there fails the build.

Most brands need four tokens or fewer:

| Token                   | Controls                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| `accent`                | Brand mark, primary header button, and active navigation marker. |
| `accent-contrast`       | Text on `accent`, such as the primary button label.              |
| `link` and `link-hover` | Links at rest and on hover.                                      |
| `emphasis`              | Eyebrows, card icons, and search highlights.                     |

The [CSS and theme reference](https://www.shoalrun.com/author/css.md) lists every token.

## Contrast checks

The build checks each palette against WCAG 2.2 before it writes any files. It checks the light set, the dark set, or both, depending on the [mode](https://www.shoalrun.com/styling/color-modes.md). If a pair fails, the build stops and names it:

```text
Theme colors fail WCAG 2.2 contrast:
  - light: link #9fe6cc on page #ffffff is 1.40:1; needs 4.5:1
```

Success criterion 1.4.3 requires 4.5:1 for text against its background.

Success criterion 1.4.11 requires 3:1 for focus rings, form field borders, and the accent fill against the page.

The build checks these pairs:

- Body text, muted text, links, headings, navigation text, and summaries on the page, surface, and field backgrounds.
- Hovered links, callout text, and inline code on their backgrounds.
- Body text, links, and labels in each callout type: note, tip, important, warning, and caution.
- Body text, links, and labels on each custom callout tone from `callouts.tones`.
- Active navigation, subject lifecycle badges, and required and optional field badges.
- Code text and code labels on code blocks.
- `accent-contrast` on `accent`, and `strong-text` on `strong-surface`.
- `focus`, `field-border`, and `accent` against the page and surface.

Every built-in palette passes in both modes. The framework tests check them on every change.

### Check colors in CI

`shoalrun config validate` runs the same check without building the site. It prints the same messages and exits with status 1 when a pair fails, so a CI step can stop a change before it merges:

```bash
shoalrun config validate docs.config.yaml
```

On success, its JSON output includes `"contrast": { "status": "ok", "palette": "kelp", "modes": ["light"] }`.

[`shoalrun audit`](https://www.shoalrun.com/publish/audit.md) also fails on a contrast problem, because it builds the site.

The check covers palette colors only. Colors you set in [project CSS](https://www.shoalrun.com/author/css.md), and syntax colors from a named Shiki theme, are not checked. Test those yourself. The default `site` code theme derives its syntax colors from the palette and replaces any that fall below 4.5:1 with plain code text.

## Related reading

### Read first

- [Themes](https://www.shoalrun.com/styling/themes.md) — Pick the preset that the palette colors.

### Related topics

- [Light and dark mode](https://www.shoalrun.com/styling/color-modes.md) — A palette has one color set for light mode and one for dark mode.
