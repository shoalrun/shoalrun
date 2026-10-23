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

**Updated: 2026-10-23.**

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

These directives compose configuration values. Paths resolve relative to the file declaring them. For complete examples, merge order, and troubleshooting, follow [Configure your project](https://www.shoalrun.com/configuration.md).

### `$include`

`{ $include: ./path.yaml }` replaces a value at any depth with the contents of another YAML file. The mapping can have no other keys. Included files can include others; a cycle fails with `Configuration cycle` and the chain of files. Normal inheritance rules apply to the resolved value.

### `extends`

A top-level `extends: [./base.yaml]` layers one or more presets in order, followed by the current file. Mappings merge key by key; lists and scalar values replace earlier values. Presets may extend other presets. A top-level `extends` always names config files, including in an included file; it cannot serve another purpose there.

### `$concat` and `$remove`

`{ $concat: [...] }` appends items to an inherited list, or becomes the list when none is inherited. It also accepts included lists. `{ $remove: [name, ...] }` removes inherited mapping keys by name or list items by `id`; it fails when nothing is inherited.

Run `shoalrun config explain <key> docs.config.yaml` to inspect a value's source and overrides. See the [CLI reference](https://www.shoalrun.com/cli.md) for other inspection commands.

## `search`

Optional. `search.synonyms` is a list of groups of two or more words or phrases. Each term in a group can find the others, with exact matches ranked higher. A term can appear in only one group. Use `$include` to keep the groups in a project-owned YAML file. The [site search guide](https://www.shoalrun.com/author/search.md) shows the format and which search paths use it.

## `authoring`

Optional project guidance and read-only source locations. These settings do not choose a model or read external files during a site build.

| Key             | Meaning                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `directives`    | Nonempty project writing instructions.                                                                                          |
| `guideFiles`    | Project-relative writing-guide paths.                                                                                           |
| `exemplarFiles` | Project-relative reviewed examples.                                                                                             |
| `sourceRoots`   | Named local folders for source search. Each entry has `path`, optional `name`, and optional `include` and `exclude` glob lists. |
| `pageSources`   | Stable page IDs mapped to source file paths or globs. These seed evidence selection for known features.                         |

Source paths resolve from the root configuration directory. Source folders and page-source files may be outside the docs project; guide and exemplar paths remain inside it. URLs are not source folders. Git is not required. Your coding agent selects the evidence scope under its own permissions.

```yaml title="docs.config.yaml"
authoring:
  sourceRoots:
    - name: Application implementation
      path: ../application/src
      include: ["**/*.ts", "**/*.tsx"]
      exclude: ["**/*.test.ts"]
  pageSources:
    guide.authentication:
      - ../application/src/authentication.ts
```

Project discovery reports these configured source locations. Use your coding agent's own search and read tools, with its execution permissions, to investigate external implementation files. `docs source` reads only paths inside the project. See [authoring tools commands](https://www.shoalrun.com/author/workspace/commands.md) for current discovery and validation commands.

## `site`

Required.

| Key              | Default                                  | Meaning                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`          | None                                     | Site name in the masthead and the heading of `/llms.txt`.                                                                                                                                                                                                                                                                            |
| `contentDir`     | `content`                                | Page directory, relative to the root config file. Every `.md` and `.mdx` file in it is read.                                                                                                                                                                                                                                         |
| `contentFilter`  | None                                     | Build-time whole-page selection by configured reader facets. All selected facets must match; any listed choice within a facet matches. Unmarked pages are excluded. Unknown or empty selectors and selections with no pages fail. See [separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md). |
| `basePath`       | `""`                                     | Mount point for public pages and resources, such as `/docs`. Use URL path segments without escapes or dot segments. Build tools keep internal manifests at the output root; the public site is also complete inside the `docs/` output subtree.                                                                                      |
| `origin`         | None                                     | The site's HTTPS origin, such as `https://docs.example.com`, with no path or trailing slash. Required to publish the API catalog, and makes link-preview URLs absolute.                                                                                                                                                              |
| `indexing`       | `true`                                   | Set `false` on previews to add noindex to pages, disallow crawling in `robots.txt`, and omit the XML sitemap.                                                                                                                                                                                                                        |
| `updated`        | None                                     | Optional YYYY-MM-DD fallback for sitemap `lastmod`, especially on generated API pages. Page `updated` overrides it.                                                                                                                                                                                                                  |
| `favicon`        | A mark drawn from the preset and palette | A local `.svg` or `.png` file. See [share images and favicon](https://www.shoalrun.com/styling/share-images.md).                                                                                                                                                                                                                     |
| `customCss`      | None                                     | A local `.css` file linked after the framework styles. See [CSS](https://www.shoalrun.com/author/css.md).                                                                                                                                                                                                                            |
| `editionBadge`   | `auto`                                   | Masthead publication label: `auto` shows only the channel, version, or language values that differ across publications; `always` or `never`.                                                                                                                                                                                         |
| `header.links`   | None                                     | Masthead links. See [header](https://www.shoalrun.com/styling/header.md).                                                                                                                                                                                                                                                            |
| `agentDiscovery` | Visually hidden until focused            | HTML agent guidance, visual presentation, and link labels. See `site.agentDiscovery` below.                                                                                                                                                                                                                                          |
| `footer`         | None                                     | Footer `columns`, bottom-row `links`, and a `text` line. See [site footer](https://www.shoalrun.com/styling/footer.md).                                                                                                                                                                                                              |

A minimal site needs only a title:

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
```

Keep pages in another directory, add a stylesheet, and always show the publication label:

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
  contentDir: pages
  customCss: ./styles/project.css
  editionBadge: always
```

Publish the API catalog. `origin` is required once any API sets `discovery.endpoint`:

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
  origin: https://docs.example.com
```

Add masthead links:

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
  header:
    links:
      - { label: Guides, href: /start }
      - { label: GitHub, href: "https://github.com/example/payments", style: button }
      - { label: Sign up, href: "https://example.com/signup", style: primary }
```

Add a footer:

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
  footer:
    columns:
      - title: Guides
        links:
          - { label: Get started, href: /start }
    links:
      - { label: Privacy, href: /legal/privacy }
    text: © 2026 Example, Inc.
```

### `site.agentDiscovery`

Optional mapping. It controls the early agent guidance in HTML pages.

| Key              | Default                      | Meaning                                                                                                  |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `mode`           | `focus`                      | Controls visual presentation and whether the block is included. See the visual and agent behavior below. |
| `label`          | `For agents`                 | Nonempty plain text before the message and links. Shoalrun adds the colon.                               |
| `message`        | None                         | Optional plain-text guidance. HTML tags are escaped; Markdown syntax stays literal.                      |
| `links.article`  | `Skip to article`            | Label for the generated `#main` link.                                                                    |
| `links.index`    | `Documentation index`        | Label for the generated `/llms.txt` link, including `site.basePath`.                                     |
| `links.markdown` | `Read this page as Markdown` | Label for the current page's Markdown twin.                                                              |

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
  agentDiscovery:
    mode: visible
    label: For agents
    message: Use the Markdown version for complete examples and nested schemas.
    links:
      article: Jump to the article
      index: Browse all documentation
      markdown: Read Markdown
```

Only link labels are configurable; Shoalrun generates their destinations for each page. Labels must be nonempty strings. Unknown keys and invalid mode values fail validation and builds.

The mode controls visual presentation and whether the instruction is included:

| Value        | Visual presentation                                   | Agent reading HTML                                          |
| ------------ | ----------------------------------------------------- | ----------------------------------------------------------- |
| `focus`      | Visually hidden until a link receives keyboard focus. | The instruction and links are present in the HTML.          |
| `visible`    | Always shown as a banner.                             | The same instruction and links are present in the HTML.     |
| `disclosure` | A compact header toggle, closed initially.            | Links remain in HTML source; open it for visual navigation. |
| `off`        | No agent guidance block appears.                      | The instruction and its links are omitted from the HTML.    |

Screen readers and agents parsing raw HTML can encounter the block in all enabled modes. An agent using screenshots sees the same visual presentation as a human. Some HTML extraction tools discard visually hidden elements; the document head also provides discovery links. Visually hiding the block does not make it private.

This setting affects HTML only. It does not change the Markdown index link, generated discovery files, or the standard accessibility skip link. The focus and visible blocks follow that skip link before the header. Disclosure mode places the toggle inside the header. It is hidden in print.

### Content freshness

`site.freshness: { history: ./config/content-updates.json }` opts into persistent content-digest dates. Paths resolve from the root config directory and must stay inside the project. The first build seeds declared dates; changed content later receives today's UTC date while unchanged content retains its date. Commit the history file for reproducible clean builds. Without this setting, declared `updated` and `site.updated` remain authoritative. Native page `verified` is an independent, author-set calendar date. See [revision and verification dates](https://www.shoalrun.com/publish/seo.md).

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

## `apis`

A mapping from API ID to its source and operations. See [API references](https://www.shoalrun.com/publish/api-references.md) and [focused contracts](https://www.shoalrun.com/api-docs/focused-contracts.md).

| Key                         | Meaning                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source.kind`               | Must be `file`.                                                                                                                                                                                                                                    |
| `source.path`               | Local OpenAPI 3.0 or 3.1 file, relative to the declaring config file.                                                                                                                                                                              |
| `source.focused`            | `true` writes a [focused contract](https://www.shoalrun.com/api-docs/focused-contracts.md) for each reference page.                                                                                                                                |
| `source.publish`            | `true` publishes the full source file, which must end in `.yaml`, `.yml`, or `.json`. Also turns on focused contracts.                                                                                                                             |
| `publicReview.digest`       | Required SHA-256 review digest when API content appears on a public page or in a focused contract. Generate a candidate with `shoalrun api review <config> --output <local-directory>`, inspect it, then pin the reported digest.                  |
| `discovery.endpoint`        | Public HTTPS API URL for `/.well-known/api-catalog`. Needs `source.publish` and `site.origin`.                                                                                                                                                     |
| `operations`                | A list of `{ id, sourceOperationId, reference }` bindings. Stable IDs are unique across all APIs.                                                                                                                                                  |
| `publications`              | A list of `{ channel, version, source, discovery }` entries for publications other than the default.                                                                                                                                               |
| `generateReferences`        | `true`, or `{ pathPrefix, include }` or `{ pathPrefix, exclude }`. `pathPrefix` defaults to `/reference/<apiId>`.                                                                                                                                  |
| `mappings.subjectLifecycle` | Explicitly map an operation-level `x-*` scalar or dotted property to `beta`, `in-development`, `experimental`, or `deprecated`. See [OpenAPI extension mappings](https://www.shoalrun.com/publish/openapi-extension-mappings.md).                  |
| `querySyntax`               | Opt-in rules for a placeholder query parameter whose filter expressions go directly in the URL. Each rule has `parameter`, `pathPrefixes`, `style: unwrapped`, and `example`. See [API generation](https://www.shoalrun.com/api-docs/generate.md). |

One authored reference page for one operation. The spec stays private:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
  operations:
    - id: payments.create
      sourceOperationId: createPayment
      reference: reference.create-payment
```

Publish the spec, a focused contract per page, and the API catalog. This also needs `site.origin`:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml, publish: true }
  discovery:
    endpoint: https://api.example.com
  operations:
    - { id: payments.create, sourceOperationId: createPayment, reference: reference.create-payment }
```

Keep the spec private but publish focused contracts:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml, focused: true }
  operations:
    - { id: payments.create, sourceOperationId: createPayment, reference: reference.create-payment }
```

Generate reference pages for every operation except two:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
  generateReferences:
    pathPrefix: /api-reference/payments
    exclude: [internalReconcile, debugEcho]
```

Give the v2 publication its own spec. The top-level `source` covers the default publication:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/v1.yaml }
  publications:
    - channel: production
      version: v2
      source: { kind: file, path: ../apis/payments/v2.yaml, publish: true }
  operations:
    - { id: payments.create, sourceOperationId: createPayment, reference: reference.create-payment }
```

## `audit`

Optional local audit settings. Run `shoalrun check [config]` or `shoalrun audit [config]` to execute configured tests and build a temporary site. The checks compare API representations, inspect focused contracts, and validate local links. `check` prints readable results (`--json` selects JSON); `audit` returns JSON. Both exit with code 1 on failure.

```yaml title="docs.config.yaml"
audit:
  tests:
    - id: project-tests
      run: [node, --test, scripts/docs.test.mjs]
  api: true
  focusedContracts: true
  links: true
```

`audit.tests` is the integration point for external test suites. We recommend Doc Detective for documentation behavior tests; any command that exits nonzero on failure can be used. Each test needs a unique lowercase `id` and a nonempty `run` argument list. The first argument names the executable; the rest are passed without a shell. Commands run from the directory containing `docs.config.yaml`, so use project-relative paths. The `api`, `focusedContracts`, and `links` switches default to `true`. Set any to `false` to skip that group. The site build always runs because it checks the complete project and supplies focused contracts. See [audit a docs project](https://www.shoalrun.com/publish/audit.md) for a Doc Detective example, execution order, output, timeouts, and limits.

For snapshot validation, declare local check dependencies with optional `inputs` paths relative to the directory containing `docs.config.yaml`:

```yaml title="docs.config.yaml"
audit:
  tests:
    - id: formatting
      run: [vale, --config=../format.ini, content]
      inputs: [../format.ini, ../styles]
```

The snapshot copies declared files and directories within the project parent. It rejects missing inputs, symlinks, credentials, dependency folders, and paths outside that boundary. Directory declarations also track added and deleted files for freshness. Declare the configuration's supporting files too; Shoalrun does not infer dependencies from command arguments. Ordinary `check` and `audit` commands still run in the original project.

### Agent evaluation reports

`audit.evals` opts into checking a reviewed task report after the audit's temporary build. Set `tasks` to a YAML or JSON task file and `report` to a JSON result file. Both paths resolve relative to the file declaring them. Optional `run` is a nonempty command/argument list. It runs without a shell from the root config directory after a successful build. The timeout is two minutes; environment variables supply eval paths and digests. It can call external services and write the report; a nonzero exit fails independently of report validation. No evaluator is built into Shoalrun. See [evaluate agent tasks](https://www.shoalrun.com/publish/evals.md) for the report format, environment variables, and CLI commands.

## `cookbooks`

Optional mapping of cookbook IDs to a chooser title and ordered reader options. Each option has a unique `id`, `label`, and `doc` ID for a public `type: recipe` page in the same publication as the chooser. The build rejects duplicate options and unavailable targets. Set `mode: single` for alternative goals or use `mode: multiple` (the default) for compatible recipes. Optional option fields `when`, `needs`, and `outcome` explain each choice. The browser loads selected published recipe content in configured order and supports selection links, Markdown downloads, and printing. The [CookbookChooser reference](https://www.shoalrun.com/author/components/cookbook-chooser.md) shows a live example and the HTML and Markdown behavior.

```yaml title="docs.config.yaml"
cookbooks: { $include: ./config/cookbooks.yaml }
```

## `relationships`

A list of authored links between pages, with `id`, `from`, `to`, `type`, `reason`, and optional `order`. `type` is `prerequisite`, `next-step`, `reference`, `advanced`, `see-also`, or `not-confused-with`. See [related reading](https://www.shoalrun.com/author/related-reading.md).

A reading path through three pages:

```yaml title="config/relationships.yaml"
- id: auth-before-payment
  from: guide.create-payment
  to: guide.authentication
  type: prerequisite
  reason: Create an API key before sending a payment request.
- id: payment-then-refund
  from: guide.create-payment
  to: guide.refunds
  type: next-step
  reason: Refund a payment that was created by mistake.
```

Order links in a group. Lower numbers come first:

```yaml title="config/relationships.yaml"
- id: payment-reference
  from: guide.create-payment
  to: reference.create-payment
  type: reference
  reason: Check every request field and error code.
  order: 1
- id: payment-errors
  from: guide.create-payment
  to: guide.handle-errors
  type: reference
  reason: Look up what each decline code means.
  order: 2
```

Two-way links. Declare `see-also` and `not-confused-with` once; both pages show them:

```yaml title="config/relationships.yaml"
- id: refunds-vs-disputes
  from: guide.refunds
  to: guide.disputes
  type: not-confused-with
  reason: A refund is sent by you; a dispute is started by the cardholder's bank.
```

## `variables`

A mapping of project-wide values for [snippets](https://www.shoalrun.com/author/snippets.md). They override snippet defaults and are overridden by page `variables` and invocation values. Values are strings, numbers, or booleans.

```yaml title="docs.config.yaml"
variables:
  product: Payments
  supportEmail: support@example.com
  retryLimit: 3
  betaFeatures: false
```

A page overrides a project value for itself:

```yaml title="content/sandbox-guide.mdx (frontmatter)"
variables:
  product: Payments sandbox
```

A single include overrides both:

```mdx title="content/sandbox-guide.mdx"
<Snippet id="payment.request-prep" values={{ product: "Payments test mode" }} />
```

## `snippets`

A mapping from snippet ID to `{ file, variables }`. Each variable has a `type` (`string`, `number`, or `boolean`) and optional `required`, `default`, and `enum`. See [snippets](https://www.shoalrun.com/author/snippets.md).

A snippet with no variables:

```yaml title="config/snippets.yaml"
legal.beta-notice:
  file: ../snippets/beta-notice.mdx
```

Required and default values:

```yaml title="config/snippets.yaml"
payment.request-prep:
  file: ../snippets/request-prep.mdx
  variables:
    product: { type: string, required: true }
    header: { type: string, default: Idempotency-Key }
```

A value limited to a list, and a number:

```yaml title="config/snippets.yaml"
limits.rate:
  file: ../snippets/rate-limit.mdx
  variables:
    plan: { type: string, enum: [free, team, enterprise], default: free }
    perMinute: { type: number, required: true }
```

## `callouts`

Custom callout `types` and color `tones`. A type has a `label`, a `tone`, and an optional Lucide `icon`. A tone has `line`, `background`, and `text` colors, and an optional `dark` set. See [callouts](https://www.shoalrun.com/author/components/callout.md) for configuration examples and contrast requirements.

## `badges`

`badges.variants` adds or overrides inline badge colors. Each lowercase kebab-case name needs `light.background` and `light.text` hex colors; `light.border` is optional and defaults to the text color. Add the same fields under `dark` when the site uses dark or system mode. The build checks badge text contrast in every shown mode. See [Badges](https://www.shoalrun.com/author/components/badge.md) for the built-in variant table and a separate custom `partner` example.

## `templates`

An optional mapping from template ID to `{ type, body, required }`. Built-in templates need no registration; reuse a built-in ID to override it or add a custom ID. `type` becomes the new page's `type`, and `body` is a `.md` or `.mdx` file that can open with commented frontmatter. The only `required` value is `operations`. See [templates](https://www.shoalrun.com/author/templates.md).

```yaml title="config/templates.yaml"
how-to:
  type: how-to
  body: ../templates/how-to.mdx
```

Override the built-in API reference while retaining its operation requirement:

```yaml title="config/templates.yaml"
api-reference:
  type: api-reference
  body: ../templates/api-reference.mdx
  required: [operations]
```

Replace a built-in template by reusing its ID:

```yaml title="config/templates.yaml"
guide:
  type: guide
  body: ../templates/our-guide.mdx
```

## `readerFilters`

Optional reader views for one site. `facets` maps each stable facet ID to a reader-facing `label` and an `options` map of stable choice IDs to labels. `typeDefaults` optionally marks all pages of a document type unless a page supplies a value for that facet. `controls` selects sidebar and header pickers; `module` names a local browser module for custom controls. The first visit shows all content. See [reader views](https://www.shoalrun.com/author/reader-views.md) for page and section marks, controls, saved choices, and share links.

```yaml title="docs.config.yaml"
readerFilters:
  facets:
    audience:
      label: Reader
      options: { ui: Use the UI, developer: Build with the API }
  typeDefaults:
    api-reference: { audience: [developer] }
```

## `frontmatter`

Global `defaults`, `enforced` values, per-language formatting `locales`, custom `fields` declarations, and `changelogIdentifier`. Pages can replace defaults but not enforced values. `id` and `slug` can't be set globally. See [frontmatter](https://www.shoalrun.com/author/frontmatter.md) and [release notes and changelog](https://www.shoalrun.com/author/release-notes.md).

Let pages leave out common values:

```yaml title="config/frontmatter.yaml"
defaults:
  type: guide
  channel: production
  version: current
  access: { policy: public }
```

Force a value on every page:

```yaml title="config/frontmatter.yaml"
enforced:
  audiences: [partners]
```

Choose what identifies each changelog entry. The default is `either`; `date` and `version` are also available:

```yaml title="config/frontmatter.yaml"
changelogIdentifier: either
```

Here `version` means the page's `releaseVersion` field, not the documentation publication version.

Declare custom fields. `public: true` lets a field appear in the Markdown twin's header:

```yaml title="config/frontmatter.yaml"
fields:
  owner:
    type: string
    required: true
    description: Team that maintains the page.
  agent.intent:
    type: string
    public: true
  reviewStatus:
    type: string
    enum: [draft, reviewed, approved]
```

## `mcp`

Enable a read-only HTTP MCP endpoint on Node or in Vercel output for one public publication:

```yaml title="docs.config.yaml"
mcp:
  enabled: true
  access: public
  path: /mcp
  publication: { channel: production, version: current, language: en }
```

`path` defaults to `/mcp` and is mounted beneath `site.basePath`. The build rejects conflicting output routes. `enabled` must be a boolean, and enabled configurations require `access: public` and all three publication coordinates.

Optional `allowedHosts` lists exact hostnames without ports or wildcards. Optional `allowedOrigins` lists exact HTTP(S) browser origins. `site.origin` contributes its hostname and origin automatically; the local Node server also permits loopback requests. Unknown settings fail validation.

Omit the section, set `mcp: false`, or set `enabled: false` to disable it. The Node server reads generated settings, and `shoalrun vercel build` packages an independent function automatically. Read-only SDK calls have been verified on this site’s production Vercel endpoint. See [connect an MCP client](https://www.shoalrun.com/publish/mcp.md) for setup and request limits.

Optional `mcp.analytics.module` names a local `.js` or `.mjs` server adapter exporting `capture(event)` and optional `flush()`. It resolves relative to the declaring config file. The build copies the module and its dependencies without executing it. Relative imports must stay within its directory. Credentials belong in runtime environment variables.

Optional `mcp.analytics.consent` contains `header` and `value`. When configured, only requests with that exact header value can load or call the analytics adapter. Other requests can use the documentation tools without tracking. The header must be a lowercase custom `x-` name; forwarded, Vercel, and MCP protocol headers are reserved. The value is a case-sensitive policy identifier of up to 64 letters, digits, dots, underscores, or hyphens.

The header gate is off when omitted or set to `false`; readers then need no special client configuration for analytics. Use the gate only when your deployment requires explicit caller opt-in. In that mode, removing the header stops collection on future requests. This feature does not determine your privacy obligations. See [analytics safeguards](https://www.shoalrun.com/publish/mcp-analytics.md).

Optional `mcp.analytics.clientMetadata: true` adds normalized client labels and model labels from a fixed registry when supported request metadata is present. It defaults to `false`. Labels are unverified; raw headers, unrelated metadata, queries, and intent are excluded.

Optional `mcp.analytics.intent` and `mcp.analytics.conversationIds` are booleans that default to `false`. An adapter’s optional `instrument(server, options)` hook implements them. The PostHog example can add context/model arguments and conversation handles while excluding raw queries and results. Its context argument requests a fixed intent category. Free-text or invalid values are replaced with a per-tool category before analytics delivery; raw intent is never stored by that example. Other adapters must implement their own safeguards.

Omit `mcp.analytics` or set it to `false` to disable collection. It is independent of browser analytics and does not instrument stdio. See [measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) for fields, service mappings, and a PostHog example.

## `analytics`

Analytics is disabled by default. Configure a local browser adapter to receive interaction events:

```yaml title="docs.config.yaml"
analytics:
  module: ./analytics.js
```

The adapter must export `track(event)` and can export an asynchronous `init(context)`. `module` resolves relative to the declaring config file and is copied to the public assets without being executed during the build. `analytics: false` disables it. Shoalrun emits documented events; your adapter owns the service, consent, and delivery. See [bring your own analytics](https://www.shoalrun.com/author/analytics.md).

## `metadata`

`metadata.provider.module` names an optional local module that exports `provideMetadata(context)`. The module can supply owned page fields to the build. The framework does not run an external vocabulary validator or publish supplied fields automatically. See [custom metadata](https://www.shoalrun.com/author/custom-metadata.md) for the return shape and ownership rule.

```yaml title="docs.config.yaml"
metadata:
  provider:
    module: ./metadata/provider.mjs
```

The path is relative to the config file that declares it. `provider` accepts only `module`.

## `outputs`

Use `outputs` to configure the HTML, Markdown, discovery, and text artifacts produced by a build.

| Key                          | Meaning                                                                                                                                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `markdown.metadata`          | The Markdown twin's YAML header: `format`, `fields`, `addFields`, `removeFields`, `omitNull`, `byType`, and `profiles`. `format` defaults to `none`. See [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md). |
| `html.shareImages`           | `true`: a generated 1200×630 link-preview image per page. `false` turns them off; a mapping with `template` and `fonts` replaces the design. See [share images and favicon](https://www.shoalrun.com/styling/share-images.md).      |
| `html.highlighting`          | Code highlighting `provider`, `theme`, and `module`. Defaults to Shiki with the `site` theme, which takes code colors from the palette. See [code blocks](https://www.shoalrun.com/author/components/code-blocks.md).               |
| `html.navigation.showCounts` | Show page counts beside navigation groups. Defaults to `true`; set `false` to omit them. See [navigation](https://www.shoalrun.com/author/navigation.md).                                                                           |
| `html.search`                | Search `provider`, `module`, and `index`. See [search](https://www.shoalrun.com/author/search.md).                                                                                                                                  |
| `text`                       | Ordered frontmatter field paths for `card`, `pageHeader`, `search`, `htmlDescription`, and `socialCard`. See [custom metadata](https://www.shoalrun.com/author/custom-metadata.md).                                                 |

The build always writes `/llms.txt`, `documents.json`, `redirects.json`, and `resource-headers.json`; there are no settings for them.

A short Markdown header on every page:

```yaml title="docs.config.yaml"
outputs:
  markdown:
    metadata:
      format: yaml-frontmatter
      fields:
        id: frontmatter.id
        title: frontmatter.title
        summary: frontmatter.summary
        description: frontmatter.description
        canonical: publication.canonicalUrl
```

Add fields for one page type, and define a profile pages can select with `markdownMetadata: versioned`:

```yaml title="docs.config.yaml"
outputs:
  markdown:
    metadata:
      format: yaml-frontmatter
      fields: { id: frontmatter.id, title: frontmatter.title }
      byType:
        api-reference:
          addFields: { operations: frontmatter.operations }
      profiles:
        versioned:
          addFields: { version: publication.version, language: publication.language }
```

Use another Shiki theme, and turn off search:

```yaml title="docs.config.yaml"
outputs:
  html:
    highlighting: { provider: shiki, theme: github-light }
    search: { provider: none }
```

Plug in your own search and highlighter modules:

```yaml title="docs.config.yaml"
outputs:
  html:
    highlighting: { provider: custom, module: ./highlight.mjs }
    search: { provider: custom, module: ./search/hosted.js }
```

### Agent discovery index

Every published page is included automatically, using its title and frontmatter summary. You do not need to list page IDs. Omit `outputs.llms` for automatic grouping, or choose a bare alphabetical list of links and summaries:

```yaml title="docs.config.yaml"
outputs:
  llms:
    format: flat
```

`format` accepts `grouped` (the default) or `flat`. Flat mode includes all pages under `Pages`, without optional groups or repeated type labels. Discovery resources and API contracts remain linked, and fictional labels still apply. Grouping overrides are optional; `primaryIds` is an exception list, not an inventory.

`outputs.llms` controls grouping in `/llms.txt`. The build groups primary pages by type, puts secondary pages under `## Optional`, and lists `/search-index.json` under Discovery only when that file is generated. The complete manifest remains available for inventory. `fictionalPrefixes` also sets `demo: true` on matching pages in `documents.json`, `search-index.json`, and `search-index.min.json`. Matching uses the authored slug, including descendants, independently of publication or site path prefixes. Other pages receive `demo: false`, meaning unmarked rather than verified as a live service.

```yaml title="docs.config.yaml"
outputs:
  llms:
    primaryIds: [guide.components]
    optionalTypes: [recipe, ingredient, cookbook]
    optionalPrefixes: [/author/components]
    fictionalPrefixes: [/example-api]
```

`primaryIds` keeps named document IDs in their primary type section even when an optional type or prefix matches; fictional examples remain optional. Entries sort alphabetically within each section or optional group. Type labels appear only in the mixed optional groups. `optionalTypes` defaults to recipe, ingredient, and cookbook. Both prefix lists default to empty. Prefixes match page slugs before publication and base-path prefixes, on path boundaries. Fictional entries are always optional, labeled in the index, and carry a disclaimer in their Markdown twins. Use fictional prefixes only for synthetic examples, not real product API references.

## Related reading

### Read first

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, stable IDs, and config composition before changing settings.

### Related topics

- [CLI reference](https://www.shoalrun.com/cli.md) — Build, serve, and inspect a config from the command line.

- [Example configs](https://www.shoalrun.com/config/examples.md) — The same settings, combined into complete, working files.
