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

## Prepare a report for the built site

```sh
shoalrun build docs.config.yaml site-dist
shoalrun eval prepare site-dist --tasks evals/tasks.yaml --out evals/results.json
```

Create the `evals` directory first. Preparation refuses to overwrite an existing report; use a new output filename for another run.

The template contains a task-file digest, a documentation-build digest, a per-file `buildFiles` inventory, a timestamp, empty runner details, and each task marked `skipped`. It records no passing results and does not run the tasks. A template with skipped required tasks fails the check until you complete the run and review.

The task digest uses normalized definitions, so whitespace-only changes do not invalidate a run. Prompt, criteria, tools, or required-status changes do. The build digest covers published output files, including HTML, Markdown, indexes, discovery, and assets. It excludes `build-info.json`, private `ai/` artifacts, and `.shoalrun/` state. File touches do not invalidate otherwise identical output; changed published bytes do. Other published metadata, including build IDs embedded in manifests, remains covered even when it reflects deployment provenance.

## Diagnose a different build

Save a file inventory alongside an evaluation build:

```sh
shoalrun eval snapshot site-dist > evaluated-build.json
shoalrun eval snapshot rebuilt-site > current-build.json
shoalrun eval compare current-build.json --since evaluated-build.json
```

The comparison lists added, changed, and removed file paths. It exits 0 for identical snapshots and 1 for differences or invalid input. Each inventory binds relative file paths and SHA-256 byte digests to the same build digest used by evaluation reports. It contains no answers or grades.

New report templates include this inventory in `buildFiles`. When a report is stale, `eval check` includes the file comparison in `details.buildChanges`. Older reports still receive the exact-build check, but cannot identify which earlier files differ. Editing the stored digest or deleting changed files is not a new evaluation.

For local review of a hosted build, download and retain that exact output, task file, and report template. Run the tasks against the downloaded site and check the completed report against it. Rebuilding the source on another operating system can change rendered assets; a report about the downloaded build does not automatically cover that rebuild. Archive the source revision and build inventory with the run. A successful build capture records no evaluation pass.

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

## Check the report

```sh
shoalrun eval check site-dist --tasks evals/tasks.yaml --report evals/results.json
```

The command prints JSON and exits 1 on failure. It checks schema versions and fields, unique task and criterion IDs, the two digests, timestamps, runner and review details, declared tool access, criterion coverage, and whether each citation identifies a published page in the selected publication. Required tasks must pass. Missing or failed optional tasks appear in the outcomes without blocking, but malformed results, bad citations, or unsupported passing claims still fail validation.

Shoalrun verifies that cited pages exist; it does not verify that their text supports an answer. Reported tool use and grades are assertions supplied by the runner and reviewer. A passing report does not establish broad agent reliability or factual correctness.

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

## Shoalrun's own example

This repository retains `docs/evals/tasks.yaml` and `docs/evals/results.json` as an example of a small agent self-assessment. Its five questions cover custom search providers, search off, bounded lexical coverage, reader choices, and freshness. This narrow, familiar task set is not a general quality gate. The site's routine audit does not import the report, and ordinary documentation changes do not require rerunning it.

The original October 1 report is preserved unchanged in `docs/evals/history/results-2026-10-01.json`. The October 15 local run retains its actual tool responses, new answers, self-review judgments, and exact-build inventory under `docs/evals/runs/2026-10-15-local/`. The evaluator knew the project and had seen the earlier report; tasks shared retrieved pages. These are historical observations, not blind or independent evidence of general agent reliability. Earlier exploratory results remain in `plans/documentation/agent-docs-eval.json`.

Run a new evaluation when it answers a concrete product question, with relevant tasks and a clearly described runner and reviewer. Preserve older reports rather than changing their dates, digests, or grades. An exact-build report can legitimately fail freshness against a later build; that does not make its original evidence invalid or require routine refreshes.

Shoalrun's evaluation commands and optional audit hook remain available for projects that choose them. This site's normal validation still covers the build, links, schemas, output consistency, relevant behavior tests, and browser checks. To inspect the archived October 15 evidence without requiring the current site to match its old build, run from the repository root after compiling the framework:

```sh
node docs/evals/runs/2026-10-15-local/verify.mjs
```

That command checks the recorded responses and report provenance; it does not rerun tasks, grade answers, or certify the current site.

## Related reading

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Look up report preparation and validation commands.

### Related topics

- [Non-goals](https://www.shoalrun.com/non-goals.md) — Understand why agent execution remains outside Shoalrun.
