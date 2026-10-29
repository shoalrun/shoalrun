---
id: reference.config-outputs
title: Output and export settings
summary: Configure metadata providers, application exports, Markdown headers,
  and discovery indexes.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/outputs
---

# Output and export settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Configuration reference > Output and export

**Updated: 2026-10-29.**

Parent page: [Full Markdown page](/config/outputs.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure metadata providers, application exports, Markdown headers, and discovery indexes. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `exports`

Use [resource selectors](https://www.shoalrun.com/content-delivery/select.md) to select pages, approved sections, and named snippet instances.

Optional named targets for `shoalrun export`. They select portable application content independently of website navigation and `site.contentFilter`. The normal website build does not emit export bundles automatically. See [export content into an application](https://www.shoalrun.com/publish/content-export.md).

Each target accepts these fields:

| Field           | Default                                         | Meaning                                                                                                                  |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `formats`       | `[markdown, html]`                              | A nonempty unique list of `markdown` and/or `html`.                                                                      |
| `documents`     | All eligible pages when neither selector is set | Explicit document IDs. Missing, inaccessible, or export-filtered IDs fail. Mutually exclusive with `resources`.          |
| `resources`     | None                                            | Typed page, section, or snippet selectors. Mutually exclusive with `documents`.                                          |
| `publication`   | The only enabled publication                    | One complete `{ channel, version, language }` combination. Required when selection is ambiguous.                         |
| `contentFilter` | None                                            | Optional configured reader facets; every facet must match any listed choice. Unmarked pages do not match.                |
| `publicBase`    | `/`                                             | Root-relative mount with a trailing slash, such as `/help/`. It locates bundle content and assets in the app.            |
| `assetRoots`    | Content directory only                          | Extra local asset directories, relative to the declaring config file. Only referenced supported files are copied.        |
| `notices`       | Renderer notices only                           | Local text or Markdown license/notice files to retain in `NOTICES.txt`. Paths are relative to the declaring config file. |
| `apiReview`     | Matching API-level approval, if any             | API IDs mapped to reviewed SHA-256 digests for this export selection.                                                    |

```yaml
exports:
  app-help:
    formats: [markdown, html]
    documents: [guide.api-keys, guide.billing]
    publicBase: /help/
```

The export preserves whole-page content, including all reader sections. It flattens interactive components into readable static content and omits website/browser runtimes. Unsupported output, escaping assets, and unavailable document fallbacks fail. `exports` and its target fields are validated for unknown keys.
