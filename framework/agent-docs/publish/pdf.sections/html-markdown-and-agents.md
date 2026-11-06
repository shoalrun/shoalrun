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

## HTML, Markdown, and agents

HTML offers the optional browser print button or endpoint download link. Markdown retains the page's documentation and these instructions, without an interactive print control. The browser copies semantic article content into its print view. It shows tab panels and reader sections with their context and expands details without changing the source page. Browser-only controls and active elements aren't copied. CLI and endpoint PDF rendering expand those components into labeled static content. Reader views don't exclude their sections; use build filters and feature requirements for exclusion. Math retains its rendered expression, and code retains its text.

Agents can run the same export command with explicit publication coordinates and profile, then read the PDF artifact manifest to identify the selection. PDFs are separate delivery artifacts: enabling them doesn't add a new Content REST representation or a public link to every publication export.
