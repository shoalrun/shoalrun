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

## Change inherited lists deliberately

Suppose the shared header contains a Support link. A local `site.header.links` list replaces that link, even when its entries use different IDs or labels. Use `$concat` to append instead.

Extend the current entry file to read:

```yaml title="docs.config.yaml"
schemaVersion: 1
extends: [../shared/base.yaml]
site:
  title: Parcel handbook
  header:
    links:
      $concat:
        - { label: Status, href: "https://status.example.com" }
variables: { $remove: [legacyLabel] }
navigation: { $include: ./config/nav.yaml }
```

The header now contains Support followed by Status. The variable map retains `company` and drops `legacyLabel`.

```sh
npx --no-install shoalrun config explain site.header.links docs.config.yaml
npx --no-install shoalrun config explain variables docs.config.yaml
npx --no-install shoalrun build docs.config.yaml dist
```

### Know the directive limits

`$concat` expects a list base when an inherited value exists. It does not append to a mapping. Included lists within `$concat` are flattened one level, so several team navigation fragments can become one list:

```yaml
navigation:
  $concat:
    - { $include: ./config/nav-guides.yaml }
    - { $include: ./config/nav-api.yaml }
```

That fragment requires both named files. Each should contain a navigation list. Concatenation preserves order and does not remove duplicates; duplicate navigation IDs still fail during a build.

`$remove` requires an inherited value. For mappings, its strings name keys. For lists, they match each item's `id`; it does not remove scalar strings or match another field such as `label`. Removing a missing name has no effect. Removing an item does not automatically repair links or other settings that referred to it.

Each directive mapping must contain exactly one directive and no other keys. You cannot combine `$remove` and `$concat` at the same location in one overlay. Use separate preset layers when you need both operations.
