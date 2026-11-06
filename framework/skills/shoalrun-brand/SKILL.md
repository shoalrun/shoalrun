---
name: shoalrun-brand
description: Apply a visual brand to a Shoalrun documentation site or local demo using theme settings, fonts, logos, and scoped CSS. Use for matching a supplied website or brand guide, or refining an existing site's visual identity.
---

# Brand a documentation site

Inspect the target project's configuration, styles, assets, installed package version, and applicable project instructions. Preserve documentation, routes, navigation, publication selection, and existing edits. For a separate demo, copy source into a new directory and keep its build output separate. Visual branding doesn't establish product facts; retain sample-content labels and don't invent product capabilities or release histories.

## Establish the brand

Use the supplied website, assets, or brand guide as evidence. Inspect the rendered reference when browser access is available; stylesheets and font declarations can identify exact values. Record the relevant source URLs or file paths with the project, along with colors, font roles and weights, logo variants, spacing, shapes, and intended color modes. Distinguish observed values from approximations. If the reference is unavailable, work from supplied evidence and identify what couldn't be verified.

Keep brand-specific values and assets in the customer project. Use available logo and font files with suitable usage rights; preserve notices. Don't copy a reference site's tracking scripts or application bundle into the documentation site.

Before editing an existing project, capture a baseline with `shoalrun docs baseline --config docs.config.yaml --out .shoalrun/brand-before.json`. For a customer edition, use the same explicit `--profile FILE` throughout baseline, validation, build, and preview. Read the installed edition guidance before changing profile-owned branding.

## Apply supported configuration first

Use the installed CLI's bundled references before choosing unfamiliar keys:

```sh
shoalrun docs read reference.config-site
shoalrun docs read guide.themes
shoalrun docs read guide.palettes
shoalrun docs read guide.css
```

Set site identity, logo, favicon, and header links through supported `site` settings. Choose the closest `theme.preset`; use `theme.palette` for checked color pairs, `theme.mode` for the requested color behavior, and `theme.fonts` for local body, heading, and code fonts. Declare static font weights accurately and retain fallback families. Keep source and asset paths relative to the configuration that declares them.

Use `site.customCss` for remaining visual changes. Prefer documented tokens for broad adjustments and verified generated selectors for specific regions. Project CSS loads after generated styles. Relative CSS images and imports aren't copied automatically; use the documented asset mechanism or site-root URLs for assets that are actually served.

## Keep each surface readable

A dark header can contain light inputs and result panels. Scope foreground and background tokens together for each surface; don't let header text colors leak into inputs, option lists, buttons, or search results. Inspect actual markup and computed styles before choosing selectors. Search selection can be expressed on a result's parent element rather than its link.

Check these states where present:

- Header links and buttons: normal, hover, focus, and active.
- Search: typed text, placeholder, shortcut key, results, summaries, matched terms, empty state, hover, and keyboard selection.
- Publication and product selectors: label, selected value, open options, and focus ring.
- Navigation, cards, callouts, tables, and code: text, fills, borders, and links.

Check every requested color mode. Normal text needs at least 4.5:1 contrast; large text needs 3:1. Required control boundaries and state indicators need 3:1 against adjacent colors. Keep keyboard focus visible. The compiler checks configured palette pairs, but custom CSS and inherited interaction states need separate verification.

## Validate and preview

For branded PDF output, read the [PDF skill](../shoalrun-pdf/SKILL.md). Configure print styling separately from website styling, retain the intended publication/profile selection, and inspect actual rendered PDF pages. A passing HTML build doesn't verify PDF appearance.

Validate against the baseline with `shoalrun docs validate --baseline .shoalrun/brand-before.json --config docs.config.yaml`, including the selected profile when applicable. Read the report's findings and coverage. Reuse its captured output with `shoalrun docs preview REPORT --port 0`, or follow the project's required build workflow and serve that output. Rebuild when styles, configuration, or assets change.

Inspect a landing page and a representative article at desktop and mobile widths. Check font and image loading, overflow, keyboard navigation, dropdown destinations, and search interactions. Confirm HTML navigation and Markdown twins retain the documentation's meaning. A successful build doesn't establish visual correctness; state any browser checks that couldn't run.

Present the preview URL, changed files, verified states, and unresolved approximations. Keep the review concise and link to detailed evidence when needed. Follow the user's authorization for commits and publication.
