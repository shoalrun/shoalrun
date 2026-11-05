---
id: guide.mcp
title: Connect an MCP client
summary: Connect read-only MCP clients over stdio or HTTP to search and read
  built documentation.
type: how-to
area: discovery
subarea: discovery-mcp
canonical: /publish/mcp
---

# Connect an MCP client

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search, chat, and agent access > MCP > Connect an MCP client

**Updated: 2026-11-05.**

Connect an MCP client to built documentation through read-only tools. Use stdio for a client-launched local process, or enable an HTTP endpoint on Node or in a generated Vercel function. Both use the same search and Markdown reading core.

The HTTP endpoint currently supports one explicitly selected public publication. The generated Vercel endpoint is deployed and verified on this site. Netlify and Cloudflare adapters aren't implemented. Analytics is off by default; an optional [server adapter](https://www.shoalrun.com/publish/mcp-analytics.md) can measure tool calls.

You need Node.js 22.12 or newer, the installed Shoalrun CLI, and a client that supports MCP stdio or Streamable HTTP. Follow [Getting started](https://www.shoalrun.com/start.md) to install the public npm package.

## Why offer MCP for public docs?

MCP gives tool-capable agents a predictable way to search your docs and request a page or section within a token budget. For example, an agent answering “How do I configure analytics?” can search and follow the returned read instruction. The result includes relevant Markdown, its publication, and a source link.

The documentation can already be public. MCP adds a tool interface; it doesn't grant access that public Markdown lacks. Agents that can fetch and search your Markdown may not need it. Offer both when your readers use MCP clients, and check whether the tools help them find answers with fewer requests or less content.

To use Shoalrun's own live documentation endpoint, follow [use this site's MCP](https://www.shoalrun.com/connect/mcp.md). The setup below is for hosting your own project's tools.

## Serve a public endpoint on Node

Use this procedure when agents should connect to a URL instead of launching the CLI themselves. Analytics isn't enabled by this setting.

1. ### Enable a public publication

   Add the endpoint and the exact channel, version, and language to your project config. The selected publication must contain public pages:

   ```yaml title="docs.config.yaml"
   mcp:
     enabled: true
     access: public
     path: /mcp
     publication: { channel: production, version: current, language: en }
   ```

   Since 0.1.0-alpha.18

   Add `product` to `mcp.publication` for a product release, for example `{ product: payments, channel: production, version: v3, language: en }`. Hosting remains restricted to one configured publication; adding product support doesn't open every product in the build.

   The endpoint supplies those publication coordinates when the client omits them. Requests for a different publication are rejected. Its lexical search index is generated even if browser search is disabled.

2. ### Build and serve the site

   With the CLI available as `shoalrun`, build the output and start the Node server:

   ```sh
   shoalrun build docs.config.yaml dist
   shoalrun serve dist --port 8774
   ```

   The server reads the MCP settings from that build. It doesn't need the source config. With no site base path, the local endpoint is `http://127.0.0.1:8774/mcp`; a base path such as `/docs` makes it `/docs/mcp`.

   Set `mcp: false` or remove the setting and rebuild to disable the endpoint. Restart a non-watching server after replacing its build; watched preview reloads settings with each successful build.

3. ### Connect and check the tools

   Add the endpoint URL in your client’s remote MCP settings. The client should discover the tools listed below for its installed release. Search for a known page, then follow the returned read instruction and verify its publication.

   The SDK integration is tested with legacy and automatic protocol negotiation using MCP TypeScript client version `2.2.0`. Compatibility with a specific desktop client or public host still needs its own check.

### Hosts, origins, and limits

Local connections permit the configured loopback host. For a public Node deployment, `site.origin` supplies a trusted hostname and browser origin. Add explicit `mcp.allowedHosts` hostnames for other domains and `mcp.allowedOrigins` origins for browser-based clients. Forwarded host headers aren't trusted. Native clients don't need an Origin header.

The endpoint accepts JSON MCP requests through POST; it doesn't provide a persistent session or standalone event stream. GET and DELETE return 405. Browser preflight uses OPTIONS.

Limits are 64 KiB per request, eight concurrent requests per handler, and a 15-second deadline. Excess concurrent requests return 429 with retry guidance. Tool token budgets still apply. These are process-local controls; configure deployment-level limits before exposing a public service. This is a public endpoint, not an authentication mechanism for private documentation.

## Generate a Vercel endpoint

With the public MCP configuration above, generate deployment output from your project:

```sh
shoalrun vercel build docs.config.yaml .vercel/output
```

No extra MCP flag, Ask configuration, embeddings, or model key is required. The command packages the read-only tools and their selected public documentation in a Node function at the configured endpoint. Internal runtime files stay out of the public static output. Follow [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) to deploy the complete output directory.

The function trusts `site.origin`, explicit allowed hosts, and Vercel’s reserved deployment host variables. It doesn't trust arbitrary forwarded hosts or other projects’ preview domains. Deployment protection may block an MCP client from reaching a preview; check that host setting if a client can't connect.

Returned Markdown links use the URLs generated at build time. Set the intended origin before building; request headers don't rewrite the documentation identity. Per-instance limits aren't global deployment limits. Configure host-level traffic controls before opening a public endpoint.

Local package tests cover SDK clients and the generated function. Read-only SDK calls have also been verified at this site’s production Vercel endpoint. Named desktop-client checks remain separate.

## Choose the documentation source

From your documentation project with the CLI installed, start a server for Shoalrun's bundled documentation:

```sh
npx --no-install shoalrun docs mcp
```

For your site's documentation, build it first and pass the output directory. The following example runs from your documentation project root:

```sh
npx --no-install shoalrun build docs.config.yaml site-dist
npx --no-install shoalrun docs mcp --site site-dist
```

Search needs `search-index.json`; page reads need `documents.json` and the generated Markdown files. The server doesn't rebuild the site or fetch remote pages. Rebuild after editing your site's sources. The shared core reads the built files on each call.

## Configure the client

Enter a stdio server command and arguments in your client's MCP settings. Use absolute paths to your installed package and built site so the client's working directory doesn't affect resolution:

```json
{
  "command": "node",
  "args": [
    "/absolute/path/to/my-docs/node_modules/@shoalrun/cli/dist/cli.js",
    "docs",
    "mcp",
    "--site",
    "/absolute/path/to/my-docs/site-dist"
  ]
}
```

This is the server entry; the surrounding configuration differs by client. Omit `--site` and its directory to use the bundled Shoalrun docs. Once the CLI is linked or installed locally, the command can instead be `shoalrun` with arguments `docs`, `mcp`, and the optional site selection.

Standard output contains only MCP protocol messages. Diagnostics go to standard error. The process waits for requests and exits when the client closes its input.

## Search, then read

Ask the client to discover the server's tools. It should find:

| Tool               | Required input  | Optional inputs                                                             | Result                                                                       |
| ------------------ | --------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `get_publications` | None            | `product`, `channel`, `version`, `language`, `limit`, `offset`, `maxTokens` | A compact page of published coordinates and concise product labels/defaults. |
| `search_docs`      | `query`         | `limit`, `maxTokens`, `product`, `channel`, `version`, `language`           | Ranked document IDs, links, summaries, and excerpts.                         |
| `get_page`         | `id`            | `maxTokens`, `product`, `channel`, `version`, `language`                    | The page's generated Markdown and publication metadata.                      |
| `get_outline`      | `id`            | `maxTokens`, `product`, `channel`, `version`, `language`                    | Top-level section IDs, fetch URLs, digests, and sizes.                       |
| `get_section`      | `id`, `section` | `maxTokens`, `product`, `channel`, `version`, `language`                    | One complete section with parent context and nested reader content.          |

For example, call `search_docs` with `{"query":"search provider","limit":5,"maxTokens":2048}`, choose a result, and call its `read.tool` with its `read.arguments` exactly. Choose a publication when the index or document ID spans multiple products, channels, versions, or languages. The server refuses to mix publications.

Search uses the same lexical ranking as the CLI. Titles, summaries, and headings are searchable; article text is bounded. See [search index coverage](https://www.shoalrun.com/author/search.md). The page tool returns generated Markdown, including all reader-marked sections. Reader views remain visibility controls, not access controls.

Search supplies the next call: `read.tool` is `get_section` for a unique matching section, or `get_page` otherwise. Its arguments include the ID, publication, section ID when needed, and a token budget based on the indexed size. Don't guess section IDs or call `get_outline` first. Check `budget.truncated` after a page read and increase the budget if needed.

The result's `markdownUrl` fetches the recommended content directly; `pageMarkdownUrl` always fetches the full page. Use the full page when the section doesn't answer the question or needs more context. Search prefers the full page for short documents, broad queries, ambiguous headings, or queries spanning multiple sections. Search normally prefers complete lexical matches. With no complete match, results within one meaningful term of the best coverage (at least two matched terms) rank by non-filler field score first. A stronger result missing one meaningful term can outrank complete matches found only in body text; `matchMode: mixed` identifies that case. See [search ranking](https://www.shoalrun.com/author/search.md). A section recommendation also requires an explicit author declaration that its content and repeated introduction are self-contained. Undeclared sections use full-page reads, including indexes built before this declaration existed. The compiler checks heading identity, not prerequisite completeness. `get_outline` remains available for deliberate browsing. Retain publication coordinates and parent/section digests for citations. See [section resources](https://www.shoalrun.com/author/markdown-metadata.md).

## Discover product releases before searching

Since 0.1.0-alpha.18

Call `get_publications` with `{}` when the product or release is unknown. It reads the built publication catalog and returns `publications`, `total`, `offset`, budget metadata, and an optional `nextOffset`. Each publication carries its product when present, channel, version, and language. The optional `products` list contains concise metadata only for products represented on that response page. A default version is reported only when available in the selected scope. It doesn't return page inventories or the private customer profile.

The tool defaults to 20 entries and a 2,048-token budget. `limit` accepts 1–100, `offset` is a nonnegative whole number, and `maxTokens` accepts 256–100000. The budget may reduce the number of entries. Follow the returned `nextOffset`, rather than adding the requested limit yourself. Stop when it's absent. If one entry can't fit, increase the token budget. Keep the filters and built site unchanged while paging; rediscover after rebuilding.

For example, discover releases with `{"product":"payments","limit":5}`, then search with an available coordinate:

```json
{"query":"retry a payment","product":"payments","channel":"production","version":"v3","language":"en","limit":5}
```

A local stdio server can list the publications available in its built site. A hosted HTTP endpoint lists only its configured publication, and rejects an explicitly different product or release. A customer build lists only its compiled edition. Products with independently named releases aren't expanded into combinations: Payments v3 and Reporting v1 are two publication choices.

Follow each search result’s `read.tool` and `read.arguments` exactly. Those arguments retain the product alongside the other publication fields. A stable page ID such as `guide.start` can exist in both products; dropping the product can make the request ambiguous or select the wrong documentation. Catalog discovery doesn't change keyword ranking or make CLI/MCP search semantic.

## HTML, Markdown, and agents

The website’s native publication dropdown groups rendered releases by product for HTML navigation. Its labels may hide a single language, but the language remains part of every publication coordinate. MCP clients receive those coordinates as structured data instead of operating the dropdown. Page and section tools return the selected publication’s generated Markdown; they don't combine content from another product with the same page ID. Reader-marked sections remain in published Markdown, while customer profile feature exclusions are removed during compilation.

## Check budgets and errors

Page, outline, section, and search tools default to `maxTokens: 4096` and accept 256 through 100000. Publication discovery defaults to 2048. Search defaults to eight results; `limit` accepts 1 through 100.

Successful results include `budget.maxTokens`, `budget.encoding`, `budget.tokens`, and `budget.truncated`. The budget covers the serialized JSON tool payload, including page or search metadata, using the `cl100k_base` tokenizer. `tokens` is a conservative count for that payload. It doesn't include the MCP envelope or the client's own prompts, and other models can tokenize the same text differently. MCP returns the payload as both text and structured data; the budget applies to one payload, rather than both copies together.

Search drops lower-ranked results to fit. Page reads return a prefix of the Markdown; that prefix can end inside a section or code block. Check `truncated`, then increase the budget if needed. Outline and section reads instead require the complete result to fit; they never truncate code blocks. Page reads don't paginate; publication discovery uses `nextOffset` as described above. For pages larger than the maximum budget, fetch their published Markdown directly. If even the metadata can't fit, the tool reports `invalid_input`.

| Error code        | Meaning                                                      | Next action                                       |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| `invalid_input`   | Empty query or ID, invalid budget, or ambiguous publication. | Correct the input or choose a publication.        |
| `unknown_section` | Section ID is absent from the selected page.                 | Request its current outline.                      |
| `unknown_page`    | The stable ID doesn't exist in the manifest.                 | Search for the page's ID.                         |
| `missing_index`   | The required search index or manifest is absent.             | Build the site with the required outputs.         |
| `internal_error`  | Built metadata or a page file can't be read correctly.       | Rebuild the documentation and inspect the output. |

Tool failures set MCP `isError` and return a structured `error` with `code` and `message`. Protocol or schema validation failures may be reported by the MCP SDK before the documentation core runs. An ordinary search with no matches succeeds with an empty result list.

## Verify the connection

Search for a known page, read the returned ID, and inspect its Markdown. Then request a nonexistent ID: it should return `unknown_page` without stopping the server. Confirm that a small budget sets `truncated` on a long page. These checks exercise the source selection and tool contract without an agent harness.

The tools are read-only and don't expose authoring commands. Stdio makes them available to a local tool-capable client; clients that can't launch a local process can't use this transport. They can read published Markdown over HTTP when their tools support fetching URLs. Stdio has no analytics adapter. The optional HTTP adapter records tool outcomes without raw queries.

## Related reading

### Next steps

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Optionally measure tool calls through a server adapter.

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Look up shared search and read flags and error behavior.

### Related topics

- [Content delivery and agents](https://www.shoalrun.com/content-delivery/agents.md) — Use existing documentation MCP tools for contextual reads.

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — Understand the published Markdown and discovery surfaces alongside MCP.
