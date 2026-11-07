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

**Updated: 2026-11-07.**

**Available since: 0.1.0-beta.1.**

Parent page: [Full Markdown page](/publish/pdf.md)

Offer **Print PDF** on a static site using the visitor's browser. Site builds generate no page PDFs or extra print documents. When you want a downloadable full manual, export it explicitly through the CLI with your own fonts, colors, paper size, and print layout. A Node host can also offer direct page PDF downloads on request.

## Publish an optional manual download

Generate a complete selected publication with the CLI only when you want a downloadable manual. Keep its export directory outside the site build destination. After generating `pdf/manual/publication.pdf`, build the site and copy the PDF into the deployment output:

```sh
npx --no-install shoalrun build docs.config.yaml site-dist
mkdir -p site-dist/downloads
cp pdf/manual/publication.pdf site-dist/downloads/manual.pdf
```

Add an ordinary content, header, or footer link to `/downloads/manual.pdf`, and run your site's link checks after copying. This example assumes root hosting; place the file and link under the configured base path when using one. Deploy it with the site. A later site build replaces its output, so repeat the explicit copy as part of your deployment workflow.

Shoalrun doesn't automatically publish CLI export directories or create a full-manual download button. One optional manual file can serve the publication without prebuilding a PDF for every page. Use the same publication and customer profile for the site and manual.
