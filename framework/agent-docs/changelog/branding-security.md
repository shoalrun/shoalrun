---
id: change.branding-security
title: Branding guidance and safer hosted chat
summary: Match your documentation to your brand with an agent skill, and bind
  hosted-chat visitor checks to the intended site.
type: changelog-entry
area:
  - appearance
  - discovery
  - project
subarea:
  - appearance-themes
  - discovery-chat
  - project-releases
canonical: /changelog/branding-security
date: 2026-11-05
releaseVersion: 0.1.0-alpha.19
---

# Branding guidance and safer hosted chat

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Project](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project](https://www.shoalrun.com/status.md) > Changelog > alpha.19: Branding and security

**Published: 2026-11-05.**

**Version: 0.1.0-alpha.19.**

Give your coding agent the `shoalrun-brand` skill to match a documentation site to your brand. It guides the agent through colors, fonts, logos, theme settings, and CSS, then checks menus, search results, buttons, keyboard focus, and mobile layouts for readability.

Upgrade to CLI `0.1.0-alpha.19`. Rebuild and redeploy hosted chat to apply its new visitor checks. You don't need provider credentials to read the skill or brand a local site.

## Match a documentation site to your brand

Ask your agent to read the skill:

```sh
npx --no-install shoalrun skills read shoalrun-brand
```

The skill works from a supplied website, brand guide, or assets. It uses supported configuration first and project CSS where needed. It keeps brand assets in your project and preserves the documentation, navigation, and routes. It checks both the page and interactive surfaces: a dark header can contain light inputs, dropdowns, and search results that need their own text colors.

The agent builds and previews the result for review. See [themes and fonts](https://www.shoalrun.com/styling/themes.md) and the [CSS reference](https://www.shoalrun.com/author/css.md) for the configuration it uses.

## Keep visitor checks tied to the intended site

Hosted chat checks the hostname returned by Turnstile rather than accepting a successful response alone. By default, the accepted names come from the site's trusted deployment addresses. You can supply an exact `chat.challenge.hostnames` list and an optional `action` for this operation.

A session pass is now tied to the hostname/action policy as well as the caller. A pass from a different policy can't skip the check, even when deployments share a secret. Changing the policy invalidates existing passes; the next required check gives the visitor a new one.

Local public preview handles the published dummy-token response separately from production verification. Hosted test previews need matching test credentials and a separate usage store. See [Host and limit documentation chat](https://www.shoalrun.com/chat/host.md) for the settings and preview behavior.

## Check dependencies and hosting policy

Coordinated releases now check both the framework and documentation dependency graphs, including development tools. The documentation site's browser tools and affected dependencies are updated without forcing an incompatible package version.

The documentation site also restricts framing to the same origin, sets an explicit referrer policy, and checks the required headers after deployment. Its broader Content Security Policy starts in report-only mode: browser violations can be reviewed before enforcement, and that policy doesn't yet block scripts. These settings belong to this site; they aren't compiler defaults for customer sites.

The repository and package READMEs now cover product versions, customer editions, branding, application content delivery, and agent workflows.

## HTML, Markdown, and agents

Branding changes the HTML site's appearance and interaction states. Markdown retains the documentation and examples without fonts, colors, menus, or focus styles. Agents read the packaged skill and bundled references, edit project source, validate the result, and share a local preview. A successful build doesn't replace visual checks of the browser output.
