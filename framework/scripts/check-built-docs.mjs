// Check the same output that documentation CI already compiled. This does not
// rebuild or execute configured project tests or external evaluation hooks.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../dist/config.js';
import { auditLinks } from '../dist/link-audit.js';
import { auditFocusedContracts } from '../dist/focused-audit.js';
import { checkOutputContract } from './check-output-contract.mjs';

export async function checkBuiltDocs(configFile, site) {
  const loaded = await loadConfig(path.resolve(configFile));
  const links = await auditLinks(site, loaded.value.site?.origin);
  const focused = await auditFocusedContracts(site);
  const contract = await checkOutputContract(site);
  const results = [
    { id: 'links', status: links.status, findings: links.findings, checked: links.checked },
    { id: 'focused-contracts', status: focused.status, findings: focused.failures },
    { id: 'output-contract', ...contract },
  ];
  return { status: results.some(result => result.status !== 'ok') ? 'error' : 'ok', results };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) throw new Error('Usage: node check-built-docs.mjs <config> <built-site>');
  const report = await checkBuiltDocs(process.argv[2], path.resolve(process.argv[3]));
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'ok') process.exitCode = 1;
}
