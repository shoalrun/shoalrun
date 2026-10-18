import path from 'node:path';
import { bundledDocumentation, DocumentationError, documentationFailure, getDocumentationOutline, getDocumentationSection, getDocumentationPage, searchDocumentation, type DocumentationOptions } from './documentation-core.js';

export function parseDocsReadOptions(args: string[], mcp = false) {
  let directory = bundledDocumentation;
  let json = false;
  const options: DocumentationOptions = {};
  const positional: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!flag.startsWith('--')) { positional.push(flag); continue; }
    if (seen.has(flag)) throw new DocumentationError('invalid_input', `Duplicate ${flag}`);
    seen.add(flag);
    if (flag === '--json' && !mcp) { json = true; continue; }
    const value = args[++i];
    if (!(mcp ? ['--site'] : ['--site', '--max-tokens', '--limit', '--channel', '--version', '--language']).includes(flag) || !value || value.startsWith('--')) throw new DocumentationError('invalid_input', `Unknown option or missing value for ${flag}`);
    if (flag === '--site') directory = path.resolve(value);
    else if (flag === '--max-tokens' || flag === '--limit') {
      if (!/^\d+$/.test(value)) throw new DocumentationError('invalid_input', `${flag} must be an integer`);
      options[flag === '--limit' ? 'limit' : 'maxTokens'] = Number(value);
    } else options[flag.slice(2) as 'channel' | 'version' | 'language'] = value;
  }
  return { directory, json, options, positional };
}

export async function runDocsReadCommand(command: 'search' | 'read' | 'outline' | 'section', args: string[]) {
  let json = args.includes('--json') || command !== 'read';
  try {
    const parsed = parseDocsReadOptions(args);
    json = json || parsed.json;
    if (!parsed.positional.length || command !== 'search' && parsed.positional.length !== (command === 'section' ? 2 : 1) || command !== 'search' && parsed.options.limit !== undefined) throw new DocumentationError('invalid_input', `Usage: shoalrun docs ${command} <${command === 'search' ? 'query' : command === 'section' ? 'document-id> <section-id' : 'document-id'}> [--site DIRECTORY] [--json] [--max-tokens N] [--channel C --version V --language L]${command === 'search' ? ' [--limit N]' : ''}`);
    const result = command === 'search'
      ? await searchDocumentation(parsed.directory, parsed.positional.join(' '), parsed.options)
      : command === 'outline' ? await getDocumentationOutline(parsed.directory, parsed.positional[0], parsed.options)
      : command === 'section' ? await getDocumentationSection(parsed.directory, parsed.positional[0], parsed.positional[1], parsed.options)
      : await getDocumentationPage(parsed.directory, parsed.positional[0], parsed.options);
    if (json) process.stdout.write(JSON.stringify(result) + '\n');
    else {
      process.stdout.write('content' in result ? result.content : '');
      if (result.budget.truncated) process.stderr.write('Page truncated by --max-tokens; increase the limit or use --json for budget metadata.\n');
    }
  } catch (error) {
    const output = JSON.stringify(documentationFailure(error)) + '\n';
    (json ? process.stdout : process.stderr).write(output);
    process.exitCode = 1;
  }
}
