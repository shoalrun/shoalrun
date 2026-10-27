---
id: guide.custom-metadata
title: Metadata customization
summary: Configure metadata defaults, enforcement, fields, and providers.
type: reference
area: authoring
subarea: authoring-metadata
canonical: /author/custom-metadata
---

# Metadata customization

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Page metadata > Metadata customization

**Updated: 2026-10-26.**

Use this guide when your project needs shared metadata rules or fields beyond the [native page metadata](https://www.shoalrun.com/author/frontmatter.md). To choose which values appear in published Markdown, see [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md).

## Global defaults and enforced values

The project config is the root `docs.config.yaml` plus any imported fragments. Its `frontmatter` block supplies shared page values; this block does not appear inside an individual page's header. Configure it in the root file or an imported fragment:

```yaml
frontmatter:
  locales: { en: en-US }
  defaults:
    type: guide
    channel: production
    version: v1
    language: en
    audiences: [developers]
    access: { policy: draft }
    seo:
      description: Documentation for the example API.
    variables:
      product: Payments
  enforced:
    audiences: [partners]
    editorial:
      owner: API documentation
  fields:
    editorial.owner:
      type: string
      description: Team responsible for the documentation.
```

`defaults` fills in values that a page may replace. `enforced` sets values the page cannot replace. Precedence is **defaults → page frontmatter → enforced values**. Objects merge recursively, and arrays replace rather than concatenate. In this example, every page's effective audience is `partners`, even if its source lists another audience. A page can override the default SEO description, but cannot override the enforced editorial owner.

The `id` and `slug` fields must stay on each page; they cannot be global defaults or enforced values. Other native and custom metadata can be inherited. Required fields and declared types are checked after merging, so an inherited `type`, `summary`, or required custom field satisfies validation. The generated JSON Schema omits inherited fields from its source-level required lists. Global values do not bypass public metadata projection rules.

`access` follows the same precedence. A default public policy allows a page to remain an explicit draft. An enforced public policy replaces even an explicit draft policy, so use defaults if authors need to keep individual pages unpublished. Scaffolded files are still initially written with draft access.

For language, a page uses the enforced language, its own language, the frontmatter default, `publications.defaults.language`, then `en`, in that order. Enabled publication entries that omit language use the enforced/default global language, then the publication default, then `en`. The current router leaves the default language unprefixed. Future translation URL conventions remain open.

`frontmatter.locales` sets the usual formatting locale for each language. A page can override it with its own `locale`; `frontmatter.enforced.locale` takes precedence over both. The locale has no routing effect. A project with one language can instead use `frontmatter.defaults.locale` without a map.

When updating an earlier prototype project, rename these settings:

| Earlier name                                                              | Current name              | If left unchanged                                                                  |
| ------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| `publications.defaults.locale`, `publications.enabled[].locale`           | `language`                | The config loader fails with a migration message.                                  |
| Page `locale` used to choose a publication                                | `language`                | The page uses the default language, and `locale` sets only formatting conventions. |
| `redirects[].to.locale`                                                   | `redirects[].to.language` | The build fails because the redirect has no full target publication.               |
| `publication.locale` in Markdown metadata sources                         | `publication.language`    | The build fails with an unknown metadata source.                                   |
| Page `lifecycle: beta`, `in-development`, `experimental`, or `deprecated` | `subjectLifecycle`        | No status badge appears, and the build reports no error.                           |
| `--locale` CLI option                                                     | `--language`              | The command fails with an unknown-option error.                                    |
| `locale` in a custom search provider's context                            | `language`                | The value is `undefined`.                                                          |

Review page `locale` values individually, because that name now means formatting conventions.

Set nested global values with YAML mappings, as shown above. Dotted names such as `editorial.owner` belong in `fields` declarations and metadata projections. Global settings are applied in memory during the build; source pages are not rewritten. There are no directory-specific or document-type global policies yet.

## Add a custom page field

The [page metadata guide](https://www.shoalrun.com/author/frontmatter.md) uses the optional, project-defined `agent.intent` field to record the task it helps a reader complete. Shoalrun does not require or interpret that field. A custom field has two parts: a **declaration** in project config and a **value** in a page header. The declaration appears in the [published field reference](https://www.shoalrun.com/author/frontmatter-reference.md) and the local generated reference; the value belongs to that page.

1. `docs/docs.config.yaml` loads the field declarations from a separate file:

   ```yaml title="docs/docs.config.yaml"
   frontmatter: { $include: ./config/frontmatter.yaml }
   ```

2. `docs/config/frontmatter.yaml` declares both fields used by that guide:

   ```yaml title="docs/config/frontmatter.yaml"
   fields:
     agent.intent:
       type: string
       description: The reader task this page helps an agent complete.
       public: true
     editorial.reviewNote:
       type: string
       description: Internal note for documentation reviewers.
       public: false
   ```

3. This page, `docs/content/frontmatter.mdx`, gives them these values:

   ```yaml title="docs/content/frontmatter.mdx"
   agent:
     intent: Help authors understand and configure page metadata.
   editorial:
     reviewNote: Check the frontmatter examples before release.
   ```

The config key `agent.intent` is a path. On the page, write it as an `agent` object with an `intent` value. The declaration checks that the value is a string and adds its description to the generated reference. `public: true` makes it eligible for the Markdown preamble; it does not export the value by itself.

Undeclared fields are allowed in source pages, but they have no project type check or export approval. Declarations cannot redefine built-in fields, `slug`, `channel`, `version`, or the [protected metadata roots](https://www.shoalrun.com/author/markdown-metadata.md). A dotted declaration such as `agent.intent` needs any declared parent, such as `agent`, to have type `object`. Declarations support `string`, `number`, `integer`, `boolean`, `object`, and `array`. They can also set `required`, `items` for arrays, or `enum` for scalar values.

For conditional source rules, such as requiring a verification date and evidence note together, see [check editorial policies with Manni](https://www.shoalrun.com/publish/manni.md). This optional check complements the field declarations above.

## Choose text for each surface

`summary` and `description` are separate fields. The short `summary` is required by Shoalrun; the fuller `description` is optional. Project config chooses an ordered list of field paths for each surface. The first nonempty string wins:

```yaml title="docs.config.yaml"
outputs:
  text:
    card: [summary]
    pageHeader: [summary]
    search: [description, summary]
    htmlDescription: [description, summary]
    socialCard: [summary]
```

`socialCard` writes an Open Graph description tag when it finds text; it does not generate a card image. Without a `socialCard` rule or page override, Shoalrun writes no Open Graph description. The other surfaces default to `summary` if no rule is set. The search choice becomes the summary in `search-index.json`. A card's existing `card.description` and an HTML page's existing `seo.description` take precedence over these rules.

Override one surface on a page with literal text:

```yaml title="A page's frontmatter"
displayText:
  socialCard: A short introduction for link previews.
```

`displayText` is presentation control; it is not exported as Markdown metadata. A configured text rule can also select a custom or provider-supplied string field by path. Selecting it for public HTML or the search index is an explicit publication decision.

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

## Preview changes to metadata providers

Restart local preview after editing a custom metadata provider module configured with `metadata.provider`. Node loads the module once, so a watched rebuild does not reload its implementation. Stop `shoalrun dev` and start it again to see changes to the provider code. Changes to ordinary documentation pages still trigger automatic rebuilds. See the [CLI reference](https://www.shoalrun.com/cli.md) for other changes that require a restart.

## Related reading

### Next steps

- [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md) — Choose which eligible project fields to publish.
