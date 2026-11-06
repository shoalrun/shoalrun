---
id: guide.pdf-export
title: Export styled PDFs
summary: Export a page or publication as a PDF and offer an optional page download.
type: how-to
area: publishing
subarea: publishing-builds
canonical: /publish/pdf
---

# Export styled PDFs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Export styled PDFs

**Updated: 2026-11-06.**

**Available since: 0.1.0-beta.1.**

Parent page: [Full Markdown page](/publish/pdf.md)

Offer **Print PDF** on a static site using the visitor's browser. Site builds generate no page PDFs or extra print documents. When you want a downloadable full manual, export it explicitly through the CLI with your own fonts, colors, paper size, and print layout. A Node host can also offer direct page PDF downloads on request.

## Export a page or publication

Run the page command with the page's stable document ID:

```sh
npx --no-install shoalrun export docs.config.yaml --format pdf --document guide.start --out pdf/page
```

Omit `--document` to export a complete publication:

```sh
npx --no-install shoalrun export docs.config.yaml --format pdf --out pdf/manual
```

If several publications are enabled, select one explicitly. These product and version values are examples:

```sh
npx --no-install shoalrun export docs.config.yaml --format pdf --product core --channel production --version v2 --language en --out pdf/core-v2
```

Pass `--profile customer.yaml` when exporting a [customer edition](https://www.shoalrun.com/publish/deployment-profiles.md). PDF selection uses the target's `contentFilter`, or the site's `site.contentFilter` when the target doesn't specify one. Product, version, language, page access policy, and feature requirements apply before rendering. A missing or excluded explicitly requested page fails.

Publication chapters follow navigation order. Eligible pages outside navigation are appended in stable document-ID order and reported in diagnostics. A named export target can supply an explicit document order:

```yaml
exports:
  manual:
    formats: [pdf]
    documents: [guide.start, guide.configure]
    pdf:
      cover: true
      toc: true
```

Run that target with `--target manual`. PDF targets contain whole pages and use a separate PDF manifest. Export HTML and Markdown in another invocation when your application needs those representations too.
