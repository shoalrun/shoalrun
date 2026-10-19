---
id: reference.config
title: Configuration reference
summary: Every top-level setting in docs.config.yaml, with defaults, validation
  rules, and links to the full guides.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-19.**

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

## `callouts`

Custom callout `types` and color `tones`. A type has a `label`, a `tone`, and an optional Lucide `icon`. A tone has `line`, `background`, and `text` colors, and an optional `dark` set. See [callouts](https://www.shoalrun.com/author/components/callout.md).

A new type that uses a built-in tone:

```yaml title="config/callouts.yaml"
types:
  security:
    label: Security
    tone: warning
    icon: shield-alert
```

A new tone with light and dark colors, used by a new type:

```yaml title="config/callouts.yaml"
tones:
  laboratory:
    line: "#087f8c"
    background: "#e9f8f8"
    text: "#075c66"
    dark: { line: "#3cb9c4", background: "#0e2a2d", text: "#8fe3ea" }
types:
  experiment:
    label: Experiment
    tone: laboratory
    icon: flask-conical
```

Relabel a built-in type:

```yaml title="config/callouts.yaml"
types:
  note:
    label: Good to know
    tone: note
```
