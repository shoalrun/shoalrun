---
id: guide.non-goals
title: Non-goals
summary: Scope limits for skill generation, agent orchestration, and reader-view
  authorization.
type: explanation
area: project
subarea: project-overview
canonical: /non-goals
---

# Non-goals

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Project](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project](https://www.shoalrun.com/status.md) > Project > Non-goals

**Updated: 2026-10-26.**

Shoalrun's scope includes publishing documentation that people and agents can discover and read. This page records capabilities we deliberately exclude and the reasoning behind those decisions.

## Shipping a skill builder with the tool

Shoalrun does not ship a non-interactive skill builder or automatically generate a reader-side skill for each site it builds.

Skills need a human expert to guide their creation and maintenance. That expert brings knowledge of the domain, decides which workflows are appropriate, tests the instructions against real tasks, and keeps them accurate as the product changes.

A non-interactive builder could produce something that looks complete and give users false confidence that they have “automatic agent skills.” Generating instructions alone does not establish that those instructions are useful, reliable, or kept current. We are not yet comfortable shipping a feature that implies that confidence.

Shoalrun's bundled authoring skills are maintained instructions for working with Shoalrun. Published sites receive Markdown pages and discovery files during the build. Teams that create their own skills remain responsible for expert guidance, review, evaluation, and maintenance.

## General agent orchestration

Shoalrun provides [authoring tools](https://www.shoalrun.com/author/agent-overview.md) for project discovery, documentation references, snapshot validation, and local review. The author's coding agent owns planning, evidence gathering, editing, its model, and execution permissions. General orchestration of arbitrary agents and tasks remains outside Shoalrun's scope.

The [evaluation task format and audit hook](https://www.shoalrun.com/publish/evals.md) let teams use their own agents to run tasks and record reviewed results against a build. Shoalrun checks the report; the team owns agent execution and grading.

## Using reader views for authorization

[Reader views](https://www.shoalrun.com/author/reader-views.md) shape navigation and visible sections. They do not protect content: published files and Markdown twins remain available. Using a reader's selected view as an authorization boundary is outside their purpose. Exclude nonpublic pages from a public build and use host-level authorization when private content must be protected.

## Related reading

### Reference while working

- [Bundled agent skills](https://www.shoalrun.com/reference/agent-skills.md) — See the maintained authoring skills that Shoalrun bundles.

### Related topics

- [Evaluate agent tasks against your docs](https://www.shoalrun.com/publish/evals.md) — Understand why agent execution remains outside Shoalrun.

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — See how published Markdown and discovery files help agents read a site.

- [Bundled agent skills](https://www.shoalrun.com/reference/agent-skills.md) — Understand why a non-interactive skill builder is outside the tool's scope.

- [Project status](https://www.shoalrun.com/status.md) — Distinguish deliberate scope limits from deferred features.
