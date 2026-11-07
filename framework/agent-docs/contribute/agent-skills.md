---
id: guide.agent-skills
title: Use the bundled agent skills
summary: Give an agent the setup and authoring workflows that ship with Shoalrun.
type: how-to
area: authoring
subarea: authoring-agent-workflows
canonical: /contribute/agent-skills
---

# Use the bundled agent skills

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Use the bundled agent skills

**Updated: 2026-11-07.**

Give an agent a bundled skill for Shoalrun setup, authoring, components, recipes, walkthroughs, branding, or PDF exports. You need an agent that can read the skill file and run commands, plus a Shoalrun checkout or installed CLI.

## Choose the skill for your task

Use `shoalrun-setup` to start a site, `shoalrun-author` to add or revise pages, `shoalrun-recipes` to write a complete task recipe, or `shoalrun-walkthrough` to explain code in steps. Use `shoalrun-component-author` to create trusted custom components. The [skill reference](https://www.shoalrun.com/reference/agent-skills.md) lists their locations and behavior.

Use `shoalrun-brand` for website branding and `shoalrun-pdf` for [styled PDF exports](https://www.shoalrun.com/publish/pdf.md). The PDF skill includes a print stylesheet starter and instructions for covers, typography, publication selection, download actions, and visual verification. Keep its complete folder when making it available to an agent.

## Make the instructions available

Find the skill in the installed package, then make it discoverable to your agent. `shoalrun skills list` and `shoalrun skills read NAME` only read packaged instructions. Installing the npm package doesn't register skills in an agent session.

Install complete skill folders using your agent's installation process. Keep supporting references and assets, including sibling skills when a workflow links to them. Skill folders in an installed project live under `node_modules/@shoalrun/cli/skills/`; you don't need a framework checkout.

### Expose skills to your agent

Use the skill directory and project scope documented by your agent. If it discovers project skills under `.agents/skills`, the following example copies the bundled workflows there from the project root. Use your host's actual directory when it differs. Existing folders are preserved:

```sh
mkdir -p .agents/skills
for skill in node_modules/@shoalrun/cli/skills/*; do
  name="${skill##*/}"
  if [ ! -e ".agents/skills/$name" ] && [ ! -L ".agents/skills/$name" ]; then
    cp -R "$skill" ".agents/skills/$name"
  fi
done
```

Keep references, assets, and sibling skills together. These copies are snapshots; compare them with the installed package when upgrading and preserve project customizations. Shoalrun's isolated source capture rejects symlinked project inputs, so use copied folders when those skills live inside the captured project.

Verify the skill appears in your agent's skill list. Invoke it using that agent's supported method, or let the agent select it by its description. Follow the host's refresh or restart instructions when discovery doesn't update. If the host doesn't expose native skills, give the agent the exact `SKILL.md` path to read instead.

### Give project instructions an exact path

Put a concrete loading instruction in the project instructions file your agent reads, such as `AGENTS.md`. Adjust the content and skill paths to your project:

```text
Before editing content/, load .agents/skills/shoalrun-author/SKILL.md.
Use the session's skill loader when available. If it doesn't expose the
skill, read that exact file before editing. Follow the project's writing
guide and checks, then reuse the validated output for preview.
```

A file pointer remains useful when a host doesn't expose native skills. Give the agent the project's `docs.config.yaml` path as well. Each packaged skill starts with a short task checklist; project policy supplies the required dates, taxonomy, navigation, and validation rules. If the agent can't read files or run a CLI, follow the [page creation workflow](https://www.shoalrun.com/author/add-page.md) yourself.

## Give the agent a bounded request

Name the task, documentation project, relevant source files, and result to check. For example:

```text
Load the installed shoalrun-recipes skill before editing.
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

- [Getting started](https://www.shoalrun.com/start.md) — Give an agent the same setup and authoring workflow as a bundled skill.

- [Use your coding agent](https://www.shoalrun.com/author/coding-agent.md) — Give your coding agent the bundled Shoalrun workflow instructions.
