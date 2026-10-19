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

`docs.config.yaml` connects your content, presentation, and publication settings. Start with one file, then extract sections or share defaults when several projects need them. This guide explains how those choices interact and how to inspect the result.

Use the [configuration reference](https://www.shoalrun.com/config.md) to look up individual fields. Use [example projects](https://www.shoalrun.com/config/examples.md) for complete configurations you can copy.

## Understand the three stages

Configuration takes effect in three stages:

1. **Resolve configuration.** Read the entry file, load presets and includes, and merge them into one value. Track which file supplied each setting.
2. **Resolve pages.** Apply configured frontmatter defaults, the page's own metadata, and enforced metadata. Validate the resulting page fields.
3. **Build publications.** Select public pages for enabled channel/version/language combinations, resolve links and APIs, then produce HTML, Markdown, and discovery files.

A preset changes configuration. A page default changes metadata. An enabled publication selects an edition to build. These mechanisms have separate rules; changing one does not automatically create pages or translations.

### Find the section you need

Start with the configuration sections that control the behavior you want to change.

| Goal                                           | Configuration sections                              |
| ---------------------------------------------- | --------------------------------------------------- |
| Name the site and locate content               | `site`                                              |
| Choose editions and routes                     | `publications`, `redirects`                         |
| Organize pages and related reading             | `navigation`, `relationships`                       |
| Define page metadata and authoring conventions | `frontmatter`, `metadata`, `templates`, `authoring` |
| Reuse text and semantic content                | `variables`, `snippets`, `callouts`, `badges`       |
| Register local OpenAPI sources and operations  | `apis`                                              |
| Style the site and configure rendering         | `theme`, `outputs`                                  |
| Configure reader views and project checks      | `readerFilters`, `audit`                            |

Every entry config resolves to a YAML mapping with `schemaVersion: 1`. Duplicate YAML keys and unknown top-level settings fail. Nested settings are not all checked for unknown keys, so verify spelling against the reference.

## Start with one working file

The examples use the compiled CLI from the [quickstart](https://www.shoalrun.com/start.md). From the Shoalrun checkout root, create a separate minimal project:

```sh
SHOALRUN_CLI="$PWD/framework/dist/cli.js"
CONFIG_DEMO="$(mktemp -d)"
node "$SHOALRUN_CLI" init "$CONFIG_DEMO/site" --starter minimal
cd "$CONFIG_DEMO/site"
```

The starter has two pages and this basic configuration structure:

```yaml title="docs.config.yaml"
schemaVersion: 1
site:
  title: Acme handbook
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
navigation:
  - id: welcome
    doc: guide.welcome
  - id: setup
    label: Setup
    items:
      - id: install
        doc: guide.install
```

Build once before reorganizing:

```sh
node "$SHOALRUN_CLI" build docs.config.yaml dist
```

This produces the same two pages after each reorganization below. Keep `dist/` separate from content and configuration inputs.

## Extract a section with `$include`

An include substitutes another YAML value at its location. The included file can contain a mapping, list, or scalar, depending on the setting that receives it.

Create a `config/` directory:

```sh
mkdir -p config
```

Move the navigation list into this file:

```yaml title="config/nav.yaml"
- id: welcome
  doc: guide.welcome
- id: setup
  label: Setup
  items:
    - id: install
      doc: guide.install
```

Replace the entire `navigation` section in `docs.config.yaml` with:

```yaml
navigation: { $include: ./config/nav.yaml }
```

The included file contains the list itself, without a surrounding `navigation:` key. Adding that wrapper would supply a mapping where navigation expects a list.

An include has no sibling keys. For example, placing both `$include` and `label` in the same mapping fails with `exactly one directive is required`. Include a smaller value or use inheritance to combine settings.

Includes work at any depth and can include other files. Paths in `$include` are relative to the YAML file containing that directive. A cycle fails with `Configuration cycle` and the file chain.

Inspect the substituted value and its source:

```sh
node "$SHOALRUN_CLI" config resolve docs.config.yaml
node "$SHOALRUN_CLI" config explain navigation.0.doc docs.config.yaml
```

The first command prints the effective value, digest, and configuration dependencies. The second identifies `config/nav.yaml` as the source of `guide.welcome`.

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

## Change inherited lists deliberately

Suppose the shared header contains a Support link. A local `site.header.links` list replaces that link, even when its entries use different IDs or labels. Use `$concat` to append instead.

Extend the current entry file to read:

```yaml title="docs.config.yaml"
schemaVersion: 1
extends: [../shared/base.yaml]
site:
  title: Parcel handbook
  header:
    links:
      $concat:
        - { label: Status, href: "https://status.example.com" }
variables: { $remove: [legacyLabel] }
navigation: { $include: ./config/nav.yaml }
```

The header now contains Support followed by Status. The variable map retains `company` and drops `legacyLabel`.

```sh
node "$SHOALRUN_CLI" config explain site.header.links docs.config.yaml
node "$SHOALRUN_CLI" config explain variables docs.config.yaml
node "$SHOALRUN_CLI" build docs.config.yaml dist
```

### Know the directive limits

`$concat` expects a list base when an inherited value exists. It does not append to a mapping. Included lists within `$concat` are flattened one level, so several team navigation fragments can become one list:

```yaml
navigation:
  $concat:
    - { $include: ./config/nav-guides.yaml }
    - { $include: ./config/nav-api.yaml }
```

That fragment requires both named files. Each should contain a navigation list. Concatenation preserves order and does not remove duplicates; duplicate navigation IDs still fail during a build.

`$remove` requires an inherited value. For mappings, its strings name keys. For lists, they match each item's `id`; it does not remove scalar strings or match another field such as `label`. Removing a missing name has no effect. Removing an item does not automatically repair links or other settings that referred to it.

Each directive mapping must contain exactly one directive and no other keys. You cannot combine `$remove` and `$concat` at the same location in one overlay. Use separate preset layers when you need both operations.

## Understand where paths point

Resolution records a source file for every configuration value. Relative paths often use that source rather than the entry file or your shell's current directory.

| Path                                   | Base directory                                    |
| -------------------------------------- | ------------------------------------------------- |
| `extends` and `$include`               | The YAML file containing the directive            |
| `site.contentDir`                      | The entry config's directory, even when inherited |
| `site.customCss`, `site.favicon`       | The file supplying that path value                |
| API `source.path`                      | The file supplying that path value                |
| Snippet `file`, custom template `body` | The file supplying that path value                |
| Page frontmatter `image`               | The page file's directory                         |

In the running example, `site.customCss: ./brand.css` still finds `shared/brand.css` after the project overrides `site.title`. The two keys keep separate origins.

Moving a path into `config/api.yaml` may require changing `./apis/service.yaml` to `../apis/service.yaml`. Inspect the exact path key with `config explain` after moving it. `config resolve` retains relative strings; it does not rewrite every file path into an absolute path.

Some grouped settings use the origin of their containing block: custom search uses `outputs.html.search`, fonts use `theme.fonts`, and share images use `outputs.html.shareImages`. Overriding part of such a block can change its path base. Keep a block's relative paths and related overrides together, and inspect that block's source when debugging.

CLI output arguments have their own meaning. In these examples, `dist` is relative to the working directory where you run `build`.

## Separate config inheritance from page metadata

The loader first combines all configured `frontmatter` sections using the config merge rules. It then resolves each page using:

```text
frontmatter.defaults → page frontmatter → frontmatter.enforced
```

Mappings merge recursively and lists replace at this stage too. Config directives such as `$include`, `$concat`, and `$remove` are not page-frontmatter inheritance instructions.

For example, `frontmatter.defaults.access.policy: public` lets a page set itself to `draft`. Setting `frontmatter.enforced.access.policy: public` overrides that draft choice. Use defaults when authors should control publication access.

`frontmatter.fields` declares field types and requirements; it does not fill in missing values. A metadata provider is an additional advanced input to page resolution. See [page metadata](https://www.shoalrun.com/author/frontmatter.md) and the [configuration reference](https://www.shoalrun.com/config.md) before adding one.

### Publication defaults serve a different purpose

`publications.defaults` identifies default publication choices, including which channel and version receive an API's top-level source. It also supplies defaults for scaffolding and API selection. The default language supplies a page language when one is missing.

Existing authored pages still need resolved channel and version fields. The starter provides these through `frontmatter.defaults`. Do not assume that changing `publications.defaults.version` also changes every page's metadata.

`publications.enabled` selects combinations to build; it does not clone pages into those combinations. Navigation and `doc:` links resolve against the selected publication. See [versions and languages](https://www.shoalrun.com/publish/publications.md) for complete variant and route examples.

## Inspect and validate changes

Think of `config explain` as asking where one site setting came from. It shows the value Shoalrun will use, the file that supplied it, and any earlier value it replaced. For example, `site.title` tells you which file named the site. `navigation.0.doc` tells you which page is first in the menu and which file put it there.

Use these commands while reorganizing configuration:

| Command                                      | What it establishes                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `config resolve docs.config.yaml`            | Effective values, a digest of those values, and loaded YAML dependencies   |
| `config explain site.title docs.config.yaml` | The value, source file, and replacement history for one key                |
| `config graph docs.config.yaml`              | The entry file and a flat list of loaded YAML dependencies                 |
| `config validate docs.config.yaml`           | Successful configuration loading and theme contrast checks                 |
| `build docs.config.yaml dist`                | Whether content, navigation, APIs, routes, and output can compile together |

Prefix each command with `node "$SHOALRUN_CLI"`. For `explain`, the key comes before the config filename. Use numeric segments to inspect lists, such as `navigation.0.doc`. Dotted names represent traversal, so a literal key containing a dot cannot be addressed unambiguously through this CLI syntax.

`graph` reports dependencies, not an edge-by-edge visual graph. Its list covers loaded configuration files, not every content or API input. The resolved digest hashes effective values; it is not a digest of all referenced file contents.

A successful `config validate` does not establish that document links resolve or that an API review digest is current. Run a full build after structural changes. If a setting looks correct but behaves unexpectedly, inspect its exact key and source before editing another layer.

### Recover common configuration failures

Match the build message or symptom to the corresponding correction.

| Message or symptom                  | Next action                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `unknown setting`                   | Check top-level spelling and whether a fragment has an extra wrapper.            |
| `Configuration cycle`               | Follow the reported chain and remove the recursive include or preset dependency. |
| `exactly one directive is required` | Remove sibling keys beside a directive or split the change across layers.        |
| `$concat requires an array base`    | Check that the inherited setting is a list.                                      |
| `$remove has no inherited value`    | Add an actual inherited value or remove the unnecessary directive.               |
| `Unknown config path`               | Inspect `resolve`, then correct the dotted key or list index.                    |
| A list unexpectedly lost entries    | Replace a normal overlay list with `$concat` when appending was intended.        |
| A local file cannot be found        | Inspect the path's source file and the relevant path-base rule.                  |

Finish the running example with:

```sh
node "$SHOALRUN_CLI" config graph docs.config.yaml
node "$SHOALRUN_CLI" config validate docs.config.yaml
node "$SHOALRUN_CLI" build docs.config.yaml dist
```

Next, use the [configuration reference](https://www.shoalrun.com/config.md) for the feature you want to add. For content or publication failures, use [troubleshooting](https://www.shoalrun.com/publish/troubleshooting.md).

## Related reading

### Reference while working

- [Frontmatter field reference](https://www.shoalrun.com/author/frontmatter-reference.md) — Inspect generated native and project-defined page fields.

- [Configuration reference](https://www.shoalrun.com/config.md) — Look up individual settings and their defaults.

### Related topics

- [Example configs](https://www.shoalrun.com/config/examples.md) — Explore complete projects using composition, versions, and languages.
