---
id: guide.configuration
title: Organize project configuration
summary: Learn how Shoalrun resolves config files, layers presets, tracks path
  origins, and applies page defaults before building publications.
type: how-to
area: publishing
subarea: publishing-configuration
canonical: /configuration
---

# Organize project configuration

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Configure your project

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/configuration.md)

`docs.config.yaml` connects your content, presentation, and publication settings. Start with one file, then extract sections or share defaults when several projects need them. This guide explains how those choices interact and how to inspect the result.

Use the [configuration reference](https://www.shoalrun.com/config.md) to look up individual fields. Use [example projects](https://www.shoalrun.com/config/examples.md) for complete configurations you can copy.

## Share defaults through `extends`

Use `extends` when several projects should inherit shared settings. Presets are ordinary YAML mappings and can extend other presets. Each file's `extends` list is processed in order; later presets override earlier ones, and the local file overrides them all.

Create a shared directory beside the site:

```sh
mkdir -p ../shared
```

Create the following preset:

```yaml title="../shared/base.yaml"
schemaVersion: 1
site:
  title: Company handbook
  customCss: ./brand.css
  header:
    links:
      - { label: Support, href: "https://support.example.com" }
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
frontmatter:
  defaults:
    type: guide
    channel: production
    version: current
    access: { policy: public }
variables:
  company: Acme
  legacyLabel: Old handbook
```

Add its stylesheet:

```css title="../shared/brand.css"
.content h2 {
  text-underline-offset: 0.2em;
}
```

Now replace `docs.config.yaml` with this smaller entry file:

```yaml title="docs.config.yaml"
schemaVersion: 1
extends: [../shared/base.yaml]
site:
  title: Parcel handbook
navigation: { $include: ./config/nav.yaml }
```

The project inherits publications, page defaults, the stylesheet, variables, and header links. Its title replaces the shared title. The content directory remains `site/content/`, beside the entry config.

Check the final values and build:

```sh
node "$SHOALRUN_CLI" config explain site.title docs.config.yaml
node "$SHOALRUN_CLI" config explain site.header.links docs.config.yaml
node "$SHOALRUN_CLI" config explain site.customCss docs.config.yaml
node "$SHOALRUN_CLI" config validate docs.config.yaml
node "$SHOALRUN_CLI" build docs.config.yaml dist
```

`site.title` comes from the local file, with the preset in its replacement history. `site.customCss` comes from `shared/base.yaml`, so `./brand.css` resolves beside that preset.

### Predict a merge before you make it

When a config extends another file, the overlay value determines how each inherited value changes.

| Overlay value            | Result                                                                     |
| ------------------------ | -------------------------------------------------------------------------- |
| Mapping over a mapping   | Merge recursively by key. Unchanged keys survive.                          |
| List                     | Replace the entire inherited list. Items do not merge by ID.               |
| Scalar, including `null` | Replace the inherited value. The receiving setting must accept that value. |
| `$concat`                | Append to an inherited list, or create a list if none exists.              |
| `$remove`                | Remove inherited mapping keys or list entries by `id`.                     |

This also applies after resolving an include. An included mapping can merge with an inherited mapping at the same location; inclusion itself supplies the overlay value.

To layer a second preset, use `extends: [../shared/base.yaml, ../shared/brand.yaml]`. Only settings in `brand.yaml` override the base; the project's local settings still win.

`extends` is recognized at the top level of each loaded YAML file, including files loaded through `$include`. Avoid using a top-level `extends` key as unrelated data in a fragment. An `extends` nested inside an ordinary mapping is not an inheritance instruction.
