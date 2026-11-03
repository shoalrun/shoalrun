# Deployment-specific documentation

Build separate documentation editions from one content project. Each deployment
supplies its own profile file; profiles do not need to live together or belong in
the shared repository. A profile selects purchased SKU revisions, additional
features, branding, and documentation versions.

All names and domains below are fictional. Keep actual customer profiles and
branding in their deployment environments.

## Define products in the shared project

Add a `profiles` section to `docs.config.yaml`:

```yaml
profiles:
  manifest: ./sku-manifest.yaml
  required: true
  pruneNavigation: true
```

`manifest` resolves relative to the configuration file declaring it. `required`
defaults to `true`; builds must explicitly supply a profile. `pruneNavigation`
defaults to `false`. Enable it to remove navigation targets known to be excluded
and collapse empty groups. Unknown targets still fail validation.

Define stable feature IDs and explicitly versioned SKU mappings:

```yaml
# sku-manifest.yaml
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

Keep historical revisions unchanged when packaging changes. The compiler cannot
reconstruct an old purchase from today's catalog or enforce that past revisions
were never edited. Retain the manifest revision used for each deployment.

Feature definitions accept optional `description` and `lifecycle` (`active`,
`deprecated`, or `retired`). Lifecycle labels do not grant or remove features.

## Supply one profile per deployment

The deployment can mount or generate this file outside the documentation repo:

```yaml
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

SKU features and explicit `features` form an additive set. An explicit feature
needs no SKU: use it for standalone purchases or grandfathered functionality.
Duplicate grants are harmless. To build only shared content, supply `features: []`
with no SKU grants. Missing input never falls back to granting every feature.
Unknown features, SKUs, and SKU revisions fail the build. Use an empty list rather
than `null`; malformed grant lists are rejected.

Publication selection is optional and must be a nonempty subset of the shared
project's `publications.enabled`. Use existing versions for older instructions.
A grandfathered feature does not automatically enable old-version content.

```sh
shoalrun build docs.config.yaml site-dist --profile /run/config/docs-profile.yaml
shoalrun export docs.config.yaml --out content-dist --profile /run/config/docs-profile.yaml
```

Exports with multiple enabled publications still need their normal explicit
publication selection. Each deployment should use its own output directory.

The CLI profile path resolves from the current working directory. Profile logo
and favicon paths resolve from the profile's directory and must stay inside it.
Only explicitly declared assets are read; Shoalrun does not discover other
profiles in the directory. Shared configuration paths keep their existing origins.

Profiles accept these settings:

| Setting | Supported values |
| --- | --- |
| `schemaVersion` | Required; `1`. |
| `skus` | List of explicit `{ id, revision }` pairs. |
| `features` | List of directly granted feature IDs. Declare this or `skus`, even when empty. |
| `site` | `title`, `origin`, `basePath`, `logo`, `favicon`, `header`, `footer`, `indexing`. |
| `theme` | `preset`, a built-in `palette` name, `mode`, `toggle`. |
| `variables` | Project-level string, number, or boolean values for existing typed snippets. |
| `publications` | An `enabled` subset using existing publication coordinates. |

Settings use their ordinary Shoalrun shapes and validation. A profile is not a
general configuration overlay: it cannot change content sources, register plugins,
replace the SKU catalog, change access policy, or inherit another profile.
Profile-level CSS, custom fonts, and file-backed palettes are not supported.
Existing snippet variable precedence and snippet-only `<Var>` placement remain
unchanged; profile variables are not immutable branding tokens.

`site.logo` accepts a local SVG or PNG, also in ordinary shared config. The masthead
keeps the site title as its accessible label and displays the logo alongside it.

## Select pages and sections

By default, you do not need to mark every page. Pages declare feature requirements, not SKU
IDs. A page with no `requires`, either authored or inherited from frontmatter
defaults, is shared across customer editions. Common setup and introductions can
remain unmarked.

Shared pages still need to pass access, publication, language, and facet rules.
Draft pages stay excluded from ordinary builds; older instructions need their
publication enabled.

After those rules pass, feature selection follows this table. Grants may come
from SKUs or direct entries:

| Page requirements | No granted features | Analytics only | Analytics and Connectors |
| --- | --- | --- | --- |
| No authored or inherited requirements | Included | Included | Included |
| `allOf: [analytics]` | Omitted | Included | Included |
| `allOf: [analytics, connectors]` | Omitted | Omitted | Included |
| `anyOf: [analytics, connectors]` | Omitted | Included | Included |

Forgetting a requirement makes a feature-specific page shared. Shoalrun does not
infer requirements from folders, titles, product metadata, or navigation labels.
Enable `profiles.requireClassification: true` to require a deliberate
classification on each publishable source page.

### Require explicit classification

For customer deployments that should reject unclassified content, add
`requireClassification: true` to the shared `profiles` configuration. It defaults
to `false`, preserving shared-by-default behavior in existing projects.

```yaml
profiles:
  manifest: ./sku-manifest.yaml
  required: true
  pruneNavigation: true
  requireClassification: true
```

Each public page in the shared project's enabled publications must explicitly
write `shared: true` or `requires` in its source frontmatter. Missing classification
fails with the source filename before customer feature or publication selection.
Drafts and pages outside the shared enabled publications do not need classification
for that build. A later SKU or publication selection cannot bypass this check.
Builds, exports, and isolated authoring validation use the same policy.

