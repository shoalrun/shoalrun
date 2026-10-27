# Shoalrun

Shoalrun turns Markdown and MDX into a documentation website and Markdown pages from the same content. People can browse the site; agents can read the Markdown. Native components such as steps, tabs, and API references preserve their content in both formats.

This package provides the `shoalrun` CLI, starter projects, agent skills, and offline documentation. It requires Node.js 22.12 or newer. This is a private alpha distributed through GitHub Packages; your account needs package read access.

## Install

From the project where you want to keep your documentation, authenticate with a GitHub classic personal access token that has `read:packages`. Enter the token at the password prompt:

```sh
npm login --scope=@shoalrun --registry=https://npm.pkg.github.com --auth-type=legacy
npm install --save-dev @shoalrun/cli@0.1.0-alpha.9 --@shoalrun:registry=https://npm.pkg.github.com
```

## Create and preview a site

Run these commands from the directory where you installed the package:

```sh
npx shoalrun init my-docs --starter minimal
npx shoalrun build my-docs/docs.config.yaml my-docs/site-dist
npx shoalrun serve my-docs/site-dist --port 8770
```

Open <http://127.0.0.1:8770/>. Edit the pages in `my-docs/content/` and the site settings and navigation in `my-docs/docs.config.yaml`. Rebuild to update the preview, or use the development server to rebuild on changes:

```sh
npx shoalrun dev my-docs/docs.config.yaml my-docs/site-dist --port 8770
```

Stop the existing preview with Ctrl-C before starting the development server on the same port. Use the `api-docs` starter instead of `minimal` for an example site with an OpenAPI source. Choose `--starter showcase` for a fuller fictional service handbook with component examples, diagrams, reader views, themes, and generated API references. All three starters build without provider credentials.

## Work with an agent

Shoalrun works with your existing coding agent. Its packaged skills explain how to set up a site, edit pages, and develop components:

```sh
npx shoalrun skills list
npx shoalrun skills read shoalrun-setup
```

Ask your agent to read the skill for the task. `skills list` returns names, descriptions, and local instruction-file paths. These commands read the skills; installing the npm package does not automatically install them into your agent.

The usual editing workflow is to capture a baseline, edit source files, validate the changes, then review a local preview. From your documentation project directory:

```sh
npx shoalrun docs baseline --out .shoalrun/task-baseline.json
# Edit your pages and configuration.
npx shoalrun docs validate --baseline .shoalrun/task-baseline.json
```

Validation returns a report path. Pass that path to `shoalrun docs review` and `shoalrun docs preview`. Snapshot validation can render affected draft pages while preserving their draft access; ordinary site builds exclude drafts. Supply your own project writing and review requirements—the starter does not define them for you.

## Find documentation

Read the documentation bundled with your installed version without a provider key or website connection:

```sh
npx shoalrun --help
npx shoalrun docs search "Steps" --json
npx shoalrun docs read guide.component.steps --json
```

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

## Export content into an application

Export pages from the same source into a portable directory for an application's
help drawer, onboarding screens, or other content surfaces:

```sh
npx shoalrun export docs.config.yaml --out app/public/help --public-base /help/
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
Omit `documents` to export all eligible public pages in one enabled publication;
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
describes the file contract. Mount each document once per DOM; repeated instances
need consumer-side ID and reference rewriting. Whole-page exports do not include
website navigation, search/chat runtimes, themes, or heuristic section resources.

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

## Status and development

This alpha may change configuration and output formats between releases. No compatibility promise or maintained older release line is offered yet. Creating and previewing a basic site does not require a model provider or Chrome. Optional provider-backed features require their own configuration.

To contribute to the framework, use the [repository development instructions](https://github.com/shoalrun/shoalrun#develop-the-framework). Those commands run in a source checkout.

## License

Copyright 2026 Casey Smith. This package is licensed under [Apache-2.0](LICENSE). Your authored site content keeps its own license. Built sites contain runtime assets and may contain copied template text; retain applicable licenses and third-party notices when distributing them.
