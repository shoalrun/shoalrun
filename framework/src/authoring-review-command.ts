import { authoringReview, authoringReviewMarkdown } from './authoring-review.js';
import { startAuthoringPreview } from './authoring-preview.js';
import { SnapshotError } from './authoring-snapshot.js';
import { validationFailure } from './authoring-validation.js';

export async function runAuthoringReviewCommand(command: 'review' | 'preview', args: string[]) {
  try {
    const positional: string[] = [], seen = new Set<string>();
    let format = 'json', port: number | undefined;
    for (let index = 0; index < args.length; index++) {
      const flag = args[index];
      if (!flag.startsWith('--')) { positional.push(flag); continue; }
      if (seen.has(flag)) throw new SnapshotError('invalid_input', `Duplicate ${flag}`);
      seen.add(flag);
      if (flag === '--json') continue;
      const value = args[++index];
      if (command === 'review' && flag === '--format' && ['json', 'markdown'].includes(value)) format = value;
      else if (command === 'preview' && flag === '--port' && /^\d+$/.test(value ?? '')) port = Number(value);
      else throw new SnapshotError('invalid_input', `Unknown option or invalid value for ${flag}`);
    }
    if (positional.length !== 1) throw new SnapshotError('invalid_input', `Usage: shoalrun docs ${command} REPORT${command === 'review' ? ' [--format json|markdown]' : ' [--port PORT]'}`);
    if (command === 'review') {
      const review = await authoringReview(positional[0]);
      process.stdout.write(format === 'markdown' ? authoringReviewMarkdown(review) : JSON.stringify(review) + '\n');
      if (review.status !== 'ok') process.exitCode = 1;
    } else {
      const preview = await startAuthoringPreview(positional[0], { port });
      const { server, review, close, ...connection } = preview;
      let validation;
      try { validation = await review(); }
      catch (error) { await close(); throw error; }
      const stop = async () => {
        process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
        try { await close(); process.stdout.write(JSON.stringify({ schemaVersion: 1, kind: 'shoalrun-authoring-preview', status: 'stopped', snapshotId: preview.snapshotId, directoryRemoved: preview.directory, validationArtifactsRetained: true }) + '\n'); }
        catch (error) { process.stdout.write(JSON.stringify(validationFailure(error)) + '\n'); process.exitCode = 1; }
      };
      process.once('SIGINT', stop); process.once('SIGTERM', stop);
      process.stdout.write(JSON.stringify({ ...connection, status: 'serving', validation }) + '\n');
    }
  } catch (error) { process.stdout.write(JSON.stringify(validationFailure(error)) + '\n'); process.exitCode = 1; }
}
