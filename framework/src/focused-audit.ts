import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

export async function auditFocusedContracts(siteDirectory: string) {
  const root = path.resolve(siteDirectory);
  const manifest = JSON.parse(await readFile(path.join(root, 'documents.json'), 'utf8'));
  const pages = manifest.documents.filter((doc: any) => doc.focusedContractUrl);
  const failures: Array<{ documentId: string; message: string }> = [];
  let totalBytes = 0;
  let largestBytes = 0;
  for (const page of pages) {
    try {
      const route = page.focusedContractUrl;
      if (!/^\/api\/operations\/[A-Za-z0-9._/-]+\.json$/.test(route) || route.includes('..')) throw new Error(`Unsafe focused contract route ${route}`);
      const file = path.join(root, route.slice(1));
      const contract = JSON.parse(await readFile(file, 'utf8'));
      const bytes = (await stat(file)).size;
      totalBytes += bytes;
      largestBytes = Math.max(largestBytes, bytes);
      if (!/^3\.(0|1)\./.test(String(contract.openapi))) throw new Error('Missing supported OpenAPI version');
      if (typeof contract.info?.title !== 'string' || typeof contract.info?.version !== 'string') throw new Error('Missing OpenAPI info');
      const paths = Object.entries<any>(contract.paths ?? contract.webhooks ?? {});
      if (contract.paths && contract.webhooks) throw new Error('Contract must select paths or webhooks, not both');
      if (paths.length !== 1 || Object.keys(paths[0][1]).filter(key => methods.has(key)).length !== 1) throw new Error('Contract must contain exactly one operation');
      const operation = Object.values<any>(paths[0][1]).find(value => value?.operationId);
      if (!operation) throw new Error('Contract operation lacks operationId');
      const walk = (value: any): void => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) { value.forEach(walk); return; }
        if (typeof value.$ref === 'string') {
          const ref: string = value.$ref;
          if (!ref.startsWith('#/components/')) throw new Error(`External reference ${ref}`);
          const resolved = ref.slice(2).split('/').reduce((at: any, segment: string) => at?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')], contract);
          if (resolved === undefined || resolved === null) throw new Error(`Unresolved reference ${ref}`);
        }
        if (value.discriminator?.mapping) {
          for (const target of Object.values<any>(value.discriminator.mapping)) {
            if (typeof target !== 'string' || !target.startsWith('#/components/')) throw new Error(`Unresolved discriminator mapping ${target}`);
            const resolved = target.slice(2).split('/').reduce((at: any, segment: string) => at?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')], contract);
            if (resolved === undefined || resolved === null) throw new Error(`Missing discriminator target ${target}`);
          }
        }
        Object.values(value).forEach(walk);
      };
      walk(contract);
      const markdown = await readFile(path.join(root, page.markdownUrl.slice(1)), 'utf8');
      if (!markdown.includes(route)) throw new Error('Markdown page does not link to its contract');
    } catch (error) {
      failures.push({ documentId: page.id, message: (error as Error).message });
    }
  }
  return { status: failures.length ? 'error' : 'ok', contracts: pages.length, totalBytes, largestBytes, failures };
}
