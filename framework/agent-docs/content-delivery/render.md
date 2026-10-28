---
id: guide.content-rendering
title: Render content in an application
summary: Mount passive HTML and keep application styling, navigation, and
  lifecycle under your control.
type: how-to
area: publishing
subarea: publishing-content-delivery
subjectLifecycle: in-development
canonical: /content-delivery/render
---

# Render content in an application

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Content delivery > Render content in an application

**Updated: 2026-10-28.**

**Status: In development.**

Your application can display a resource in a panel, onboarding surface, article view, or help drawer. Fetch the resource through a [content snapshot](https://www.shoalrun.com/content-delivery/client.md), then mount its HTML in a container you own.

## Mount the result

```ts
import { mountContent, openManifestContentSource } from '@shoalrun/cli/content';

const snapshot = await openManifestContentSource({
  manifestUrl: '/content/revisions/r1/manifest.json',
});
const result = await snapshot.get(
  { kind: 'section', documentId: 'guide.billing', sectionId: 'refunds' },
  { format: 'html' },
);
const container = document.querySelector('#content-panel');
if (!container) throw new Error('Missing content panel');
const mounted = mountContent(container, result);
```

Mounting assigns a unique prefix to IDs and rewrites local fragments, footnote references, and supported ID-reference attributes. This allows separate instances of the same resource without duplicating those DOM IDs. An explicit `instanceId` must be unique where the content is mounted.

## Own the interface

Apply your application's CSS to passive elements. The mount helper does not install the documentation theme or recreate interactive components. Preserve headings, link labels, image alternatives, and other semantic content when styling.

Your app owns loading and failure states, navigation history, focus management, close controls, keyboard behavior, and announcements when content changes. Preserve heading levels from the content; arrange the surrounding page so those levels make sense.

The helper inserts trusted compiler output. It is not a sanitizer for arbitrary HTML from users or unknown publishers.

## Route links and clean up

`mounted.links` records each exported link's kind and target. Resource links include a typed `ref`; canonical and external links have ordinary URLs. Intercept a resource link only when the app can open that target and preserve its fragment or query. Other links should retain their normal destination.

Use the returned `mounted.anchors` for instance-specific fragment targets. Do not guess DOM IDs from headings. When the view closes, call `mounted.unmount()` and dispose the snapshot when it is no longer shared by another view.

## HTML, Markdown, and agents

HTML fragments retain static content but omit component browser enhancements. The application supplies the interface around them. Markdown consumers receive the readable representation without mount IDs or application controls. Agents should use resource references and manifest links rather than inspect a rendered drawer to find the original content.

## Related reading

### Read first

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Understand resource delivery and its application boundary. (Status: in development.)

### Related topics

- [Read content with a client](https://www.shoalrun.com/content-delivery/client.md) — Mount trusted HTML and route its links. (Status: in development.)

- [Publish and update content](https://www.shoalrun.com/content-delivery/publish.md) — Publish complete revisions and update the client. (Status: in development.)
