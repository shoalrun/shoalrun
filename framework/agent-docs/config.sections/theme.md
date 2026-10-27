---
id: reference.config
title: Configuration reference
summary: Configuration settings, defaults, validation rules, and related guides.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/config.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, stable IDs, and config composition before changing settings.

A project's config starts at `docs.config.yaml`. The CLI looks for that name by default, and `shoalrun scaffold -n` searches parent directories for it. For the configuration workflow, composition rules, and debugging, start with [configure your project](https://www.shoalrun.com/configuration.md). This page lists every top-level key. Keys with a dedicated guide link there for the full rules. For complete, working configs, see [example configs](https://www.shoalrun.com/config/examples.md).

The root file must be a YAML mapping with `schemaVersion: 1`. YAML is parsed strictly: duplicate keys fail. Any top-level key not listed here fails with `unknown setting <key>`. Keys nested inside `site`, `apis`, `publications`, and `outputs` are not all checked yet, so check spelling there carefully.

```yaml title="docs.config.yaml"
schemaVersion: 1
site:
  title: Example documentation
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
navigation: { $include: ./config/nav.yaml }
```

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
