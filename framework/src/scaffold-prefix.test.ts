import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { scaffoldFromPath } from './scaffold.js';

test('scaffold avoids repeating a publication prefix in the derived slug', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-scaffold-prefix-'));
  try {
    const config = path.join(root, 'docs.config.yaml');
    await writeFile(config, `schemaVersion: 1
site: { title: Example }
publications:
  defaults: { channel: production, version: v2, language: en }
  channels: { production: { pathPrefix: /prod } }
  versions: { v1: { pathPrefix: /v1 }, v2: { pathPrefix: /v2 } }
  enabled:
    - { channel: production, version: v1 }
    - { channel: production, version: v2 }
`);
    const defaultTarget = path.join(root, 'content/v2/check-payment.mdx');
    await scaffoldFromPath(config, 'guide', defaultTarget);
    assert.match(await readFile(defaultTarget, 'utf8'), /^slug: \/check-payment$/m);

    const overrideTarget = path.join(root, 'content/v1/check-payment.mdx');
    await scaffoldFromPath(config, 'guide', overrideTarget, { version: 'v1' });
    assert.match(await readFile(overrideTarget, 'utf8'), /^slug: \/check-payment$/m);

    const channelTarget = path.join(root, 'content/prod/v2/channel-check.mdx');
    await scaffoldFromPath(config, 'guide', channelTarget);
    assert.match(await readFile(channelTarget, 'utf8'), /^slug: \/channel-check$/m);

    const ordinaryTarget = path.join(root, 'content/guides/check-payment.mdx');
    await scaffoldFromPath(config, 'guide', ordinaryTarget);
    assert.match(await readFile(ordinaryTarget, 'utf8'), /^slug: \/guides\/check-payment$/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
