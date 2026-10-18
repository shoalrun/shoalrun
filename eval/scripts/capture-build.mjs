// Preserve the exact output to evaluate elsewhere; never regenerate grades.
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evalBuildSnapshot, prepareEvalReport } from '../../framework/dist/docs-eval.js';

export async function captureEvalBuild(site, tasks, destination, sourceCommit) {
  if (sourceCommit !== undefined && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(sourceCommit)) throw new Error('sourceCommit must be a full Git commit hash');
  const output = path.resolve(destination);
  const root = path.resolve(site);
  if (output === root || output.startsWith(root + path.sep)) throw new Error('Capture destination must be outside the built site');
  await mkdir(output); // Refuse to overwrite a captured evaluation build.
  const before = await evalBuildSnapshot(root);
  for (const [name] of before.fileDigests) {
    const target = path.join(output, 'site', name);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(root, name), target);
  }
  await copyFile(tasks, path.join(output, 'tasks.yaml'));
  const captured = await evalBuildSnapshot(path.join(output, 'site'));
  const after = await evalBuildSnapshot(root);
  if (before.buildDigest !== captured.buildDigest || before.buildDigest !== after.buildDigest) throw new Error('Build changed during capture; discard this capture and retry');
  await prepareEvalReport(path.join(output, 'site'), path.join(output, 'tasks.yaml'), path.join(output, 'report-template.json'));
  const inventory = { schemaVersion: 1, buildDigest: captured.buildDigest, files: captured.fileDigests };
  await writeFile(path.join(output, 'snapshot.json'), JSON.stringify(inventory, null, 2) + '\n');
  await writeFile(path.join(output, 'provenance.json'), JSON.stringify({ schemaVersion: 1, ...(sourceCommit ? { sourceCommit } : {}), platform: process.platform, arch: process.arch, node: process.version, buildDigest: captured.buildDigest }, null, 2) + '\n');
  // A new template is deliberately ungraded. Copy it before recording a real run.
  return { status: 'ok', buildDigest: captured.buildDigest, files: captured.files, output };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [site, tasks, output, sourceCommit, ...extra] = process.argv.slice(2);
  if (!site || !tasks || !output || extra.length) throw new Error('Usage: node eval/scripts/capture-build.mjs SITE TASKS OUTPUT [SOURCE-COMMIT]');
  console.log(JSON.stringify(await captureEvalBuild(site, tasks, output, sourceCommit), null, 2));
}
