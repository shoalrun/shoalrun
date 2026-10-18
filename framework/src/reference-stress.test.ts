import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { compile } from './compiler.js';
import { auditReference } from './reference-audit.js';
import { auditFocusedContracts } from './focused-audit.js';

const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/reference-stress');

test('synthetic reference stress project keeps its awkward API cases in both outputs', async t => {
  const source = path.join(fixture, 'apis/cedar-parcel.yaml');
  const audit = await auditReference(source);
  assert.equal(audit.status, 'ok');
  assert.equal(audit.operations, 6);
  assert.equal(audit.namedExamples, 11);

  const output = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-reference-stress-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  const manifest = await compile(path.join(fixture, 'docs.config.yaml'), output);
  assert.equal(manifest.documents.length, 8);
  const page = async (id: string) => {
    const document = manifest.documents.find(item => item.id === id);
    assert.ok(document, id);
    return {
      html: await readFile(path.join(output, document.url, 'index.html'), 'utf8'),
      markdown: await readFile(path.join(output, document.markdownUrl), 'utf8'),
      document
    };
  };

  const enrollment = await page('reference.cedar.createEnrollment');
  assert.equal(enrollment.document.subjectLifecycle, 'beta');
  assert.match(enrollment.html, /Local pickup.*6 properties/);
  assert.match(enrollment.html, /Use exactly one of these shapes:/);
  assert.match(enrollment.markdown, /Local pickup.*6 properties/);
  assert.match(enrollment.markdown, /Enrollment sandbox only/);
  assert.doesNotMatch(enrollment.markdown, /https:\/\/api\.cedar-parcel\.example\/v1/);
  assert.ok(enrollment.document.focusedContractUrl);
  const enrollmentContract = await readFile(path.join(output, enrollment.document.focusedContractUrl), 'utf8');
  assert.doesNotMatch(enrollmentContract, /EnrollmentBase/);

  const query = await page('reference.cedar.listParcels');
  assert.equal(query.document.subjectLifecycle, 'in-development');
  assert.match(query.html, /Filters<span class="api-parameter-in"> \(query\)<\/span>/);
  assert.match(query.markdown, /\?declaredValue\(gt\)=100/);
  assert.match(query.markdown, /##### text\/csv/);
  assert.match(query.markdown, /##### application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
  const curl = query.markdown.match(/```bash\n(curl[^`]+)```/)?.[1];
  assert.ok(curl);
  assert.match(curl, /\/Search\/parcels\/YOUR_SCOPE\?/);
  assert.doesNotMatch(curl, /parameters=/);

  const lookup = await page('reference.cedar.getParcel');
  assert.match(lookup.markdown, /No authentication required\./);
  assert.match(lookup.markdown, /lookup\.api\.cedar-parcel\.example/);
  assert.doesNotMatch(lookup.markdown, /sandbox\.api\.cedar-parcel\.example/);
  const legacy = await page('reference.cedar.getLegacyParcel');
  assert.equal(legacy.document.subjectLifecycle, 'deprecated');
  const webhook = await page('reference.cedar.parcelDelivered');
  assert.match(webhook.markdown, /Webhook: parcel\.delivered/);
  assert.doesNotMatch(webhook.markdown, /curl --request/);
  assert.ok(webhook.document.focusedContractUrl);
  const webhookContract = JSON.parse(await readFile(path.join(output, webhook.document.focusedContractUrl), 'utf8'));
  assert.ok(webhookContract.webhooks?.['parcel.delivered']);

  const focused = await auditFocusedContracts(output);
  assert.equal(focused.status, 'ok');
  assert.equal(focused.contracts, 6);
  await assert.rejects(stat(path.join(output, 'api/cedar/production/current/cedar-parcel.yaml')), { code: 'ENOENT' });
});
