# Authoring command reference

Detailed CLI and library contracts for project inspection, isolated validation, review, and preview. For installation and a first project, start with the [package README](README.md).

## Project and reference tools

These provider-free commands inspect an existing project without selecting a page:

```sh
shoalrun docs project --config docs.config.yaml
shoalrun docs project --section guidance --config docs.config.yaml
shoalrun docs project --section configuration --config docs.config.yaml
shoalrun docs project --query "installation" --config docs.config.yaml
shoalrun docs project --id guide.install --section relationships --config docs.config.yaml
shoalrun docs source AGENTS.md --config docs.config.yaml
shoalrun docs search "Steps" --json
shoalrun docs read guide.component.steps --json
```

`--config` defaults to the nearest `docs.config.yaml` in the current directory or
its ancestors. The project root is the configuration directory. Search/read reuse
the bundled documentation and their existing token budgets/publication filters;
they need no project or model key. The Steps reference contains exact MDX,
required attributes, nesting, accessibility and HTML/Markdown semantics. Use
`guide.frontmatter-reference` for metadata definitions, `guide.frontmatter` for
authoring guidance, and `guide.templates` for page shapes. These references
describe bundled framework behavior, not a consumer project's companion policy.

`docs project` always returns JSON (`--json` is accepted). Its sections are:

| Section | Entries |
| --- | --- |
| `pages` (default) | IDs, owning paths, SHA-256 source digests, resolved type/summary/slug, publication defaults, access and link-label aliases. Includes draft and untracked pages. |
| `guidance` | Exact configured directives and guide/example locations, project/content and loaded configuration ancestors' `AGENTS.md` files, digests, source roles and directory scope. Read files with `docs source`. |
| `configuration` | Leaf values for site, metadata defaults/enforcement/custom fields, publications, authoring source locations, audit, templates and search; each has its actual owning file/key/digest. |
| `navigation`, `relationships` | Flattened entries/edges with actual configuration ownership. |
| `templates` | Canonical scaffold definitions and project overrides, types, required fields and body locations. Page types remain extensible; this is a template catalogue, not a type whitelist. |
| `findings` | Inspection errors, skipped symlinks and missing guidance/policy with severity, location when known and next action. |

Choose at most one of `--id ID`, `--file PROJECT_RELATIVE_PATH`, or
`--query TEXT` for pages/navigation/relationships. Topic matching is lexical over
IDs, paths, titles, summaries, body text and aliases, using configured search
synonyms. It returns ranked leads; it does not choose a page for the author.
Navigation and relationship selectors use all matching IDs before pagination.
An unknown selector returns an empty result.

Project JSON schema version 1 has `kind: shoalrun-authoring-project`, `status`,
`summary`, `section`, `entries`, `pagination`, `coverage` and `budget`.
`summary` identifies the project/config digest, content directory, section counts,
policy status, reference IDs and check availability. `coverage.validation` and
check execution are `not-run`: inspection is not snapshot validation or a preview.
Always inspect `summary.counts.findings` and read the findings section as needed.

`--offset N` (default 0) and `--limit N` (default 20, range 1–100) page the
selected section. `pagination.nextOffset` is null at the end. The serialized JSON
fits `--max-tokens N` (default 8192, range 1024–100000, `cl100k_base`); a budget
can reduce the number of entries. Follow the returned cursor, not the requested
limit. An entry that cannot fit returns `invalid_input`; increase the budget or
read its source passage. Pagination assumes an unchanged working tree. Inspection
does not capture an atomic snapshot; rerun discovery after edits.

`docs source FILE` returns schema version 1, `kind: shoalrun-authoring-source`,
`status`, `file`, whole-file SHA-256 `digest`, `role`, `location`, `applicability`,
`content`, `nextOffset` and `budget`. Paths must be project-relative and resolve
inside the project; outside symlinks and traversal are rejected. Its `--offset`
counts Unicode code points (not bytes), with a reported starting line. Its default
budget is 4096 tokens (same range as project). Follow `nextOffset` to reconstruct
long passages, including long lines. Check the digest between reads. External
implementation roots are reported as configured locations; read them with the
harness's own tools and permissions. Unconfigured sources are `unclassified`,
never implicitly approved as technical evidence.

