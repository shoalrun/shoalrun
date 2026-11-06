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

## Check the result

Open `page.pdf` or `publication.pdf` in the export directory. Check the cover, fonts, long tables and code, page breaks, internal links, and bookmarks. Confirm that excluded edition content is absent. The adjacent manifest records publication identity, page order, input digests, and renderer details; it isn't a Content REST representation manifest. A failed export preserves an earlier PDF export directory.

For browser printing, open a page, activate **Print PDF**, and inspect the branded view and native print preview. Confirm that the selected page and release appear and that no page PDFs were generated in the site build. Check that the original page's tabs, details, and reader view remain unchanged.

For an endpoint action, follow **Download PDF** and confirm the selected page downloads. An endpoint link makes a normal same-origin navigation and download request; the server returns a readable error if generation fails.
