---
id: guide.manni
title: Use Manni with Shoalrun
summary: Use Manni in your documentation project.
type: how-to
area: publishing
subarea: publishing-builds
canonical: /publish/manni
---

# Use Manni with Shoalrun

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Use Manni with Shoalrun

**Updated: 2026-10-25.**

Parent page: [Full Markdown page](/publish/manni.md)

[Manni](https://hawkeyexl.github.io/manni/) is a toolkit for managing and checking documentation. It can validate, query, and help fill page information; manage terminology; track connections between explanations and source code; and build knowledge graphs. It also provides tools for testing documentation and running evaluations.

This guide focuses on its checking tools. You choose the rules, and Manni reports pages that break them. For example:

- A page is missing its title or description.
- A tutorial gives instructions but never tells readers how to check that they worked.
- A page refers to a glossary term that no longer exists.
- Code has changed underneath an explanation, so the explanation needs another look.

Shoalrun builds and delivers your docs. Here, we use Manni to add checks before publishing, while its other tools remain available through the same command. You can use either tool without the other.

This guide shows how to run Manni in a Shoalrun project and add a check to `shoalrun audit`. That command runs the checks you configure and reports whether they passed. Start with one useful rule, then add more when you need them. For a working example, see [how we use Manni on this site](https://www.shoalrun.com/publish/manni.md#how-this-site-uses-manni).

Manni's [documentation site](https://hawkeyexl.github.io/manni/) describes its available tools and rules. Your choices go in `manni.config.yaml`; you do not need a separate Shoalrun setting for each Manni feature.

## Check the result

With the core schema selected, a page with `title` and `description` passes those required-field checks. A temporary draft missing `description` should fail with a diagnostic naming the field. Restore the description or remove the fixture after checking the failure path. Metadata validation does not rewrite source files.
