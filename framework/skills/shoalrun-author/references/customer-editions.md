# Author customer documentation editions

Use this workflow when a project selects documentation by purchased products or
features, including grandfathered access and deployment-owned branding. Keep
commercial selection in profiles and feature IDs in authored content.

## Establish the edition context

Check the installed CLI's `shoalrun --help` and `shoalrun docs --help` for `--profile`
before using this workflow. Deployment profiles require `0.1.0-alpha.15` or later with this capability.
Do not silently upgrade the project's pinned package. The package's
`DEPLOYMENT-PROFILES.md` is the configuration reference; use
`docs read guide.deployment-profiles` when that guide exists in the bundled
snapshot. Do not assume a newly implemented feature is in an older snapshot.

Read the existing shared `profiles` configuration and SKU manifest. Preserve
immutable SKU revisions; use the purchase's explicit revision rather than
substituting today's bundle. SKU grants and direct `features` are additive.
Grandfathered features need no SKU. `deprecated` and `retired` labels do not
revoke grants, and feature grants do not select older documentation versions.

Use the one profile path supplied for the deployment. Keep real customer profiles,
branding, reports, and captured snapshots outside public source control and served
output. Do not introduce a central customer registry or scan adjacent deployments.
If the profile is unavailable, continue shared-source work and report which edition
checks remain unverified; do not fabricate real purchases or remove `required`.

For a new synthetic example, these are complete selection inputs:

```yaml
# Shared sku-manifest.yaml, beside docs.config.yaml
schemaVersion: 1
features:
  analytics: {}
  reports.classic: {lifecycle: deprecated}
skus:
  professional:
    revisions:
      "2026-10": {features: [analytics]}
```

```yaml
# Shared docs.config.yaml fragment; retain the project's other settings
profiles:
  manifest: ./sku-manifest.yaml
  required: true
  pruneNavigation: true
  requireClassification: true
```

```yaml
# Deployment-owned profile outside the shared repository
schemaVersion: 1
skus:
  - {id: professional, revision: "2026-10"}
features: [reports.classic]
```

Direct-only profiles can omit `skus`; `features: []` with no SKU grants selects
shared content only. Missing required input, unknown IDs/revisions, and `null`
grant lists fail rather than falling back to another edition. Profile paths resolve
from the invocation directory; declared logo/favicon paths resolve from the profile
directory and must remain inside it. Branding uses bounded existing `site`, `theme`,
and snippet `variables` settings, not arbitrary config merges. Profiles cannot
replace content sources, plugins, access policy, or navigation labels.

## Choose page and section requirements

In normal mode, a page with no authored or inherited `requires` is shared after
ordinary publishing rules. Do not infer requirements from folders, product tags,
SKU names, or navigation labels.

With `profiles.requireClassification: true`, each public source page in the shared
enabled publications must explicitly declare either `shared: true` or `requires`.
The check precedes customer feature/publication selection. Drafts and disabled
shared publications do not need classification for that build. Inherited
requirements still restrict a page but do not satisfy classification. `shared`
cannot appear in defaults/enforced settings; `shared: false` and combining
`shared: true` with page requirements are invalid. Review unclassified pages
named in errors; do not automatically mark them shared or disable the policy.

```yaml
# Shared page frontmatter fragment
shared: true
```

```yaml
# Feature-specific page frontmatter fragment
requires:
  allOf: [analytics]
```

Requirements name feature IDs, not SKUs. Use `allOf` when every feature is needed
and `anyOf` when one suffices; if both clauses appear, both must pass. Lists are
nonempty. Unmet page requirements omit the whole page.

A shared page may contain product-specific sections:

```mdx
These setup instructions apply to every customer.

<ForFeature allOf="analytics">

## Configure Analytics

Instructions for customers with Analytics.

</ForFeature>

These troubleshooting tips apply to every customer.
```

`ForFeature` is a block with literal whitespace-separated `allOf`/`anyOf` feature
IDs. Excluded blocks contribute no text, links, snippets, API embeds, or images.
Put links to optional pages inside matching conditions. A matching inner block
cannot restore an excluded page. Ungated text on shared pages remains shared:
classification catches missing metadata, not incorrect decisions or paragraphs.

Generated API references accept explicit `shared: true` or `requires` on the API
definition beside `generateReferences`, or `x-shoalrun-shared: true` /
`x-shoalrun-requires: {allOf: [analytics]}` on an OpenAPI operation. API-level
requirements still apply. Classify differing operations individually; ordinary
frontmatter defaults do not satisfy generated classification. Authored API pages
follow the source-page rule. Profile builds require focused operation contracts;
full raw-source publication and standalone schema embeds are unsupported.

## Validate the selected edition

Capture the baseline before editing and pass the same explicit profile during
validation, build, and export. From the project directory:

```sh
shoalrun docs baseline --config docs.config.yaml \
  --out .shoalrun/edition-before.json --profile /run/config/docs-profile.yaml

# Edit source, then validate with the selected deployment context.
shoalrun docs validate --config docs.config.yaml \
  --baseline .shoalrun/edition-before.json --profile /run/config/docs-profile.yaml

shoalrun build docs.config.yaml edition-dist --profile /run/config/docs-profile.yaml
shoalrun export docs.config.yaml --out edition-content \
  --profile /run/config/docs-profile.yaml
```

Use explicit `--file`/`--id` selectors if no baseline exists. Apply the authoring
skill's applicable project checks, review, preview, and freshness workflow to the
returned report. Snapshot capture includes the external profile and its declared
assets; changing them invalidates the evidence. Export still needs its normal
publication selection when multiple combinations are enabled. `dev` and
checked-plan authoring do not resolve deployment editions; use build/serve or
snapshot validation/preview. Preview URLs and artifacts may contain customer data.

Check both included and excluded content in HTML, Markdown, search/discovery,
focused API contracts, and exports. Use synthetic no-grant, relevant single-feature,
and combined-feature profiles when changing shared selection logic; do not invent
customer records. Confirm unclassified content fails in strict mode, shared prose
remains, and excluded markers/assets are absent from output files. Selected prose
links must resolve; known excluded navigation entries prune only when configured.
The private `.shoalrun/profile-selection.json` receipt is not a public artifact.

Read coverage: pages excluded by the profile have not had their rendered content
checked. Validate a context that includes changed gated content before claiming
it is verified. Reports establish selection and validation, not authentication;
the deployment controls customer access to each resulting edition.
