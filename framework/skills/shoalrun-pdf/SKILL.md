---
name: shoalrun-pdf
description: Style and export Shoalrun pages or publications as PDFs, including brand typography, covers, print layouts, optional download actions, and visual verification. Use for documentation PDFs rather than ordinary website styling or unrelated PDF editing.
---

# Style and export documentation PDFs

## Before you start

- Check the installed CLI, print settings, and required browser before exporting.
- Keep product, version, language, profile, and build filters consistent with the requested artifact.
- Use local print assets with appropriate rights and keep output separate from source.
- Inspect rendered pages, extracted text, links, and absence of excluded content.
- Reuse each verified artifact until inputs change; enable download actions only within the requested scope.


Inspect the documentation project's instructions, installed CLI, content selection, and existing print assets. Check `shoalrun export --help` before using PDF options; a skill folder alone doesn't establish installed-version support. Use the project's installed CLI and package references without requiring a framework checkout. Preserve existing source, routes, IDs, and unrelated edits.

## Choose the publication and output

Confirm whether the request covers a page, a selected collection, or a complete publication. Keep product, channel, version, language, audience, and customer profile consistent with the intended site. Pass the same profile to build, export, and preview. PDF selection uses the export target's `contentFilter`, otherwise the site's filter. Reader sections remain complete labeled content; reader views aren't exclusion or authorization controls.

For an existing project, capture the required baseline before editing. Keep a separate demo's source and output isolated. Use genuine project facts in customer documentation; label sample content and don't invent product capabilities to fill a design.

## Translate the brand into print

Read [the print design reference](references/print-design.md) when choosing configuration, selectors, typography, or page behavior. Use supplied brand evidence and suitable local fonts/logo assets; keep customer-specific values in the project and preserve asset notices. Website theme settings aren't automatically a PDF theme.

Use `outputs.pdf` for shared print settings and `exports.<target>.pdf` for overrides. Copy [the manual stylesheet starter](assets/print.css) into the project when useful, then adapt its tokens and typography. It supplies a restrained cover, contents, chapter hierarchy, tables, code, and print breaks; it isn't a required visual style. Browser print views reuse these print settings and shared assets. The ordinary browser Print fallback uses website print CSS through `site.customCss` and `@media print`.

Design the cover, contents, article pages, tables, and code as one publication. Use physical dimensions for page geometry and keep text/background contrast readable in print. Give headings room without isolating them from their content. Avoid blanket `break-inside: avoid` on chapters, long code, or large tables; it can create blank space or overflow. Don't reduce body type to hide a pagination problem.

Register local font files explicitly with accurate families, weights, and styles. Use existing licensed assets rather than copying system fonts into a distributable template. The stylesheet can't import files or load URLs; images must be staged local assets. Keep source paths relative to the configuration that declares them.

## Export and offer downloads

Use an output directory separate from source. Commands below assume the project directory and its installed CLI:

```sh
shoalrun export docs.config.yaml --format pdf --document guide.start --out pdf/page
shoalrun export docs.config.yaml --format pdf --out pdf/manual
```

Select a named target or explicit publication coordinates when needed. One export contains one publication. Full-publication order follows navigation, with eligible unlisted pages appended and reported; an explicit target document list supplies an order. PDF bundles and manifests are separate from HTML/Markdown application exports and Content REST representations.

Enable the optional page action only when requested. Static sites use `mode: print`, which opens the visitor's print dialog without generating page PDFs or extra print documents during builds. Keep whole-manual PDF generation optional through the CLI and publish that download only when requested. Never turn on per-page PDF generation as a static-hosting default.

Endpoint generation is an explicit option for a Node host with an installed browser. Label, placement, page inclusion/exclusion, and suppression are configurable. A style target supplies only its PDF settings to a browser print view or endpoint download; it mustn't change the current page's selection. Browser print views have no generation endpoint and use shared CSS/fonts/settings rather than per-page output files. See the reference for configuration and hosting boundaries.

## Verify the PDF itself

Generate a representative page and full publication when the request affects both. Reuse each artifact until its source, styling, or assets change. Inspect all pages as rendered images or in a PDF viewer, then check extracted text, internal destinations, fonts, and any requested bookmarks. Check cover crop, chapter starts, heading orphans, footer clearance, contrast, long URLs/code, table continuation, and mathematical content. Verify excluded edition content is absent.

Check an enabled action against the selected page and publication. For browser printing, verify that it opens the native print dialog with the current page's printable content and creates no build-time PDFs. For a CLI or endpoint download, verify the actual PDF. An HTML preview, successful build, or browser-free test isn't evidence that PDF generation works. Chromium outline/tagging support is experimental; inspect actual output and don't claim PDF/UA compliance from a setting.

If rendering is blocked, report the exact failed stage and preserve the prepared content and runnable export command. Don't disable browser sandboxing to make a preview work. A native print-interface fallback can demonstrate styling when appropriate, but identify its renderer/settings and don't report it as a passing automated CLI export. A print dialog isn't an on-demand PDF download endpoint.

Deliver the PDF or working preview link with a brief description of the design, checks completed, and remaining limitations. Follow the user's existing authorization for commits, deployment, and publication.
