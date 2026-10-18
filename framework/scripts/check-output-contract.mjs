// Validate an existing build. This command never builds, writes artifacts, or contacts a host.
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { canonicalJson } from '../dist/document-sync.js';
import { markdownSize } from '../dist/markdown-size.js';

const schemas = await Promise.all(['manifest', 'sync'].map(async name => JSON.parse(await readFile(new URL(`../schemas/${name}.schema.json`, import.meta.url), 'utf8'))));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const schema of schemas) ajv.addSchema(schema);
const validators = schemas.map(schema => ajv.getSchema(schema.$id));
const hash = value => createHash('sha256').update(value).digest('hex');
const identity = doc => JSON.stringify([doc.id, doc.variant.channel, doc.variant.version, doc.variant.language]);

export function validateOutputMetadata(manifest, snapshot, buildInfo) {
  const findings = [];
  for (const [index, value] of [manifest, snapshot].entries()) {
    const validate = validators[index];
    if (!validate(value)) for (const error of validate.errors) findings.push(`${index ? 'documents.sync.json' : 'documents.json'}${error.instancePath}: ${error.message}${error.params.missingProperty ? ` (${error.params.missingProperty})` : ''}`);
  }
  if (findings.length) return findings;
  if (manifest.buildId !== snapshot.buildId) findings.push('Manifest and sync buildId differ');
  if (!buildInfo || buildInfo.schemaVersion !== 1 || buildInfo.buildId !== manifest.buildId || buildInfo.configDigest !== manifest.configDigest) findings.push('build-info.json does not match manifest schemaVersion, buildId, and configDigest');
  const { documents, dependencies, buildId, ...metadata } = manifest;
  if (hash(canonicalJson(metadata)) !== snapshot.metadataDigest) findings.push('Sync metadataDigest does not match manifest metadata');
  const records = new Map();
  for (const doc of documents) {
    const key = identity(doc);
    if (records.has(key)) findings.push(`Duplicate manifest identity: ${key}`);
    records.set(key, doc);
  }
  const tabs = new Map();
  for (const tab of manifest.navigationTabs ?? []) {
    const key = identity(tab);
    if (tabs.has(key)) findings.push(`Duplicate navigation tab identity: ${key}`);
    tabs.set(key, tab);
    const landing = documents.find(doc => doc.url === tab.url && identity({ id: tab.id, variant: doc.variant }) === key);
    if (!landing || landing.markdownUrl !== tab.markdownUrl || landing.navigationTab?.id !== tab.id) findings.push(`${key}: navigation landing does not belong to its section`);
  }
  for (const doc of documents) if (doc.navigationTab) {
    const tab = tabs.get(identity(doc.navigationTab));
    if (!tab || canonicalJson(tab) !== canonicalJson(doc.navigationTab) || canonicalJson(tab.variant) !== canonicalJson(doc.variant)) findings.push(`${identity(doc)}: navigation section does not match the publication catalog`);
  }
  const seen = new Set();
  let previousIdentity;
  for (const record of snapshot.documents) {
    const key = identity(record);
    if (previousIdentity !== undefined && key < previousIdentity) findings.push('Sync records are not sorted by identity tuple');
    previousIdentity = key;
    if (seen.has(key)) findings.push(`Duplicate sync identity: ${key}`);
    seen.add(key);
    const doc = records.get(key);
    if (!doc) { findings.push(`Sync identity missing from manifest: ${key}`); continue; }
    for (const field of ['url', 'markdownUrl', 'digest', 'contentDigest']) if (record[field] !== doc[field]) findings.push(`${key}: sync ${field} differs from manifest`);
    if (record.recordDigest !== hash(canonicalJson(doc))) findings.push(`${key}: recordDigest does not match full manifest record`);
  }
  for (const [key, doc] of records) {
    if (doc.updated !== undefined) {
      const calendar = doc.updated.slice(0, 10);
      const parsed = Date.parse(`${calendar}T00:00:00Z`);
      if (Number.isNaN(Date.parse(doc.updated)) || Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== calendar) findings.push(`${key}: updated must be a real calendar date or timezone-qualified ISO timestamp`);
    }
    if (!seen.has(key)) findings.push(`Manifest identity missing from sync: ${key}`);
    const sections = new Set();
    for (const section of doc.sections) {
      if (sections.has(section.id)) findings.push(`${key}: duplicate section id ${section.id}`);
      sections.add(section.id);
      if (section.parentDigest !== doc.digest || section.parentMarkdownUrl !== doc.markdownUrl) findings.push(`${key}/${section.id}: section parent linkage differs from manifest`);
    }
    const targets = [...(doc.change?.affects ?? []), ...(doc.change?.migration ? [doc.change.migration] : []), ...['replacement', 'migration'].flatMap(field => doc.subjectDeprecation?.[field] ? [doc.subjectDeprecation[field]] : [])];
    if (doc.change && new Set(doc.change.affects.map(target => target.id)).size !== doc.change.affects.length) findings.push(`${key}: duplicate change affects identity`);
    for (const target of targets) {
      const resolved = records.get(identity({ id: target.id, variant: doc.variant }));
      if (!resolved || resolved.id === doc.id || ['title', 'url', 'markdownUrl'].some(field => resolved[field] !== target[field])) findings.push(`${key}: target ${target.id} does not resolve to another matching document in the same publication`);
    }
    const dates = doc.subjectDeprecation;
    if (dates?.deprecatedOn && dates?.sunsetOn && dates.sunsetOn < dates.deprecatedOn) findings.push(`${key}: sunsetOn precedes deprecatedOn`);
  }
  return findings;
}