Policy status is `missing` or `requires-interpretation`. Read all applicable
policy/style/example sources. Opposing prose is retained for author review;
the tool does not infer changelog, navigation or relationship obligations or
silently choose between conflicting policies. Ancestor instructions outside the
configuration directory remain the harness's responsibility. Configured audit
settings are exposed, but inspection runs no shell checks.

Both new commands exit 0 when inspection completes, even with findings. Request
or execution failures exit 1 and emit JSON on stdout with `schemaVersion: 1`,
`status: error`, and `error: { code, message }`. Codes are `invalid_input`,
`unknown_source`, `unsafe_path`, `invalid_project` and `internal_error`.
Findings use `code`, `severity` (`error`, `warning`, `review-needed`), optional
`file`/`location`/`reference`, `explanation` and `nextAction`. A reference is a
bundled documentation ID. Existing context/plan/apply and search/read retain
their existing schemas and exit behavior.

The public library entry point is `@shoalrun/cli/authoring`. API version 1 adds
`inspectAuthoringProject(configFile, options)`,
`readAuthoringSource(configFile, file, options)`, `projectToolSchemaVersion`,
`projectSections`, `ProjectToolError`, `projectToolFailure`, and the existing
`bundledDocumentation`, `searchDocumentation`, `getDocumentationPage` functions.
New discovery capabilities are additive; checked plan/apply clients remain
compatible. Library failures throw; CLI failures use the envelope above.

The runtime package excludes compiled development tests.

Run `npm run test:authoring-tools` from the repository root for the supported
authoring contracts. Run `npm run authoring:package-check` for packed public
CLI/library compatibility.

After building, run `node framework/scripts/package-authoring-smoke.mjs --clean-install`
from the repository root to install the tarball with fresh production dependencies
and an empty npm cache. The check exercises both starters through the installed
CLI and public library. This mode needs npm registry access. Provider credentials and
`NODE_PATH` are omitted; browser downloads are disabled. It does not test diagrams
or replace independent author trials. Without the flag, the check shares existing
dependencies for an offline package compatibility check. Both modes remove their
temporary consumers after completion.

## Working-tree snapshot validation

Capture a task baseline before editing when earlier local edits need to be
distinguished from this task. Otherwise declare the changed files or IDs explicitly:

```sh
shoalrun docs baseline --out .shoalrun/task-baseline.json --config docs.config.yaml
# Edit ordinary MDX/configuration files with the harness's native file tools.
shoalrun docs validate --baseline .shoalrun/task-baseline.json --config docs.config.yaml
shoalrun docs validate --file content/procedure.mdx --file config/nav.yaml --config docs.config.yaml
shoalrun docs validate --id guide.install --config docs.config.yaml
shoalrun docs validation-status /path/from/result/report.json
```

These commands always return JSON; `--json` is accepted. Configuration discovery
works as for `docs project`. Baseline output is exclusive: choose a new filename
for a new task. It records the **current working tree**, including earlier dirty
and untracked files, rather than Git HEAD. It executes no checks. Its version-1
`shoalrun-authoring-baseline` file contains project/config identity, input paths,
SHA-256 digests, modes, external directory scope, exclusions and an integrity
digest. A baseline from another project/configuration is rejected.

`docs validate` requires either a baseline or explicit `--file`/`--id` selectors.
Repeat file/ID flags for multiple changes; do not combine them with a baseline.
Baseline comparison detects new, modified and deleted inputs, preserving earlier
dirty files outside the task's change set. Sibling dependencies remain in baseline
scope even after configuration stops referencing them. Explicit files describe
the author's declared change set: absent paths declare deletions; unknown IDs
fail (select broken/deleted pages by path). Without a baseline, prior file contents
and creation history are unknown and reported as `declared`, not inferred from Git.

