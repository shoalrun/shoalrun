---
name: shoalrun-component-author
description: Create or repair Shoalrun component packages with shared documentation and optional browser enhancements. Use for content generation, attribute schemas, instance data, manifests, and component behavior checks.
---

# Author a Shoalrun component

Read project policy and `shoalrun docs read guide.custom-components` from the installed CLI. Distinguish using an existing component from developing its package. Page authors need the documented tag and attributes; component developers own the manifest, implementation, dependencies, and tests. Keep task-specific prose in MDX.

Start with the smallest content model that solves the request. Export `defineComponent({ attributes?, children?, content })` from `@shoalrun/cli/components`. The required synchronous `content()` function receives validated attributes and opaque authored children. Return the children, supported `content` helpers, or `{ content, data }`. Do not construct compiler nodes or add separate HTML/Markdown renderers. Shoalrun renders the same shared content into both formats; authors must review its adequacy.

Use helpers such as `paragraph`, `strong`, `link`, `table`, `code`, `group`, and `component`. Attribute schemas support string, boolean, and numeric literals with defaults and constraints. Quoted `"false"` overrides a boolean default. Children default to none, or can be optional/required. Inspect the installed API declarations for exact types.

A static JSON manifest declares `apiVersion: 1` and `components: { Name: { module, browser?, styles? } }`. Paths are relative to that manifest. Consumers register its local path or installed package export once in `components`. The framework compiles normal source imports, TypeScript, and browser JSX and tracks dependencies. Declare the package's own dependencies; do not ask consumers to wire internal assets or run a separate component bundler. Imported JSON supplies local build data. Styles are self-contained CSS. No remote plugins, arbitrary MDX imports, or build-time fetching are supported.

For browser behavior, return a JSON instance model together with the shared content. Export `enhance({ root, controls, content, data })` from the browser module, mount optional controls, and reveal them after mounting. Keep shared content intact. Read the model from `data`; never scrape table labels or other presentation markup. Import shared calculations/validation into both build and browser code. Component packages may use React; React is not a framework runtime dependency.

Inventory essential explanations, choices, warnings, code, links, and meaningful order. A calculator needs its rules, supported inputs, default worked result, and qualifications, rather than every possible numeric state. Test the component's own valid/invalid inputs, nested content when supported, calculations, complete shared output, keyboard behavior, and browser/no-JavaScript fallback. Framework registration, compiler, dependency-graph, and atomic-output conformance belong to Shoalrun's tests; do not reproduce that entire suite in each component project.

Configured modules are trusted code, including during isolated authoring validation. Browser modules have page-origin permissions. They are not sandboxed.

Provide a manifest, editable source, focused fixtures, a short usage example, and validation evidence. Use `shoalrun docs validate --config <config> --file <fixture>`, then `docs review <report> --format markdown` and `docs preview <report> --port 0`. Read status, coverage, findings and skipped checks. Review the same snapshot's HTML and Markdown for meaning. Share a local preview for author review; source edits make prior evidence stale. Publication follows the task's authorization.
