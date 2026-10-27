---
id: reference.authoring-workspace
title: Authoring tools commands
summary: Look up provider-free project discovery, reference reads, baselines,
  and snapshot validation.
type: reference
area: authoring
subarea: authoring-agent-workflows
audiences:
  - authors
subjectLifecycle: experimental
canonical: /author/workspace/commands
---

# Authoring tools commands

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Project tools > Commands

**Updated: 2026-10-25.**

**Status: Experimental.**

These commands are available through the private prototype's CLI. They make no authoring provider calls.

## Discovery and references

Use these commands to find the project and retrieve the references needed for an edit.

| Command                    | Result                                                            |
| -------------------------- | ----------------------------------------------------------------- |
| `docs project`             | Project-wide JSON discovery, without requiring a page selector.   |
| `docs source FILE`         | Bounded project-relative source passage with a whole-file digest. |
| `docs search QUERY --json` | Search bundled framework documentation.                           |
| `docs read ID --json`      | Read a bundled reference by stable ID.                            |

Project commands accept `--config FILE`; otherwise they find the nearest `docs.config.yaml` in the current directory or its ancestors. Project sections are `pages`, `guidance`, `configuration`, `navigation`, `relationships`, `templates`, and `findings`. Choose a section with `--section`. Pages, navigation, and relationships accept one of `--id`, `--file`, or `--query`.

Project pagination uses `--offset` and `--limit` (default 20, maximum 100). Follow the returned `pagination.nextOffset`. `--max-tokens` bounds the response (default 8192). Source reads use Unicode code-point offsets and default to 4096 tokens; follow `nextOffset` and verify the digest between reads. Paths must resolve inside the project. Use your harness's tools and permissions for external implementation sources.

## Validation

Use these checks to find source and publication problems before reviewing the result.

| Command                         | Result                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `docs baseline --out FILE`      | Record the current working tree without running checks. The destination must be new. |
| `docs validate --baseline FILE` | Validate changes since a task baseline in a separate capture.                        |
| `docs validate --file FILE`     | Validate declared file changes; repeat the selector for more files.                  |
| `docs validate --id ID`         | Validate declared pages; repeat the selector for more IDs.                           |
| `docs validation-status REPORT` | Check whether a retained report still applies to current inputs.                     |

Baselines and validation artifacts must be outside the project or inside its excluded `.shoalrun` directory. `--artifacts DIRECTORY` selects a new artifact directory; otherwise validation retains a temporary directory. Results contain actual report, capture, and site locations. `--run-checks` opts into configured trusted shell checks under the harness's permissions; evaluator hooks remain skipped.

Declare sibling files and directories needed by a configured check in [`audit.tests[].inputs`](https://www.shoalrun.com/config.md). Paths are relative to the project configuration directory and must remain within its parent. Snapshot builds resolve revision dates without writing freshness history. A configured check that changes captured source or history still fails validation.

Configured Node checks receive Shoalrun's installed dependency search paths through `NODE_PATH` for CommonJS resolution. Consumer dependencies are not copied into the snapshot; missing modules produce an unavailable check. ESM imports do not use `NODE_PATH`.

Validation statuses include `ok`, `failed`, `incomplete`, `unavailable`, and `stale`. Read findings and coverage alongside status. These commands always return JSON. Snapshot validation requires affected page IDs to match `[A-Za-z0-9][A-Za-z0-9._-]*`.

## Review and preview

Use these commands to inspect proposed changes and their rendered output.

| Command                                | Result                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `docs review REPORT`                   | JSON review for a retained validation report.                             |
| `docs review REPORT --format markdown` | A readable report for the same snapshot and task scope.                   |
| `docs preview REPORT --port PORT`      | Foreground local preview of that exact build, with a browser review page. |

`REPORT` is the validation report path returned by `docs validate`. Review accepts `--format json` or `--format markdown`; JSON is the default. It exits 0 only for a current `ok` result. An error returns the existing JSON failure envelope, even when Markdown was requested.

Preview binds only to `127.0.0.1`; the default port is 8771. Use port 0 to allocate a free port. Its JSON startup record contains the snapshot ID, origin, and review/status URLs. It also includes affected HTML/Markdown URLs, serving-copy directory, validation review, and lifecycle instructions. The process stays running. Ctrl-C or SIGTERM closes it, removes its private copy, and emits a stopped record. Validation artifacts remain. No browser is opened automatically.

The review identifies the baseline, changed-file operations and digests, dependencies, and current freshness. It includes checks, findings and source/reference locations, coverage, and affected-page artifacts. Earlier file contents are not retained in a baseline; the report explains why it cannot generate a task diff. Evidence gathering remains with the harness. Reviewer results and author dispositions are explicitly empty; no semantic reviewer ran.

Configuration, dependency, and deletion changes conservatively list every rendered page, including generated API operations. Authored-only changes list their affected pages. Each page reports its authored or generated origin.

A stale working tree can still be previewed as a clearly labelled historical snapshot. Modified or missing validation artifacts prevent startup. A missing site after a failed compile is reviewable through `docs review`, but cannot be served. A built site with failed or skipped checks can be previewed with its actual status. A running preview detects changed artifacts and refuses page serving; replacing the report never switches it to another snapshot.

HTML pages show a freshness banner that refreshes every two seconds while open. Markdown stays the captured output; read its snapshot ID from the HTTP `X-Shoalrun-Snapshot` header and consult the status URL. After edits, revalidate and restart with the new report. Copies are limited to 20,000 regular files and 512 MiB; symlinks are rejected. A forced kill can leave the serving copy, whose path is returned at startup. Remove that directory only after the process has stopped.

## Existing checked edits

`docs context`, `docs plan`, and `docs apply` remain supported. They preserve source freshness, collision, validation, and rollback protections. See [Apply a checked edit plan](https://www.shoalrun.com/author/authoring-agent.md) for that procedure. Working-tree editing is the default for the new tools. The portable authoring skill uses this working-tree workflow.

## Related reading

No matching documents.
