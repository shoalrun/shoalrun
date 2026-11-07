---
id: change.code-api-references
title: Shoalrun 1.0 — SDK references and smoother font loading
summary: Generate code API references from source and docstrings, choose how
  readers browse them, and load custom fonts earlier.
type: changelog-entry
area:
  - api
  - appearance
  - project
subarea:
  - api-generation
  - appearance-themes
  - project-releases
canonical: /changelog/code-api-references
date: 2026-11-06
releaseVersion: 1.0.0
---

# Shoalrun 1.0 — SDK references and smoother font loading

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Project](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project](https://www.shoalrun.com/status.md) > Changelog > 1.0: SDK references and font loading

**Published: 2026-11-06.**

**Version: 1.0.0.**

Upgrade to CLI `1.0.0` and rebuild to apply these changes. Regenerate a code-reference snapshot whenever its source or docstrings change.

## [Generate SDK references](https://www.shoalrun.com/api-docs/code-references.md)

Turn Python source and docstrings into native reference pages with declarations, linked types, field defaults, parameters, and examples. Other languages can bring a converter using the same JSON format. Choose separate symbol pages, inline class or module references, and an optional complete reference on one page. Publication and customer-profile selection apply to every layout; HTML, Markdown, content delivery, and PDF workflows retain the selected content.

## [Load custom fonts earlier](https://www.shoalrun.com/styling/themes.md)

Local custom body and heading fonts get preload hints and versioned asset URLs for caching. Bundled fonts revalidate instead of remaining stale in a development browser.

## Stable npm release channel

Shoalrun 1.0 uses npm's `latest` channel. Publication verifies distribution tags separately from the upload, so interrupted tagging can resume without uploading the same version again. Future prereleases keep a stable `latest` in place.
