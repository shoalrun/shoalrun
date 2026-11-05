---
id: change.2026-11-04-runtime-packaging
title: Smaller hosted search and Ask functions
summary: Rebuild hosted docs with alpha.17 to reduce deployment files while
  keeping semantic search and Ask available.
type: changelog-entry
area:
  - publishing
  - discovery
  - project
subarea:
  - publishing-configuration
  - discovery-search
  - project-releases
canonical: /changelog/2026-11-04-runtime-packaging
date: 2026-11-04
releaseVersion: 0.1.0-alpha.17
---

# Smaller hosted search and Ask functions

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Project](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project](https://www.shoalrun.com/status.md) > Changelog > alpha.17: Hosted search and Ask

**Published: 2026-11-04.**

**Version: 0.1.0-alpha.17.**

Alpha.17 reduces the files packaged with hosted Search and Ask. Large deployments previously included tools used to compile documentation, even though the hosted functions didn't need them to answer requests.

Upgrade to CLI `0.1.0-alpha.17` and rebuild your hosted bundle to apply the change. Existing deployments keep their current files until you deploy the rebuilt output. No configuration migration is required.

## Package each function's required files

Hosted Search now has its own runtime package instead of receiving a copy of the Ask function. It keeps its private passage index and embeddings, with the same semantic endpoint, keyword fallback, and usage limits. Ask keeps its answer generation and card support. Both functions avoid the component compiler, icon library, syntax highlighter, math renderer, and browser bundler.

A local comparison using Shoalrun's documentation corpus reduced the complete deployment from 18,205 files to 3,995 files. Its size fell from about 202 MB to 93 MB before compression. Those measurements include static documentation and MCP. Results depend on your site's content and enabled services; they aren't a per-site size guarantee.

The MCP function retains its existing runtime and scope. This release doesn't add semantic retrieval to MCP or the CLI, or introduce a vector database backend.

## Check the rebuilt deployment

Build and validate your production output before uploading it. Verify that Search and Ask still answer requests after deployment, and inspect semantic search fallback reasons if results use keyword matching. See [Configure site search](https://www.shoalrun.com/author/search.md) for the search setup and [Deploy with Vercel](https://www.shoalrun.com/publish/vercel.md) for hosted deployment instructions.
