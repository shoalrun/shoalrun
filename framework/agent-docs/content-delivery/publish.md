---
id: guide.content-delivery-publishing
title: Publish and update content
summary: Publish complete revisions, compare removed references, and replace
  content snapshots deliberately.
type: how-to
area: publishing
subarea: publishing-content-delivery
subjectLifecycle: in-development
canonical: /content-delivery/publish
---

# Publish and update content

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Content delivery > Publish and update content

**Updated: 2026-10-28.**

**Status: In development.**

Publish a complete export as one revision. The manifest and representation files must agree; replacing only the manifest or only an article can leave a running application with mismatched content.

## Build a revision

Choose a revision mount, such as `/content/revisions/r2/`, and set the target's `publicBase` to that path. Export into a separate output directory:

```sh
npx --no-install shoalrun export docs.config.yaml \
  --target application --out ./content-r2
```

Review every selected resource in HTML and Markdown, including links, images, notices, and snippet values. Imported API material requires the existing source-review approval before the bundle is ready for delivery.

## Compare public references

Keep the manifest of the last published revision. For an established collection, compare against it:

```sh
npx --no-install shoalrun export docs.config.yaml \
  --target application --out ./content-r2 \
  --previous-manifest ./content-r1/manifest.json \
  --fail-on-removed
```

The comparison reports added and removed typed references within their publication. A title or body edit changes content without changing an explicit identity. A renamed derived section ID can remove a reference. Strict removal checking fails before replacing the previous output; without a baseline, removal checking is reported as unavailable.

Review intentional removals with the applications that consume them. Keep old revisions available while deployed applications still need them. Comparison does not create redirects or aliases.

## Serve and switch

Upload the complete directory to its configured mount. Serve the manifest as `application/json`, HTML as `text/html`, and Markdown as `text/markdown`. Keep relative file paths and local assets intact.

The application chooses which manifest URL to open. An already-open snapshot stays on its revision. Open and validate the replacement before switching the UI, then dispose the old snapshot when its views are finished. The [REST adapter](https://www.shoalrun.com/content-delivery/rest.md) can supply the same interface. Replacing its handler updates the loaded snapshots; authorization, historical revision routing, and asset hosting remain the host application's responsibility.

## HTML, Markdown, and agents

Publish both representations together when both are selected. Agents and applications can record the manifest revision with a resource reference to explain which content they read. A digest verifies that bytes match the declared revision; it is not a signature or proof of factual accuracy. Remote images remain external dependencies and need separate availability planning.

## Related reading

### Read first

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Understand resource delivery and its application boundary. (Status: in development.)

### Related topics

- [Render content in an application](https://www.shoalrun.com/content-delivery/render.md) — Publish complete revisions and update the client. (Status: in development.)

- [Content manifest](https://www.shoalrun.com/content-delivery/manifest.md) — Inspect revision and representation metadata. (Status: in development.)
