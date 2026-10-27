---
id: reference.config-publishing
title: Publications and routing settings
summary: Configure versions, languages, navigation, and redirects.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/publishing
---

# Publications and routing settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Configuration reference > Publications and routing

**Updated: 2026-10-27.**

Configure versions, languages, navigation, and redirects. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

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

## `navigation`

A list of sidebar nodes. Each node has a unique `id` and exactly one of `doc`, `operation`, `generated`, or `items`. Unknown node keys fail. See [navigation](https://www.shoalrun.com/author/navigation.md).

| Key         | Meaning                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`        | Unique node ID. Required.                                                                                                                     |
| `doc`       | A page ID.                                                                                                                                    |
| `operation` | A stable operation ID; shows that operation's reference page.                                                                                 |
| `items`     | Child nodes, optionally loaded from another YAML list with `$include`; makes the node a group. Groups need a `label`.                         |
| `label`     | Menu text. Defaults to the page title for `doc` and `operation` nodes.                                                                        |
| `search`    | Extra words for the sidebar navigation filter, separate from site-wide search. Allowed on page and operation nodes, not groups or generators. |
| `api`       | Limits a group or generator to one API. Children inherit it.                                                                                  |
| `tab`       | Set `true` on a top-level group to give it a navigation tab and sidebar. Requires `landing`; nested tabs are rejected.                        |
| `landing`   | Stable ID of a page inside the tab's items. The tab links to that page in each publication.                                                   |
| `tag`       | An OpenAPI tag for a group that uses `generated: remaining`.                                                                                  |
| `generated` | `tags` or `remaining`. Adds generated reference pages.                                                                                        |

Pages and groups:

```yaml title="config/nav.yaml"
- id: start
  doc: guide.overview
- id: guides
  label: Guides
  items:
    - id: first-payment
      doc: guide.create-payment
      label: Your first payment
      search: checkout charge
    - id: errors
      doc: guide.handle-errors
```

Mix authored pages, a pinned API operation, and generated reference pages grouped by OpenAPI tag:

```yaml title="config/nav.yaml"
- id: payments
  label: Payments API
  api: payments
  items:
    - id: payment-guide
      doc: guide.create-payment
    - id: create-payment
      operation: payments.create
    - id: other-payment-pages
      generated: tags
```

Fill one hand-made group with the remaining operations for a tag:

```yaml title="config/nav.yaml"
- id: reports
  label: Reports
  api: payments
  tag: Reports
  items:
    - id: report-guide
      doc: guide.reports
    - id: report-operations
      generated: remaining
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

## Related reading

### Read first

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Find configuration settings in another topic.
