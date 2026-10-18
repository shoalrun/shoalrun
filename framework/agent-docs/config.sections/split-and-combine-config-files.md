---
id: reference.config
title: Configuration reference
summary: Every top-level setting in docs.config.yaml, with defaults, validation
  rules, and links to the full guides.
type: reference
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-17.**

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

## Split and combine config files

Four directives let one config span several files. Paths are relative to the file that contains them.

### `$include`

`{ $include: ./path.yaml }` replaces a value with the contents of another YAML file. The included content becomes the value at that position. If the containing file extends a preset, the normal merge rules then apply to that value. A mapping that uses `$include` can have no other keys. Included files can include others, and a cycle fails with `Configuration cycle` and the chain of files.

Move a large section into its own file:

```yaml title="docs.config.yaml"
navigation: { $include: ./config/nav.yaml }
apis: { $include: ./config/api.yaml }
```

Include a value at any depth, not only at the top level:

```yaml title="docs.config.yaml"
apis:
  payments:
    source: { kind: file, path: ./apis/payments/openapi.yaml }
    operations: { $include: ./config/payment-operations.yaml }
```

An API source path is relative to the file declaring `source.path`. Here `config/api.yaml` points one level up to reach `apis/`:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
```

### `extends`

A top-level `extends: [./base.yaml]` in any config file layers that file over one or more preset files, in order. Mappings merge key by key, and lists and single values replace what came before. Use it to share settings across several sites:

```yaml title="docs.config.yaml"
schemaVersion: 1
extends: [../shared/docs-base.yaml]
site:
  title: Payments documentation
```

List several presets to layer them. Later files override earlier ones, and the current file overrides them all:

```yaml title="docs.config.yaml"
schemaVersion: 1
extends:
  - ../shared/docs-base.yaml
  - ../shared/brand-theme.yaml
```

A preset is an ordinary config file, and it can have its own `extends`:

```yaml title="../shared/docs-base.yaml"
schemaVersion: 1
site:
  title: Company documentation
  header:
    links:
      - { label: Support, href: "https://support.example.com" }
theme:
  preset: reef
```

A top-level `extends` is always read as a list of config files. So a file you `$include` can't use a top-level `extends` for any other purpose. See the palette example in [palettes](https://www.shoalrun.com/styling/palettes.md).

### `$concat` and `$remove`

`{ $concat: [...] }` appends items to a list inherited through `extends`. Without an inherited list, it becomes the list itself. `{ $remove: [name, ...] }` drops inherited mapping keys, or list items by their `id`. `$remove` fails when nothing is inherited.

Add pages after the shared navigation, and drop a relationship the shared config declares:

```yaml title="docs.config.yaml"
extends: [../shared/docs-base.yaml]
navigation:
  $concat:
    - { id: payments, doc: guide.payments }
    - { id: refunds, doc: guide.refunds }
relationships: { $remove: [legacy-overview-link] }
```

Remove inherited mapping keys by name. This drops a snippet and a template that the preset registers:

```yaml title="docs.config.yaml"
extends: [../shared/docs-base.yaml]
snippets: { $remove: [legal.beta-notice] }
templates: { $remove: [troubleshooting-legacy] }
```

`$concat` also accepts included lists, so each team can keep its own navigation file:

```yaml title="docs.config.yaml"
extends: [../shared/docs-base.yaml]
navigation:
  $concat:
    - { $include: ./config/nav-payments.yaml }
    - { $include: ./config/nav-reports.yaml }
```

Run `shoalrun config explain <key> docs.config.yaml` to see which file set a value and what it replaced. The [CLI reference](https://www.shoalrun.com/cli.md) covers the other `config` commands.
