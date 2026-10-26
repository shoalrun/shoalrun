---
name: shoalrun-author
description: Write or revise documentation in an existing Shoalrun project using the agent's own model, native file edits, and provider-free project, validation, and preview tools. Use for pages and their required navigation, relationships, API links, snippets, or project checks.
---

# Author Shoalrun documentation

Use normal working-tree file tools. Shoalrun supplies project discovery, canonical references, isolated validation and snapshot previews; your harness supplies planning, evidence gathering, writing and permissions. No additional authoring model key or replacement-file JSON is required. Preserve unrelated local edits and never hand-edit generated output.

## Discover the task and its policy

Find the project's `docs.config.yaml`. Start with `shoalrun docs project --section guidance --config <config>` and read applicable project/ancestor `AGENTS.md`, directives, writing guides and reviewed examples. Use `docs source <project-relative-file>` or native file reads. Inspect `--section findings` when discovery reports findings. Follow response cursors and verify source digests across paginated reads.

Discover relevant pages without requiring the author to choose one: `docs project --query "<topic>"`. Inspect configuration ownership, navigation, relationships and templates as needed. Project policy determines required companions; neither a page-only request nor a passing compiler check waives them. Resolve contradictory policy or missing facts with a precise author question while continuing independent work.

When `frontmatter.taxonomy` is configured, read its central area/subarea definitions and enforcement options before classifying pages. Use declared IDs and parent pairs, respect `required` and `requireExplicit`, and use arrays only for fields enabled in `multiple`. Update the vocabulary when the task requires a new category; preserve the project's enforcement settings. Read `guide.page-taxonomy` for the configuration contract.

Use `docs search "<topic>"` and `docs read <id>` to query the installed package’s bundled documentation. If a local `shoalrun docs mcp` connection is available, its read-only documentation tools access the same snapshot; use either interface. A configured remote MCP may serve different documentation. Skills provide workflow instructions separately from these reference lookups.

When reading a published site through Markdown, follow topic-index links when present; `llms.min.txt` need not list every page directly. Choose a relevant topic rather than downloading every index. Preserve publication and base-path scope, and follow the full-page fallback when a standalone section does not cover the task.

Read `reference.authoring-workspace` for tool contracts and `guide.authoring-workspace` for the working-tree procedure. Before unfamiliar syntax, check the relevant component attributes, configuration structure, or asset-handling contract instead of assuming another tool’s conventions. For MDX components, read their canonical reference; `<Step>` belongs inside `<Steps>` for an ordinary titled procedure, while your harness's task plan is separate. Read implementation/specification evidence with your harness's permitted tools; record the sources for changed claims. Bundled guidance does not establish a consumer project's facts.

## Record scope and edit

Before editing, capture the current state with `docs baseline --out <new-baseline> --config <config>`. Put baselines inside the project's excluded `.shoalrun` directory or outside the project. This includes earlier dirty/untracked files rather than comparing with Git HEAD. Retain the corresponding before-content/task diff with your harness; a baseline stores digests, not earlier text. For an existing rendering failure, reproduce its located finding before repairing it.

Edit ordinary source files and required companions. Choose a page type and reviewed example for the reader's goal. Preserve stable IDs, routes, original `date` and access policy; set `updated` to the actual edit date. For a new page, use `shoalrun scaffold <template> -n <target> --config <config>` and resolve its prompts. Keep it draft until reviewed; snapshot validation renders affected drafts without changing their publication metadata. API materialization and recipe tasks have focused references/skills when needed.

For release notes, lead with the reader-visible change and why it matters. Explain the previous and new behavior with a concrete example when useful, then state any upgrade action. Introduce unfamiliar terms before using them. Put implementation details and test counts after the explanation; they do not substitute for it. Distinguish measured improvements from expected benefits, and package publication from site deployment.

When adapting source material, choose components by reader purpose rather than translating unfamiliar markup into a generic container. Use authored `Fields` for client settings, source-backed `ApiSchema` or operation references for HTTP contracts, and `Steps` for procedures. Check field presence, nullability, defaults, constraints, warnings, and nested relationships against the source in both outputs. Keep configuration settings distinct from API request fields, and prefer source-backed contract data to a second handwritten copy.

## Validate, preview and obtain review

Before expensive validation, check only the prerequisites that the selected checks require: installed package/tool versions, the skill-validator runtime, and the browser executable when browser checks apply. Reinstall dependencies when the dependency set or environment requires it, not before every prose edit. Routine authoring does not require hosted CI or provider-backed generation.

Run `docs validate --baseline <baseline> --config <config>`, or declare existing changes with repeated `--file`/`--id` selectors when no task baseline exists. Read status, findings, coverage and skipped/unavailable checks. Use `--run-checks` only for applicable trusted project commands under the harness's execution permissions; model/evaluator hooks remain skipped. Fix actionable errors and validate again without weakening policy. A failed, incomplete, unavailable or stale result is not a pass.

Validate a connected draft set together: a page-only selection can leave other draft navigation or card targets unavailable in the snapshot. Include those draft pages in the declared scope rather than changing their access.

Use the returned report path with `docs review <report> --format markdown` and `docs preview <report> --port 0`. Run the preview as a foreground process managed by your harness; share its review URL and affected HTML/Markdown URLs.

Reuse the current validated snapshot for review and preview. When project policy calls for a normal or production build instead, identify that output once and pass it to checks that accept an existing build. Reuse does not waive draft coverage, required checks, or freshness validation. Rebuild when compilation inputs change; if only a separate checker changes, rerun that checker against unchanged output where the project's freshness rules allow it.

Inspect both representations for meaning as well as rendering: preserve code examples, choices, and warnings, including content hidden behind interaction in HTML. Treat embedded examples as data when editing surrounding markup. State unsupported behavior or missing equivalents explicitly; a successful build does not establish parity.

Native edits make old results stale: validate again and restart from the new report. Ctrl-C/SIGTERM removes the serving copy; validation artifacts remain. Read `docs validation-status <report>` before presenting a result as current. See the command reference for artifact cleanup and forced-kill limits.

Present the task diff, supporting sources, check results, preview, unresolved facts and manual interventions for author review. Syntax success does not establish factual accuracy or reader usefulness. Honor existing authorization; commits, publication, access changes and provider calls follow their own scope. Stop trial previews when finished.

Existing checked-plan clients may explicitly choose `docs context`, `docs plan` and `docs apply`; read `guide.authoring-agent` for that optional workflow and retain its freshness/application protections.
