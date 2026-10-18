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

Parent page: [Full Markdown page](/publish/agent-friendliness.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Know which HTML, Markdown, and manifest files the build writes.

**Next steps**

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Connect a tool-capable client to bundled or built documentation.

- [Content negotiation](https://www.shoalrun.com/publish/content-negotiation.md) — Serve the Markdown twin when an agent asks for it.

Shoalrun lets people use an interactive documentation page while agents read a Markdown copy of the same instructions. Tabs, closed disclosures, and reader choices should not make essential content disappear from that copy.

The build checks that it knows how to turn each component into readable Markdown. If it does not, it stops with an error. Each generated Markdown page also has a SHA-256 digest, a fingerprint of its bytes. An agent can compare it with the fetched file to verify that the bytes match the published manifest.

Try the example below. Switch the client tab, open **Retry detail**, and choose a reader. Then compare what is visible with the Markdown underneath, which retains both clients, the retry advice, and both reader sections. You can also open [this page's actual Markdown](https://www.shoalrun.com/publish/agent-friendliness.md).

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
