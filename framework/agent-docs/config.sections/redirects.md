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

## `redirects`

A list of old URLs to send to a current page. Shoalrun's own docs use redirects to preserve links when changelog entries are combined.

Add a redirect when a URL that readers, bookmarks, or other sites already use would stop working:

- You change a page's `slug`. The slug sets the URL, so the old path no longer has a page.
- You change `site.basePath`, a channel or version `pathPrefix`, or a language prefix. Every route under it moves.
- You delete a page, merge two pages, or replace a page with one in another version.

You don't need a redirect when a page keeps its `slug`. Moving or renaming the source file doesn't change a URL, and neither does changing navigation. The URL comes from the slug, not the file.

List the redirects under `redirects` in `docs.config.yaml`, or keep them in a file and include it:

```yaml title="docs.config.yaml"
redirects: { $include: ./config/redirects.yaml }
```

The [versioned API documentation](https://www.shoalrun.com/config/examples.md) example shows a complete config with a redirect. Each entry looks like this:

```yaml title="config/redirects.yaml"
- from: /guides/old-payment
  to: { doc: guide.create-payment, channel: production, version: current, language: en }
```

Use a different status, such as 301 for clients that don't support 308:

```yaml title="config/redirects.yaml"
- from: /getting-started
  to: { doc: guide.overview, channel: production, version: current, language: en }
  status: 301
```

Send an old URL to a page in another publication, such as a retired v1 page to its v2 version:

```yaml title="config/redirects.yaml"
- from: /v1/guides/webhooks
  to: { doc: guide.webhooks, channel: production, version: v2, language: en }
```

Because the target is a page ID, the redirect follows the page when its slug changes. Nothing else needs updating.

| Key      | Meaning                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `from`   | Old path, starting with `/`. Compared without regard to case; a duplicate or a path that belongs to a current page fails. |
| `to`     | Target page ID and its full publication: `doc`, `channel`, `version`, and `language` are all required.                    |
| `status` | HTTP status: `301`, `302`, `303`, `307`, or `308`. Defaults to `308`.                                                     |

The build resolves each target to its current route and writes `redirects.json`. `shoalrun serve` and the Vercel build apply the redirects, with or without a trailing slash. The old page's `.md` URL redirects to the target's Markdown twin with the same status.
