---
id: guide.output
title: Publishing and agent representations
summary: Read the published-output contract for HTML, Markdown, manifests, and
  incremental sync.
type: reference
area: publishing
subarea: publishing-builds
canonical: /publish/output
---

# Publishing and agent representations

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Generated outputs

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/output.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — See how these files help agents discover and read the site.

`shoalrun build` turns accepted source pages and local OpenAPI files into a static site. A **publication** is one enabled channel, version, and language combination, such as production, v1, and English. The build includes a public page only in publications matching its frontmatter. It makes no model calls or remote requests.

For each included page, the build writes an HTML page for browsing. It also writes a **Markdown twin**, a generated `.md` copy that agents can read as text. The Markdown twin can start with a short YAML header. That header contains only the page metadata selected in project config, so agents get useful context without a long source header or internal notes. Shared content appears in both bodies; authors can also add content to either format alone with [Only](https://www.shoalrun.com/author/components/only.md).

The site also includes a **document manifest**, `documents.json`, which indexes the built pages and their URLs. Projects with an API source can publish operation pages and **focused contracts**, small OpenAPI files containing one operation and the definitions it needs.

## Validate an existing build locally

From a repository checkout with development dependencies installed and the framework compiled, run:

```sh
node framework/scripts/check-output-contract.mjs docs/dist
```

Replace `docs/dist` with an already-built site's directory. The checker loads both schemas locally and makes no network requests. It checks field shapes, unique document identities, manifest/sync correspondence, build/config identity agreement, record and metadata hashes, same-publication change/deprecation targets, section parent linkage, and exact Markdown byte counts, token counts, and digests. It also verifies referenced focused-contract bytes. Unknown fields remain allowed and participate in the applicable record or metadata hash.

The report has `status`, `findings`, and document/section counts. A failure exits nonzero. The command never rebuilds, writes output, evaluates model tasks, or checks live hosting. The existing repository built-site check includes this check, so run either path rather than duplicating it for unchanged output. Use the [deployment checker](https://www.shoalrun.com/publish/deployment-check.md) separately for HTTP behavior.

Passing checks establish the specified structure and consistency, not authored truth, semantic completeness, or a fresh evaluation grade. The build identity is compared across files, not recomputed from final stamped artifacts. This contract does not add `llms-full.txt`, a public evaluation report, signatures, or an offline release archive.
