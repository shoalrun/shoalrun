# Notification ingredient and recipe drafts

`queue-welcome-email.mdx` is a generated API ingredient draft. Its source is
`../ingredient-specs/queue-welcome-email.yaml` plus the configured
`notifications.send-email` OpenAPI operation. It copies the example request
and queued response; it does not send an email or prove delivery.

The authored ingredients under `../ingredients/` declare their inputs, outputs,
shared prerequisites, and continuation checks in `workflow` frontmatter.
`../recipe-specs/send-welcome-email.yaml` combines them into the generated
`../recipe-drafts/send-welcome-email.mdx`. The published example is
`../content/welcome-email.mdx`, with the draft notice and review checklist removed.

Run `node framework/example-configs/notifications/demo.mjs` from the repository
root for a local simulation. It sends no mail. The first status lookup returns
queued; the next returns delivered, or failed for `blocked@example.com`.
The welcome-email cookbook offers an acceptance-only path and a complete
delivery path. Both are covered by an integration test using the published
shell commands.

From the repository root, build the CLI and compare the drafts with their
inputs:

```sh
npm --prefix framework run build
node framework/dist/cli.js ingredient draft \
  --config framework/example-configs/notifications/docs.config.yaml \
  --spec framework/example-configs/notifications/ingredient-specs/queue-welcome-email.yaml \
  --out framework/example-configs/notifications/ingredient-drafts/queue-welcome-email.mdx \
  --check
node framework/dist/cli.js recipe draft \
  --config framework/example-configs/notifications/docs.config.yaml \
  --spec framework/example-configs/notifications/recipe-specs/send-welcome-email.yaml \
  --out framework/example-configs/notifications/recipe-drafts/send-welcome-email.mdx \
  --check
```

`--check` reports `unchanged`, `would-create`, or `would-change` and prints the
proposed content. Without `--check`, each command creates a new file and
refuses to overwrite an existing one. A custodian reviews and tests the whole
workflow before publishing a recipe.