```yaml
# Shared page frontmatter fragment
shared: true
```

Do not combine `shared: true` and `requires` on one page; `shared: false` is invalid.
`shared` cannot appear in frontmatter defaults or enforced settings. Inherited
feature requirements still restrict content, but do not satisfy classification.
Review pages reported by build errors rather than automatically marking them all
shared. Templates can write the chosen classification into each new page.

This catches missing declarations, not incorrect choices or ungated paragraphs
inside a shared page. Classification is a publishing policy, not authentication.

### Restrict a whole page or section

Restrict a feature-specific page in its frontmatter:

```yaml
requires:
  allOf: [analytics, connectors]
```

Use `anyOf` for alternatives. If both clauses appear, both must pass. Clauses must
be nonempty lists of declared feature IDs. A page whose resolved requirements do
not match the profile is omitted. Requirements combine with existing access,
publication, and facet selection; they cannot widen those rules.

For part of a shared page, including one marked `shared: true`:

```mdx
<ForFeature allOf="analytics connectors">

## Connect your reports <Anchor id="connect-reports" />

Instructions requiring both features.

</ForFeature>
```

`allOf` and `anyOf` attributes contain whitespace-separated IDs. Conditions are
validated before rendering. Excluded branches contribute no links, snippets,
API embeds, images, or text to the output. Explicit root section anchors remain
stable when adjacent conditional content disappears. Conditions also work in
snippets and named snippet exports.

Text outside `<ForFeature>` stays shared. Excluding a block leaves the rest of
the page in the edition. A matching block cannot restore a page excluded by its
page-level requirements. With `features: []` and no SKU grants, eligible shared
pages and text remain while feature-dependent pages and blocks are omitted.

Links remaining in prose must target selected content. Shoalrun reports excluded
document targets as errors instead of deleting the links. Put the surrounding
paragraph in an appropriate condition, or link a shared overview. A migration
overview can use `anyOf: [reports.classic, reports.next]` when either audience needs
it. Replacement and migration references must still resolve in their publication.

`site.contentFilter` retains its existing relevance-filter behavior. Browser reader
filters only change visibility; use requirements for build-time exclusion.

### Classify generated API pages

Strict mode accepts an explicit `shared: true` or `requires` on the API definition
beside `generateReferences`. An OpenAPI operation can instead declare
`x-shoalrun-shared: true` or `x-shoalrun-requires: {allOf: [analytics]}`.
API-level feature requirements still restrict every operation. Do not combine
shared and requirements on the same declaration. General frontmatter defaults
do not count; classify operations individually when their requirements differ.
Authored API reference pages follow the ordinary source-page rule.

## Validate the deployment edition

Use the same profile when recording a baseline and validating:

```sh
shoalrun docs baseline --out .shoalrun/baseline.json --profile /run/config/docs-profile.yaml
shoalrun docs validate --baseline .shoalrun/baseline.json --profile /run/config/docs-profile.yaml
```

Explicit `--file` and `--id` validation also accept `--profile`. Project inspection
and source reads accept it too. Review and preview use the resulting report as
usual and serve the captured edition. Profiles and declared branding files are
captured into bounded private validation artifacts even when mounted outside the
project. Other deployment files are not scanned. Symlink substitutions of
captured branding inputs invalidate validation and cannot enter a later snapshot. Profile, asset, and catalog edits
make prior validation stale. Excluded affected pages remain listed in coverage with
a warning that their rendered content was not checked; validate another profile
that includes them before accepting their content changes. Treat validation reports and artifact directories as
private; they contain selected customer inputs.

A successful normal site build writes `.shoalrun/profile-selection.json` with
resolved features, grant sources, and page/section decisions. The compile/export
APIs also return `profileSelection` to their caller. These reports are local build
information, not served metadata. The report describes a build candidate; match
its `buildId` to the output before treating it as a receipt for that output. A
report write failure leaves the previous website intact. Public outputs omit the profile and branding
source filenames; the intended branding is present in the website.

## API and hosting boundaries

Generated OpenAPI operations can declare `x-shoalrun-requires` with the same
`allOf`/`anyOf` shape. API definitions and explicit operation bindings also accept
`requires`. An authored reference page's requirements remain effective when
automatic reference generation is enabled. Generated reference pages also respect
requirements inherited through frontmatter defaults.

Profiled builds reject full OpenAPI source publication, because hiding reference
pages does not remove operations from that source. Use `source.publish: false`
and `source.focused: true` for focused operation downloads. Operation embeds
respect selection. Standalone `<ApiSchema api="..." schema="..." />` embeds are
not supported in profiled builds; use an eligible operation embed instead.

Static `vercel build --profile FILE` is supported. Profiled chat-function builds
are not supported. Other commands without a profile option, including `dev` and
checked-plan authoring, do not yet resolve deployment editions; use build/serve
or captured validation/preview.

Shoalrun does not fetch billing records, infer contract terms, expire grants, or
authenticate customers. The deployment supplies the declared edition and the
host controls who can retrieve it. Reuse an artifact only when all inputs,
including branding, origin, publication selection, and grants, are identical.
