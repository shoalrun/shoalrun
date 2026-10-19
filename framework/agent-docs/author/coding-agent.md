---
id: guide.coding-agent-authoring
title: Use your coding agent
summary: Give your agent project guidance and draft a new documentation page.
type: how-to
area: authoring
subarea: authoring-agent-workflows
audiences:
  - authors
canonical: /author/coding-agent
---

# Use your coding agent

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Use your agent > Draft a page

**Updated: 2026-10-19.**

Use an agent that can read project files and run commands. It writes with its own model; Shoalrun requires no additional authoring API key.

## Prepare your agent

Install the [portable authoring skill](https://www.shoalrun.com/contribute/agent-skills.md) using your agent's supported skill setup. If it cannot load skills, give it the same project instructions and commands directly. Tell it where to find `docs.config.yaml`, your writing guide, and reviewed examples. The [example writing guide](https://www.shoalrun.com/author/writing-style.md) is a starting point you can adapt.

The CLI's `docs search` and `docs read` commands read bundled Shoalrun guidance. The [MCP server](https://www.shoalrun.com/cli.md) offers documentation search and reads for agents that support MCP; it does not write project files. Your agent uses its own file tools and the CLI for edits.

## Give a working-tree task

Name the reader outcome and documentation project. Let the agent discover the relevant pages and required supporting changes from project policy. For example:

```text
Read the installed shoalrun-author/SKILL.md and work in this documentation project.
Revise the authoring procedure so readers can write titled steps and inspect
both outputs. Read project policy and supporting evidence first, preserve earlier
local edits, capture a task baseline, edit files normally, and show the matching
validation report, preview, and task diff. Do not commit or publish.
```

This uses the harness's own writer and execution permissions. Required navigation, relationships, and changelog entries come from the project instructions rather than an automatic compiler rule. If evidence is missing or policies conflict, the agent should identify the question for review.

## Draft a new page

1. ## Define the reader's task

   Give your agent the audience, goal, intended page type, and supporting sources. Let it gather and evaluate evidence using its own tools. Ask it to identify missing facts rather than invent examples or behavior.

2. ## Choose and scaffold a template

   Use the project's [templates](https://www.shoalrun.com/author/templates.md). Record the starting state before scaffolding:

   ```sh
   shoalrun docs baseline --out .shoalrun/task-baseline.json --config docs.config.yaml
   shoalrun scaffold how-to -n content/publish-a-site.mdx --config docs.config.yaml
   ```

   The new file is a draft. Replace the prompts, preserve its identity and publication metadata, and add required companions from project policy.

3. ## Check and review the page

   Run the project's style checker and configured checks. Read the draft, verify its examples, and review technical claims against the evidence.

   ```sh
   shoalrun docs validate --baseline .shoalrun/task-baseline.json --config docs.config.yaml
   shoalrun docs review /path/from/result/report.json --format markdown
   shoalrun docs preview /path/from/result/report.json --port 0
   ```

   Use the actual report path returned by validation. It renders affected drafts in a separate capture while preserving their authored access policy. Review findings, coverage, and skipped checks; use `--run-checks` only for applicable trusted commands under the harness's permissions. A stale, failed, incomplete, or unavailable result is not a pass. After edits, revalidate and restart the preview from the new report. Stop the foreground preview with Ctrl-C when finished.

4. ## Prepare publication

   After the author approves publication, change the page's access policy to public and build to a dedicated output directory. Inspect its HTML, Markdown, navigation, and links before committing or deploying.

   ```sh
   shoalrun build docs.config.yaml preview-output
   ```

## Related reading

### Related topics

- [Write with agents](https://www.shoalrun.com/author/agents.md) — Choose the authoring workflow that fits how you work.

- [Use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md) — Give your coding agent the bundled Shoalrun workflow instructions.

- [Apply a checked edit plan](https://www.shoalrun.com/author/authoring-agent.md) — Prepare a checked edit to an existing page. (Status: experimental.)
