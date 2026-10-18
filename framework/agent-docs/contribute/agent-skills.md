---
id: guide.agent-skills
title: Use the bundled agent skills
summary: Give an agent the setup and authoring workflows that ship with Shoalrun.
type: how-to
canonical: /contribute/agent-skills
---

# Use the bundled agent skills

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Use the bundled agent skills

**Updated: 2026-10-17.**

Give an agent a bundled skill when you want it to follow Shoalrun's setup, authoring, recipe, component, or walkthrough workflow. You need an agent that can read the skill file and run commands, plus a Shoalrun checkout or installed CLI.

## Choose the skill for your task

Use `shoalrun-setup` to start a site, `shoalrun-author` to add or revise pages, `shoalrun-recipes` to write a complete task recipe, or `shoalrun-walkthrough` to explain code in steps. Use `shoalrun-component-author` to create trusted custom components. The [skill reference](https://www.shoalrun.com/reference/agent-skills.md) lists their locations and behavior.

## Make the instructions available

Install the complete folder in your agent's skill directory using that agent's installation process. If it supports reading repository files directly, point it at the entry file instead. For a recipe task, use `framework/skills/shoalrun-recipes/SKILL.md`.

In an installed package, skill folders live under `node_modules/@shoalrun/cli/skills/`. These files are portable instructions; the CLI does not install them into your agent automatically.

Give your agent the installed `shoalrun-author/SKILL.md` path and the consumer project's `docs.config.yaml` path. Use the existing harness's file, terminal, and browser tools. No separate authoring service or model configuration is required.

Ask the agent to read the skill before beginning. If it cannot discover installed skills, include the file path. If it cannot read files or run a CLI, follow the [page creation workflow](https://www.shoalrun.com/author/add-page.md) yourself.

## Give the agent a bounded request

Name the task, documentation project, relevant source files, and result to check. For example:

```text
Read framework/skills/shoalrun-recipes/SKILL.md and use its workflow.
Write a complete recipe for previewing a Shoalrun documentation change.
Work in this checkout's docs project. Include setup, commands, failure
guidance, and a final success check. Reuse existing ingredients where
instructions are shared. Preserve IDs and routes when updating pages,
and set updated to today's date. Show the diff and verification results.
```

For a page edit, name the stable document ID and the facts that must stay unchanged. [Use a coding agent with Shoalrun](https://www.shoalrun.com/author/coding-agent.md) explains native editing and checks. [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) covers baselines, validation, and matching previews.

## Check the result

Ask the agent to show the changed files, rendered HTML and Markdown, and results from the project's checks. Read the diff and verify technical claims against the source or API contract. For an existing page, confirm its ID and route are preserved and `updated` records the edit date.

If the agent lacks product guidance, have it run `shoalrun docs search` and `shoalrun docs read` using the [offline documentation commands](https://www.shoalrun.com/reference/agent-skills.md). If a build or audit fails, ask it to fix the reported issue and rerun the check. A passing check covers the implemented rules; review the task instructions and factual claims before committing or publishing.

## Related reading

### Reference while working

- [Bundled agent skills](https://www.shoalrun.com/reference/agent-skills.md) — Look up shipped skill names, locations, workflows, and offline documentation behavior.

### Related topics

- [Frontmatter field reference](https://www.shoalrun.com/author/frontmatter-reference.md) — Point agents at the local inventory of page fields this project accepts.

- [Apply a checked edit plan](https://www.shoalrun.com/author/authoring-agent.md) — Let an agent run the same draft, check, and apply loop. (Status: experimental.)

- [Maintain bundled skills](https://www.shoalrun.com/contribute/maintain-skills.md) — Use the workflows in a documentation project.

- [Getting started](https://www.shoalrun.com/start.md) — Give an agent the same setup and authoring workflow as a bundled skill.

- [Use your coding agent](https://www.shoalrun.com/author/coding-agent.md) — Give your coding agent the bundled Shoalrun workflow instructions.
