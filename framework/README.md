# Shoalrun

Shoalrun builds a documentation website, Markdown pages, and application content from the same Markdown and MDX source. People can browse the site; applications and agents can read stable documents, sections, and snippet instances. Native components keep essential instructions and API details readable in both HTML and Markdown.

This package provides the `shoalrun` CLI, starter projects, agent skills, and offline documentation. It requires Node.js 22.12 or newer. This alpha is distributed through the public npm registry. Installation requires no npm account or package token.

## Install

From the project where you want to keep your documentation:

```sh
npm install --save-dev --save-exact @shoalrun/cli@0.1.0-alpha.19
```

## Create and preview a site

Run these commands from the directory where you installed the package:

```sh
npx --no-install shoalrun init my-docs --starter showcase
npx --no-install shoalrun build my-docs/docs.config.yaml my-docs/site-dist
npx --no-install shoalrun serve my-docs/site-dist --port 8770
```

Open <http://127.0.0.1:8770/>. Edit the pages in `my-docs/content/` and the site settings and navigation in `my-docs/docs.config.yaml`. Rebuild to update the preview, or use the development server to rebuild on changes:

```sh
npx --no-install shoalrun dev my-docs/docs.config.yaml my-docs/site-dist --port 8770
```

Stop the existing preview with Ctrl-C before starting the development server on the same port. Choose **Explore the starter**, the first item in the left navigation, to find component examples, diagrams, reader views, themes, and generated API references. The service and API hosts are fictional; replace them before sending requests. Choose `--starter minimal` for a smaller starting point or `--starter api-docs` for a focused OpenAPI example. All three starters build without provider credentials.

## What you can build

