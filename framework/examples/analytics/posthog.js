// Bundle before configuring this adapter; see README.md.
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
