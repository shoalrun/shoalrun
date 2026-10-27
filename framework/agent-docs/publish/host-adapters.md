---
id: guide.host-adapters
title: Add Shoalrun to another build or host
summary: Publish compiled files alongside another site and supply the host's HTTP rules.
type: how-to
area: publishing
subarea: publishing-hosting
canonical: /publish/host-adapters
---

# Add Shoalrun to another build or host

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Add Shoalrun to another build or host

**Updated: 2026-10-26.**

Shoalrun builds a complete static site without a host framework. To include its pages in another build system, run Shoalrun's CLI as a build step. Then copy the generated files into the host's output. The host does not need to parse Shoalrun's MDX or OpenAPI sources.

```sh
shoalrun build docs.config.yaml ./shoalrun-dist
```

The command replaces `./shoalrun-dist` on each build. Use a dedicated output directory. With an empty `site.basePath`, copy its **contents** to the root of the host's published output.

For a site hosted at `/docs`, set `site.basePath: /docs`. The Node and Vercel adapters serve the prefixed routes directly. On a static host that mounts a directory at `/docs`, publish the build output's `docs/` subtree as that directory's root. The build keeps internal manifests at the output root for local commands. Static hosts also need routing rules for [Markdown content negotiation](https://www.shoalrun.com/publish/content-negotiation.md).

With the command above, the public subtree for `/docs` is `shoalrun-dist/docs/`.

## Add a build adapter

An adapter for Astro, another site builder, or a deployment platform can follow these steps:

1. Run `shoalrun build <config> <temporary-output>` after the host has generated its own files.
2. Enumerate both output trees and fail if a Shoalrun file would replace a host file. Also fail if a file occupies a directory the other tree needs. Compare paths without regard to case so a build that works on one filesystem does not overwrite files on another.
3. Copy the Shoalrun files into the host output, keeping their paths. Do not modify the generated HTML or Markdown: both came from the same content build.
4. Configure the host's routing and response headers as described below. Run the [post-deploy checker](https://www.shoalrun.com/publish/deployment-check.md) against the published URL.

The generated `documents.json` lists every page's HTML and Markdown URLs. `redirects.json` records redirects, and `resource-headers.json` records content types for Markdown and discovery resources. It also records `Content-Security-Policy: sandbox` and `X-Content-Type-Options: nosniff` for generated and local SVG files. Apply those headers when hosting SVGs; the Node server and Vercel adapter do this automatically. `/llms.txt`, `search-index.json`, API contracts, images, styles, and scripts are ordinary output files. The [output guide](https://www.shoalrun.com/publish/output.md) lists their paths.

## Supply HTTP behavior

Copying files does not make a static host negotiate Markdown at an HTML URL or apply redirects and special content types. Use the [content negotiation contract](https://www.shoalrun.com/publish/content-negotiation.md) to configure those rules. A host that cannot inspect request headers can still serve the direct `.md` URLs, but cannot provide the negotiated response. Shoalrun's [Node server](https://www.shoalrun.com/cli.md) handles these rules; the [Vercel build](https://www.shoalrun.com/publish/vercel.md) generates a deployable configuration for that host.

Keep the adapter small: Shoalrun owns content compilation and the generated files, while the host owns request handling. A JavaScript plugin API is not required to call the CLI or publish its output.

## Related reading

### Next steps

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — Confirm the host applies the HTTP rules correctly.

### Related topics

- [Deploy your documentation](https://www.shoalrun.com/publish.md) — Apply the hosting contract on another platform.

- [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) — The Vercel build generates its own HTTP rules; other hosts need them supplied.
