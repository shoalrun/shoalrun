import { createHash } from 'node:crypto';

export function generatedOperationIdentity(apiId: string, sourceOperationId: string, pathPrefix = `/reference/${apiId}`) {
  const stem = sourceOperationId.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'operation';
  const suffix = createHash('sha256').update(sourceOperationId).digest('hex').slice(0, 8);
  const identity = /^[A-Za-z0-9._-]+$/.test(sourceOperationId) ? sourceOperationId : `${stem}-${suffix}`;
  return { id: `${apiId}.${identity}`, reference: `reference.${apiId}.${identity}`, slug: `${pathPrefix}/${stem}-${suffix}`, filename: `${stem}-${suffix}.mdx` };
}
