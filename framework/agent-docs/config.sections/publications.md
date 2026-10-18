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

## `publications`

Required. Declares which channel, version, and language combinations to build. See [how Shoalrun works](https://www.shoalrun.com/concepts.md) for the concepts.

These settings select page variants within a build. For separate branches and domains, see [use Git branches for separate docs sites](https://www.shoalrun.com/publish/revisions.md).

| Key                                    | Meaning                                                                                                                                                                                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                              | At least one `{ channel, version, language }` entry. `language` is optional and defaults to the default language.                                                                                                                                     |
| `channels.<name>.pathPrefix`           | Route prefix for a channel. Every channel used in `enabled` must be declared, even with `pathPrefix: ""`.                                                                                                                                             |
| `versions.<name>.pathPrefix`           | Route prefix for a version. Same rule as channels.                                                                                                                                                                                                    |
| `defaults.channel`, `defaults.version` | The publication that uses each API's top-level `source`, and the defaults for `scaffold` and `api select`. Required when the project has `apis`.                                                                                                      |
| `defaults.language`                    | The default language, which gets no route prefix. Global frontmatter can override it. Falls back to `en`.                                                                                                                                             |
| `externalSites`                        | Optional links in the Version menu. Each entry needs a `label` and HTTP(S) `baseUrl`, which links to that site's root. Add a local `manifest` file containing its built `documents.json` to link only matching document IDs at their published paths. |

For a page in several enabled combinations, set its frontmatter `publications` to a list of `{ channel, version }` pairs. This is separate from `apis.<name>.publications`, which binds API source files. A page without a list uses its resolved single channel and version. A list may include a declared but disabled combination; that copy is omitted from the build. See [share pages across documentation versions](https://www.shoalrun.com/publish/publications.md) for an example with version-specific sections.

A single publication with no prefixes. Pages set `channel: production` and `version: current`:

```yaml title="docs.config.yaml"
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
```

Two API versions side by side. A v1 page at `/guides/start` is published at `/v1/guides/start`:

```yaml title="docs.config.yaml"
publications:
  defaults: { channel: production, version: v2 }
  channels:
    production: { pathPrefix: "" }
  versions:
    v1: { pathPrefix: /v1 }
    v2: { pathPrefix: /v2 }
  enabled:
    - { channel: production, version: v1 }
    - { channel: production, version: v2 }
```

A sandbox channel, with a version that is declared but not yet built. Leave a combination out of `enabled` to stop publishing it without deleting its pages:

```yaml title="docs.config.yaml"
publications:
  defaults: { channel: production, version: v1 }
  channels:
    production: { pathPrefix: "" }
    sandbox: { pathPrefix: /sandbox }
  versions:
    v1: { pathPrefix: "" }
    v2: { pathPrefix: /v2 }
  enabled:
    - { channel: production, version: v1 }
    - { channel: sandbox, version: v1 }
```

English at the root and German under `/de`. Pages without a `language` are English:

```yaml title="docs.config.yaml"
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
    - { channel: production, version: current, language: de }
```
