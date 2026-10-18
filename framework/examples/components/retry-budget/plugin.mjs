import { defineComponent, content as c } from '@shoalrun/cli/components';
import policy from './policy.json' with { type: 'json' };
import { validatePolicy, retrySchedule } from './model.js';

export default defineComponent({
  attributes: { title: { type: 'string', default: 'Retry budget' } },
  content({ attributes }) {
    if (!attributes.title.trim()) throw new Error('title must be nonempty');
    const model = validatePolicy(policy);
    const time = value => model.jitter === 'full' && value ? `0–${value} ms` : `${value} ms`;
    return {
      data: model,
      content: [
        c.paragraph(c.strong(attributes.title)),
        c.component('Callout', { type: 'warning', label: 'Before you retry' }, [c.paragraph(model.warning)]),
        c.paragraph('Configured policy. Attempts include the first request; only subsequent attempts wait. These are fictional example settings, not a Shoalrun service limit.'),
        c.table(['Setting', 'Value'], [
          ['Maximum attempts', String(model.attempts)], ['Base delay (ms)', String(model.baseDelayMs)], ['Delay cap (ms)', String(model.maxDelayMs)],
          ['Backoff', model.backoff], ['Jitter', model.jitter], ['Retryable HTTP statuses', model.retryableStatuses.join(', ')]
        ]),
        c.paragraph('Supported controls: 1–8 attempts, base delay from 1 to 60000 ms, and a delay cap from the base delay to 60000 ms. Backoff is constant or exponential. Jitter is none or full.'),
        c.paragraph('For retry number r starting at 1: constant delay = min(cap, base); exponential delay = min(cap, base × 2^(r − 1)). No jitter waits that delay. Full jitter samples uniformly from zero to that delay; its expected wait is half the delay. The calculator shows bounds, not a random prediction.'),
        c.paragraph('The configured schedule follows. Cumulative wait excludes request duration and any longer Retry-After wait.'),
        c.table(['Attempt', 'Wait before attempt', 'Cumulative wait'], retrySchedule(model).map(row => [String(row.attempt), time(row.delay), time(row.total)])),
        c.paragraph('This JavaScript calculates the delay bounds; your request handler must separately enforce retryable statuses, idempotency, and Retry-After.'),
        c.code(`function retryDelayBounds(retry, policy) {\n  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs *\n    (policy.backoff === 'constant' ? 1 : 2 ** (retry - 1)));\n  return policy.jitter === 'full' ? [0, ceiling] : [ceiling, ceiling];\n}`, 'js'),
        c.paragraph(c.link('Read the Retry-After HTTP specification', 'https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after'))
      ]
    };
  }
});