export async function checkOutputContract(site) {
  const findings = [];
  let documents = 0, sections = 0;
  try {
    const root = await realpath(path.resolve(site));
    const readArtifact = async route => {
      if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//') || /[\\?#\x00-\x20]/.test(route) || route.split('/').includes('..')) throw new Error(`Invalid artifact route: ${route}`);
      const file = await realpath(path.resolve(root, route.slice(1)));
      if (!file.startsWith(`${root}${path.sep}`)) throw new Error(`Artifact leaves build directory: ${route}`);
      return readFile(file);
    };
    const [manifest, snapshot, buildInfo] = await Promise.all(['/documents.json', '/documents.sync.json', '/build-info.json'].map(async route => JSON.parse(await readArtifact(route))));
    findings.push(...validateOutputMetadata(manifest, snapshot, buildInfo));
    // Do not dereference malformed structures. Metadata errors are already actionable.
    if (findings.length) return { status: 'error', findings, documents, sections };
    documents = manifest.documents.length;
    for (const tab of manifest.navigationTabs ?? []) {
      try {
        const index = (await readArtifact(tab.indexUrl)).toString('utf8');
        for (const doc of manifest.documents.filter(doc => doc.navigationTab?.indexUrl === tab.indexUrl)) {
          if (!index.includes(doc.markdownUrl)) findings.push(`${tab.indexUrl}: missing section member ${doc.id}`);
        }
      } catch (error) { findings.push(`${tab.indexUrl}: ${error.message}`); }
    }
    const checkBytes = async (route, expected, markdown) => {
      try {
        const bytes = await readArtifact(route);
        if (hash(bytes) !== expected.digest) findings.push(`${route}: digest does not match artifact bytes`);
        if (bytes.length !== expected.bytes) findings.push(`${route}: byte count does not match artifact bytes`);
        if (markdown) {
          const measured = markdownSize(bytes.toString('utf8'));
          if (measured.markdownTokens !== expected.tokens || measured.markdownTokenEncoding !== expected.encoding) findings.push(`${route}: token count or encoding does not match Markdown`);
        }
      } catch (error) { findings.push(`${route}: ${error.message}`); }
    };
    for (const doc of manifest.documents) {
      for (const resource of [doc, ...doc.sections]) await checkBytes(resource.markdownUrl, { digest: resource.digest, bytes: resource.markdownBytes, tokens: resource.markdownTokens, encoding: resource.markdownTokenEncoding }, true);
      sections += doc.sections.length;
      if (doc.focusedContractUrl) await checkBytes(doc.focusedContractUrl, { digest: doc.focusedContractDigest, bytes: doc.focusedContractBytes }, false);
    }
  } catch (error) { findings.push(error.message); }
  return { status: findings.length ? 'error' : 'ok', findings, documents, sections };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) {
    console.error('Usage: node framework/scripts/check-output-contract.mjs <built-site>');
    process.exitCode = 1;
  } else {
    const report = await checkOutputContract(process.argv[2]);
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== 'ok') process.exitCode = 1;
  }
}
