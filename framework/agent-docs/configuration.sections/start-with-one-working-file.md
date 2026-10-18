---
id: guide.configuration
title: Organize project configuration
summary: Learn how Shoalrun resolves config files, layers presets, tracks path
  origins, and applies page defaults before building publications.
type: how-to
canonical: /configuration
---

# Organize project configuration

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Configure your project

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/configuration.md)

`docs.config.yaml` connects your content, presentation, and publication settings. Start with one file, then extract sections or share defaults when several projects need them. This guide explains how those choices interact and how to inspect the result.

Use the [configuration reference](https://www.shoalrun.com/config.md) to look up individual fields. Use [example projects](https://www.shoalrun.com/config/examples.md) for complete configurations you can copy.

## Start with one working file

The examples use the compiled CLI from the [quickstart](https://www.shoalrun.com/start.md). From the Shoalrun checkout root, create a separate minimal project:

```sh
SHOALRUN_CLI="$PWD/framework/dist/cli.js"
CONFIG_DEMO="$(mktemp -d)"
node "$SHOALRUN_CLI" init "$CONFIG_DEMO/site" --starter minimal
cd "$CONFIG_DEMO/site"
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
node "$SHOALRUN_CLI" build docs.config.yaml dist
```

This produces the same two pages after each reorganization below. Keep `dist/` separate from content and configuration inputs.
