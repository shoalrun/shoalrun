---
id: guide.publish
title: Deploy your documentation
summary: Build your site, choose Vercel or Node hosting, and verify the deployed
  HTML and Markdown.
type: how-to
area: publishing
subarea: publishing-hosting
canonical: /publish
---

# Deploy your documentation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Deploy your documentation

**Updated: 2026-10-19.**

After the [quickstart](https://www.shoalrun.com/start.md), you have a source project and a compiled Shoalrun CLI. Use the commands below from `my-docs/`, with `SHOALRUN_CLI` still pointing to the checkout's `framework/dist/cli.js`.

## Prepare a release

Set `site.origin` in `docs.config.yaml` to your public HTTPS origin. Then audit the project and build it:

```sh
node "$SHOALRUN_CLI" audit docs.config.yaml
node "$SHOALRUN_CLI" build docs.config.yaml dist
```

Review the generated HTML, Markdown, and `dist/documents.json`. A build replaces its output directory; keep source files outside `dist/`. If it fails, use [troubleshooting](https://www.shoalrun.com/publish/troubleshooting.md).

## Choose a host

Choose a hosting route based on the artifacts and server features your site needs.

| Hosting route                                        | What to deploy                                                                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [Vercel](https://www.shoalrun.com/publish/vercel.md) | A source checkout containing the framework and your project; Vercel builds `.vercel/output/`.                                          |
| Node server                                          | The compiled site plus the built framework and its installed dependencies, as described below.                                         |
| Another host                                         | The compiled files plus routing and headers implementing the [HTTP contract](https://www.shoalrun.com/publish/content-negotiation.md). |

For a site hosted at `/docs`, set `site.basePath: /docs`. The Node and Vercel adapters serve the prefixed routes directly. On a static host that mounts a directory at `/docs`, publish the build output's `docs/` subtree as that directory's root. Static hosts still need a proxy or routing rules for Markdown content negotiation.

### Node hosting

On a machine with Node and npm, obtain your committed checkout containing `framework/` and `my-docs/`. From that checkout root:

```sh
npm ci --prefix framework
npm --prefix framework run build
node framework/dist/cli.js build my-docs/docs.config.yaml my-docs/dist
node framework/dist/cli.js serve my-docs/dist --host 0.0.0.0 --port 8080
```

The last command runs the server in the foreground. Configure your host's process manager to run it from the checkout root and restart it after a release. Route your public HTTPS endpoint to port 8080 using the host's proxy or load balancer. Preserve request `Accept` headers and response headers through that proxy. The Node server handles HTML, negotiated Markdown, explicit `.md` URLs, and discovery resources.

For a local check, use `http://localhost:8080/install/` and `http://localhost:8080/install.md` from the minimal starter. Replace those paths with your own pages when you change the content.

### Other hosts

A static upload alone does not establish Markdown content negotiation. Configure the host to serve the resources and page variants described in [content negotiation](https://www.shoalrun.com/publish/content-negotiation.md), including `Vary: Accept`, content types, Markdown alternate links, redirects, and 404 responses. Use [generated outputs](https://www.shoalrun.com/publish/output.md) to identify the files to deploy.

## Verify the public site

From the checkout root, run the checker against your deployed origin:

```sh
npm --prefix framework run deploy:check -- https://your-docs.example/
```

[Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) explains the result and how to pass a URL with a base path. A local build verifies files; this check verifies the host's responses.

Before sharing a page, [check its SEO and social preview metadata](https://www.shoalrun.com/publish/seo.md), including the public share-image URL.

Next, [put multiple versions on one site](https://www.shoalrun.com/publish/publications.md) if you need several editions in one site. For branches, tags, and retained build snapshots, see [use Git branches for separate docs sites](https://www.shoalrun.com/publish/revisions.md).

## Related reading

### Next steps

- [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) — Build the site and routing rules for Vercel.

### Reference while working

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — Check deployed HTML, Markdown, and discovery responses.

### Related topics

- [Add Shoalrun to another build or host](https://www.shoalrun.com/publish/host-adapters.md) — Apply the hosting contract on another platform.
