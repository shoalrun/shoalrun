import test from 'node:test';
import assert from 'node:assert/strict';
import { authoringHints } from './authoring-hints.js';
import { hasScaffoldPlaceholders } from './scaffold-placeholders.js';

test('related-reading hints identify manual document links without changing author intent', () => {
  for (const body of ['## Related reading\n\n[Install](doc:guide.install)', '### Related material\n\n- [Install][setup]\n\n[setup]: doc:guide.install']) {
    const hints = authoringHints(body, 'content/page.mdx');
    assert.equal(hints.length, 1);
    assert.equal(hints[0].severity, 'warning');
    assert.equal(hints[0].reference, 'guide.related-reading');
    assert.match(hints[0].nextAction, /guide.component.related-reading/);
  }
  for (const body of [
    '## Related reading\n\n[External](https://example.test)',
    '## Other section\n\n[Install](doc:guide.install)',
    '## Related reading\n\nText.\n\n## Other section\n\n[Install](doc:guide.install)',
    '## Related reading\n\n[Install](doc:guide.install)\n\n<RelatedReading />',
    '```md\n## Related reading\n\n[Install](doc:guide.install)\n```',
  ]) assert.deepEqual(authoringHints(body, 'page.mdx'), []);
});

test('scaffold prompts in code examples are literal while prose prompts still block publication', () => {
  for (const body of [
    '```md\n[[TODO: Explain the task.]]\n```',
    '~~~yaml\nsummary: "[[TODO: Explain the task.]]"\n~~~',
    '> ```md\n> [[TODO: Explain the task.]]\n> ```',
    '````md\n```md\n[[TODO: Explain the task.]]\n```\n````',
  ]) assert.equal(hasScaffoldPlaceholders(body), false, body);
  for (const body of ['[[TODO: Explain the task.]]', '## [[TODO: Name the task.]]', '```md\n[[TODO: Example.]]\n```\n\n[[TODO: Finish the introduction.]]']) assert.equal(hasScaffoldPlaceholders(body), true);
});
