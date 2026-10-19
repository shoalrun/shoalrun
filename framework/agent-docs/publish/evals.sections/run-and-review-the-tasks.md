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

## Run and review the tasks

Use your own agent with the declared tool access. Record the actual runner name, optional model, available tools, and any limitations in `runner`. Replace `recordedAt` with the run's UTC ISO timestamp.

For each task, record its status (`pass`, `fail`, or `skipped`), answer, citations, and criterion judgments. A passing result needs a nonempty answer, at least one citation, and a passing judgment with a reason for every defined criterion. Identify citations by stable page ID and publication, so editions and languages cannot be confused:

```json
{
  "taskId": "reader-views",
  "status": "pass",
  "answer": "Reader views change visibility. Public Markdown still includes reader-marked sections, so the views do not protect private content.",
  "citations": [
    {
      "id": "guide.reader-filters",
      "publication": { "channel": "production", "version": "current", "language": "en" }
    }
  ],
  "criteria": [
    { "id": "visibility", "status": "pass", "reason": "The answer distinguishes visibility from authorization." },
    { "id": "markdown", "status": "pass", "reason": "The answer states that reader-marked sections remain in Markdown." }
  ]
}
```

This is an example result shape. Record your agent's actual answer and the reviewer’s assessment rather than copying the example as evidence of a run.

Complete `review` with `reviewer`, `method` (`human` or `external`), `reviewedAt`, and `notes`. The review timestamp must be at or after `recordedAt`; both must be valid UTC timestamps and not in the future. Identify an external grader honestly, and record its limitations. A named reviewer is evidence about who assessed the answer, not independent proof that the assessment is correct.
