---
id: guide.authoring-agent
title: Apply a checked edit plan
summary: Find a page's sources, review an edit, and apply it through Shoalrun checks.
type: how-to
audiences:
  - authors
subjectLifecycle: experimental
canonical: /author/authoring-agent
---

# Apply a checked edit plan

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Use your agent > Checked edit plans

**Updated: 2026-10-13.**

**Status: Experimental.**

Use this optional workflow when your agent needs a digest-checked replacement plan before writing files. Your agent gathers evidence and writes the candidate; Shoalrun validates and applies the exact plan. For ordinary working-tree editing, follow [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) instead.

## Prepare and apply an update

1. ## Read the page and its owners

   ```sh
   shoalrun docs context guide.welcome --config docs.config.yaml
   ```

   Read the returned source files and the project's writing guide. Capture the source digest before drafting. Give your agent the requested change and supporting sources; those can include other repositories, specifications, or links it can inspect with its own tools.

2. ## Write and review a candidate

   Have the agent save a complete replacement file separately from the source. Preserve stable IDs, routes, publication fields, and access policy. Update the edit date. Ask for a diff, the evidence supporting changed claims, and any unresolved questions. Run the project's Vale rules and verify code examples.

3. ## Create an exact edit plan

   Create `edit-request.json` with full replacement text and the digest of the source used to draft it:

   ```json
   {
     "edits": [
       {
         "file": "content/welcome.mdx",
         "baseDigest": "<SHA-256 digest of the original source>",
         "content": "<complete replacement file>"
       }
     ]
   }
   ```

   The placeholders above must be replaced with actual values. Paths are relative to the project configuration directory.

   ```sh
   shoalrun docs plan --request-file edit-request.json --out edit-plan.json --config docs.config.yaml
   shoalrun docs apply edit-plan.json --config docs.config.yaml --check
   ```

   The check builds a temporary copy and leaves source files unchanged. A stale source or failed build stops the edit. Plans support existing authored Markdown files and YAML files loaded by the configuration; use scaffolding for new files.

4. ## Apply the reviewed plan

   ```sh
   shoalrun docs apply edit-plan.json --config docs.config.yaml
   shoalrun audit docs.config.yaml
   ```

   Applying repeats freshness and build checks before writing. Inspect the resulting HTML and Markdown. The plan does not run configured audit tests, commit changes, or deploy; those are separate steps.

## What checks establish

Compiler checks catch problems such as broken document links and invalid components. Vale checks the rules your team configures. Neither establishes factual accuracy or whether a procedure works. Ask your agent to explain what it verified and what still needs review.

Ordinary public builds exclude draft pages. Use the separate working-tree `docs validate` interface to render affected drafts in isolation without changing their authored access policy. This does not change the checked plan/apply contract described above.

## Related reading

### Read first

- [Templates](https://www.shoalrun.com/author/templates.md) — Scaffold a draft page before an agent writes its content.

### Reference while working

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Review a drafted API page against its operation and contract.

- [Example writing guide](https://www.shoalrun.com/author/writing-style.md) — Review this site's example editorial guidance.

### Related topics

- [Use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md) — Let an agent run the same draft, check, and apply loop.

- [Write with agents](https://www.shoalrun.com/author/agents.md) — Start with the agent authoring workflow.

- [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) — Use the checked edit commands with your existing coding agent. (Status: experimental.)

- [Use your coding agent](https://www.shoalrun.com/author/coding-agent.md) — Prepare a checked edit to an existing page.
