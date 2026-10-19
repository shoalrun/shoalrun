type Field = 'area' | 'subarea';
export type Taxonomy = {
  required: Field[];
  requireExplicit: Field[];
  multiple: Field[];
  areas: Record<string, { label: string; subareas: Record<string, string> }>;
};
const mapping = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const identifier = /^[a-z][a-z0-9-]*$/;

export function resolveTaxonomy(value: unknown): Taxonomy | undefined {
  if (value === undefined || value === false) return;
  if (!mapping(value)) throw new Error('frontmatter.taxonomy must be a mapping');
  for (const key of Object.keys(value)) if (!['required', 'requireExplicit', 'multiple', 'areas'].includes(key)) throw new Error(`Unknown frontmatter.taxonomy setting ${key}`);
  const fields = (name: string): Field[] => {
    const list = value[name] ?? [];
    if (!Array.isArray(list) || list.some(field => !['area', 'subarea'].includes(field)) || new Set(list).size !== list.length) throw new Error(`frontmatter.taxonomy.${name} must be a unique list of area and subarea`);
    return list;
  };
  const required = fields('required'), requireExplicit = fields('requireExplicit'), multiple = fields('multiple');
  if (!mapping(value.areas) || !Object.keys(value.areas).length) throw new Error('frontmatter.taxonomy.areas must be a nonempty mapping');
  const areas: Taxonomy['areas'] = {};
  const seen = new Set<string>();
  for (const [id, area] of Object.entries(value.areas)) {
    if (!identifier.test(id) || !mapping(area) || Object.keys(area).some(key => !['label', 'subareas'].includes(key)) || typeof area.label !== 'string' || !area.label.trim()) throw new Error(`frontmatter.taxonomy.areas.${id} needs a valid ID and readable label`);
    if (area.subareas !== undefined && !mapping(area.subareas)) throw new Error(`frontmatter.taxonomy.areas.${id}.subareas must be a mapping`);
    const subareas: Record<string, string> = {};
    for (const [subarea, label] of Object.entries(area.subareas ?? {})) {
      if (!identifier.test(subarea) || typeof label !== 'string' || !label.trim()) throw new Error(`Invalid taxonomy subarea ${id}.${subarea}`);
      if (seen.has(subarea)) throw new Error(`Taxonomy subarea ${subarea} must belong to exactly one area`);
      seen.add(subarea); subareas[subarea] = label;
    }
    areas[id] = { label: area.label, subareas };
  }
  return { required, requireExplicit, multiple, areas };
}

export function validateTaxonomy(page: Record<string, any>, taxonomy: Taxonomy | undefined, file: string, source?: Record<string, unknown>): void {
  if (!taxonomy) return;
  for (const field of new Set([...taxonomy.required, ...taxonomy.requireExplicit])) if (page[field] === undefined) throw new Error(`${file}: taxonomy requires ${field}`);
  if (source) for (const field of taxonomy.requireExplicit) if (source[field] === undefined) throw new Error(`${file}: taxonomy requires explicit ${field} on authored pages`);
  const choices = (field: Field): string[] => {
    const value=page[field];if(value===undefined)return [];
    if(Array.isArray(value)) {
      if(!taxonomy.multiple.includes(field))throw new Error(`${file}: taxonomy allows only one ${field}`);
      if(!value.length||value.some(item=>typeof item!=='string'||!item.trim())||new Set(value).size!==value.length)throw new Error(`${file}: taxonomy ${field} must be a nonempty list of unique IDs`);
      return value;
    }
    if(typeof value!=='string'||!value.trim())throw new Error(`${file}: taxonomy ${field} must be a category ID`);
    return [value];
  };
  const areas=choices('area'),subareas=choices('subarea');
  for(const area of areas)if(!Object.hasOwn(taxonomy.areas,area))throw new Error(`${file}: unknown taxonomy area ${area}`);
  if(subareas.length&&!areas.length)throw new Error(`${file}: taxonomy subarea requires area`);
  for(const subarea of subareas)if(!areas.some(area=>Object.hasOwn(taxonomy.areas[area].subareas,subarea)))throw new Error(`${file}: taxonomy subarea ${subarea} does not belong to area ${areas.join(', ')}`);

}

export function taxonomySchema(taxonomy: Taxonomy, properties: Record<string, any>, required: string[], inherited: Record<string, any>): Record<string, any> {
  const values=(value: any): string[]=>value===undefined?[]:Array.isArray(value)?value:[value];
  const shape=(field: Field, ids: string[]): any=>{const scalar=ids.length?{type:'string',enum:ids}:false;return taxonomy.multiple.includes(field)?{oneOf:[scalar,{type:'array',minItems:1,uniqueItems:true,items:scalar}]}:scalar;};
  const membership=(field: Field,id: string)=>taxonomy.multiple.includes(field)?{anyOf:[{const:id},{type:'array',contains:{const:id}}]}:{const:id};
  const effective=(field: Field,id: string)=>({anyOf:[{properties:{[field]:membership(field,id)},required:[field]},...(values(inherited[field]).includes(id)?[{not:{required:[field]}}]:[])]});
  properties.area={description:properties.area.description,...shape('area',Object.keys(taxonomy.areas))};
  const subareas=Object.entries(taxonomy.areas).flatMap(([area,definition])=>Object.keys(definition.subareas).map(id=>({id,area})));
  const subareaShape=shape('subarea',subareas.map(item=>item.id));
  properties.subarea=subareaShape === false ? false : {description:properties.subarea.description,...subareaShape};
  for(const field of new Set([...taxonomy.required,...taxonomy.requireExplicit]))if(taxonomy.requireExplicit.includes(field)||inherited[field]===undefined)required.push(field);
  return {allOf:subareas.map(({id,area})=>({if:effective('subarea',id),then:effective('area',area)})),...(inherited.area===undefined?{dependentRequired:{subarea:['area']}}:{})};
}
