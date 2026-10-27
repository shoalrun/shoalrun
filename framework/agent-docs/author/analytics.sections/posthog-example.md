---
id: guide.analytics
title: Bring your own analytics
summary: Send documentation interaction events to your analytics service through
  an optional browser adapter.
type: reference
area: quality
subarea: quality-analytics
canonical: /author/analytics
---

# Bring your own analytics

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Analytics

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/analytics.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Measure documentation tool calls separately from browser interactions.

Shoalrun sends documentation interactions to an analytics service through an **adapter**: a browser module you supply to initialize the service and deliver events. Analytics is off by default. Shoalrun includes no service SDK, storage, visitor identity, or delivery queue.

## PostHog example

This example sends native page views and page leaves to PostHog, with custom events for content interactions. The runnable adapter is `framework/examples/analytics/posthog.js`.

1. ### Install the SDK and bundler

   From your documentation project, install the browser SDK and a bundler:

   ```sh
   npm install posthog-js
   npm install --save-dev esbuild
   ```

2. ### Create the adapter

   Save this as `posthog.js` beside your config. Replace the public project token and ingestion host with values from PostHog’s web setup screen. Never use a personal API key in browser code.

   ```js title="posthog.js"
   import posthog from 'posthog-js';

   export function init({ page }) {
     posthog.init('phc_REPLACE_WITH_PUBLIC_PROJECT_TOKEN', {
       api_host: 'https://us.i.posthog.com', // Use your project's ingestion host.
       autocapture: false,
       capture_dead_clicks: false,
       capture_heatmaps: false,
       capture_performance: false,
       capture_exceptions: false,
       disable_surveys: true,
       capture_pageview: false,
       capture_pageleave: true,
       disable_scroll_properties: false,
       disable_session_recording: true,
       person_profiles: 'never',
     });
     // Super-properties persist across pages, including pages outside navigation tabs.
     if (!page.navigationSectionId) posthog.unregister('navigationSectionId');
     // These properties also accompany SDK-generated page-leave events.
     posthog.register({
       ...page,
       environment: ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname)
         ? 'development' : 'production',
     });
   }

   export function track(event) {
     posthog.capture(event.name === 'page_view' ? '$pageview' : event.name, {
       ...event.properties,
       shoalrunSchemaVersion: event.schemaVersion,
       environment: ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname)
         ? 'development' : 'production',
     });
   }
   ```

   The adapter maps `page_view` to `$pageview` and keeps other Shoalrun event names. Automatic page views are off to avoid duplicates. PostHog supplies `$pageleave` with scroll depth and duration. Generic click capture, replay, and person profiles are disabled.

   Use custom names in Product Analytics insights and funnels. Do not map them to `$autocapture`, which requires SDK-generated element metadata. PostHog adds properties and manages browser storage; review its [SDK configuration](https://posthog.com/docs/libraries/js/config) for consent and content security policy requirements.

3. ### Bundle and configure the module

   Bundle the adapter and SDK into the file Shoalrun will copy:

   ```sh
   npx esbuild posthog.js --bundle --format=esm --platform=browser --outfile=analytics.js
   ```

   Keep your dependency lockfile and rebundle after changing the adapter or SDK. Point your config at the output:

   ```yaml title="docs.config.yaml"
   analytics:
     module: ./analytics.js
   ```

   Build with your usual project command, or run the CLI from the same directory:

   ```sh
   shoalrun build docs.config.yaml dist
   ```

4. ### Verify events on localhost

   Serve the built site locally. In PostHog’s live event stream, filter by `environment = development` and include internal or test users. Open a page and look for one `$pageview`; switch a tab or copy code and check for `content_tab_change` or `code_copy`. Page views should also appear in **Web Analytics**.

   Scroll down, then follow a link to another page. Inspect the first page’s `$pageleave` properties:

   | Property                                | Meaning                                                               |
   | --------------------------------------- | --------------------------------------------------------------------- |
   | `$prev_pageview_max_scroll_percentage`  | Furthest scroll position, from `0` to `1`; `1` means the bottom.      |
   | `$prev_pageview_max_content_percentage` | Fraction of document height reached by the viewport, from `0` to `1`. |
   | `$prev_pageview_duration`               | Seconds the page was open.                                            |

   These measure the document, excluding scrolling within code panes. Time open does not prove active reading, and page-leave delivery is best effort. For visual scrollmaps, configure [PostHog heatmaps](https://posthog.com/docs/toolbar/heatmaps) separately; some engagement metrics require generic autocapture.

   If events are missing, check consent, browser blockers, and network requests. Exclude development traffic from production reports or use a separate development project.
