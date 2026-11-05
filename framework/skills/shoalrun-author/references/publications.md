# Author independent product publications

Use this reference when a project gives products independent releases, shares
pages across products, or delivers documentation for a selected product release.
Product catalogs and product-aware commands require `0.1.0-alpha.18` or later.
Check the installed version and command help; don't silently upgrade a pin.
Read `guide.publications` and `reference.config-publishing` when the bundled
snapshot contains them. The package's `README.md` and `AUTHORING.md` describe
newer behavior when that snapshot is older.

## Preserve publication identity

Inspect `publications.products` before treating `frontmatter.product` as a facet.
With a catalog, a publication includes product, channel, version, and language.
Each product has its own versions, default version, and route prefix. An omitted
product version uses that product's default unless matching
`publications.defaults.product` and `version` override it. Don't borrow another
product's release or a global frontmatter version. Without a catalog, existing product
metadata and productless publication identities retain their meaning.

Set `product`, `channel`, and `version` for one page variant, or list complete
coordinates in `publications` to share one source. Don't combine those two forms.
Keep language at page level. `shared: true` classifies customer feature eligibility;
it doesn't copy a page into other products. Use `<ForPublication product="...">`
for publication-specific content and `<ForFeature>` for purchased features.

Ordinary links, navigation, search, and reads stay in the selected publication.
Name the destination product and version on a deliberate cross-product `DocLink`.
Retain all coordinates from search results when reading repeated stable page IDs.
For a built site, supply `--site OUTPUT --product ID --channel CHANNEL --version
VERSION --language LANGUAGE` to scoped docs reads. MCP `get_publications` is a
bounded discovery tool: follow `nextOffset` rather than fetching page inventories.
A hosted endpoint still exposes only its configured publication.

## Preview and delivery

For customer editions, read [customer-editions.md](customer-editions.md). A profile
selects product releases separately from feature grants. On supported releases,
`shoalrun dev docs.config.yaml edition-dist --profile /path/to/profile.yaml`
builds, serves, and watches that selection. Reader views and the publication
dropdown aren't feature gates. Check included and excluded content in HTML,
Markdown, search, and exports using the same profile.

Product-aware content manifests and REST envelopes use schema v2; productless
exports retain v1. The HTTP path remains `/content/v1`. Preserve exact product
coordinates and use a compatible client; don't rewrite legacy resource keys or
silently fall back to another product. Read `guide.content-export` and
`reference.content-manifest` before changing an application consumer.
