import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const docsHelp = `Usage: shoalrun docs <command>

Read bundled references (no project or provider key required):
  search <query> [--json]
  read <document-id> [--json]

Inspect a project:
  project [--config FILE] [--section pages|guidance|configuration|navigation|relationships|templates|findings]
  source FILE [--config FILE]
  context <document-id> [--config FILE]

Validate and preview edits:
  baseline --out FILE [--config FILE]
  validate (--baseline FILE | --file FILE | --id ID) [--config FILE]
  validation-status REPORT
  review REPORT [--format json|markdown]
  preview REPORT [--port PORT]

Other authoring tools: changes, plan, apply, mcp.
Discover packaged agent guidance with shoalrun skills list.
`;

export const skillsHelp = `Usage: shoalrun skills list [--json]
       shoalrun skills read <name> [--json]

List the names, descriptions and local paths of packaged skills, or read a skill.
These commands do not install skills or require a project or provider key.
`;

export const cliHelp = `Usage: shoalrun <command>

Start and build:
  init [directory] [--starter minimal|api-docs|showcase]
  build [config] [output]
  export [config] --out DIRECTORY [--target NAME]
  dev [config] [output] [--port PORT]
  serve <site-directory> [--host HOST] [--port PORT]
  check [config] [--json]
  audit [config]
  scaffold <template> -n <target> [--config FILE]

Agent guidance and offline documentation:
  skills list [--json]
  skills read <name> [--json]
  docs search <query> [--json]
  docs read <document-id> [--json]
  docs project [--config FILE]
  docs baseline --out FILE [--config FILE]
  docs validate (--baseline FILE | --file FILE | --id ID) [--config FILE]
  docs review REPORT [--format json|markdown]
  docs preview REPORT [--port PORT]

Other commands: config, api, operation, ingredient, recipe, search, index,
ask, answers, ask-log, chat, eval, vercel.
Run shoalrun docs --help or shoalrun skills --help for discovery commands.
`;

const skillDirectory = fileURLToPath(new URL('../skills/', import.meta.url));

export async function runSkillsCommand(args: string[]): Promise<string> {
  const json = args.includes('--json');
  const positional = args.filter(arg => arg !== '--json');
  const [command = 'list', name] = positional;
  if (args.filter(arg => arg === '--json').length > 1 ||
      !(command === 'list' && positional.length <= 1 || command === 'read' && positional.length === 2)) throw new Error(skillsHelp.trim());
  const skills = [];
  for (const entry of (await readdir(skillDirectory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const file = path.join(skillDirectory, entry.name, 'SKILL.md');
    const content = await readFile(file, 'utf8');
    const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
    const metadata = header ? parse(header[1]) : undefined;
    if (!metadata || typeof metadata.name !== 'string' || typeof metadata.description !== 'string') throw new Error(`Invalid packaged skill: ${entry.name}`);
    skills.push({ name: metadata.name, description: metadata.description, file });
  }
  if (command === 'list') return JSON.stringify({ schemaVersion: 1, status: 'ok', skills }, null, 2) + '\n';
  const skill = skills.find(skill => skill.name === name);
  if (!skill) throw new Error(`Unknown packaged skill ${name}; run shoalrun skills list`);
  const content = await readFile(skill.file, 'utf8');
  return json ? JSON.stringify({ schemaVersion: 1, status: 'ok', ...skill, content }, null, 2) + '\n' : content;
}
