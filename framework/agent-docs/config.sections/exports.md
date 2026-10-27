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

## `exports`

Optional named targets for `shoalrun export`. They select portable application content independently of website navigation and `site.contentFilter`. The normal website build does not emit export bundles automatically. See [export content into an application](https://www.shoalrun.com/publish/content-export.md).

Each target accepts these fields:

| Field           | Default                             | Meaning                                                                                                                  |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `formats`       | `[markdown, html]`                  | A nonempty unique list of `markdown` and/or `html`.                                                                      |
| `documents`     | All eligible pages                  | Explicit document IDs. Missing, inaccessible, or export-filtered IDs fail.                                               |
| `publication`   | The only enabled publication        | One complete `{ channel, version, language }` combination. Required when selection is ambiguous.                         |
| `contentFilter` | None                                | Optional configured reader facets; every facet must match any listed choice. Unmarked pages do not match.                |
| `publicBase`    | `/`                                 | Root-relative mount with a trailing slash, such as `/help/`. It locates bundle content and assets in the app.            |
| `assetRoots`    | Content directory only              | Extra local asset directories, relative to the declaring config file. Only referenced supported files are copied.        |
| `notices`       | Renderer notices only               | Local text or Markdown license/notice files to retain in `NOTICES.txt`. Paths are relative to the declaring config file. |
| `apiReview`     | Matching API-level approval, if any | API IDs mapped to reviewed SHA-256 digests for this export selection.                                                    |

```yaml
exports:
  app-help:
    formats: [markdown, html]
    documents: [guide.api-keys, guide.billing]
    publicBase: /help/
```

The export preserves whole-page content, including all reader sections. It flattens interactive components into readable static content and omits website/browser runtimes. Unsupported output, escaping assets, and unavailable document fallbacks fail. `exports` and its target fields are validated for unknown keys.
