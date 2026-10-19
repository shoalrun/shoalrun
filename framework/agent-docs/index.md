---
id: guide.home
title: Shoalrun
summary: A preview of Shoalrun, a flexible framework for API and product docs
  with fine-grained controls for what people see and what agents can discover
  and read.
type: overview
area: project
subarea: project-overview
canonical: /
---

# Shoalrun

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-10-19.**

**Docs for people. Context for agents.**

One source, with control over how each audience reads it. Build interactive docs for people and readable content for agents, with checks before you publish.

- [See what an agent gets](https://www.shoalrun.com/publish/agent-friendliness.md)
- [See what works today](https://www.shoalrun.com/status.md)

> **Prototype preview:** Explore the docs today. Shoalrun's compiler and CLI are still a private prototype, so installation isn't available yet.
>
> [See what works today →](https://www.shoalrun.com/status.md)

## Readable output, with checks you can inspect

Write Markdown, MDX, and OpenAPI once. People get tabs, disclosures, navigation, and reader views. Agents get the supported content in reading order, with stable page identities and machine-readable contracts.

| What you can inspect                     | What it gives you                                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A manifest with byte digests             | Stable page IDs and publication variants, with SHA-256 digests for checking the exact Markdown bytes.                             |
| Compact discovery and incremental sync   | Find a page without the full search index; compare saved snapshots when a build changes.                                          |
| Focused per-operation OpenAPI contracts  | One small contract containing an operation and the local schemas it needs, when enabled.                                          |
| Explicit component representations       | Tabs and disclosures become labeled sections. Snippets expand into their resolved content. Unsupported components fail the build. |
| Reader views and format-specific content | Choose what people see in the browser and write different explanations for HTML and Markdown when needed.                         |

### A tabbed page, without missing panels

This example has two client choices and a closed disclosure. The Markdown includes both clients and the troubleshooting detail.

### You write

````mdx title="content/check-service.mdx"
<Tabs label="Client">
<Tab label="curl">

```sh
curl -fsS https://api.example.com/health
```

</Tab>
<Tab label="JavaScript">

```js
const response = await fetch('https://api.example.com/health');
console.log(response.status);
```

</Tab>
</Tabs>

<Collapsible title="If the request fails">
Check the service URL and your network connection.
</Collapsible>
````

### People get HTML

### curl

```sh
curl -fsS https://api.example.com/health
```

### JavaScript

```js
const response = await fetch('https://api.example.com/health');
console.log(response.status);
```

### If the request fails

Check the service URL and your network connection.

### Agents get Markdown

````md title="/check-service.md (body excerpt)"
### curl

```sh
curl -fsS https://api.example.com/health
```

### JavaScript

```js
const response = await fetch('https://api.example.com/health');
console.log(response.status);
```

### If the request fails

Check the service URL and your network connection.
````

### Fetch the published output

Start with the compact page list, choose a page, and fetch its Markdown. The full manifest supplies byte digests when you need verification; build information and sync snapshots let returning clients detect changes. [Try the example on the agent-friendly guide](https://www.shoalrun.com/publish/agent-friendliness.md) to compare live components with tested Markdown output.

```sh
curl -fsSL https://www.shoalrun.com/llms.min.txt
curl -fsSL https://www.shoalrun.com/publish/agent-friendliness.md
```

Hosts that support [content negotiation](https://www.shoalrun.com/publish/agent-friendliness.md) can serve the same Markdown at the HTML route when the request sends `Accept: text/markdown`:

```sh
curl -fsSL -H 'Accept: text/markdown' https://www.shoalrun.com/author/search
```

## Check both audiences before you publish

Shoalrun builds static files for your host. Its audit builds HTML and Markdown, checks links and API contracts, and runs configured project tests. An unsupported component stops the build instead of disappearing from the agent's document.

For example, adding `<UnknownWidget />` to a page makes `shoalrun check` fail with the source path:

```text
FAIL build
  …/docs.config.yaml: …/content/welcome.mdx: <UnknownWidget> has no semantic/Markdown adapter
Checks failed. Fix the findings above and rerun shoalrun check.
```

This is illustrative output, not a failure on the current site. The check catches unsupported representations; it does not establish that every sentence is correct.

[Eval reports](https://www.shoalrun.com/publish/evals.md) let you add reviewed task results to the publishing gate. Required failures and reports from an older build fail the audit. You supply the agent run and answer review. Shoalrun's five example tasks are a self-reviewed demonstration, with prior context; they are not an independent measure of agent accuracy or a comparison with other platforms.

- [Audit a docs project](https://www.shoalrun.com/publish/audit.md)

  Run project tests and local API representation checks with one CI command.

- [Evaluate agent tasks against your docs](https://www.shoalrun.com/publish/evals.md)

  Define realistic tasks, record reviewed answers from your own agent, and check the results against a documentation build.

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md)

  Import a local OpenAPI file, author an operation page, review its public content, and build HTML and Markdown.

## Control the reading experience

[Reader views](https://www.shoalrun.com/author/reader-views.md) use the `readerFilters` configuration to shape browser navigation, search, cards, and marked sections. A UI reader can follow screen actions while a developer sees request examples. The published Markdown retains every reader-marked section with a label.

Reader views are visibility controls, not access controls. Hidden browser content remains in published files. Use `access.policy` to exclude pages from a public build and host authorization to protect private content.

[Format-specific content](https://www.shoalrun.com/author/components/only.md) lets you replace an interactive instruction with a useful written explanation. [Markdown metadata settings](https://www.shoalrun.com/author/markdown-metadata.md) choose which frontmatter fields are published for agents. These are authoring and publication choices; discovery files do not protect private data.

- [Reader views](https://www.shoalrun.com/author/reader-views.md)

  Reader-view configuration, page and section marks, controls, and agent-facing behavior.

- [Content for one format](https://www.shoalrun.com/author/components/only.md)

  Use Only to add content to the HTML page or its Markdown twin alone.

- [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md)

  Public field projection, source paths, profiles, precedence, and required values.

## Make it look like yours

Choose a theme and palette, follow the reader's light or dark setting, and customize brand colors or CSS. The build checks configured palette colors for contrast.

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
| Page metadata     | `metadata.provider`         | Define the fields your build can read, with values you supply.         |
| Reader views      | `readerFilters`             | Define reader choices and mark pages and sections for those choices.   |
| Share images      | `outputs.html.shareImages`  | Customize the link-preview design and fonts.                           |
| Hosting           | Build adapters              | Configure HTTP behavior for Vercel, Node, or your own host.            |

Split config across files with `$include`, share a base with `extends`, and ask `shoalrun config explain` which file set a value.

### Give your coding agent the docs

The prototype bundles four authoring skills: setup, authoring, recipes, and code walkthroughs. It also includes Shoalrun's generated documentation for offline lookup:

```sh
shoalrun docs search "custom search provider"
shoalrun docs read guide.search
```

[Use the bundled skills](https://www.shoalrun.com/contribute/agent-skills.md) or consult the [command reference](https://www.shoalrun.com/reference/agent-skills.md). Shoalrun does not generate reader-side skills for each site it builds. Skills need human expertise to create and maintain; see the [non-goals](https://www.shoalrun.com/non-goals.md).

- [Organize project configuration](https://www.shoalrun.com/configuration.md)

  Learn how Shoalrun resolves config files, layers presets, tracks path origins, and applies page defaults before building publications.

- [Configuration reference](https://www.shoalrun.com/config.md)

  Every top-level setting in docs.config.yaml, with defaults, validation rules, and links to the full guides.

- [Deploy your documentation](https://www.shoalrun.com/publish.md)

  Build your site, choose Vercel or Node hosting, and verify the deployed HTML and Markdown.
