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

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/evals.md)

Use evaluation tasks to check whether an agent can accomplish important work using your documentation. Shoalrun defines task and result formats, prepares report templates, and checks those reports during an audit. You run your own agent and arrange human or external review of its answers. Shoalrun does not launch agents, choose a model, or grade prose.

You need a built docs site, a few realistic tasks, and an agent or manual workflow for running them. The ordinary build does not execute evaluations or call a model. Evaluations are opt-in audit checks.

## Shoalrun's own example

This repository retains `docs/evals/tasks.yaml` and `docs/evals/results.json` as an example of a small agent self-assessment. Its five questions cover custom search providers, search off, bounded lexical coverage, reader choices, and freshness. This narrow, familiar task set is not a general quality gate. The site's routine audit does not import the report, and ordinary documentation changes do not require rerunning it.

The original October 1 report is preserved unchanged in `docs/evals/history/results-2026-10-01.json`. The October 15 local run retains its actual tool responses, new answers, self-review judgments, and exact-build inventory under `docs/evals/runs/2026-10-15-local/`. The evaluator knew the project and had seen the earlier report; tasks shared retrieved pages. These are historical observations, not blind or independent evidence of general agent reliability. Earlier exploratory results remain in `plans/documentation/agent-docs-eval.json`.

Run a new evaluation when it answers a concrete product question, with relevant tasks and a clearly described runner and reviewer. Preserve older reports rather than changing their dates, digests, or grades. An exact-build report can legitimately fail freshness against a later build; that does not make its original evidence invalid or require routine refreshes.

Shoalrun's evaluation commands and optional audit hook remain available for projects that choose them. This site's normal validation still covers the build, links, schemas, output consistency, relevant behavior tests, and browser checks. To inspect the archived October 15 evidence without requiring the current site to match its old build, run from the repository root after compiling the framework:

```sh
node docs/evals/runs/2026-10-15-local/verify.mjs
```

That command checks the recorded responses and report provenance; it does not rerun tasks, grade answers, or certify the current site.
