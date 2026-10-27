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

Keep application help and your documentation website in one content source. `shoalrun export` produces a directory of resolved Markdown, passive HTML fragments, referenced assets, and a manifest. Your application owns the help drawer, onboarding screen, or other interface that displays the content. It does not need a Shoalrun browser runtime.

## Prerequisites

Content exports require Shoalrun CLI `0.1.0-alpha.6` or later.

Start with a Shoalrun project and public pages assigned to an enabled publication. Navigation, facets, a site title, and a previous website build are optional. A site origin is needed only when links must fall back to pages on the documentation website. The export does not generate embeddings or run documentation chat.

## Export selected pages

1. ## Define an export target

   Add a named target to `docs.config.yaml`. These IDs refer to pages in the project's configured content directory:

   ```yaml
   exports:
     app-help:
       formats: [markdown, html]
       documents: [guide.api-keys, guide.billing]
       publicBase: /help/
   ```

   Omit `documents` to export all eligible public pages in one enabled publication. If more than one publication is enabled, select all three coordinates:

   ```yaml
   exports:
     app-help:
       formats: [html]
       documents: [guide.api-keys, guide.billing]
       publication: { channel: production, version: current, language: en }
       publicBase: /help/
   ```

   Optional `contentFilter` uses configured reader facets. Every selected facet must match; choices within a facet are alternatives. Pages missing a selected facet are excluded. An explicitly requested ID that is absent, private, unavailable in the publication, or excluded by the export filter fails with a diagnostic.

   Export selection is independent of the website's `site.contentFilter` and navigation. Changing a website menu does not change the app's help collection. See [separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) for website selection.

2. ## Build the portable bundle

   From the documentation project, run:

   ```sh
   shoalrun export docs.config.yaml --target app-help --out ../app/public/help
   ```

   Replace the output path with the directory your application will distribute. The command prints JSON with its publication, formats, selected document IDs, asset count, digest, API review requirements, and diagnostics. A successful export replaces an earlier export in that directory. A failure preserves it. Source directories, unrelated nonempty directories, and previous website builds cannot be used as the export destination.

   The result has this structure:

   ```text
   help/
     manifest.json
     content/
       ...HTML and Markdown files
     assets/
       ...referenced local files
     NOTICES.txt
   ```

   File names derive from stable document identity and publication, not titles or source-file names. Read paths from the manifest rather than constructing them in your app.

   For a one-off export without a named target:

   ```sh
   shoalrun export docs.config.yaml --out ../app/public/help \
     --format html --document guide.api-keys --document guide.billing \
     --public-base /help/
   ```

3. ## Mount and load the content in your app

   `/help/` is an example value, not a required path. Choose any root-relative path ending with a slash, such as `/resources/`. Set `publicBase` to that path, serve the generated bundle there, and update the manifest URL in your app's loader to match (for example, `/resources/manifest.json`). The `--out` filesystem directory can have a different name from the URL path.

   The examples below use `/help/`. This base locates content and assets; it does not define your application's routes.

   Your app can find a page by ID and load its HTML fragment:

   ```js
   const manifest = await fetch('/help/manifest.json').then(response => response.json());
   if (manifest.schemaVersion !== 1 || manifest.review.status !== 'ok') {
     throw new Error('Unsupported or unreviewed help export');
   }
   const help = manifest.documents.find(document => document.id === 'guide.api-keys');
   const html = await fetch(manifest.publicBase + help.representations.html.path)
     .then(response => response.text());
   helpContainer.innerHTML = html;
   ```

   Use this pattern for trusted output from your own documentation build. Handle missing documents and failed requests in your application's loading and error states. The manifest also provides Markdown paths if your app uses its own Markdown renderer.

   Images use the configured mount. This matters when HTML fetched from `/help/content/` is inserted into an app page such as `/settings/account`: relative image URLs would otherwise resolve against the app page.

4. ## Handle document links and check the result

   Links to other exported pages have `data-export-link` markers. Each marker identifies a record in that representation's `links` array. For `kind: document`, your app can prevent ordinary navigation and open `documentId` in the drawer. `fragment` identifies the original heading or anchor; the HTML representation's `anchors` array maps it to its namespaced `exportedId`.

   A link to an omitted document uses its canonical website URL only when that document is public, enabled, and selected for the website. Without an eligible destination and a configured origin, the export fails. Linked pages are never silently added to the export. Explicit external links retain their destinations.

## Check the result

Check the app from a route unrelated to the export mount. Confirm that images load, document links stay in the drawer when intercepted, canonical links open the website, and all expected content is visible. Re-export after changing source content, and distribute the updated bundle with the application.

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

## Assets, downloads, and notices

Local assets must be inside the content directory or an explicitly configured `assetRoots` directory. Roots and notice paths resolve relative to the config file that declares them:

```yaml
exports:
  app-help:
    documents: [guide.api-keys, guide.billing]
    publicBase: /help/
    assetRoots: [./downloads]
    notices: [./CONTENT-LICENSE.txt]
```

Supported files include PNG, JPEG, GIF, WebP, AVIF, passive SVG, PDF, plain text, CSV, JSON, and YAML. Local assets use content-hashed paths. Unsupported asset types, missing files, symlink escapes, active SVG, and unresolved local links fail the export. Asset directories are not copied wholesale. Self-contained focused OpenAPI downloads are included when referenced.

Remote images are not downloaded. The manifest records them in each document's `externalDependencies`, and the command reports them in diagnostics. A document with a remote image is not offline-complete. Explicit notice files and applicable diagram-renderer notices are retained in `NOTICES.txt`.

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

## Inspect the manifest

The versioned `manifest.json` identifies documents by ID and publication. It includes titles, summaries, types, eligible canonical URLs, representation paths and digests, typed links, HTML anchor maps, local assets, external image dependencies, and diagnostics. It does not copy raw source frontmatter, configuration, local dependency paths, or browser runtime payloads.

The bundle's `digest` is the SHA-256 of `JSON.stringify` of the parsed manifest with its own `digest` field removed. The `files` list records byte counts and SHA-256 digests for every payload file, including notices. All text is UTF-8. The manifest itself is excluded from that list. Deterministic output lets applications compare bundles and invalidate cached content.

## Try the help-drawer example

The package's `examples/help-drawer` directory contains a small application with two help documents, an image, a diagram, reader sections, tabs, a walkthrough, and a custom component. Copy it into a project with Shoalrun installed, then run from that example directory:

```sh
shoalrun export docs.config.yaml --target app-help --out public/help
node preview.mjs
```

Open `http://127.0.0.1:8774/settings/account`. Choose **Help with API keys**, follow **Billing help** inside the drawer, then follow the API-key link back. The app remains on its settings route. No Shoalrun browser runtime is loaded. The omitted account guide uses the configured example documentation origin; replace that origin and deploy the corresponding docs page for a working external destination.

## Related reading

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Look up named export targets and selection settings.

- [Reader views](https://www.shoalrun.com/author/reader-views.md) — Understand why exported reader sections remain complete labeled content.

### Related topics

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Reuse the same authored content inside an application.
