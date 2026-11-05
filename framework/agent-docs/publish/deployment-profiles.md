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

Build a documentation edition for individual customers from one shared content project. Keep product definitions in the shared repository and supply each customer's purchases, additional features, and branding through that deployment's own profile file. Customer profiles don't need to share a repository with the content.

By default, you don't need to mark every page. Pages without feature requirements are shared across customer editions. For customer deployments that need a deliberate decision on each page, enable explicit classification. In either mode, add requirements to pages or sections that depend on specific features.

## Before you begin

Start with a [configured documentation project](https://www.shoalrun.com/configuration.md), its authored pages, and CLI `0.1.0-alpha.15` or later. Your deployment must be able to supply one local profile file and any declared branding assets. The fictional names and products below illustrate the format; replace them with your own catalog.

A stock keeping unit (SKU) identifies a product or bundle you sell. A feature ID identifies functionality that documentation describes. A SKU revision grants a set of features; a profile can also grant features directly for standalone purchases or grandfathered agreements.

## Define the shared SKU manifest

Create `sku-manifest.yaml` beside `docs.config.yaml`:

```yaml title="sku-manifest.yaml"
schemaVersion: 1
features:
  analytics: { description: Analytics reports }
  connectors: { description: External data connectors }
  reports.classic: { lifecycle: deprecated }
skus:
  professional:
    revisions:
      "2025-04":
        features: [analytics, reports.classic]
      "2026-10":
        features: [analytics, connectors]
```

Retain historical revisions unchanged when packaging changes. An existing customer can continue using the original revision, or receive an explicit feature grant. Marking a feature `deprecated` or `retired` doesn't remove its documentation grant.

Enable profile selection in the shared configuration:

```yaml title="docs.config.yaml (fragment)"
profiles:
  manifest: ./sku-manifest.yaml
  required: true
  pruneNavigation: true
```

`required` defaults to `true`. A missing profile fails the build. `pruneNavigation` defaults to `false`; enabling it removes known excluded destinations and empty groups. Misspelled navigation targets remain errors.

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

## Supply the profile from the deployment

Mount or generate the customer profile outside the shared docs repository. For example, a deployment could provide `/run/config/docs-profile.yaml` and a `brand` directory beside it:

```yaml title="Deployment-owned docs-profile.yaml"
schemaVersion: 1
skus:
  - { id: professional, revision: "2026-10" }
features:
  - reports.classic
site:
  title: Example Partner documentation
  origin: https://docs.partner.example
  logo: ./brand/logo.svg
  favicon: ./brand/icon.png
theme:
  palette: kelp
publications:
  enabled:
    - { channel: production, version: current, language: en }
```

This profile grants Analytics and Connectors through the SKU, plus Classic Reports through a direct grant. A customer with only grandfathered functionality can omit `skus` and declare `features: [reports.classic]`. No synthetic SKU is needed.

SKU and direct grants combine into a set. Unknown IDs and revisions fail validation. Declare `features: []` with no SKU grants for a shared-content-only edition; `null` is invalid. That edition still includes eligible shared pages and text outside feature blocks, while pages and blocks requiring a feature are omitted. A missing required profile fails the build rather than selecting this shared-only behavior.

Profile logo and favicon paths resolve from the profile directory and must stay inside it. Shared configuration paths retain their own origins. Shoalrun reads the chosen profile and declared assets without discovering other customers' files in that deployment directory.

Profiles accept selected `site`, `theme`, and existing snippet `variables` settings. They can narrow `publications.enabled` to combinations already enabled by the shared project. They can't replace content sources, register plugins, change access policy, or override navigation. Profile CSS, custom fonts, and file-backed palettes aren't supported.

## Select each product release

Since 0.1.0-alpha.18

First declare the [independent product catalogs](https://www.shoalrun.com/publish/publications.md) and enabled product publications in the shared configuration. Then select the customer's exact combination in the profile:

```yaml title="Customer publication selection (profile fragment)"
publications:
  enabled:
    - { product: payments, channel: production, version: v3, language: en }
    - { product: reporting, channel: production, version: v1, language: en }
```

Another profile can select Payments v2 with Reporting v1. Selection must remain a nonempty subset of the shared project's enabled coordinates; it can't add an undeclared product or release. Product and version are part of publication identity, so `v1` in one product doesn't select another product's v1.

Feature grants and product releases answer different questions. Publication selection chooses which release's instructions to publish. SKU revisions and direct feature grants choose the functionality those instructions may describe. Selecting Payments v3 doesn't grant a feature, and granting a feature doesn't enable a Payments release. Shared pages need explicit publication memberships; `shared: true` doesn't copy them into every product.

## Build and inspect the edition

From the shared documentation project directory, build into a deployment-specific output:

```sh
npx --no-install shoalrun build docs.config.yaml dist/customer \
  --profile /run/config/docs-profile.yaml
```

To export application content, pass the same profile to `shoalrun export`:

```sh
npx --no-install shoalrun export docs.config.yaml --out dist/customer-content \
  --profile /run/config/docs-profile.yaml
```

If several publications are enabled, an export still needs its normal explicit publication selection. Grandfathered features and older instructions are independent: the feature grant selects functionality, while the [publication version](https://www.shoalrun.com/publish/publications.md) selects the release's instructions.

Use the profile when [validating documentation edits](https://www.shoalrun.com/author/workspace.md):

```sh
npx --no-install shoalrun docs baseline --config docs.config.yaml \
  --out .shoalrun/baseline.json --profile /run/config/docs-profile.yaml

# Edit your documentation, then validate the same edition.
npx --no-install shoalrun docs validate --config docs.config.yaml \
  --baseline .shoalrun/baseline.json --profile /run/config/docs-profile.yaml
```

Review and preview use the returned report. The snapshot captures the external profile and declared assets; later changes make the report stale. Treat reports and captured project directories as private build artifacts.

## Preview and edit a customer edition

Since 0.1.0-alpha.18

From the configured project directory, start a preview using the deployment's profile:

```sh
npx --no-install shoalrun dev docs.config.yaml dist/customer \
  --profile /run/config/docs-profile.yaml --port 8770
```

The development server compiles the selected edition and watches source files, the chosen profile, SKU manifest, and declared assets. A profile mounted outside the project is watched too. Changing its product releases or feature grants rebuilds the edition through the same selection rules as a static build. Use a separate output directory and port for another customer preview.

The preview banner identifies the selected profile, edition digest, and successful build. An invalid initial profile prevents startup. If an edit fails after startup, the server keeps the last successful output and shows a build-error banner. It doesn't switch to a shared edition. Fix the profile, manifest, or declared asset and save it to trigger recovery. A page removed by a successful edition change returns the browser to a published landing page.

On older releases, build with `--profile` and serve that selected output separately. Reader-view controls aren't a substitute: they change browser visibility, while the profile determines which files and instructions exist in the edition.

## Choose navigation labels

Navigation headings come from the shared project's ordinary navigation configuration. For example:

```yaml title="Shared navigation (fragment)"
navigation:
  - id: product-guides
    label: Product guides
    items:
      - { id: analytics, doc: guide.analytics }
      - { id: connectors, doc: guide.connectors }
```

`Product guides` is authored text. You can name this group `Your products`, `Reference`, or another label that suits your readers. The framework doesn't supply the words “Your products.” Profile selection removes ineligible destinations from the group; it doesn't rename the group or infer purchases from navigation labels.

## Check the result

Inspect the edition's sidebar, selected pages, and shared sections. Then inspect its Markdown, search indexes, `documents.json`, and exports for the same selections. An excluded feature's content should be absent from the output files, rather than hidden by browser controls.

A normal site build writes a private selection report at `.shoalrun/profile-selection.json`. It lists resolved features, grant sources, and inclusion decisions. Match its `buildId` to the output before treating it as a receipt for that output. The profile itself, its source filenames, and the report aren't served as public metadata.

Affected pages excluded from the selected profile remain listed in validation coverage with a warning that their rendered content wasn't checked. Validate another profile that includes those pages before accepting their content changes.

## HTML, Markdown, and agents

HTML displays the selected documentation with the deployment's title, logo, favicon, theme, and configured links. The masthead keeps the title as its accessible label. Markdown retains the selected instructions and links, without the site's branding controls. Feature selection happens during compilation and doesn't need browser JavaScript.

Agents reading search, discovery, or exported content receive the selected edition. They can't retrieve excluded instructions from that edition's Markdown twin. Existing browser reader views still affect visibility only; use feature requirements for build-time omission.

## Current limits

Profiled API builds reject full OpenAPI source publication. Set `source.publish: false` and `source.focused: true` for focused operation downloads. Generated operations can declare `x-shoalrun-requires`; API definitions and explicit bindings also accept `requires`. Generated references respect inherited frontmatter requirements.

Operation embeds respect the selection. Standalone `<ApiSchema api="..." schema="..." />` embeds aren't supported in profiled builds. Static `vercel build --profile FILE` is supported; profiled chat-function builds aren't.

Checked-plan authoring doesn't accept deployment profiles. Use captured validation and preview for that workflow. Profile-aware development is described in the preview workflow above. Your deployment supplies the declared purchases and grants; Shoalrun doesn't query billing systems or expire entitlements. Protect private editions through host authentication.

## Related reading

### Read first

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Understand how separate sites share authored content and configuration.

### Next steps

- [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) — Review the selected edition using captured HTML and Markdown. (Status: experimental.)

### Reference while working

- [Share pages across products and documentation versions](https://www.shoalrun.com/publish/publications.md) — Select older product instructions independently of feature grants.
