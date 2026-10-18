import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Vale is the objective check on prose, exactly as Jev is the objective check on claims. A draft is written, Vale reports what
// breaks the project's style, and the findings go back to the model. The config never hardcodes rule names: it hands Vale the
// project's own config, so any package or style (Voices, Google, Microsoft, a private package) works unchanged.
export type ValeFinding = { rule: string; severity: string; message: string; line?: number; span?: [number, number]; match?: string };
export type ValeResult = { status: 'ok' | 'error' | 'unavailable'; findings: ValeFinding[]; error?: string };

const stringField = (value: unknown) => typeof value === 'string' ? value : '';

// Vale's JSON is a map of file path to alerts. Any other shape yields no findings, so a version change cannot crash a build.
export function parseValeAlerts(value: unknown): ValeFinding[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const findings: ValeFinding[] = [];
  for (const alerts of Object.values(value as Record<string, unknown>)) {
    if (!Array.isArray(alerts)) continue;
    for (const alert of alerts) {
      if (!alert || typeof alert !== 'object' || Array.isArray(alert)) continue;
      const item = alert as Record<string, unknown>;
      const severity = stringField(item.Severity).toLowerCase() || 'error';
      const span = Array.isArray(item.Span) && item.Span.length === 2 && item.Span.every(part => typeof part === 'number') ? [item.Span[0], item.Span[1]] as [number, number] : undefined;
      findings.push({
        rule: stringField(item.Check) || 'unknown',
        severity,
        message: stringField(item.Message),
        ...(typeof item.Line === 'number' ? { line: item.Line } : {}),
        ...(span ? { span } : {}),
        ...(item.Match !== undefined ? { match: stringField(item.Match) } : {})
      });
    }
  }
  return findings;
}

// A config problem (a missing StylesPath, an unknown style) comes back as one object with a Code and Text, not alerts.
const valeError = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  return typeof item.Code === 'string' && typeof item.Text === 'string' ? item.Text : undefined;
};

export type ValeOptions = { directory: string; files: string[]; config?: string; command?: string[]; signal?: AbortSignal };

// Run Vale once over the given files. A missing executable is `unavailable`, not a failure, so a project without Vale installed
// can still draft; it simply gets no style check and a note. Exit 1 with valid findings is a normal style failure.
export function runVale(options: ValeOptions): Promise<ValeResult> {
  const command = options.command ?? ['vale'];
  if (!command.length || !command[0]) throw new Error('The Vale command must name an executable');
  const args = [...command.slice(1), '--output=JSON', ...(options.config ? ['--config', options.config] : []), ...options.files];
  return new Promise(resolve => {
    const child = spawn(command[0], args, { cwd: options.directory, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const append = (target: 'out' | 'err') => (chunk: Buffer) => { if (target === 'out') out = (out + chunk.toString()).slice(-1_000_000); else err = (err + chunk.toString()).slice(-16000); };
    child.stdout.on('data', append('out'));
    child.stderr.on('data', append('err'));
    const abort = () => child.kill();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) child.kill();
    const done = (result: ValeResult) => { options.signal?.removeEventListener('abort', abort); resolve(result); };
    child.on('error', error => done({ status: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'unavailable' : 'error', findings: [], error: error.message }));
    child.on('close', (code, signal) => {
      let value: unknown;
      try { value = JSON.parse(out); }
      catch {
        // No JSON came back. Vale writes rich text when it cannot read the config or the files, so its message is the error.
        done({ status: 'error', findings: [], error: err.trim() || `Vale exited with code ${code} and produced no JSON` });
        return;
      }
      const configError = valeError(value);
      if (configError) { done({ status: 'error', findings: [], error: configError }); return; }
      const findings = parseValeAlerts(value);
      const validAlerts = value !== null && typeof value === 'object' && !Array.isArray(value)
        && Object.values(value).every(alerts => Array.isArray(alerts) && alerts.every(alert =>
          alert && typeof alert === 'object' && typeof alert.Check === 'string' && typeof alert.Message === 'string'
          && ['error', 'warning', 'suggestion'].includes(alert.Severity)));
      if (!validAlerts || signal || (code !== 0 && !(code === 1 && findings.length))) {
        done({ status: 'error', findings, error: err.trim() || (signal ? `Vale terminated by ${signal}` : `Vale exited with code ${code}${validAlerts ? ' without a successful check' : ' and produced invalid alerts'}`) });
        return;
      }
      done({ status: findings.some(finding => finding.severity === 'error') ? 'error' : 'ok', findings });
    });
  });
}

// A runner for one draft at a time. The content is written to a temporary page so Vale applies the same `[*.{md,mdx}]` rules it
// uses on authored files, then removed. `directory` is the project root so Vale finds the config's relative StylesPath.
export function createValeRunner(options: { directory: string; config?: string; command?: string[]; signal?: AbortSignal }) {
  return async (content: string): Promise<ValeResult> => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-vale-'));
    try {
      const file = path.join(directory, 'draft.mdx');
      await writeFile(file, content);
      return await runVale({ directory: options.directory, files: [file], config: options.config, command: options.command, signal: options.signal });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  };
}
