export type IngredientWorkflow = {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  prerequisites: string[];
  check: string;
};

export function workflowValues(value: unknown, label: string): Record<string, string> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must map names to descriptions`);
  for (const [name, description] of Object.entries(value)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) || ['constructor', 'prototype', '__proto__'].includes(name) || typeof description !== 'string' || !description.trim()) throw new Error(`${label} needs a safe value name and nonempty description`);
  }
  return value as Record<string, string>;
}

export function ingredientWorkflow(value: unknown, label: string): IngredientWorkflow | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a mapping`);
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some(key => !['inputs', 'outputs', 'prerequisites', 'check'].includes(key))) throw new Error(`${label} has an unknown field`);
  if (typeof item.check !== 'string' || !item.check.trim()) throw new Error(`${label}.check needs an observable success condition`);
  if (item.prerequisites !== undefined && (!Array.isArray(item.prerequisites) || item.prerequisites.some(value => typeof value !== 'string' || !value.trim()))) throw new Error(`${label}.prerequisites must be a list of instructions`);
  return { inputs: workflowValues(item.inputs, `${label}.inputs`), outputs: workflowValues(item.outputs, `${label}.outputs`), prerequisites: item.prerequisites as string[] ?? [], check: item.check };
}
