import { inspectAuthoringProject, projectSections, ProjectToolError, projectToolFailure, readAuthoringSource, type ProjectOptions } from './authoring-project.js';

export function parseProjectOptions(command: 'project' | 'source', args: string[]) {
  const options: ProjectOptions = {};
  let config: string | undefined;
  const positional: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!flag.startsWith('--')) { positional.push(flag); continue; }
    if (seen.has(flag)) throw new ProjectToolError('invalid_input', `Duplicate ${flag}`);
    seen.add(flag);
    if (flag === '--json') continue;
    const allowed = command === 'project' ? ['--config', '--section', '--id', '--file', '--query', '--offset', '--limit', '--max-tokens'] : ['--config', '--offset', '--max-tokens'];
    const value = args[++i];
    if (!allowed.includes(flag) || !value || value.startsWith('--')) throw new ProjectToolError('invalid_input', `Unknown option or missing value for ${flag}`);
    if (flag === '--config') config = value;
    else if (['--offset', '--limit', '--max-tokens'].includes(flag)) {
      if (!/^\d+$/.test(value)) throw new ProjectToolError('invalid_input', `${flag} must be an integer`);
      options[flag === '--max-tokens' ? 'maxTokens' : flag === '--limit' ? 'limit' : 'offset'] = Number(value);
    } else if (flag === '--section') {
      if (!projectSections.includes(value as any)) throw new ProjectToolError('invalid_input', `Unknown section ${value}`);
      options.section = value as ProjectOptions['section'];
    } else options[flag.slice(2) as 'id' | 'file' | 'query'] = value;
  }
  if (command === 'project' && positional.length || command === 'source' && positional.length !== 1) throw new ProjectToolError('invalid_input', `Usage: shoalrun docs ${command}${command === 'source' ? ' <project-relative-file>' : ''} [--config FILE] [--json]`);
  return { config, options, file: positional[0] };
}

export async function runProjectCommand(command: 'project' | 'source', args: string[], discoverConfig: () => Promise<string>) {
  try {
    const parsed = parseProjectOptions(command, args);
    const config = parsed.config ?? await discoverConfig();
    const result = command === 'project' ? await inspectAuthoringProject(config, parsed.options) : await readAuthoringSource(config, parsed.file, parsed.options);
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (error) {
    process.stdout.write(JSON.stringify(projectToolFailure(error)) + '\n');
    process.exitCode = 1;
  }
}
