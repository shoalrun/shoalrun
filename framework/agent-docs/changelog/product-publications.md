---
id: change.product-publications
title: Independent product versions and customer previews
summary: Publish independent product releases together and preview each
  customer's selected edition while editing.
type: changelog-entry
area:
  - publishing
  - discovery
  - project
subarea:
  - publishing-versions
  - discovery-agents
  - project-releases
canonical: /changelog/product-publications
date: 2026-11-04
releaseVersion: 0.1.0-alpha.18
---

# Independent product versions and customer previews

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Project](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project](https://www.shoalrun.com/status.md) > Changelog > alpha.18: Product versions

**Published: 2026-11-04.**

**Version: 0.1.0-alpha.18.**

Alpha.18 lets each product keep its own documentation releases. For example, a company with two products could publish v3 of one and v1 of the other. Each customer edition can select the versions that customer uses. You can preview either customer edition while editing, without separately rebuilding and starting a server after each change.

Upgrade to CLI `0.1.0-alpha.18`, rebuild the site and content exports, and deploy the reviewed output. Existing deployments keep their current behavior until replaced. Ordinary builds don't automatically call embedding or answer-generation providers; regenerate those assets separately when their inputs change.

Page availability can now appear as “Since” and “Through” labels beside the page dates, using the existing release-version style. Use `availability` frontmatter for page-wide support and inline badges for newer options within an older guide. Both boundaries are inclusive, and Markdown and document manifests retain the information. See [page metadata](https://www.shoalrun.com/author/frontmatter-reference.md).

## Publish product releases independently

Declare each product's versions, default version, and route prefix in `publications.products`. Add product coordinates to enabled publications, page memberships, API sources, and customer profile selections. Product identity stays with links, navigation, search, and agent reads. A version in one product doesn't select a similarly named version in another.

This is an opt-in migration. Without a product catalog, existing productless routes and identities stay unchanged, and `frontmatter.product` remains metadata or a reader facet. With a catalog, review those values as publication IDs and add redirects for moved URLs. See [Share pages across products and versions](https://www.shoalrun.com/publish/publications.md).

Customer profiles select releases separately from feature grants. Existing page-level `requires` and section-level `<ForFeature>` continue to remove excluded content during compilation. `shared: true` classifies feature eligibility; explicit publication memberships determine where a shared page appears.

## Preview the customer edition as you edit

Run `npx --no-install shoalrun dev docs.config.yaml dist/customer --profile /run/config/customer.yaml`. The server watches the chosen profile, SKU manifest, content, and declared branding assets, including external inputs. Successful changes replace the selected edition. Failed rebuilds keep the last successful output and display an error; correcting the declared input triggers recovery.

The preview identifies the profile and successful build. When a successful edition change removes the open page, the browser moves to a published landing page. See [Build customer documentation editions](https://www.shoalrun.com/publish/deployment-profiles.md) for profile selection and preview commands.

## HTML, Markdown, and agents

Sites with product catalogs show a native publication dropdown in HTML, grouped by product, with language labels hidden when only one language is available. It supports the browser's keyboard interaction. JavaScript handles selection changes; ordinary links remain available without JavaScript. Markdown contains the selected publication's instructions and links without the dropdown.

Agents can enumerate publications through paginated MCP `get_publications`, then retain product coordinates in scoped searches and reads. Discovery indexes keep their configured output bounds. Product-aware content exports use v2 contracts without changing resource representation paths. Productless exports retain v1 contracts. See [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) and [Export content into your application](https://www.shoalrun.com/publish/content-export.md).

The release also keeps a published OpenAPI source shared across documentation languages and preserves the selected language in API authoring. Answer-card generation accepts explicit publication selectors so a multi-product site doesn't silently choose another edition.

For the complete capability overview, see [Shoalrun features](https://www.shoalrun.com/features.md).
