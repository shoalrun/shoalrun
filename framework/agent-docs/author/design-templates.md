---
id: guide.design-templates
title: Design templates
summary: Make repeatable page structures that help authors and agents serve readers.
type: explanation
area: authoring
subarea: authoring-templates
audiences:
  - authors
canonical: /author/design-templates
---

# Design templates

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Advanced workflows > Design templates

**Updated: 2026-10-26.**

A template defines the starting structure of a page. Use it for information that belongs in most pages of a particular kind. A writing guide explains how to write that information.

## Start with a reader need

Choose the page's purpose before choosing headings. A how-to helps a reader complete a task; a reference supports lookup; an explanation builds understanding; a tutorial teaches through a guided exercise. Keep distinct needs on separate pages when combining them makes either harder to use.

For an ingredient, define one reusable action, its inputs, and its success check. For a recipe, give the complete ordered procedure and recovery advice. A cookbook helps readers choose among recipes. These structures support reuse without making readers assemble their own instructions.

## Make prompts actionable

A useful placeholder asks for specific missing information: prerequisites, a tested command, expected output, or a recovery action. Avoid vague prompts such as “add useful details.” Tell the agent to flag missing evidence instead of filling gaps with plausible facts.

Keep required sections small. Make optional sections clearly optional, and provide a reviewed example outside the template. A copied example's technical details are not evidence for a different feature.

## Keep structure and checks separate

Shoalrun's [template overrides](https://www.shoalrun.com/author/templates.md) control scaffold text. They do not automatically change configured lint rules. Match the template to your page-type conventions and configure checks explicitly.

Review a template by drafting several real pages with it. Remove sections authors repeatedly leave empty, and add prompts where readers repeatedly lack information. Check both HTML and Markdown so essential instructions survive every representation.

## Related reading

### Reference while working

- [Templates](https://www.shoalrun.com/author/templates.md) — Configure project template overrides.

- [Design a writing guide](https://www.shoalrun.com/author/design-writing-guides.md) — Give agents editorial guidance alongside the page structure.
