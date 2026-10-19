import { readdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [directory, ...extra] = process.argv.slice(2);
if (!directory || extra.length) throw new Error('Usage: node check-skills.mjs <skills-directory>');
const validator = fileURLToPath(new URL('./vendor/skill-creator/quick_validate.py', import.meta.url));
const python = process.env.SKILL_VALIDATOR_PYTHON || 'python3';
const folders = [];
for (const entry of await readdir(directory, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const folder = path.resolve(directory, entry.name);
  await access(path.join(folder, 'SKILL.md'));
  folders.push(folder);
}
if (!folders.length) throw new Error('No skills found; validation did not run');
let failed = false;
for (const folder of folders.sort()) {
  const result = spawnSync(python, [validator, folder], { encoding: 'utf8' });
  console.log(`${path.basename(folder)}: ${(result.stdout || '').trim()}`);
  if (result.error || result.status !== 0) {
    console.error(result.error?.message || result.stderr || 'Skill validation failed');
    failed = true;
  }
}
if (failed) {
  console.error('Skill checks failed. Install Python 3 and scripts/requirements-skills.txt; SKILL_VALIDATOR_PYTHON can select a virtual environment.');
  process.exitCode = 1;
}
