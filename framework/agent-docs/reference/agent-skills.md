---
id: reference.agent-skills
title: Bundled agent skills
summary: Skill names, locations, workflow behavior, offline documentation, and
  validation limits.
type: reference
area: authoring
subarea: authoring-agent-workflows
canonical: /reference/agent-skills
---

# Bundled agent skills

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Bundled agent skills

**Updated: 2026-10-19.**

Shoalrun ships five portable skill folders under `framework/skills/`. Each folder contains a `SKILL.md` with instructions for an agent that can read files and run the Shoalrun CLI. A skill supplies guidance; it does not run a separate authoring service.

These are authoring skills for Shoalrun. The build does not create a reader-side skill for each published site. Agents reading a generated site use its Markdown twins, `/llms.txt`, and `/documents.json`. A non-interactive skill builder is a [non-goal](https://www.shoalrun.com/non-goals.md): skill creation and maintenance need guidance from a human expert.

## Skill inventory

Each skill supplies instructions for a specific part of the authoring workflow.

| Skill                       | Use it for                                                                                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shoalrun-setup`            | Start a docs project, choose a working example config, build it, and inspect its first HTML and Markdown pages.                                                                                                            |
| `shoalrun-author`           | Add or revise pages, navigation, API links, snippets, and project tests with the agent's own model and Shoalrun CLI. It uses normal file edits, project discovery, isolated validation, and snapshot review/preview tools. |
| `shoalrun-recipes`          | Write task-oriented how-tos as complete recipes, reuse ingredients where helpful, and configure cookbook choices.                                                                                                          |
| `shoalrun-component-author` | Create trusted [custom components](https://www.shoalrun.com/author/components/custom.md), validate their schemas and shared content, and review HTML/Markdown parity.                                                      |
| `shoalrun-walkthrough`      | Turn notes, a tutorial, or project code into a [walkthrough](https://www.shoalrun.com/author/components/walkthroughs.md) that explains code step by step.                                                                  |

Each folder name matches its skill name. For example, the author skill's entry file is `framework/skills/shoalrun-author/SKILL.md`. Installation locations depend on the agent. [Use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md) describes choosing and invoking one.

## Workflow behavior

The setup skill uses `shoalrun init` to create a project from the bundled `minimal` or `api-docs` starter, then uses `config validate`, `build`, and `dev` to check the result. The author skill uses stable IDs and project config provenance so edits stay attached to the intended publication. The walkthrough skill chooses a mode and layout, prefers code taken from project files, and checks each step's highlight. The recipes skill starts from a reader goal and success check, reuses ingredient source when useful, and distinguishes authoring from browser selection. All five ask the agent to inspect generated HTML and Markdown. They leave deployment decisions with the site owner.

The author skill starts with project-wide discovery and policy reads, captures a task baseline, and edits ordinary working-tree files. It validates a separate capture and opens the matching snapshot review/preview. Required companions come from project policy; compiler success does not waive them. Existing local edits are included in the baseline rather than attributed to the new task. No extra authoring model key is needed. Explicit checked-plan clients can still use [Apply a checked edit plan](https://www.shoalrun.com/author/authoring-agent.md).

## Component-authoring skill

`shoalrun-component-author` guides a coding agent through creating or repairing a trusted component plugin. It asks the agent to inventory essential content and decide what belongs in MDX and data. The agent then writes validation and shared content, adds browser controls where needed, and tests both representations. The agent produces project files, fixtures, usage examples, check results, and a local preview for review.

The skill is an instruction file, not a compiler feature or an automatic React-to-Markdown converter. The component author and agent must write the complete static explanation. A passing build does not establish that every interactive choice or warning is represented faithfully. [Custom components](https://www.shoalrun.com/author/components/custom.md) shows a small copy button with content in MDX, generated Markdown, and a sample agent request. [Data-driven React components](https://www.shoalrun.com/author/components/custom/react.md) adds a local policy file and generated explanations.

## Offline documentation

All five skills can consult Shoalrun's bundled docs through a local, agent-neutral tool:

```sh
shoalrun docs search "API reference navigation"
shoalrun docs read guide.api-references
```

Search returns JSON with document IDs and excerpts. Read returns the complete generated Markdown page. The commands work offline and do not require a docs site to be running. They are useful to any agent that can run a CLI, even when it cannot discover `SKILL.md` files automatically.

## Limits

Skills guide the agent's actions. They cannot establish whether a technical claim is true. Shoalrun's [audit](https://www.shoalrun.com/publish/audit.md) checks implemented build and representation rules and any configured external tests. Human review and behavior tests establish whether the instructions work.

The recipes skill prefers complete task pages, adds ingredients when instructions are shared, and uses cookbooks when readers need help choosing tasks. It respects an explicitly requested format. [Ingredients, recipes, and cookbooks](https://www.shoalrun.com/author/recipes.md) explains those distinctions.

## Related reading

### Related topics

- [Non-goals](https://www.shoalrun.com/non-goals.md) — Understand why a non-interactive skill builder is outside the tool's scope.
