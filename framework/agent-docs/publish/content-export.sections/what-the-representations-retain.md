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

## What the representations retain

Exports resolve snippets, supported components, and API material before rendering. Static output keeps the substantive content of interactive components:

| Source content                                     | Export behavior                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Prose, tables, lists, callouts, and code           | Preserve their content and structure.                                                        |
| Tabs, disclosures, and walkthroughs                | Keep all panels, disclosure content, and steps as visible labeled content.                   |
| Reader sections                                    | Keep every section with a readable audience or facet label.                                  |
| Custom components                                  | Keep shared documentation content; omit browser modules, browser data, and component styles. |
| Diagrams and images                                | Copy referenced local visuals; diagrams retain their source in Markdown.                     |
| Math                                               | Preserve the LaTeX expression as readable code.                                              |
| Browser filters, reader controls, and copy buttons | Omit the controls.                                                                           |

HTML contains no site navigation, theme, required scripts, or app-wide stylesheet. It remains readable without CSS; your app styles its content container. HTML and Markdown are rendered independently from the same resolved source, so [representation-specific blocks](https://www.shoalrun.com/author/components/only.md) retain their intended differences.

HTML heading, footnote, and other IDs are namespaced per document. Mount each exported document once per DOM. Repeated simultaneous instances require the application to rewrite IDs and all corresponding fragment and ARIA references. Markdown heading anchors depend on the customer's renderer; the export does not promise identical anchor generation across Markdown libraries.

Whole pages are the supported units. The website's size-based section resources are not exported as stable application-help IDs.
