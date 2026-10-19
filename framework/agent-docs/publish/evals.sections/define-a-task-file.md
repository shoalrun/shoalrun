---
id: guide.evals
title: Evaluate agent tasks against your docs
summary: Define realistic tasks, record reviewed answers from your own agent,
  and check the results against a documentation build.
type: how-to
area: quality
subarea: quality-evaluations
canonical: /publish/evals
---

# Evaluate agent tasks against your docs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Evaluate agent tasks against your docs

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/publish/evals.md)

Use evaluation tasks to check whether an agent can accomplish important work using your documentation. Shoalrun defines task and result formats, prepares report templates, and checks those reports during an audit. You run your own agent and arrange human or external review of its answers. Shoalrun does not launch agents, choose a model, or grade prose.

You need a built docs site, a few realistic tasks, and an agent or manual workflow for running them. The ordinary build does not execute evaluations or call a model. Evaluations are opt-in audit checks.

## Define a task file

Save YAML or JSON with `schemaVersion: 1` and a nonempty `tasks` list. Each task needs a unique lowercase ID, a prompt, an `allowedTools` list, and criteria with unique IDs and descriptions. Tasks are required by default; set `required: false` for an exploratory task that should not block an audit.

```yaml title="evals/tasks.yaml"
schemaVersion: 1
tasks:
  - id: reader-views
    prompt: Explain what reader views hide and whether they protect private content.
    allowedTools: [docs.search, docs.read]
    criteria:
      - id: visibility
        description: Explain visibility versus access control and cite the reader-views page.
      - id: markdown
        description: Explain that published Markdown retains reader-marked content.
```

Use the same tool names in your task file and runner report, such as `search`, `fetch`, `docs.search`, or `mcp.get_page`. Shoalrun validates the recorded runner tools against each executed task's allowed list. It cannot observe or enforce what tools an external agent actually used. Use a shared allowed tool set within a report; prepare separate suites for runs with different tool permissions.

Write criteria that an expert can assess. Valid citations and complete report fields are mechanical checks. Whether the answer correctly explains your product remains a review judgment.
