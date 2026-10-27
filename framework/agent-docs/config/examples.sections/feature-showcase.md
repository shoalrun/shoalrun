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

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Starters and discovery > Example projects

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/examples.md)

The installed package includes complete projects under `node_modules/@shoalrun/cli/example-configs/`, with their pages and local OpenAPI files. Start with a bundled starter in a new directory:

Install Node.js 22.12 or newer and npm before running these commands.

```sh
mkdir my-docs
cd my-docs
npm init -y
npm install --save-exact @shoalrun/cli@0.1.0-alpha.11
npx --no-install shoalrun init . --starter minimal
npx --no-install shoalrun build docs.config.yaml site-dist
npx --no-install shoalrun serve site-dist
```

Use `--starter api-docs` for the Cedar Parcel API example, or `--starter showcase` for a complete component handbook built around that fictional service. The other examples remain available to copy from `node_modules/@shoalrun/cli/example-configs/`.

The `notifications` project demonstrates an optional [cookbook chooser](https://www.shoalrun.com/author/components/cookbook-chooser.md) with email, push, and SMS choices. Its YAML maps supported selections to prebuilt recipe pages. It also includes unpublished ingredient and recipe drafts to show the authoring path. From the project where you installed Shoalrun, build the bundled example:

```sh
npx --no-install shoalrun build node_modules/@shoalrun/cli/example-configs/notifications/docs.config.yaml /tmp/notifications-site
npx --no-install shoalrun serve /tmp/notifications-site
```

The [configuration reference](https://www.shoalrun.com/config.md) explains every key.

## Feature showcase

The `showcase` starter provides 18 connected pages. Its component examples cover callouts, badges, definitions, tables, field lists, steps, timelines, collapsibles, file trees, code tabs, walkthroughs, and snippets. Other pages demonstrate reader controls, themes, diagrams, images, math, a landing page, cookbook choices, and generated API references. **Explore the starter**, first in the left navigation, maps the examples to their source pages.

```sh
mkdir my-handbook
cd my-handbook
npm init -y
npm install --save-exact @shoalrun/cli@0.1.0-alpha.11
npx --no-install shoalrun init . --starter showcase
npx --no-install shoalrun build docs.config.yaml site-dist
npx --no-install shoalrun serve site-dist
```

It needs no provider credentials to build. Replace fictional service names, hostnames, and examples before using it for a real product. Hosted chat, remote search, and analytics need your own services; the starter does not connect to a demonstration account.
