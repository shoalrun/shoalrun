---
id: guide.vercel
title: Publish on Vercel
summary: Build a Vercel deployment with Markdown negotiation and correct
  discovery headers.
type: how-to
area: publishing
subarea: publishing-hosting
canonical: /publish/vercel
---

# Publish on Vercel

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Publish on Vercel

**Updated: 2026-10-27.**

Shoalrun can produce a [Vercel Build Output API](https://vercel.com/docs/build-output-api) directory. It contains the compiled static site and routing rules for each published page. Vercel serves HTML to browsers and the generated Markdown twin when a request includes `Accept: text/markdown`. The route rules also set `Vary: Accept` and an HTTP `Link` header to the `.md` page. Explicit `.md` URLs remain available.

The [content negotiation guide](https://www.shoalrun.com/publish/content-negotiation.md) explains the same HTTP contract for any host. This page shows how to configure Vercel specifically.

## Prepare your project

Start with the [quickstart](https://www.shoalrun.com/start.md). Your documentation repository installs the public npm package and keeps its own content and configuration. It needs no framework source checkout:

```text
package.json
package-lock.json
docs.config.yaml
content/
vercel.json
```

Set `site.origin` in `docs.config.yaml` to your intended public HTTPS origin before release. This controls canonical and share-image URLs. Generate deployment output locally:

```sh
npx --no-install shoalrun vercel build docs.config.yaml .vercel/output
```

Generating output does not deploy it.

## Configure the project

Public Shoalrun packages install with `npm ci` using your committed manifest and lockfile; no registry token is needed. If you previously used GitHub Packages, follow the migration instructions in [Getting started](https://www.shoalrun.com/start.md) and commit the updated lockfile before deploying. Keep credentials required by any other private dependencies.

Set the Vercel project root to the documentation repository root and choose the **Other** framework preset. Add:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "npm ci",
  "buildCommand": "npx --no-install shoalrun vercel build docs.config.yaml .vercel/output"
}
```

Keep the build output directory setting unset: this command produces the Build Output API directory directly. If your config lives under `docs/`, adjust its path. Connecting the Git repository can trigger builds on pushes; check your build budget before enabling that integration.

### Deploy Shoalrun's own documentation

The docs repository's root `vercel.json` serves the site under `docs/`. It runs `npm ci` and `npm run docs:vercel` using the installed package. Production and local builds use the public `https://www.shoalrun.com` origin in `docs/docs.config.yaml` for absolute page and share-image URLs. Preview builds use their `VERCEL_URL` instead. Public link previews require the shared page and its image to be accessible without sign-in. Vercel deployment protection can prevent crawlers from reading preview deployments.

The Vercel output puts pages and discovery files in `.vercel/output/static/`. Its `config.json` defines page routes and content types, including `text/markdown` for `.md` files and the linkset type for `/.well-known/api-catalog` when that file exists. Keep the entire `.vercel/output/` directory together for deployment. The API catalog is optional and appears only when the project declares a public API endpoint and publishes its source.

For Shoalrun's own site, `npm run docs:build-all` makes a complete prebuilt bundle: it compiles the pages and embeds the passages for hosted chat and search. Repeat builds reuse private passage vectors when retrieval settings and passage digests match. Only new or changed passages need embedding. The build reports embedded and reused counts. It generates answer cards from `docs/config/answers.yaml` when the passages, questions, chat settings, or generator code have changed; otherwise it reuses the previous verified cards. It checks passage coverage and card digests before returning. The index and cards stay inside private functions. New embeddings call the configured provider; generating cards also calls the relevance scorer and chat model. Review `answers.json` in the function before deployment. Deleting `.vercel/output` removes the local vector and card caches. The docs repository's README has the local command sequence. The hosted search endpoint uses embeddings within shared rate and daily budgets, then returns lexical results when its embedding budget is exhausted.

The card cache lives in the previous local `.vercel/output` bundle. The command compares a fingerprint of its passage index, embedding metadata, question list, chat and retrieval settings, and compiled generator code with the new bundle. When they match, it copies the prior cards into the new private function and checks their source digests again. If the inputs changed, the old bundle is missing, or validation fails, it regenerates all cards. The final line says `reused` or `generated`. This saves card model and scorer calls on an unchanged rebuild. A fresh checkout or deleted `.vercel/output` has no local card or passage vector cache.

### Deploy without connecting GitHub

You can keep building locally and deploy the Build Output API directory with the [Vercel CLI `--prebuilt` option](https://vercel.com/docs/cli/deploy#prebuilt). Use [`vercel link`](https://vercel.com/docs/cli/link) to connect the local directory to the existing Vercel project; this does not require importing your source repository. From the docs repository root, use `npm run docs:build-all` for Shoalrun's own site when you want fresh embeddings and answer cards. For another site, build its Vercel output as configured:

```sh
npm run docs:vercel
vercel link
vercel deploy --prebuilt --prod
```

The command uploads `.vercel/output` and applies its routes and headers. A folder upload of `docs/dist` through Vercel Drop publishes the static files but does not apply Shoalrun's Vercel routing rules. It is suitable for a visual preview; the deployment checker will still report missing Markdown negotiation and response headers. Run it against the final domain after a prebuilt deploy.

The routes also cover:

- **Redirects.** Each entry in the project's [`redirects`](https://www.shoalrun.com/config.md) config becomes a route with its status, 308 by default. A second route sends the old `.md` URL to the target's Markdown twin.
- **The site root.** When no page has the slug `/`, a request for `/` gets a 302 to the page with ID `guide.overview`. If there is no such page, it goes to `/reference`, then to the first page. `shoalrun serve` uses the same rule.

Each run of `vercel build` deletes and rewrites `.vercel/output/static/`, so don't keep other files there.

## Include an MCP endpoint

Enable `mcp` in your project config before running `shoalrun vercel build`. The output includes a separate Node function for the selected public publication, without requiring Ask or embeddings. See [connect an MCP client](https://www.shoalrun.com/publish/mcp.md) for configuration, host trust, limits, and the current verification status.

MCP analytics remains off unless you also configure its [server adapter](https://www.shoalrun.com/publish/mcp-analytics.md). If enabled, set its credentials on the function’s runtime environment. Browser analytics settings do not collect MCP traffic.

## Check the deployment

After Vercel gives you a deployment URL, run the [provider-neutral deployment checker](https://www.shoalrun.com/publish/deployment-check.md) before release. Shoalrun's docs repository includes it as a site-owned command:

```sh
npm run deploy:check -- https://your-docs.example/
```

It checks every published page, discovery resources, and missing routes. To inspect one page manually, replace `https://your-docs.example` below and compare the responses:

```sh
curl -I -H 'Accept: text/html' https://your-docs.example/install/
curl -I -H 'Accept: text/markdown' https://your-docs.example/install/
curl -I https://your-docs.example/install.md
```

The first request should return `Content-Type: text/html`; the second should return `Content-Type: text/markdown`, `Vary: Accept`, and `Content-Location: /install.md`. Both page responses include an HTTP `Link` to the Markdown twin. The third request tests the explicit `.md` URL. Check `/llms.txt` and, if enabled, `/.well-known/api-catalog` as well.

The Vercel static routing rule selects Markdown when the `Accept` header explicitly includes `text/markdown` with nonzero quality. It keeps HTML when Markdown has a fractional weight and `text/html` has full weight, or when `text/html` is absent and `text/*` or `*/*` has full weight. A header rule can't compare two fractional weights. So `text/html;q=0.9, text/markdown;q=0.8` and `text/markdown;q=0.3, text/*;q=0.5` get Markdown on Vercel and HTML from the Node server.

Run the post-deploy checker after publishing each new revision. The fractional-weight limitation above remains.

## Related reading

### Next steps

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — Confirm the deployed site returns the right content and headers.

### Related topics

- [Host and limit documentation chat](https://www.shoalrun.com/chat/host.md) — Deploy the site itself to Vercel before you add the chat function. (Status: experimental.)

- [Add Shoalrun to another build or host](https://www.shoalrun.com/publish/host-adapters.md) — The Vercel build generates its own HTTP rules; other hosts need them supplied.
