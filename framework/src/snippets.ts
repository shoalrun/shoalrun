export type SnippetVariable = { type: 'string' | 'number' | 'boolean'; required?: boolean; default?: string | number | boolean; enum?: Array<string | number | boolean> };
export type SnippetDefinition = { file: string; tree: any; variables: Record<string, SnippetVariable> };
export type SnippetUse = { id: string; file: string; documentId: string };

const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const safeName = (name: string) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(name) && !['__proto__', 'prototype', 'constructor'].includes(name);
const safeId = (id: string) => /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(id) && id.split('.').every(safeName);

export function validateSnippetConfig(id: string, definition: any): Record<string, SnippetVariable> {
  if (!safeId(id)) throw new Error(`Invalid snippet ID ${id}`);
  if (!object(definition)) throw new Error(`Snippet ${id} must be a mapping`);
  for (const key of Object.keys(definition)) if (!['file', 'variables'].includes(key)) throw new Error(`Unknown snippet setting ${id}.${key}`);
  if (typeof definition.file !== 'string' || !/\.mdx?$/.test(definition.file)) throw new Error(`Snippet ${id} needs a .md or .mdx file`);
  const variables = definition.variables ?? {};
  if (!object(variables)) throw new Error(`Snippet ${id}.variables must be a mapping`);
  for (const [name, variable] of Object.entries(variables)) {
    if (!safeName(name) || !object(variable)) throw new Error(`Invalid snippet variable ${id}.${name}`);
    for (const key of Object.keys(variable)) if (!['type', 'required', 'default', 'enum'].includes(key)) throw new Error(`Unknown snippet variable setting ${id}.${name}.${key}`);
    if (!['string', 'number', 'boolean'].includes(variable.type)) throw new Error(`Snippet ${id}.${name} needs a scalar type`);
    if (variable.required !== undefined && typeof variable.required !== 'boolean') throw new Error(`Snippet ${id}.${name}.required must be boolean`);
    if (variable.default !== undefined && typeof variable.default !== variable.type) throw new Error(`Snippet ${id}.${name}.default must be ${variable.type}`);
    if (variable.enum !== undefined && (!Array.isArray(variable.enum) || !variable.enum.length || variable.enum.some((item: unknown) => typeof item !== variable.type))) throw new Error(`Snippet ${id}.${name}.enum must contain ${variable.type} values`);
    if (variable.default !== undefined && variable.enum && !variable.enum.includes(variable.default)) throw new Error(`Snippet ${id}.${name}.default is not in its enum`);
  }
  return variables as Record<string, SnippetVariable>;
}

function literal(node: any): unknown {
  if (node?.type === 'Literal' && ['string', 'number', 'boolean'].includes(typeof node.value)) return node.value;
  if (node?.type === 'ObjectExpression') {
    const result: Record<string, unknown> = {};
    for (const property of node.properties ?? []) {
      if (property.type !== 'Property' || property.computed || property.method || property.shorthand || property.kind !== 'init') throw new Error('Snippet values must be literal properties');
      const name = property.key.type === 'Identifier' ? property.key.name : property.key.type === 'Literal' ? property.key.value : null;
      if (typeof name !== 'string' || !safeName(name) || Object.prototype.hasOwnProperty.call(result, name)) throw new Error(`Invalid snippet value name ${name}`);
      result[name] = literal(property.value);
    }
    return result;
  }
  throw new Error('Snippet values must be literal strings, numbers, or booleans');
}

export function snippetAttribute(attribute: any, label: string): unknown {
  if (typeof attribute.value === 'string') return attribute.value;
  const program = attribute.value?.data?.estree;
  if (program?.body?.length === 1 && program.body[0].type === 'ExpressionStatement') return literal(program.body[0].expression);
  throw new Error(`${label}: snippet attributes must be literal values`);
}

export function resolveSnippetValues(id: string, definition: SnippetDefinition, projectValues: unknown, pageValues: unknown, invocation: Record<string, unknown>): Record<string, string | number | boolean> {
  if (projectValues !== undefined && !object(projectValues)) throw new Error('Project variables must be a mapping');
  if (pageValues !== undefined && !object(pageValues)) throw new Error('Page variables must be a mapping');
  const values: Record<string, string | number | boolean> = {};
  for (const [name, variable] of Object.entries(definition.variables)) {
    const value = invocation[name] ?? (pageValues as any)?.[name] ?? (projectValues as any)?.[name] ?? variable.default;
    if (value === undefined) {
      if (variable.required) throw new Error(`Snippet ${id} requires variable ${name}`);
      continue;
    }
    if (typeof value !== variable.type) throw new Error(`Snippet ${id}.${name} must be ${variable.type}`);
    if (variable.enum && !variable.enum.includes(value)) throw new Error(`Snippet ${id}.${name} is not in its enum`);
    values[name] = value as string | number | boolean;
  }
  for (const name of Object.keys(invocation)) if (!(name in definition.variables)) throw new Error(`Unknown snippet variable ${id}.${name}`);
  return values;
}
