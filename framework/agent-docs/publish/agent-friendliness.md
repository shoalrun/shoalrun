---
id: guide.agent-friendliness
title: Agent-friendly documentation
summary: See how interactive docs become readable Markdown, then discover pages
  and verify their contents.
type: explanation
canonical: /publish/agent-friendliness
---

# Agent-friendly documentation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Agent-friendly documentation

**Updated: 2026-10-17.**

Shoalrun lets people use an interactive documentation page while agents read a Markdown copy of the same instructions. Tabs, closed disclosures, and reader choices should not make essential content disappear from that copy.

The build checks that it knows how to turn each component into readable Markdown. If it does not, it stops with an error. Each generated Markdown page also has a SHA-256 digest, a fingerprint of its bytes. An agent can compare it with the fetched file to verify that the bytes match the published manifest.

Try the example below. Switch the client tab, open **Retry detail**, and choose a reader. Then compare what is visible with the Markdown underneath, which retains both clients, the retry advice, and both reader sections. You can also open [this page's actual Markdown](https://www.shoalrun.com/publish/agent-friendliness.md).

## Try the page controls

### Command line

Send the request from a terminal.

### Application

Send the request from application code.

### Retry detail

Retry only after checking whether the first request succeeded.

**For Reader: UI reader.**

Open the activity screen to inspect the result.

**For Reader: Developer.**

Inspect the response status and returned identifier.

## What an agent reads

Here is the Markdown generated from the example above. An agent does not need to click the tabs, expand the disclosure, or choose a reader to get these instructions.

```md
### Command line

Send the request from a terminal.

### Application

Send the request from application code.

### Retry detail

Retry only after checking whether the first request succeeded.

**For Reader: UI reader.**

Open the activity screen to inspect the result.

**For Reader: Developer.**

Inspect the response status and returned identifier.
```

The labels become headings or ordinary text. The controls themselves are omitted. This site's test compares the example's generated Markdown with the text shown here so they cannot drift apart unnoticed. The [reader views reference](https://www.shoalrun.com/author/reader-views.md) explains how authors configure those choices.

## What happens to an unsupported component?

A component needs rendering support for both HTML and Markdown. The compiler calls that support an **adapter**. If a page uses an unknown component such as the one below, Shoalrun stops rather than publishing a Markdown file that silently loses its contents.

```mdx
<UnregisteredPanel>

This instruction must not disappear.

</UnregisteredPanel>
```

Running `shoalrun check docs.config.yaml` in the private prototype reports a diagnostic containing:

```text
<UnregisteredPanel> has no semantic/Markdown adapter
```

The example is displayed as code here so you can read it. A test also runs it as an actual component, checks that compilation fails, and verifies that the previous successful output remains intact. This check establishes how unsupported components are handled; it does not prove that every supported component or authored instruction is correct.

## Discover a page with a small context budget

An agent does not need to download every discovery artifact. Start with [`/llms.min.txt`](https://www.shoalrun.com/llms.min.txt), select a matching page, and fetch its supplied Markdown URL. The compact list contains IDs, titles, summaries, publication labels, and full-page Markdown links. Nested section links appear only for author-declared standalone topics and include exact sizes plus a **Full page** fallback. Default to the full page for setup or broader questions. This site tests a 6,000-token discovery budget with the `cl100k_base` tokenizer, excluding the selected page. Other sites and tokenizers can differ.

Choose another artifact only when the task needs it:

| Resource                                                                  | When to use it                                                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`llms.min.txt`](https://www.shoalrun.com/llms.min.txt)                   | Find full pages and declared standalone sections from a text list; follow the supplied URL. |
| [`search-index.min.json`](https://www.shoalrun.com/search-index.min.json) | Inspect page headings as well as summaries, without article text.                           |
| [`llms.txt`](https://www.shoalrun.com/llms.txt)                           | Browse grouped page links, API downloads, and discovery resources.                          |
| [`documents.json`](https://www.shoalrun.com/documents.json)               | Read complete page metadata, digests, relationships, and contract links.                    |
| [`documents.sync.json`](https://www.shoalrun.com/documents.sync.json)     | Compare a saved inventory with the current build.                                           |
| [`build-info.json`](https://www.shoalrun.com/build-info.json)             | Check whether the assembled build has changed.                                              |

Both search indexes are generated when search indexing is enabled. The full `/search-index.json` includes bounded article text for browser search, CLI search, and custom lexical fallbacks. It remains available, but it is not needed to find a page through the compact list. These files are downloadable indexes, not query endpoints. Shoalrun does not produce `llms-full.txt`.

HTML pages provide a visible **Read as Markdown** link, a `rel="alternate"` link, and optional early agent guidance. The guidance links to the article, the compact index, and the current twin. The HTML head’s `rel="describedby"` link and Markdown index backlinks also point to `/llms.min.txt`, so entering through either format leads to the same starting list. Follow those supplied links when a fetch tool rejects guessed URLs. Compact-list links are site-relative; resolve them against the fetched index's origin. Markdown page links use the configured public origin when present.

## Verify the page and detect changes

Page identity is the stable document ID plus channel, version, and language. Different publication variants can share an ID, so comparing IDs alone can confuse their records.

The manifest exposes three distinct signals:

| Signal               | What it establishes                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Page `digest`        | SHA-256 of the complete generated Markdown bytes. Compare it with the bytes you fetched.                     |
| Page `contentDigest` | A resolved article-content fingerprint used for freshness tracking. It is not the hash of the Markdown file. |
| Top-level `buildId`  | Identity of the assembled publication, including pages, contracts, assets, and metadata.                     |

An author-set `verified` date is also available in the manifest. It records supplied review metadata, separately from `updated`; it is not proof that an external reviewer approved the page.

For a long-lived client, save the sync snapshot and poll the small build-information file. An unchanged build ID means the saved inventory still applies. When the ID changes, compare the current snapshot with the saved one and refresh added or changed pages. Remove records that disappeared. The comparison includes route moves, metadata changes, and removed publication variants.

The local command is `shoalrun docs changes CURRENT-SNAPSHOT --since PREVIOUS-SNAPSHOT`. Static hosts retain no snapshot history; clients keep their own baseline. If a deployment changes between the manifest and page requests, retry until the fetched Markdown matches its advertised digest. The [published outputs reference](https://www.shoalrun.com/publish/output.md) gives the fields, comparison procedure, and limits.

## Keep shared instructions complete

Supported tabs and disclosures expand into readable Markdown sections. Reader-marked sections remain present with readable labels, even when a reader choice hides them in interactive HTML. Snippets and API examples resolve during the build. Unknown components and unsupported dynamic MDX fail compilation.

The example above preserves the instructions while changing how they are presented. HTML still has tabs, disclosures, and reader controls. Markdown presents the content in reading order. The formats do not need identical bytes to be useful.

Authors can deliberately tailor sections to each format with [Only](https://www.shoalrun.com/author/components/only.md). Review those choices for missing prerequisites, warnings, or shared product facts. A build gate can reject an unknown component; it cannot decide whether an intentional omission makes a task impossible. Similarly, [reader views](https://www.shoalrun.com/author/reader-views.md) are presentation controls. They do not authorize access or remove published content from the site's files.

## Distinguish examples from a real service

Pages under configured `outputs.llms.fictionalPrefixes` carry `demo: true` in the document manifest and both search indexes. The plain-text indexes retain their fictional-example labels. Software can filter these records without interpreting prose. `demo: false` means unmarked; it does not certify that a service exists or is available.

API-reference pages can also link to a focused, digest-addressed OpenAPI contract containing one operation and its local definitions. This gives an agent an exact contract without requiring the complete API description. The [focused-contract reference](https://www.shoalrun.com/api-docs/focused-contracts.md) explains the export and audit checks.

An API catalog, when configured, links a declared endpoint to its description and documentation. This site's example endpoint uses a reserved `.test` domain and does not describe a live service. A contract or catalog entry is a description, not permission to execute an operation.

## Use the transport your client supports

A fetch-only agent can read the published files over HTTP. It needs no CLI, repository access, JavaScript, or MCP connection. Hosts must serve Markdown with the correct media type and apply content negotiation at HTML page URLs. Missing Markdown pages return HTTP `404` with compact recovery links. The [hosting and negotiation reference](https://www.shoalrun.com/publish/content-negotiation.md) describes the contract; verify it on the deployed host.

The private Shoalrun package also bundles this framework's own documentation. `shoalrun docs search` and `shoalrun docs read` use that bundle by default; `--site DIRECTORY` selects another built site. These are local tools for users with the package, not requirements imposed on public readers.

`shoalrun docs mcp` exposes the local search/read core over stdio. You can also [connect to this site’s public HTTP MCP endpoint](https://www.shoalrun.com/connect/mcp.md). The local read tool applies a token budget and can truncate a response; fetch the published twin when you need complete bytes for digest verification. See [the MCP reference](https://www.shoalrun.com/publish/mcp.md) for its current contract.

Shoalrun does not automatically generate a reader skill for every site. Its maintained authoring skills guide an author's existing agent through writing and validation; teams remain responsible for reviewing their instructions. The [non-goals](https://www.shoalrun.com/non-goals.md) explain that boundary.

## Evidence has a scope

Compiler tests, the example above, and digest checks establish specific behavior. They do not substitute for task evaluation or independent factual review. AFDocs checks also inspect discovery, Markdown availability, and HTTP behavior; parity findings need review because authors can intentionally tailor each format.

A local build and passing Node-host checks do not establish what a production host currently serves. Run the deployment checks against the published origin after releasing a build. The [output reference](https://www.shoalrun.com/publish/output.md) and [deployment checker](https://www.shoalrun.com/publish/deployment-check.md) describe the artifacts and live checks separately.

## Related reading

### Read first

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Know which HTML, Markdown, and manifest files the build writes.

### Next steps

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Connect a tool-capable client to bundled or built documentation.

- [Content negotiation](https://www.shoalrun.com/publish/content-negotiation.md) — Serve the Markdown twin when an agent asks for it.

### Related topics

- [Configure the agent discovery block](https://www.shoalrun.com/publish/agent-discovery.md) — Understand how HTML guidance, Markdown, and discovery files serve different readers.

- [Focused OpenAPI contracts](https://www.shoalrun.com/api-docs/focused-contracts.md) — Focused contracts are how agents find exact API details without the full spec.

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Understand the published Markdown and discovery surfaces alongside MCP.

- [Non-goals](https://www.shoalrun.com/non-goals.md) — See how published Markdown and discovery files help agents read a site.

- [Use this site's MCP](https://www.shoalrun.com/connect/mcp.md) — Understand the Markdown and discovery outputs behind the tools.
