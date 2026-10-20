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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Content negotiation

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

## Why this matters

An agent reading HTML may receive navigation, styles, scripts, and interactive controls along with the article. It may then have to extract the useful content or convert the HTML to Markdown. Shoalrun's generated Markdown gives it the article directly, including material inside tabs and collapsibles and resolved OpenAPI examples. This can make the page easier to retrieve and less likely to lose content during conversion. [AFDocs checks](https://afdocs.dev/checks/markdown-availability) both `.md` URLs and content negotiation for this reason.

The direct `.md` links in each HTML page and [`/llms.txt`](https://www.shoalrun.com/llms.txt) help agents that know to follow them. Negotiation helps an agent that arrives at the ordinary page URL and requests Markdown without first discovering a second URL. It does not require writers to maintain a separate article.
