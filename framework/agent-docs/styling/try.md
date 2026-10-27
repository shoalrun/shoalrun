---
id: guide.theme-preview
title: Try a theme
summary: Preview every preset, palette, and color mode on this page, then copy
  the config.
type: how-to
area: appearance
subarea: appearance-themes
canonical: /styling/try
---

# Try a theme

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Visual examples > Try a theme

**Updated: 2026-10-27.**

Pick a shape, a palette, and a mode. This page restyles itself as you choose. Scroll down to see how each option styles the sample content, then copy the config into `docs.config.yaml`.

Every preset works with every palette, in light or dark mode.

| Preset   | Shape                                                                               | Default palette |
| -------- | ----------------------------------------------------------------------------------- | --------------- |
| `shoal`  | Flat page with a ruled sidebar and square-cornered controls.                        | `kelp`          |
| `reef`   | Rounded panels on a tinted page, with pill navigation and controls.                 | `coral`         |
| `ledger` | Technical manual with an inked masthead, monospace headings, and numbered sections. | `ink`           |
| `vice`   | Night masthead with a sunset stripe, bold italic type, and neon rules.              | `vice`          |

| Palette    | Colors                                                          |
| ---------- | --------------------------------------------------------------- |
| `kelp`     | Sea green on white.                                             |
| `coral`    | Coral accent over cool blue-gray neutrals.                      |
| `ink`      | Black ink on warm paper with a vermilion accent.                |
| `harbor`   | Navy ink, blue links, and a yellow callout rule.                |
| `amethyst` | Violet accents over lavender neutrals.                          |
| `vice`     | Flamingo pink and aqua by day, neon on night purple after dark. |

```yaml title="docs.config.yaml"
theme:
  preset: vice
  palette: harbor
  mode: system
```

The preview lasts until you leave the page or press **Reset**. It does not change the site for other readers. Your site's [project CSS](https://www.shoalrun.com/author/css.md) still applies on top of the preview.

## Sample content

A guide page mixes prose, [links](https://www.shoalrun.com/styling/themes.md), `inline code`, and components. Each preset styles them in its own way.

> **Tip:** Try the `vice` shape in dark mode.

### A table

Use this sample to inspect table headers, cell spacing, and inline values in the selected theme.

| Setting   | Default        | Values                                 |
| --------- | -------------- | -------------------------------------- |
| `preset`  | `shoal`        | `shoal`, `reef`, `ledger`, `vice`      |
| `palette` | Preset default | Any built-in name, or a custom palette |
| `mode`    | `light`        | `light`, `dark`, `system`              |

### A code block

```yaml title="docs.config.yaml"
theme:
  preset: reef
  palette: amethyst
  mode: system
```

### Tabs

### Light

Readers always see the light set.

### Dark

Readers always see the dark set.

### System

The site follows each reader's system setting, with an optional toggle.

## Related reading

### Related topics

- [Themes](https://www.shoalrun.com/styling/themes.md) — Preview every preset, palette, and color mode on a live page.
