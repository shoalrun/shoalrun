---
id: guide.configuration
title: Organize project configuration
summary: Learn how Shoalrun resolves config files, layers presets, tracks path
  origins, and applies page defaults before building publications.
type: how-to
area: publishing
subarea: publishing-configuration
canonical: /configuration
---

# Organize project configuration

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Configure and customize > Configure your project

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/configuration.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Reuse shared configuration and content for separately selected sites.

`docs.config.yaml` connects your content, presentation, and publication settings. Start with one file, then extract sections or share defaults when several projects need them. This guide explains how those choices interact and how to inspect the result.

Use the [configuration reference](https://www.shoalrun.com/config.md) to look up individual fields. Use [example projects](https://www.shoalrun.com/config/examples.md) for complete configurations you can copy.

## Start with one working file

The examples use a separate project so you can replace its configuration as you follow along. Install the same pinned package used in [getting started](https://www.shoalrun.com/start.md):

```sh
CONFIG_DEMO="$(mktemp -d)"
mkdir "$CONFIG_DEMO/site"
cd "$CONFIG_DEMO/site"
npm init -y
npm install --save-exact @shoalrun/cli@0.1.0-alpha.11
npx --no-install shoalrun init . --starter minimal
```

The starter has two pages and this basic configuration structure:

```yaml title="docs.config.yaml"
schemaVersion: 1
site:
  title: Acme handbook
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
frontmatter:
  defaults:
    type: guide
    channel: production
    version: current
    access: { policy: public }
navigation:
  - id: welcome
    doc: guide.welcome
  - id: setup
    label: Setup
    items:
      - id: install
        doc: guide.install
```

Build once before reorganizing:

```sh
npx --no-install shoalrun build docs.config.yaml dist
```

This produces the same two pages after each reorganization below. Keep `dist/` separate from content and configuration inputs.
