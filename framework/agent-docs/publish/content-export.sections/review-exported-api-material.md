---
id: guide.content-export
title: Export content into your application
summary: Export shared content for application help.
type: how-to
area: publishing
subarea: publishing-builds
canonical: /publish/content-export
---

# Export content into your application

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Export content into your application

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/content-export.md)

Keep application help and your documentation website in one content source. `shoalrun export` produces a directory of resolved Markdown, passive HTML fragments, referenced assets, and a manifest. Your application owns the help drawer, onboarding screen, or other interface that displays the content. It does not need a Shoalrun browser runtime.

## Review exported API material

The export preserves the API source-review gate. If its selected API material has no matching review digest, the normal command fails before replacing the previous bundle. Produce a candidate for inspection with:

```sh
shoalrun export docs.config.yaml --target app-help --out review/app-help --review
```

A candidate needing review reports `status: needs-review`, sets `manifest.review.status: required`, and exits with code 2. Inspect its references and downloads, then pin the reported API digests to the target:

```yaml
exports:
  app-help:
    documents: [reference.catalog.listItems]
    publicBase: /help/
    apiReview:
      catalog: "REPLACE_WITH_THE_REVIEWED_SHA256_DIGEST"
```

Run the normal export command again. Changed source bytes or exposed API selections invalidate approval. An existing `apis.<id>.publicReview.digest` also applies when it exactly matches the export's review fingerprint. Do not distribute candidates with review still required.