The [features overview](https://www.shoalrun.com/features) describes the complete authoring and delivery workflow. Start with the part you need:

| Need | Capability |
| --- | --- |
| A documentation site | Pages, navigation, local preview, themes, palettes, fonts, and project CSS. |
| Reusable procedures | Recipes, shared ingredients, and cookbooks that help readers choose a complete task. |
| API reference | OpenAPI operation pages, code examples, focused contracts, and an explicit source-review gate. |
| Several product releases | Independent product versions and defaults, publication routes, and a header publication selector. |
| Customer editions | External profiles, SKU revisions, feature grants, and conditional pages or sections. |
| Application help | HTML and Markdown exports, stable page/section/snippet references, static and REST clients, and instance-safe mounting. |
| Agent discovery | Markdown twins, compact linked indexes, read-only MCP tools, bundled skills, and offline references. |
| Search and answers | Browser keyword search, optional semantic retrieval, and hosted documentation chat with shared limits. |

Local builds and keyword search need no provider credentials. Semantic retrieval and generated answers use separately configured services; credentials stay server-side. Reader filters are browsing controls, not authorization. Customer profiles select output during compilation; private-edition hosting remains your responsibility.

## Match your brand

Use `site.logo`, `site.favicon`, and header settings for site identity. Choose a theme preset and configure `theme.palette`, `theme.mode`, and `theme.fonts`. Use `site.customCss` for changes beyond those settings. Customer profiles can supply deployment-owned branding without storing customer records in the shared source.

Check controls and interactive states as well as article text: a dark header can contain light inputs, menus, and search results. Palette validation doesn't check arbitrary project CSS. See [themes and fonts](https://www.shoalrun.com/styling/themes), the [CSS reference](https://www.shoalrun.com/author/css), and [deployment profiles](DEPLOYMENT-PROFILES.md).

## Independently versioned products

Projects can give each product its own version catalog and default version. Product publications carry a product, channel, version, and language; routes, document links, navigation, search, and content exports retain that scope. Existing projects without product catalogs keep their publication identities and routes.

Product catalogs and profile-aware development preview are available since `0.1.0-alpha.18`. The product names and versions below are an example configuration.

The header publication dropdown groups the published releases by product. It hides language labels when the edition has one language; set `site.publicationSelector.showLanguage: true` or `false` to override that display without changing publication identity.

```yaml
publications:
  defaults: { channel: production, language: en }
  channels:
    production: {}
  products:
    payments:
      label: Payments
      pathPrefix: /payments
      defaultVersion: v3
      versions:
        v3: { pathPrefix: /v3 }
        v2: { pathPrefix: /v2 }
    reporting:
      label: Reporting
      pathPrefix: /reporting
      defaultVersion: v1
      versions:
        v1: { pathPrefix: /v1 }
  enabled:
    - { product: payments, channel: production, version: v3 }
    - { product: payments, channel: production, version: v2 }
    - { product: reporting, channel: production, version: v1 }
```

Declare a page's product and version in its frontmatter; omitting its version selects that product's `defaultVersion`. To reuse a source across product releases, list explicit product/channel/version entries in `publications` instead of setting those fields at page level. A page with slug `/setup` in the Payments v3 publication above is published at `/payments/v3/setup`. Product selection does not grant feature access: page-level `requires` and section-level `<ForFeature>` still select content from the customer's feature grants.

An existing customer profile can narrow the shared enabled publications independently for each product:

```yaml
schemaVersion: 1
features: [] # Or declare SKU revisions and additional feature grants.
publications:
  enabled:
    - { product: payments, channel: production, version: v3 }
    - { product: reporting, channel: production, version: v1 }
```

The shared configuration must declare `profiles.manifest`, which defines the known features and SKU revisions. Each selected publication must be enabled by that configuration. Preview the customer edition directly:

```sh
npx --no-install shoalrun dev docs.config.yaml site-dist --profile customers/example.yaml --port 8770
```

The development server compiles the selected edition and watches its profile, SKU manifest, and declared assets, including files outside the project. Editing the profile rebuilds the edition and removes output that is no longer selected. The preview identifies the last successful edition. If a rebuild fails, it keeps that output and displays the failure on existing and newly opened pages. Reader views remain browsing controls; customer profile selection applies during compilation to HTML, Markdown, navigation, and indexes.

Agents can discover product scopes through MCP `get_publications` before searching. It returns a short, paginated list (20 publications and a 2,048-token budget by default), with only the relevant product labels and defaults. Search results supply scoped read arguments; catalogs are stored once in `documents.json`, rather than repeated in every page. Product-aware content exports use schema version 2; legacy exports remain version 1.

## Work with an agent

Shoalrun works with your existing coding agent. Its packaged skills cover setup, page authoring, components, recipes, and walkthroughs. Use `skills list` to discover the skills included with your installed version:

```sh
npx --no-install shoalrun skills list
npx --no-install shoalrun skills read shoalrun-setup
```

Ask your agent to read the skill for the task. `skills list` returns names, descriptions, and local instruction-file paths. These commands read the skills; installing the npm package does not automatically install them into your agent.

The editing workflow is to capture a baseline, edit source files, validate the changes, then review a local preview. From your documentation project directory:

```sh
npx --no-install shoalrun docs baseline --out .shoalrun/task-baseline.json
# Edit your pages and configuration.
npx --no-install shoalrun docs validate --baseline .shoalrun/task-baseline.json
```

Validation returns a report path. Pass that path to `shoalrun docs review` and `shoalrun docs preview`. Snapshot validation can render affected draft pages while preserving their draft access; ordinary site builds exclude drafts. Supply your own project writing and review requirements. Configured checks and custom plugins execute trusted project code; a validation copy is not an operating-system sandbox.

## Find documentation

Read the documentation bundled with your installed version without a provider key or website connection:

```sh
npx --no-install shoalrun --help
npx --no-install shoalrun docs search "Steps" --json
npx --no-install shoalrun docs read guide.component.steps --json
```

The bundled documentation is a reviewed, pinned snapshot. Its provenance lives in `agent-docs/SNAPSHOT.json`; it does not automatically follow the live site.

See the [authoring command reference](AUTHORING.md) for project inspection, validation, report schemas, and the public authoring API. Visit [shoalrun.com](https://www.shoalrun.com) for the full documentation; it may describe changes newer than your installed package.

## Build sites from shared content

Use separate entry configs with the same `site.contentDir` and shared `extends`
presets. Each site can have its own title, origin, base path, theme, navigation,
and output directory. `site.contentFilter` selects whole pages using any
configured `readerFilters` facet, including audience, product, area, subarea,
and custom facets. For example:

```yaml
extends: [./base.yaml]
site:
  title: Developer resources
  origin: https://developers.example.com
  contentFilter: { audience: [developer] }
```

Every named facet must match at least one selected choice. Unmarked pages are
excluded; mark shared pages with all applicable choices. Unknown or empty
selectors and selections with no published pages fail. Omit the selector to
publish all otherwise eligible pages. Keep navigation and links inside the
selected set. Selected pages retain their full body; this is page selection,
not section redaction or host authorization.

See [the runnable faceted-sites example](example-configs/faceted-sites/README.md)
for main, developer, and regional sites built from one source directory.

For deployment-owned SKU selections, direct or grandfathered feature grants, and
branding supplied outside the shared repository, see [deployment profiles](DEPLOYMENT-PROFILES.md).

## Enable semantic search

The default search runs in the browser with no server or API key. To use
Shoalrun's semantic endpoint, select the included provider:

```yaml
outputs:
  html:
    search:
      provider: semantic
retrieval:
  embeddings:
    provider: voyage
    model: voyage-4-large
    queryModel: voyage-4-lite
    dimension: 1024
```

Set `VOYAGE_API_KEY` in the build and server environment, then run:

```sh
shoalrun build docs.config.yaml site-dist
shoalrun index site-dist --embed --config docs.config.yaml
shoalrun serve site-dist --search --config docs.config.yaml
```

No custom browser adapter or chat model is needed. The browser sends the selected
publication and reader view to the same-origin endpoint and uses keyword search
if it is missing or unavailable. Each semantic query calls the embedding
provider; keys stay server-side. Reindex changed content and restart the preview
after rebuilding indexes. Existing matching embedding inputs are reused.

`provider: semantic` configures the browser connection; production hosting still
needs a search endpoint. The current Vercel integration supplies search through
its chat-function deployment, which does not yet support deployment profiles.
A static deployment remains usable through keyword fallback. External search
services can continue to use `provider: custom`.

## Export content into an application

Export pages from the same source into a portable directory for an application's
help drawer, onboarding screens, or other content surfaces:

```sh
npx --no-install shoalrun export docs.config.yaml --out app/public/help --public-base /help/
```

The command writes `manifest.json`, resolved Markdown, passive HTML fragments,
referenced local assets, and `NOTICES.txt`. It does not require navigation,
facets, a previous website build, or a Shoalrun runtime in the app. Your app maps
stable document IDs to the exported files and owns its UI and routing.

For a reusable selection, define an `exports` target:

```yaml
exports:
  app-help:
    formats: [markdown, html]
    documents: [guide.api-keys, guide.billing]
    publicBase: /help/
```

Run `shoalrun export docs.config.yaml --target app-help --out app/public/help`.
Omit both `documents` and `resources` to export all eligible public pages in one enabled publication;
select an explicit publication when more than one is enabled. Export selection
is independent of the website's `site.contentFilter` and navigation. Selected
pages retain all reader sections as labeled static content. Tabs and walkthroughs
keep every panel or step. Interactive browser modules are not exported.

Document links use bundle locations and typed manifest targets for in-app routing.
Omitted documents need an eligible canonical website destination. `publicBase`
must match the bundle's app mount so images work from arbitrary app routes.
`/help/` is an example: choose another root-relative path, such as `/resources/`,
and update the app's manifest URL and server mount to match. The `--out`
filesystem directory can have a different name from the URL path.
Local assets default to the content directory; explicit `assetRoots` extend that
boundary. Remote images remain external and are reported. API material retains
the source-review gate; `--review` produces a review candidate and exits 2 when
approval is needed. Unavailable targets and unsupported content fail before an
older export is replaced.

See [the help-drawer example](examples/help-drawer/README.md) for a plain-JavaScript
consumer and local preview. The [export manifest schema](schemas/content-export.schema.json)
describes the file contract. Direct HTML insertion requires consumer-side ID and
reference rewriting for repeated instances; the content-delivery mount helper
provides that rewriting. Whole-page exports do not include
website navigation, search/chat runtimes, themes, or heuristic section resources.

## Content delivery

Content delivery extends export to selected pages, standalone sections, and named snippet instances. Applications can use the browser-safe client with a static manifest or a read-only REST endpoint. Static delivery requires no server or model provider.

```ts
import { openManifestContentSource } from '@shoalrun/cli/content';

const source = await openManifestContentSource({
  manifestUrl: '/content/releases/r42/manifest.json',
});
const resource = await source.get(
  { kind: 'section', documentId: 'guide.billing', sectionId: 'refunds' },
  { format: 'html' },
);
```

Heading-derived section IDs are the default. Optional explicit IDs preserve references across heading renames. Export comparisons report removed references when a previous manifest is supplied. Each opened source stays on one publication and revision; open a new source to update it.

See the [content-delivery example](examples/content-delivery/README.md) for resource selection, instance-safe HTML mounting, and a complete local preview. The example also runs the REST adapter and demonstrates `openRestContentSource` with the same reading interface. See the [OpenAPI contract](schemas/content-rest.openapi.json) for the HTTP API. Authentication, search, and production hosting remain application concerns.

## Publish discovery files

Set `site.origin` to the HTTPS origin (for example, `https://example.github.io`)
and `site.basePath` to the mount path (for example, `/my-docs`). With indexing
enabled, the origin enables canonical URLs and an XML sitemap. The generated
`llms.txt` links to that sitemap when available. Without an origin, Shoalrun
still publishes Markdown and documentation indexes, but omits the sitemap.

For a site mounted below a path, the generated `robots.txt` lives under that
path. Crawlers consult `/robots.txt` at the host root; configure that file at
the host level if needed. A project-path robots file does not control the host.

Shoalrun generates `llms.min.txt` and `llms.txt`, not `llms-full.txt`. Any custom
full-document export must rewrite source-relative links to published URLs and
retain each document's public source URL. Write page summaries that describe
which questions the page answers; the generated indexes reuse those summaries.

Compact discovery indexes have a 2,000-token limit (`cl100k_base`). Small sites
list pages directly. Larger sites link to topic indexes, grouped by publication
and primary taxonomy area (or page type when no area is declared). Growing topics
split into narrower indexes automatically. Follow a matching topic or title range
until you reach a page; every published page remains reachable, including pages
outside navigation. Standalone sections retain their sizes and full-page links.
Navigation-section indexes use the same limit. `llms.txt` remains the complete
catalog and is optional for topic-based discovery. Consumers must follow index
links instead of assuming every page appears directly in `llms.min.txt`.

The limit applies to each index response, not an entire multi-step reading session.
An individual title or summary too large to fit an index produces an explicit
build error rather than silently dropping content.

## Verification dates

Set `verified` only after checking a page's technical claims. It is separate from
`updated`, which records content revision. Both appear as labeled `<time>` elements
in the standard HTML page header, and as dates in Markdown and `documents.json`.
Builds never assign `verified`.

```yaml
updated: 2026-10-28
verified: 2026-10-27
showVerified: false
```

`showVerified` defaults to `true`. Set it to `false` to hide the verification date
in HTML only; Markdown and manifest metadata retain it. Set
`frontmatter.defaults.showVerified: false` in project configuration for a shared
default, then override it with `showVerified: true` on individual pages. A layout
with a Hero replaces the standard page header and does not display its dates.

## Upgrade from the earlier private registry

If you previously used the private GitHub Packages alpha, check `npm config get @shoalrun:registry`. Remove or replace any `@shoalrun:registry=https://npm.pkg.github.com` entry in your project or user `.npmrc`. You can explicitly select the public registry for the upgrade:

```sh
npm install --save-dev --save-exact @shoalrun/cli@0.1.0-alpha.19 --@shoalrun:registry=https://registry.npmjs.org
```

Commit the updated package manifest and lockfile together. Check that the lockfile resolves `@shoalrun/cli` from `registry.npmjs.org`. Keep any credentials needed by other private dependencies; Shoalrun itself no longer needs a package token.

## Status and development

This alpha may change configuration and output formats between releases. No compatibility promise or maintained older release line is offered yet. Creating and previewing a basic site does not require a model provider or Chrome. Optional provider-backed features require their own configuration.

Shoalrun is maintainer-led and does not accept unsolicited pull requests at this time. The [repository development instructions](https://github.com/shoalrun/shoalrun#develop-the-framework) explain how to build and test your own checkout or fork.

Pin an exact package version and read the [changelog](CHANGELOG.md) before upgrading. Rebuild and check HTML, Markdown, links, and any application consuming exported content before deploying. See the [contribution policy](https://github.com/shoalrun/shoalrun/blob/main/CONTRIBUTING.md) and [security policy](https://github.com/shoalrun/shoalrun/blob/main/SECURITY.md) for reporting problems and project trust boundaries.

## License

Copyright 2026 Casey Smith. This package is licensed under [Apache-2.0](LICENSE). Your authored site content keeps its own license. Built sites contain runtime assets and may contain copied template text; retain applicable licenses and third-party notices when distributing them.