Validation captures all regular project files within a 10000-file/256-MiB bound.
It excludes `.git`, `node_modules`, `dist`, `site-dist`, `.vercel`, `.shoalrun`, `.private-archives`, `.private-evals`,
`.aws`, `.ssh`, `.codex`, `.npmrc`, `.env` and `.env.*` entries and reports those
exclusions. Source symlinks are rejected. Loaded configuration and supported local
dependency paths, including sibling Walkthrough sources and page images, retain
their relative layout within the project parent. Dependencies beyond that boundary
or absolute local dependency paths are unsupported; a required excluded/uncaptured
dependency cannot receive a passing report. External directory scopes are captured
recursively. This is source capture, not a clean dependency installation.

The compiler runs only on the temporary copy. Public pages and affected authored
drafts are checked together. Configuration, source dependency and deletion changes
conservatively affect every current authored page. Draft rendering uses an explicit
compiler authoring option and retains authored/resolved access metadata, including
enforced draft access. Unchanged, unselected drafts remain excluded from ordinary
publication rendering. An affected page that matches no enabled publication is a
located error, never a pass. Snapshot validation requires affected page IDs to
match `[A-Za-z0-9][A-Za-z0-9._-]*`. This is the snapshot tool's stable-ID contract.
Existing checked plan/apply keeps its prior behavior. Compiler checks cover metadata, identities/routes,
components, document links, navigation and relationships. Local link/fragment checks
read the actual HTML and Markdown; external URLs are not requested. Configured API
example and focused-contract audits reuse the existing auditors.

Configured `audit.tests` (including style/example commands) are **skipped** unless
the harness explicitly runs `docs validate ... --run-checks` under its execution
permissions. Commands run with argv and the captured project as their working
directory, with `SHOALRUN_VALIDATION_SITE` and `SHOALRUN_VALIDATION_SNAPSHOT` set.
These commands execute trusted project code. The harness must authorize them
and ensure they operate on the capture rather than absolute live paths or external
services. Declare sibling files/directories required by a check with optional
`audit.tests[].inputs`, relative to the project configuration directory. Capture
rejects missing files, symlinks, excluded locations and paths outside the project
parent; directory additions/deletions participate in freshness. Snapshot builds
resolve revision dates without writing captured freshness history. Changes made
by checks to captured source or history still invalidate the result.
Node checks receive the installed tool's dependency search paths through
`NODE_PATH` for CommonJS resolution; ESM does not use it. Consumer dependencies
are not copied. Missing executables or Node modules are `unavailable`.
Model/evaluator hooks are skipped. Executable metadata/highlighting
extensions currently return `unavailable` without invocation. No provider is chosen
and no semantic review, automatic rewrite, application or publication occurs.

`--artifacts DIRECTORY` chooses a new, exclusive artifact directory; otherwise a
temporary directory is retained. Baselines and artifacts must be outside the
project or inside its excluded `.shoalrun` directory. Canonical path checks prevent
source/output collisions, including filesystem aliases. Results report the snapshot
ID, report/site/captured-project locations and cleanup instructions. Remove only
the reported artifact directory when finished. Validation starts no service. Use the separate snapshot review/preview commands
below to inspect this captured result.

Validation JSON schema version 1 has `kind: shoalrun-authoring-validation`, `status`,
`snapshotId`, project/config identity, declared `baseline`, `changed` operations
and before/current digests, full `inputs`/`excluded` lists, `dependencies`, content,
config and validator digests, `runtimeDependencies`, `checks`, `findings`,
`coverage`, `artifacts` and `freshness`. Coverage distinguishes current authored
paths, affected paths, actual rendered routes/Markdown twins and affected paths
that did not render. Findings include stable codes, severity, owning file, exact
line/column/key when established, related collision files, explanation, canonical
reference and next action. Compiler failure can stop later checks; unrendered
affected pages remain visible. A build does not establish factual correctness.

