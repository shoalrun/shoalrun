---
id: guide.custom-metadata
title: Metadata customization
summary: Defaults, enforcement, custom field declarations, text selection, and
  provider contracts.
type: reference
canonical: /author/custom-metadata
---

# Metadata customization

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Metadata > Metadata customization

**Updated: 2026-10-03.**

Parent page: [Full Markdown page](/author/custom-metadata.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md) — Choose which eligible project fields to publish.

Use this guide when your project needs shared metadata rules or fields beyond the [native page metadata](https://www.shoalrun.com/author/frontmatter.md). To choose which values appear in published Markdown, see [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md).

## Read metadata from a project module

A project can opt into a local build-time provider module. Shoalrun does not validate external vocabularies; projects run their own validation separately. A provider can adapt an external metadata manifest to Shoalrun's page model:

```yaml title="docs.config.yaml"
metadata:
  provider:
    module: ./metadata/provider.mjs
```

```js title="metadata/provider.mjs"
export async function provideMetadata({ file, source, projectRoot }) {
  const entry = await lookupById(source.id, projectRoot);
  if (!entry) return;
  return {
    values: { owner: entry.owner },
    ownedKeys: ['owner'],
    dependencies: [entry.manifestFile]
  };
}
```

`lookupById` is project code in this example. The provider runs for each authored page before project defaults and normal frontmatter checks. Returned values can be used by Shoalrun's build features. Return nothing to leave a page unchanged. `ownedKeys` names top-level fields the provider owns, including fields with no value on a given page. Every key in `values` must be owned. If `ownedKeys` is omitted, the provider owns exactly the keys in `values`. If an owned field also appears in page frontmatter, the build fails. Providers cannot replace `id`, `slug`, publication selectors, or `access`. `dependencies` lists absolute paths of files the provider read so the build record includes them.

Provider fields stay out of public metadata unless the project selects them. To put a custom provider field in the Markdown header, declare it under `frontmatter.fields` with `public: true`, then select it in `outputs.markdown.metadata.fields`. The project's explicit selection determines what is published.

Next, [choose metadata for published Markdown](https://www.shoalrun.com/author/markdown-metadata.md).
