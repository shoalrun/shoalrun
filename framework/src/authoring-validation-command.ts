import { writeAuthoringBaseline, SnapshotError } from './authoring-snapshot.js';
import { authoringValidationStatus, validateAuthoringChanges, validationFailure, type ValidationOptions } from './authoring-validation.js';

export async function runValidationCommand(command: 'baseline' | 'validate' | 'validation-status', args: string[], discoverConfig: () => Promise<string>) {
  try {
    let config: string | undefined, output: string | undefined;
    const options: ValidationOptions = {};
    const positional: string[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < args.length; index++) {
      const flag = args[index];
      if (!flag.startsWith('--')) { positional.push(flag); continue; }
      if (!['--file', '--id'].includes(flag) && seen.has(flag)) throw new SnapshotError('invalid_input', `Duplicate ${flag}`);
      seen.add(flag);
      if (flag === '--json') continue;
      if (flag === '--run-checks' && command === 'validate') { options.runConfiguredChecks = true; continue; }
      const allowed = command === 'baseline' ? ['--config', '--out'] : command === 'validate' ? ['--config', '--file', '--id', '--baseline', '--artifacts'] : [];
      const value = args[++index];
      if (!allowed.includes(flag) || !value || value.startsWith('--')) throw new SnapshotError('invalid_input', `Unknown option or missing value for ${flag}`);
      if (flag === '--config') config = value;
      else if (flag === '--out') output = value;
      else if (flag === '--file') (options.files ??= []).push(value);
      else if (flag === '--id') (options.ids ??= []).push(value);
      else if (flag === '--baseline') options.baselineFile = value;
      else if (flag === '--artifacts') options.artifactsDirectory = value;
    }
    if (command === 'validation-status' ? positional.length !== 1 : positional.length !== 0) throw new SnapshotError('invalid_input', `Unexpected arguments for docs ${command}`);
    if (command === 'baseline' && !output) throw new SnapshotError('invalid_input', 'Usage: shoalrun docs baseline --out FILE [--config FILE]');
    const result = command === 'validation-status' ? await authoringValidationStatus(positional[0]) : command === 'baseline' ? await writeAuthoringBaseline(config ?? await discoverConfig(), output!) : await validateAuthoringChanges(config ?? await discoverConfig(), options);
    process.stdout.write(JSON.stringify(result) + '\n');
    if (result.status !== 'ok') process.exitCode = 1;
  } catch (error) {
    process.stdout.write(JSON.stringify(validationFailure(error)) + '\n');
    process.exitCode = 1;
  }
}
