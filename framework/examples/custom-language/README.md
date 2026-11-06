# Custom language highlighting

Register a local TextMate JSON grammar under
`outputs.html.highlighting.languages`, then use its `id` or an `aliases` entry
as a fenced-code language. This example adds two illustrative keywords to
Python's existing syntax-color rules.

From this directory, with the CLI installed in your project:

```sh
npx --no-install shoalrun build docs.config.yaml site-dist
npx --no-install shoalrun serve site-dist --port 8770
```

From the framework repository root:

```sh
node framework/dist/cli.js build framework/examples/custom-language/docs.config.yaml /tmp/shoalrun-custom-language
node framework/dist/cli.js serve /tmp/shoalrun-custom-language --port 8770
```

Grammar paths resolve from the configuration file that declares them. The
compiler tracks those files as build dependencies; edit the grammar and rebuild,
or use `dev` for watched editing. Malformed or missing grammars fail the build
and preserve existing output. IDs and aliases can't replace bundled languages;
each grammar needs a distinct `scopeName`.

The resulting HTML contains syntax colors without loading the grammar in the
browser. Markdown keeps the original code and fence label. The grammar doesn't
validate programs or add autocomplete, filename-based language inference, or
editor integration. Replace this illustrative grammar with your language's
grammar and retain its applicable license notices.
