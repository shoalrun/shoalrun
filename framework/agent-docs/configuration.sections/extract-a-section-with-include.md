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

## Extract a section with `$include`

An include substitutes another YAML value at its location. The included file can contain a mapping, list, or scalar, depending on the setting that receives it.

Create a `config/` directory:

```sh
mkdir -p config
```

Move the navigation list into this file:

```yaml title="config/nav.yaml"
- id: welcome
  doc: guide.welcome
- id: setup
  label: Setup
  items:
    - id: install
      doc: guide.install
```

Replace the entire `navigation` section in `docs.config.yaml` with:

```yaml
navigation: { $include: ./config/nav.yaml }
```

The included file contains the list itself, without a surrounding `navigation:` key. Adding that wrapper would supply a mapping where navigation expects a list.

An include has no sibling keys. For example, placing both `$include` and `label` in the same mapping fails with `exactly one directive is required`. Include a smaller value or use inheritance to combine settings.

Includes work at any depth and can include other files. Paths in `$include` are relative to the YAML file containing that directive. A cycle fails with `Configuration cycle` and the file chain.

Inspect the substituted value and its source:

```sh
npx --no-install shoalrun config resolve docs.config.yaml
npx --no-install shoalrun config explain navigation.0.doc docs.config.yaml
```

The first command prints the effective value, digest, and configuration dependencies. The second identifies `config/nav.yaml` as the source of `guide.welcome`.
