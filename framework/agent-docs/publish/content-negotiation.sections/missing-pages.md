---
id: guide.content-negotiation
title: Content negotiation
summary: Understand content negotiation, why it helps agents, and what a hosting
  provider needs to do.
type: reference
area: discovery
subarea: discovery-agents
canonical: /publish/content-negotiation
---

# Content negotiation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Content negotiation

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/publish/content-negotiation.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) — Generate a Vercel deployment with negotiation already configured.

- [Add Shoalrun to another build or host](https://www.shoalrun.com/publish/host-adapters.md) — Supply the same HTTP rules on another host.

Shoalrun builds two versions of every published page from one authored source. The HTML version is for people using a browser. The generated Markdown version contains shared material in a form agents can read directly. Authors can also add or suppress [format-specific content](https://www.shoalrun.com/author/components/only.md) in either version. The versions share a core but need not contain identical text.

**Content negotiation** lets a visitor ask for a format at the page's usual URL. Some agents send the request header `Accept: text/markdown`. A host that supports negotiation responds with Shoalrun's Markdown version. A browser asking for HTML gets the HTML version. The URL stays the same:

| Request to `/publish/output/`       | Response                                     |
| ----------------------------------- | -------------------------------------------- |
| Browser sends `Accept: text/html`   | HTML page, `Content-Type: text/html`         |
| Agent sends `Accept: text/markdown` | Markdown page, `Content-Type: text/markdown` |

`Accept` says what the visitor can use. `Content-Type` says what the host actually returned. The `.md` URL, such as `/publish/output.md`, also works directly.

## Missing pages

A missing page returns HTTP `404`, with links to the documentation index, the search index when published, and the homepage. The response stays a `404` even though it provides recovery links. It does not redirect to the homepage or return an unrelated article with status `200`.

Shoalrun's Node server returns Markdown for a missing `.md` URL or a request that prefers `Accept: text/markdown`; other requests receive HTML. Both responses carry `X-Robots-Tag: noindex`. If a known Markdown twin is missing while its HTML page exists, the response links to that HTML page in its body and `Link` header. Unexpected server errors return `500`.

The build generates `404.html` and `404.md` under `site.basePath`. The Vercel adapter applies error routes after checking for existing files and preserves HTTP `404`. A missing known Markdown route includes an HTML alternate in its `Link` header. Its generic error body provides the discovery links.

On another static host, configure missing routes to serve these error files with HTTP `404`. Merely uploading them does not configure the host's error status or content negotiation. Serve `404.md` as `text/markdown; charset=utf-8`, and keep error responses out of search indexes with `X-Robots-Tag: noindex`.
