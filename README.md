# Shoalrun

Shoalrun builds a documentation website and Markdown pages from the same Markdown and MDX source. People get navigation, search, and interactive components. Agents get readable documentation with the same instructions, examples, and API details.

Write pages in your editor or with your coding agent, preview them locally, then publish the generated site. Shoalrun includes starter projects, native documentation components, agent skills, and an offline copy of its own documentation.

[Read the documentation](https://www.shoalrun.com) · [Install the CLI](framework/README.md#install) · [Agent workflow](framework/README.md#work-with-an-agent)

## Try it from this checkout

Use Node.js 22.12 or newer. From the repository root:

```sh
npm ci --prefix framework
npm --prefix framework run build
node framework/dist/cli.js init my-docs --starter minimal
node framework/dist/cli.js build my-docs/docs.config.yaml my-docs/site-dist
node framework/dist/cli.js serve my-docs/site-dist --port 8770
```

Open <http://127.0.0.1:8770/>. Edit pages in `my-docs/content/`; configure the site and navigation in `my-docs/docs.config.yaml`. Build again to update the preview. Use the `api-docs` starter for an example with an OpenAPI source.

For a separate documentation project, follow the [package installation instructions](framework/README.md). The CLI is currently a private alpha on GitHub Packages and requires package read access. A basic local site needs no model provider.

## Work with an agent

Your existing coding agent can use the skills and references included with Shoalrun. From this checkout:

```sh
node framework/dist/cli.js skills list
node framework/dist/cli.js skills read shoalrun-setup
node framework/dist/cli.js docs search "Steps" --json
```

The authoring tools let an agent inspect a project, validate changes in an isolated copy, and produce a local preview. See the [package README](framework/README.md#work-with-an-agent) for the editing workflow and the [command reference](framework/AUTHORING.md) for detailed contracts.

## Develop the framework

The CLI source is in `framework/src/`. Runnable starters are in `framework/example-configs/`, and component examples are in `framework/examples/`. Website content is maintained separately in [shoalrun/docs](https://github.com/shoalrun/docs).

After installing dependencies and building as above:

```sh
npm run test:compiled
npm run authoring:package-check
```

`npm test` builds and runs the full suite. Reuse compiled output for follow-up checks when source inputs are unchanged. Browser tests need Chrome or Puppeteer's development browser; documentation formatting tests use Vale 3.20 or newer. The package check installs a local tarball with fresh production dependencies and needs npm registry access.

The bundled documentation is a pinned import with provenance in `framework/agent-docs/SNAPSHOT.json`. To update it, export a reviewed snapshot from the docs repository, then run `npm run agent-docs:import -- PATH --source-commit FULL_DOCS_COMMIT`. Builds never fetch the latest website content. Portable evaluation tools live in `eval/`; provider-backed studies are opt-in.

Validation runs locally. Pushes, package releases, and website deployments are separate actions; no hosted workflow runs automatically.

## License

[Apache-2.0](LICENSE). Authored site content keeps its own license.
