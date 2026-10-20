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

## Verify the deployed URL

Run the [post-deploy checker](https://www.shoalrun.com/publish/deployment-check.md) against the real site origin from `framework/`. It tests every page in the deployed manifest, direct `.md` URLs, required headers, discovery resources, and 404 behavior:

```sh
npm run deploy:check -- https://your-docs.example/
```

For a manual check of one page, replace the domain and page path below with one from your site:

```sh
curl -i -H 'Accept: text/html' https://your-docs.example/publish/output/
curl -i -H 'Accept: text/markdown' https://your-docs.example/publish/output/
curl -i https://your-docs.example/publish/output.md
curl -i -H 'Accept: text/markdown;q=0' https://your-docs.example/publish/output/
```

Check the status, headers, and body. The first and fourth requests should return HTML. The second and third should return readable Markdown that gives its reader what they need for the intended task. Shared facts and API constraints should stay consistent, while human- and agent-oriented content may differ; see [Shoalrun's authoring position](https://www.shoalrun.com/publish/agent-friendliness.md). The first two responses should include `Vary: Accept` so caches keep the formats separate, and a Markdown `Link` so clients can find the twin. The negotiated Markdown response should include `Content-Location` with its `.md` URL. Also check that a missing page returns 404 and the published discovery files have the types declared in `resource-headers.json`.

Run these checks against the production domain after deployment. Local preview results establish what Shoalrun's Node server does; they do not prove that a CDN applies the same rules. For a whole-site audit, run the [AFDocs scorecard](https://afdocs.dev/) against the deployed site and review its findings against the site's content requirements.