Validation status is `ok`, `failed`, `incomplete` (skipped configured checks),
`unavailable` or `stale`. Only `ok` exits 0. Request/capture failures exit 1 with
`{ schemaVersion: 1, status: "error", error: { code, message } }`; capture codes
include `invalid_input`, `unsafe_path`, `stale_input`, `capture_limit` and
`unsupported_dependency`. `validation-status` exits 0 only for a still-current
`ok` report; it returns individual source/baseline/validator/artifact change flags
and the next validation action. It performs no build or source writes.

Capture verifies file identity/size/time/mode around reads and compares complete
inventories after copying and after validation. Persistent concurrent edits cause
a stale result rather than apparently successful mixed inputs. Report and artifact
digests bind the checked content and core validator code/assets/configuration.
Freshness includes new/deleted source files, baseline changes and relevant renderer
configuration. This detects changes between checks, not an OS transaction or proof
against a file changing and reverting between observations. Installed transitive
runtime code is identified by package configuration; complete clean-install/version
compatibility remains a later gate. Recheck applicability after subsequent edits.

The public `@shoalrun/cli/authoring` entry adds `captureAuthoringBaseline(configFile)`,
`writeAuthoringBaseline(configFile, output)`,
`validateAuthoringChanges(configFile, { files?, ids?, baselineFile?, artifactsDirectory?, runConfiguredChecks? })`,
`authoringValidationStatus(reportFile)`, `snapshotSchemaVersion` and matching types.
API version 1 and the existing checked plan/apply contracts remain compatible.

## Snapshot review and preview

```sh
shoalrun docs review /path/from/validation/report.json
shoalrun docs review /path/from/validation/report.json --format markdown
shoalrun docs preview /path/from/validation/report.json --port 8771
```

Review returns `kind: shoalrun-authoring-review`, schema version 1, the snapshot ID,
validation status and current freshness. It identifies the baseline and changed-file
operations/digests. Results include checks, findings and source/reference locations,
coverage, affected HTML/Markdown routes and artifact paths, dependencies and next action. Baselines contain digests rather than earlier source contents;
`diff.available` is false with the declared basis and an explanation. Harness-owned
evidence and optional reviewer/disposition slots are explicitly unpopulated.
Configuration/dependency/deletion changes include every rendered page, including
generated API references; authored-only changes list affected pages. Page origin and
selection scope are explicit. No semantic review is implied by compiler success. Review exits 0 only for current
`ok`; errors use the validation JSON envelope even in Markdown mode.

Preview binds only to `127.0.0.1`, defaults to port 8771, and accepts port 0 for an
allocated port. It emits JSON with `kind: shoalrun-authoring-preview`, snapshot ID,
origin, review/status URLs, all affected rendered page URLs, private serving-copy
path, validation review and lifecycle. It remains a foreground process. Open the
returned URL with your harness's normal browser interaction. Ctrl-C/SIGTERM closes
connections, removes only the private copy and emits a stopped record. Retained
validation artifacts remain separate; a forced kill can leave the serving copy.

The private copy is checked against the validation site digest. Changed/missing
artifacts refuse startup or serving. A stale working tree can be inspected as a
historical snapshot with a visible banner. HTML pages poll freshness every two
seconds; Markdown remains the captured output with an `X-Shoalrun-Snapshot` HTTP
header. Failed/skipped checks retain their actual status while previewing. No
watching/rebuilding occurs: edit, validate again, stop and restart with the new
report. The copy limit is 20,000 regular files and 512 MiB; symlinks are rejected.
The preview is a local development service for trusted project artifacts.

The public library adds `authoringReview(reportFile)`,
`authoringReviewMarkdown(review)`, and
`startAuthoringPreview(reportFile, { port? })`. The controller exposes `server`,
`review()` and idempotent `close()` plus the connection metadata. Always await
`close()` in cleanup. API version 1 remains unchanged; capabilities add
`snapshot-preview` and `authoring-review-report`.
