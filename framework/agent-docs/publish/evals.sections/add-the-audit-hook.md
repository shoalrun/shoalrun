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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Evaluate agent tasks against your docs

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/evals.md)

Use evaluation tasks to check whether an agent can accomplish important work using your documentation. Shoalrun defines task and result formats, prepares report templates, and checks those reports during an audit. You run your own agent and arrange human or external review of its answers. Shoalrun does not launch agents, choose a model, or grade prose.

You need a built docs site, a few realistic tasks, and an agent or manual workflow for running them. The ordinary build does not execute evaluations or call a model. Evaluations are opt-in audit checks.

## Add the audit hook

To check an existing report whenever you run `shoalrun audit` or `shoalrun check`, add:

```yaml title="docs.config.yaml"
audit:
  evals:
    tasks: ./evals/tasks.yaml
    report: ./evals/results.json
```

Paths resolve beside the config file declaring each value, including included config files. The audit builds a temporary site, then checks the report against that output. Changes to published output or task definitions require a new evaluation. Reports remain project files; Shoalrun does not publish them into the site automatically.

If your team already has an evaluator command, configure it as an optional `run` list:

```yaml title="docs.config.yaml"
audit:
  evals:
    tasks: ./evals/tasks.yaml
    report: ./evals/results.json
    run: [node, scripts/evaluate-docs.mjs]
```

That script belongs to your project. It runs after a successful build, from the root config directory, with no shell interpolation and a two-minute timeout. It receives these environment variables:

| Variable                     | Value                               |
| ---------------------------- | ----------------------------------- |
| `SHOALRUN_EVAL_SITE`         | Absolute temporary build directory. |
| `SHOALRUN_EVAL_TASKS`        | Absolute task-file path.            |
| `SHOALRUN_EVAL_REPORT`       | Absolute report-file path to write. |
| `SHOALRUN_EVAL_BUILD_DIGEST` | Digest of the built documentation.  |
| `SHOALRUN_EVAL_TASKS_DIGEST` | Digest of the normalized tasks.     |

The script must run and assess tasks, write a report, and exit nonzero on execution failure. A successful exit does not bypass report checks. A nonzero exit fails the audit even if an older report still validates. Hook execution and report validation appear separately as `eval-run` and `evals` in the audit results. A failed build prevents the eval hook from running.

Configured commands can use your provider keys, make network requests, and write files. Shoalrun supplies the interface; your team owns the execution, costs, review, and credentials. The temporary build is removed after the audit. For longer runs, execute your evaluator separately and import the resulting report.
