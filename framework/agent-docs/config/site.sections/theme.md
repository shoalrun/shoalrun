---
id: reference.config-site
title: Site and theme settings
summary: Configure the site identity, header, footer, agent guidance, colors, and fonts.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/site
---

# Site and theme settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Configuration reference > Site and theme

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/site.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure the site identity, header, footer, agent guidance, colors, and fonts. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `theme`

Accepts `preset`, `palette`, `mode`, `toggle`, and `fonts`. See [themes](https://www.shoalrun.com/styling/themes.md), [palettes](https://www.shoalrun.com/styling/palettes.md), and [color modes](https://www.shoalrun.com/styling/color-modes.md). The build checks palette colors for WCAG contrast.

| Key       | Default                                       | Values                                                                                                                       |
| --------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `preset`  | `shoal`                                       | `shoal`, `reef`, `ledger`, `vice`                                                                                            |
| `palette` | The preset's palette                          | `kelp`, `coral`, `ink`, `harbor`, `amethyst`, `vice`, or a custom mapping                                                    |
| `mode`    | `light`                                       | `light`, `dark`, `system`                                                                                                    |
| `toggle`  | `true` with `mode: system`, otherwise `false` | `true` or `false`. `true` is allowed only with `mode: system`.                                                               |
| `fonts`   | The preset's bundled fonts                    | `system`, or a mapping of `body`, `headings`, and `code`. See Fonts in [themes](https://www.shoalrun.com/styling/themes.md). |

Change the layout and keep its colors:

```yaml title="docs.config.yaml"
theme:
  preset: ledger
```

Follow the reader's system setting and let them switch:

```yaml title="docs.config.yaml"
theme:
  preset: reef
  palette: harbor
  mode: system
```

Use a built-in palette as a base and change the brand colors:

```yaml title="docs.config.yaml"
theme:
  palette:
    extends: harbor
    light: { accent: "#0a6a48", link: "#0a6a48" }
    dark: { accent: "#4fd6a4", link: "#7fe0bd" }
```

Use dark mode only, without a switch:

```yaml title="docs.config.yaml"
theme:
  mode: dark
```
