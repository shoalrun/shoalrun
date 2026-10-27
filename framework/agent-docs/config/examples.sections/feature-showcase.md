---
id: reference.config-examples
title: Example configs
summary: Complete, working docs.config.yaml files for common kinds of
  documentation sites.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/examples
---

# Example configs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Example projects

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/examples.md)

Each example below is a complete project in the repository's `framework/example-configs/` directory, with pages and any OpenAPI files it needs. The test suite builds every one, and checks that the configs on this page match the files, so they stay correct. Start with the bundled `minimal`, `api-docs`, or `showcase` project, then build it:

```sh
shoalrun init my-docs --starter minimal
cd my-docs
shoalrun build docs.config.yaml site-dist
shoalrun serve site-dist
```

Use `--starter api-docs` for the Cedar Parcel API example, or `--starter showcase` for a complete component handbook built around that fictional service. The other examples remain available to copy from `framework/example-configs/`.

The `notifications` project demonstrates an optional [cookbook chooser](https://www.shoalrun.com/author/components/cookbook-chooser.md) with email, push, and SMS choices. Its YAML maps supported selections to prebuilt recipe pages. It also includes unpublished ingredient and recipe drafts to show the authoring path. Build it from the repository root:

```sh
node framework/dist/cli.js build framework/example-configs/notifications/docs.config.yaml /tmp/notifications-site
node framework/dist/cli.js serve /tmp/notifications-site
```

The [configuration reference](https://www.shoalrun.com/config.md) explains every key.

## Feature showcase

The `showcase` starter provides 18 connected pages. Its component examples cover callouts, badges, definitions, tables, field lists, steps, timelines, collapsibles, file trees, code tabs, walkthroughs, and snippets. Other pages demonstrate reader controls, themes, diagrams, images, math, a landing page, cookbook choices, and generated API references. **Explore the starter**, first in the left navigation, maps the examples to their source pages.

```sh
shoalrun init my-handbook --starter showcase
cd my-handbook
shoalrun build docs.config.yaml site-dist
shoalrun serve site-dist
```

It needs no provider credentials to build. Replace fictional service names, hostnames, and examples before using it for a real product. Hosted chat, remote search, and analytics need your own services; the starter does not connect to a demonstration account.
