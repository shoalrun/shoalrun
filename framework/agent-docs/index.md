---
id: guide.home
title: Shoalrun
summary: Preview API and product docs with content selection and agent discovery.
type: overview
area: project
subarea: project-overview
canonical: /
---

# Shoalrun

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-10-30.**

**Docs for people. Context for agents.**

One source, two audiences. Build interactive docs for people and readable content for agents, with checks before you publish.

- [Use your docs in your app](https://www.shoalrun.com/content-delivery.md)
- [See what an agent gets](https://www.shoalrun.com/publish/agent-friendliness.md)
- [See what works today](https://www.shoalrun.com/status.md)

> **Try the alpha:** Install `@shoalrun/cli` from npm. No account or token is needed, and the normal build makes no model calls or network requests. Pin an exact version while the alpha evolves.
>
> [Install Shoalrun →](https://www.shoalrun.com/start.md)

## Put your docs inside your product

Export pages, single sections, and named snippets from the source that builds your site. Read them as HTML or Markdown in a help drawer, an onboarding screen, or an agent. Static files are enough; no content server or model provider is needed.

```ts
import { openManifestContentSource } from '@shoalrun/cli/content';

const snapshot = await openManifestContentSource({
  manifestUrl: '/content/revisions/r1/manifest.json',
});
const result = await snapshot.get(
  { kind: 'section', documentId: 'guide.billing', sectionId: 'refunds' },
  { format: 'html' },
);
```

The client checks each representation against the manifest's digest. A REST adapter serves the same snapshots over HTTP.

- [Content delivery](https://www.shoalrun.com/content-delivery.md)

  Deliver pages, sections, and snippet instances to applications from one reviewed content bundle.

- [Read content with a client](https://www.shoalrun.com/content-delivery/client.md)

  Open a content revision and read typed resources without depending on generated filenames.

- [Serve content through REST](https://www.shoalrun.com/content-delivery/rest.md)

  Expose reviewed content snapshots over HTTP and read them through the content client.

## Readable output, with checks you can inspect

Write Markdown, MDX, and OpenAPI once. People get tabs, navigation, and reader views. Agents get the supported content in reading order, with stable page IDs and machine-readable contracts.

| What you can inspect                     | What it gives you                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| A manifest with byte digests             | Stable page IDs and publication variants, with SHA-256 digests for the exact Markdown bytes.               |
| Compact discovery and incremental sync   | Find a page without the full search index; compare snapshots when a build changes.                         |
| Focused per-operation OpenAPI contracts  | One small contract with an operation and the local schemas it needs, when enabled.                         |
| Explicit component representations       | Tabs and disclosures become labeled sections. Snippets expand. Unsupported components fail the build.      |
| Reader views and format-specific content | Choose what people see in the browser, and write different explanations for HTML and Markdown when needed. |

Start with the compact page list, then fetch a page as Markdown. Hosts that support [content negotiation](https://www.shoalrun.com/publish/agent-friendliness.md) also serve it at the HTML route when the request sends `Accept: text/markdown`.

```sh
curl -fsSL https://www.shoalrun.com/llms.min.txt
curl -fsSL https://www.shoalrun.com/publish/agent-friendliness.md
```

## Check both audiences before you publish

The audit builds HTML and Markdown, checks links and API contracts, and runs your project tests. An unsupported component stops the build instead of disappearing from the agent's document. Adding `<UnknownWidget />` to a page, for example, makes `shoalrun check` fail with the source path:

```text
FAIL build
  …/docs.config.yaml: …/content/welcome.mdx: <UnknownWidget> has no semantic/Markdown adapter
Checks failed. Fix the findings above and rerun shoalrun check.
```

This output is illustrative, not a failure on the current site. The check catches unsupported representations; it does not establish that every sentence is correct.

[Eval reports](https://www.shoalrun.com/publish/evals.md) add reviewed agent-task results to the gate. You supply the agent run and the review. Shoalrun's five example tasks are a self-reviewed demonstration, not an independent measure of agent accuracy.

- [Audit a docs project](https://www.shoalrun.com/publish/audit.md)

  Run project tests and local API representation checks with one CI command.

- [Evaluate agent tasks against your docs](https://www.shoalrun.com/publish/evals.md)

  Define realistic tasks, record reviewed answers from your own agent, and check the results against a documentation build.

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md)

  Import a local OpenAPI file, author an operation page, review its public content, and build HTML and Markdown.

## Let agents read your docs, and help write them

Agents search and read built docs through the CLI or a read-only MCP server with four tools: `search_docs`, `get_page`, `get_outline`, and `get_section`. MCP cannot edit files or deploy. Writing and checking use your agent's own file tools, CLI commands such as `docs validate` and `audit`, and five bundled skills.

```sh
shoalrun docs mcp --site docs/dist
```

This site's live endpoint is `https://www.shoalrun.com/mcp`.

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md)

  Connect read-only MCP clients over stdio or HTTP to search and read built documentation.

- [Use your coding agent](https://www.shoalrun.com/author/coding-agent.md)

  Give your agent project guidance and draft a new documentation page.

- [Use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md)

  Give an agent the setup and authoring workflows that ship with Shoalrun.

## Control the reading experience

[Reader views](https://www.shoalrun.com/author/reader-views.md) shape navigation, search, cards, and marked sections in the browser. A UI reader can follow screen actions while a developer sees request examples. The Markdown keeps every marked section, with a label. [Format-specific content](https://www.shoalrun.com/author/components/only.md) swaps an interactive instruction for a written explanation.

- [Reader views](https://www.shoalrun.com/author/reader-views.md)

  Reader-view configuration, page and section marks, controls, and agent-facing behavior.

- [Content for one format](https://www.shoalrun.com/author/components/only.md)

  Use Only to add content to the HTML page or its Markdown twin alone.

- [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md)

  Public field projection, source paths, profiles, precedence, and required values.

## Build more than one site from one source

Keep one content directory and give each site its own config, origin, theme, and navigation. `site.contentFilter` selects pages by audience, product, or region at build time. Versions and languages can share unchanged pages.

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md)

  Publish separate sites from shared content using optional facet selection.

- [Share pages across documentation versions](https://www.shoalrun.com/publish/publications.md)

  Versioning one docs site without copying every page: share unchanged pages, vary sections, and publish changed pages separately.

## Make it look like yours

Pick a theme and palette, follow the reader's light or dark setting, and add brand colors or CSS. The build checks palette contrast.

```yaml title="docs.config.yaml"
theme:
  preset: reef
  palette: harbor
  mode: system
```

### Try the themes and palettes

Every preset works with every palette, in light or dark mode.

| Preset   | Shape                                                                               | Default palette |
| -------- | ----------------------------------------------------------------------------------- | --------------- |
| `shoal`  | Flat page with a ruled sidebar and square-cornered controls.                        | `kelp`          |
| `reef`   | Rounded panels on a tinted page, with pill navigation and controls.                 | `coral`         |
| `ledger` | Technical manual with an inked masthead, monospace headings, and numbered sections. | `ink`           |
| `vice`   | Night masthead with a sunset stripe, bold italic type, and neon rules.              | `vice`          |

| Palette    | Colors                                                          |
| ---------- | --------------------------------------------------------------- |
| `kelp`     | Sea green on white.                                             |
| `coral`    | Coral accent over cool blue-gray neutrals.                      |
| `ink`      | Black ink on warm paper with a vermilion accent.                |
| `harbor`   | Navy ink, blue links, and a yellow callout rule.                |
| `amethyst` | Violet accents over lavender neutrals.                          |
| `vice`     | Flamingo pink and aqua by day, neon on night purple after dark. |

```yaml title="docs.config.yaml"
theme:
  preset: vice
  palette: harbor
  mode: system
```

[Explore themes](https://www.shoalrun.com/styling/themes.md) or [customize the CSS](https://www.shoalrun.com/author/css.md).

## Bring your own tools

Customize these parts through config, local modules, or a host adapter.

| Part              | Configure it in             | What you can change                                                    |
| ----------------- | --------------------------- | ---------------------------------------------------------------------- |
| Search            | `outputs.html.search`       | Use the built-in index, supply a provider, or turn browser search off. |
| Code highlighting | `outputs.html.highlighting` | Choose a Shiki theme or supply a highlighter.                          |
| Page metadata     | `metadata.provider`         | Define the fields your build can read.                                 |
| Reader views      | `readerFilters`             | Define reader choices and mark pages and sections.                     |
| Share images      | `outputs.html.shareImages`  | Customize the link-preview design and fonts.                           |
| Hosting           | Build adapters              | Configure HTTP behavior for Vercel, Node, or your own host.            |

Split config across files with `$include`, share a base with `extends`, and run `shoalrun config explain` to see which file set a value.

- [Organize project configuration](https://www.shoalrun.com/configuration.md)

  Learn how Shoalrun resolves config files, layers presets, tracks path origins, and applies page defaults before building publications.

- [Configuration reference](https://www.shoalrun.com/config.md)

  Find configuration settings by topic and compose a project configuration.

- [Deploy your documentation](https://www.shoalrun.com/publish.md)

  Build your site, choose Vercel or Node hosting, and verify the deployed HTML and Markdown.
