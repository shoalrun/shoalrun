---
id: guide.manni
title: Use Manni with Shoalrun
summary: Use Manni in your documentation project.
type: how-to
area: publishing
subarea: publishing-builds
canonical: /publish/manni
---

# Use Manni with Shoalrun

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Use Manni with Shoalrun

**Updated: 2026-10-25.**

[Manni](https://hawkeyexl.github.io/manni/) is a toolkit for managing and checking documentation. It can validate, query, and help fill page information; manage terminology; track connections between explanations and source code; and build knowledge graphs. It also provides tools for testing documentation and running evaluations.

This guide focuses on its checking tools. You choose the rules, and Manni reports pages that break them. For example:

- A page is missing its title or description.
- A tutorial gives instructions but never tells readers how to check that they worked.
- A page refers to a glossary term that no longer exists.
- Code has changed underneath an explanation, so the explanation needs another look.

Shoalrun builds and delivers your docs. Here, we use Manni to add checks before publishing, while its other tools remain available through the same command. You can use either tool without the other.

This guide shows how to run Manni in a Shoalrun project and add a check to `shoalrun audit`. That command runs the checks you configure and reports whether they passed. Start with one useful rule, then add more when you need them. For a working example, see [how we use Manni on this site](#how-this-site-uses-manni).

Manni's [documentation site](https://hawkeyexl.github.io/manni/) describes its available tools and rules. Your choices go in `manni.config.yaml`; you do not need a separate Shoalrun setting for each Manni feature.

## Prerequisites

Start in a Shoalrun project's root, with its package manifest and a `docs/` directory containing `docs.config.yaml` and `content/`. Adjust paths for a different layout.

## Set up Manni

1. ## Install the optional tools

   Install the tested Manni version and a separate Node 24 development runtime:

   ```sh
   npm install --save-dev --save-exact @hawkeyexl/manni@4.25.0 node@24.22.1 --ignore-scripts
   npm rebuild node
   ```

   Manni requires Node 24. The launcher below uses the installed runtime, so Shoalrun can continue to run on Node 22.12 or later. The first command leaves dependency install scripts disabled; the second installs the Node binary for your platform. Commit your package manifest and lockfile according to your project's workflow.

   A subsequent `npm ci` must include development dependencies and permit the Node runtime install script. After an installation with scripts disabled, run `npm rebuild node`. Review and test upgrades before changing either pin.

2. ## Add a command for running Manni

   Create `docs/scripts/manni.cjs`. This small script starts the installed Manni program with the Node version it needs:

   ```js
   // CommonJS resolution also works through NODE_PATH in isolated Shoalrun checks.
   const { spawnSync } = require('node:child_process');
   const { readFileSync } = require('node:fs');
   const path = require('node:path');

   try {
     const runtime = require.resolve('node/bin/node');
     const packageFile = require.resolve('@hawkeyexl/manni/package.json');
     const installed = JSON.parse(readFileSync(packageFile, 'utf8'));
     const result = spawnSync(runtime, [path.join(path.dirname(packageFile), installed.bin.manni), ...process.argv.slice(2)],
       { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
     if (result.error) throw result.error;
     if (result.signal) process.kill(process.pid, result.signal);
     else process.exitCode = result.status ?? 2;
   } catch (error) {
     console.error(`Manni unavailable: ${error.message} Run npm ci with development dependencies and the Node runtime install script enabled.`);
     process.exitCode = 2;
   }
   ```

   Add this entry to the existing `scripts` mapping in your root `package.json`:

   ```json
   "manni": "node docs/scripts/manni.cjs"
   ```

   From the project root, discover the installed CLI and its built-in schemas:

   ```sh
   npm run manni -- --help
   npm run manni -- meta schemas
   npm run manni -- meta schemas show manni:core:1.0.0
   ```

   Arguments, standard input, output, and exit status pass through to Manni. Every command runs from `docs/`, so input paths and explicit config paths are relative to that directory. Manni's normal config discovery and `--config` option remain available. The launcher adds no default command, target, or flags.

   The script also works when Shoalrun validates a temporary copy of your docs. Missing tools produce an error and an installation message. The launcher itself does not install tools.

3. ## Choose your documents and schemas

   Create `docs/manni.config.yaml`. A schema is a set of rules for the information in a page's YAML header, such as its title. This example selects Manni's built-in core schema:

   ```yaml
   collections:
     - name: site
       paths: ["content/**/*.{md,mdx}"]
   meta:
     defaults: false
     schemas: ["manni:core:1.0.0"]
   ```

   The collection identifies your source pages, including drafts. `meta.defaults: false` applies only the schemas you select. Choose schemas using `meta schemas` and inspect their requirements with `meta schemas show` before enabling them. Each schema retains its own rules; schemas for another site generator may not fit Shoalrun content.

   The core schema requires nonempty `title` and `description` fields. Shoalrun's required `summary` does not substitute for `description`. If you choose this vocabulary, add a meaningful `description` to each page's existing frontmatter:

   ```yaml
   description: Create an API key and choose the permissions your application needs.
   ```

   These metadata checks read the YAML header at the top of each Markdown or MDX source file. Put required values there: Manni does not see values Shoalrun adds later from defaults or a metadata provider. See [metadata customization](https://www.shoalrun.com/author/custom-metadata.md) for how Shoalrun combines those values.

4. ## Run Manni's native tools

   From the project root, run:

   ```sh
   npm run manni -- meta validate content --no-color
   npm run manni -- status
   npm run manni -- check
   ```

   `meta validate` checks your selected metadata schemas. `status` explains which tools are configured. `check` runs Manni's configured checks; adding configuration or relevant page metadata can expand that set.

   The launcher accepts any native command provided by the installed Manni version. Configure terminology, citations, structural checks, and other tools using [Manni's documentation](https://hawkeyexl.github.io/manni/). Each tool retains its native installation, metadata, and execution requirements. Access to the CLI does not activate those tools automatically.

5. ## Connect a selected check to Shoalrun

   Add an explicit command to `docs/docs.config.yaml`, preserving existing tests:

   ```yaml
   audit:
     tests:
       - id: manni-meta
         run: [node, scripts/manni.cjs, meta, validate, content, --config, manni.config.yaml, --no-color]
         inputs:
           - manni.config.yaml
           - scripts/manni.cjs
           - ../package.json
           - ../package-lock.json
   ```

   Commands run from the directory containing `docs.config.yaml`. The declared inputs are captured for isolated validation; changes to configuration or package pins make earlier validation evidence stale. Include local schema files in `inputs` if you add them. The command does not depend on generated `.shoalrun` files or a previous website build.

   Run the project audit from the project root:

   ```sh
   npx --no-install shoalrun audit docs/docs.config.yaml
   ```

   For [isolated authoring validation](https://www.shoalrun.com/author/workspace.md), capture a baseline before editing, then run:

   ```sh
   npx --no-install shoalrun docs baseline --config docs/docs.config.yaml --out .shoalrun/manni-baseline.json
   # Edit source pages or configuration.
   npx --no-install shoalrun docs validate --config docs/docs.config.yaml \
     --baseline .shoalrun/manni-baseline.json --run-checks
   ```

   Inspect the report's `test:manni-meta` result. A skipped, unavailable, or failed check is not a pass. This explicit audit command stays on metadata validation when you configure additional Manni tools. You can choose `check` as a broader project gate after reviewing its scope.

   Isolated validation captures source and declared inputs. It does not provide full Git history, a running application, a browser, or a model execution setup. Run tools needing those resources in a project workflow with that context. Source-writing commands are explicit author actions; review their changes before accepting them.

## Check the result

With the core schema selected, a page with `title` and `description` passes those required-field checks. A temporary draft missing `description` should fail with a diagnostic naming the field. Restore the description or remove the fixture after checking the failure path. Metadata validation does not rewrite source files.

## How this site uses Manni

Here are some ways we use Manni to check the docs you are reading. You can adopt the examples that suit your project.

**Catch broken glossary references.** Some pages list the glossary terms they discuss, such as “facet” or “reader view.” If an author types “reader veiw” in that list, the check fails because no such term exists. We check those lists against the [glossary](https://www.shoalrun.com/glossary.md), using its existing definitions. This does not check every word in the prose.

**Keep instructions complete.** On this page and the [content export guide](https://www.shoalrun.com/publish/content-export.md), we require prerequisites, named steps with instructions, and a final result check. The [getting-started tutorial](https://www.shoalrun.com/start.md) must cover setup, creating a page, navigation, and checking both outputs. Two common problems in [troubleshooting](https://www.shoalrun.com/publish/troubleshooting.md) must explain their cause and what to do. Removing one of those required sections makes the check fail.

**Try the quickstart commands.** A procedure test creates a disposable project and follows the quickstart's initialization, scaffolding, and build instructions. It uses the completed page and navigation examples from the guide, then checks the promised HTML, Markdown, and links. Manni runs this test through [Doc Detective](https://doc-detective.com/). Registry login, package downloading, and the long-running preview server remain manual steps.

**Check every published HTML page.** Manni opens each page in a browser and checks for problems such as unnamed buttons, missing image descriptions, and insufficient contrast. We use the build's page list, so pages outside navigation are checked too. This scan covers browser pages; Markdown and API downloads are separate resources.

**Find explanations that need another review.** Our metadata guide explains which settings win when a page and its project configuration provide different values. We connect that paragraph to the code that implements the behavior. Manni records both texts and flags a change to either one. A person then reviews whether the explanation still matches the code.

The glossary, structure, and quickstart procedure checks run when we audit our documentation. The accessibility scan runs against an existing build. The code citation check runs separately because it needs a copy of the framework source code. None of these checks are required for your own Shoalrun project.

### Run these checks in this documentation repository

These scripts belong to this site's documentation project:

```sh
npm run docs:terms
npm run docs:structure
npm run docs:procedures
```

The glossary script reads four definitions from the existing glossary and gives them to Manni. Pages identify their glossary references with `concepts` in their YAML headers. The structure check uses a Manni template that understands Shoalrun's `Steps` and `Step` components.

The procedure check uses the project's installed CLI and pinned Doc Detective dependency. It extracts selected commands and completed examples from the quickstart, runs them in a temporary directory, and removes the directory afterward. Doc Detective's automatic updates and telemetry are disabled for this check.

For accessibility, build once and scan that output:

```sh
npm run docs:build
npm run docs:a11y
```

The scan starts a temporary local server and checks every HTML page named in `documents.json`, including pages without navigation links. It fails on detected violations, skipped pages, or incomplete coverage. It reuses the built files and does not run another build. You can select another built directory with `SHOALRUN_BUILT_SITE`.

To check the connection between our metadata guide and its implementation, provide a framework source checkout. Replace `/path/to/shoalrun` with its location:

```sh
npm run docs:citations -- --repo framework=/path/to/shoalrun
```

The citation record is kept outside the published page. Review changes to the explanation and code before updating that record. It identifies the source version reviewed; it does not replace testing the installed Shoalrun package.

## Optional custom policies

You can add your own rules as a local JSON Schema in `meta.schemas`. For example, if a page records a review date, you might require a note explaining what was reviewed. Those fields and rules belong to your project; Manni does not require them.

Keep simple required-field, type, and enum rules in [Shoalrun's field declarations](https://www.shoalrun.com/author/custom-metadata.md). Add a custom Manni schema when you need conditional rules, and include that schema in the audit's captured inputs. A recorded verification date and note establish a metadata contract; they do not prove accuracy or freshness.
