---
id: guide.content-delivery
title: Content delivery
summary: Deliver pages, sections, and snippet instances to applications from one
  reviewed content bundle.
type: explanation
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery
---

# Content delivery

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Content delivery > Overview

**Updated: 2026-10-29.**

Content delivery makes your documentation a reusable content source for applications, agents, services, and workflows. They can retrieve whole pages, individual sections, or reusable snippets in HTML or Markdown. You control how the content is displayed, combined, or processed; Shoalrun supplies the content and its metadata.

For example:

- A product displays billing instructions beside its payment settings.
- An agent retrieves a deployment procedure as context for completing a task.
- A publishing workflow reuses sections in onboarding emails or training material.
- A service feeds the documentation into its own search or retrieval index.

These are starting points. The consuming system decides what to build with the content.

Available since `0.1.0-alpha.13`.

## Choose a resource

Choose the unit that matches the application surface.

| Resource         | Identity                   | Typical use                                                    |
| ---------------- | -------------------------- | -------------------------------------------------------------- |
| Page             | Document ID                | A complete guide or reference                                  |
| Section          | Document ID and section ID | Part of a page, reviewed for use without the rest of that page |
| Snippet instance | Named export instance      | Reused text with fixed build-time values                       |

[Select resources](https://www.shoalrun.com/content-delivery/select.md) in an export target, then build a directory containing a manifest, passive HTML, Markdown, and local assets. An application opens the manifest and reads resources by their typed references. It never needs to guess generated filenames.

Exporting a section leaves out the ordinary page introduction and neighboring sections. Before selecting one, check that it still makes sense on its own and record that judgment in `standaloneSections`. This declaration is required only for section exports, not whole-page exports. [Section identity and compatibility](https://www.shoalrun.com/content-delivery/sections.md) shows a missing-context example and the declaration.

## Start with static delivery

A static server can serve the bundle from your application's origin. The content client opens one revision and checks each representation against the manifest's byte count and digest. No content API server, model provider, or website build is required.

```text
Authored pages and snippets
  -> reviewed export
  -> static files on the application origin
  -> content client
  -> application interface
```

Keep the application's content access behind the [ContentSnapshot interface](https://www.shoalrun.com/content-delivery/api.md). The [REST adapter](https://www.shoalrun.com/content-delivery/rest.md) exposes the same resources through HTTP, and its client returns that interface. The host supplies its listener and authorization. The adapter does not add search or live content editing.

## Choose the next task

- [Select content resources](https://www.shoalrun.com/content-delivery/select.md) to define the bundle.
- [Read content with a client](https://www.shoalrun.com/content-delivery/client.md) to fetch static exports.
- [Serve content through REST](https://www.shoalrun.com/content-delivery/rest.md) to expose the same snapshots over HTTP.
- [Render content in an application](https://www.shoalrun.com/content-delivery/render.md) to display it.
- [Publish and update content](https://www.shoalrun.com/content-delivery/publish.md) to keep revisions consistent.

## HTML, Markdown, and agents

HTML exports contain passive fragments that the application styles. Markdown exports retain readable content for agents or another renderer. Interactive controls are lowered to static content; no Shoalrun browser behavior ships with a fragment. Agents can use the manifest and typed references without operating the application. [Compare delivery and discovery](https://www.shoalrun.com/content-delivery/agents.md) before choosing an agent integration.

## Related reading

### Related topics

- [Select content resources](https://www.shoalrun.com/content-delivery/select.md) — Choose which resources the application receives.
