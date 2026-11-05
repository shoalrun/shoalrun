---
id: guide.deployment-profiles
title: Build customer documentation editions
summary: Select purchased and grandfathered features with a deployment-owned
  profile and apply customer branding.
type: how-to
area: publishing
subarea: publishing-configuration
canonical: /publish/deployment-profiles
---

# Build customer documentation editions

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Customer editions

**Updated: 2026-11-05.**

**Available since: 0.1.0-alpha.15.**

Parent page: [Full Markdown page](/publish/deployment-profiles.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Understand how separate sites share authored content and configuration.

**Next steps**

- [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) — Review the selected edition using captured HTML and Markdown. (Status: experimental.)

Build a documentation edition for individual customers from one shared content project. Keep product definitions in the shared repository and supply each customer's purchases, additional features, and branding through that deployment's own profile file. Customer profiles don't need to share a repository with the content.

By default, you don't need to mark every page. Pages without feature requirements are shared across customer editions. For customer deployments that need a deliberate decision on each page, enable explicit classification. In either mode, add requirements to pages or sections that depend on specific features.

## Mark pages and shared sections

Pages declare feature requirements with `requires`. They don't name SKU IDs. The profile's SKU mappings and direct grants determine which features are available.

### Unmarked pages are shared by default

With `profiles.requireClassification` omitted or `false`, a page with no authored or inherited `requires` is included in every eligible customer edition. Common setup, introductions, and shared troubleshooting can remain unmarked.

Shared content still has to pass the project's access, publication, language, and facet rules. A draft stays excluded from normal builds, and a page for an older version still needs that publication enabled.

The following table shows feature selection after those other rules pass. Grants can come from SKUs or direct feature entries:

| Page requirements                     | No granted features | Analytics only | Analytics and Connectors |
| ------------------------------------- | ------------------- | -------------- | ------------------------ |
| No authored or inherited requirements | Included            | Included       | Included                 |
| `allOf: [analytics]`                  | Omitted             | Included       | Included                 |
| `allOf: [analytics, connectors]`      | Omitted             | Omitted        | Included                 |
| `anyOf: [analytics, connectors]`      | Omitted             | Included       | Included                 |

**Forgetting a requirement makes a feature-specific page shared.** Shoalrun doesn't infer requirements from its folder, title, product metadata, or navigation label. Enable explicit classification to catch missing page declarations, and review feature-specific content before distributing an edition.

### Require a deliberate page classification

Enable strict classification in the shared project configuration:

```yaml title="docs.config.yaml (fragment)"
profiles:
  manifest: ./sku-manifest.yaml
  required: true
  pruneNavigation: true
  requireClassification: true
```

Every public page in the shared project's enabled publications must now explicitly declare `shared: true` or `requires` in its own source frontmatter. An unclassified page fails the build with its source filename; it doesn't silently disappear. The check runs before customer feature and publication selection, so a later purchase or publication change can't expose a previously unchecked page. Drafts and pages outside the shared project's enabled publications don't need classification for that build.

For common instructions, add this page-level declaration:

```yaml title="Shared page frontmatter (fragment)"
shared: true
```

For a product-specific page, use `requires` as shown below. Don't combine `shared: true` and `requires` on the same page. `shared: false` is invalid. `shared` must stay page-specific and can't appear in frontmatter defaults or enforced settings. Inherited feature requirements still restrict content, but don't satisfy strict classification: each page needs its own declaration.

To migrate, enable the policy locally and classify the pages named in build errors after reviewing their content. Put the declaration in page templates to make the choice part of creating a page; avoid marking an entire collection shared without reviewing it.

This policy catches missing declarations. It can't tell whether a declaration is correct or detect an ungated product-specific paragraph inside a shared page. It doesn't authenticate readers; the deployment still controls access to the resulting edition.

### Restrict a feature-specific page

Add a requirement to each page that depends on specific functionality. This integration guide needs both features:

```yaml title="Integration guide frontmatter (fragment)"
requires:
  allOf: [analytics, connectors]
```

Use `anyOf` when either feature is sufficient. If a requirement contains both clauses, both must pass. When the resolved requirements don't match the profile's grants, the whole page is omitted.

### Restrict part of a shared page

A page classified `shared: true` can still contain product-specific sections. Use `<ForFeature>` around each section that depends on features. Its attributes contain whitespace-separated feature IDs:

```mdx
These setup instructions apply to every customer.

<ForFeature allOf="analytics connectors">

## Connect your reports <Anchor id="connect-reports" />

Import a dataset through a connector, then select it in your analytics report.

</ForFeature>

These troubleshooting tips apply to every customer.
```

The page's content outside `<ForFeature>` stays shared. A block appears only when its requirements match; excluding a block doesn't exclude the rest of the page. If a page-level requirement excludes the whole page, a matching block inside it can't restore that page.

Excluded blocks contribute no text, links, snippet expansions, API embeds, or images to the edition. Put links to optional pages inside matching conditions. A link remaining in selected prose must point to a selected destination.

### Classify generated API references

Generated pages take an explicit classification from their API definition or OpenAPI operation. For an API whose generated references are shared, add `shared: true` beside `generateReferences`:

```yaml title="Shared API definition (fragment)"
apis:
  example:
    shared: true
    source:
      kind: file
      path: ./openapi.yaml
      focused: true
    generateReferences: true
```

For a feature-specific API, use `requires` instead of `shared`. An individual OpenAPI operation can declare `x-shoalrun-shared: true` or `x-shoalrun-requires: { allOf: [analytics] }`. Its declaration satisfies classification for that generated page; API-level feature requirements still apply. Operations with differing requirements need their own declarations. General frontmatter defaults don't satisfy generated-page classification. Authored API reference pages follow the ordinary page rule.
