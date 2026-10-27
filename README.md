# Shoalrun

Shoalrun builds a documentation website and Markdown pages from the same Markdown and MDX source. People get navigation, search, and interactive components. Agents get readable documentation with the same instructions, examples, and API details.

Write pages in your editor or with your coding agent, preview them locally, then publish the generated site. Shoalrun includes starter projects, native documentation components, agent skills, and an offline copy of its own documentation.

[Read the documentation](https://www.shoalrun.com) · [Install the CLI](framework/README.md#install) · [Agent workflow](framework/README.md#work-with-an-agent)

## Try it from this checkout

Use Node.js 22.12 or newer. From the repository root:

```sh
npm ci --prefix framework
npm --prefix framework run build
node framework/dist/cli.js init my-docs --starter showcase
node framework/dist/cli.js build my-docs/docs.config.yaml my-docs/site-dist
node framework/dist/cli.js serve my-docs/site-dist --port 8770
```

Open <http://127.0.0.1:8770/> and choose **Explore the starter**, the first item in the left navigation. The fictional Cedar Parcel handbook demonstrates components, diagrams, reader views, themes, and generated API references. Its API hosts are examples; replace them before sending requests.

Edit a page in `my-docs/content/`, then run the build command again and refresh the preview. Configure the site and navigation in `my-docs/docs.config.yaml`. Choose `minimal` for a small starting point or `api-docs` for a focused OpenAPI example. All three starters build without provider credentials.

For a separate documentation project, follow the [package installation instructions](framework/README.md). The alpha CLI is distributed through the public npm registry; installing it needs no account or token. A basic local site needs no model provider.

## Work with an agent

Your existing coding agent can use the skills and references included with Shoalrun. From this checkout:

```sh
node framework/dist/cli.js skills list
node framework/dist/cli.js skills read shoalrun-setup
node framework/dist/cli.js docs search "Steps" --json
```

The authoring tools let an agent inspect a project, validate changes in an isolated copy, and produce a local preview. See the [package README](framework/README.md#work-with-an-agent) for the editing workflow and the [command reference](framework/AUTHORING.md) for detailed contracts.

## Develop the framework

The CLI source is in `framework/src/`. Runnable starters are in `framework/example-configs/`, and component examples are in `framework/examples/`. The [documentation website](https://www.shoalrun.com) is maintained separately. Report documentation problems in this repository's issues; access to the website source is not required to report a problem.

After installing dependencies and building as above:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r framework/scripts/requirements-skills.txt
export SKILL_VALIDATOR_PYTHON="$PWD/.venv/bin/python"
npm run test:compiled
npm run authoring:package-check
```

`npm test` builds and runs the full suite. Reuse compiled output for follow-up checks when source inputs are unchanged. Browser tests need Chrome or Puppeteer's development browser; documentation formatting tests use Vale 3.20 or newer. The test commands also run the bundled OpenAI skill validator against every packaged skill. Set `SKILL_VALIDATOR_PYTHON` to use a Python virtual environment.

The package check installs a local tarball with fresh production dependencies and needs npm registry access.

The bundled documentation is a pinned import with provenance in `framework/agent-docs/SNAPSHOT.json`. To update it, export a reviewed snapshot from the docs repository, then run `npm run agent-docs:import -- PATH --source-commit FULL_DOCS_COMMIT`. Builds never fetch the latest website content. Portable evaluation tools live in `eval/`; provider-backed studies are opt-in.

Validation runs locally. Pushes, package releases, and website deployments are separate actions; no hosted workflow runs automatically.

Shoalrun is maintainer-led and does not accept unsolicited pull requests at this time. Bug reports are welcome, with no guaranteed response time. Read the [contribution policy](CONTRIBUTING.md) and [security policy](SECURITY.md) before reporting a problem.

## Alpha status

Shoalrun is an alpha. Configuration, commands, programmatic APIs, and generated output may change between alpha versions; older release lines are not maintained. Pin an exact version, read the [changelog](framework/CHANGELOG.md), and rebuild and check your site before deploying an upgrade.

Local site builds, previews, lexical search, and bundled documentation do not need a model provider. Semantic search and generated answers require separately configured services and credentials. Browser-based checks require Chrome; ordinary site builds do not. Custom plugins and configured validation commands execute trusted project code; see the [security policy](SECURITY.md).

The [release checklist](RELEASING.md) records the checks needed before a public release. The package README includes migration instructions for users of the earlier GitHub Packages alpha.

## License

[Apache-2.0](LICENSE). Authored site content keeps its own license.
