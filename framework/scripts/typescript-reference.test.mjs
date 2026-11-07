import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';
import { convertTypeScript, writeTypeScriptSnapshot } from '../adapters/typescript/shoalrun-reference.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'shoalrun-ts-reference-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = path.join(root, 'tsconfig.json');
  await fs.writeFile(project, JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, skipLibCheck: true, types: [] } }));
  const extract = (entry = 'index.ts', sourceRoot = root) => convertTypeScript({ typescript: ts, root: sourceRoot, project, entry, moduleName: 'example.sdk' });
  return { root, project, extract };
}

test('TypeScript extraction follows public re-exports, overloads, type links, JSDoc, fields and local members without executing source', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'index.ts'), "export { Client, type Record, type Result } from './sdk.js';\nthrow new Error('Do not execute');\n");
  await fs.writeFile(path.join(f.root, 'sdk.ts'), `
/** Record returned by the SDK. */
export interface Record {
  /** Stable identifier. */
  readonly id: string;
  /** Optional label. */
  label?: string;
}
/** A generic result. */
export type Result<T> = { value: T; error?: string };
/** Public client. */
export class Client {
  private secret = 'NeverPublishInitializer';
  protected hidden(): void {}
  constructor(readonly token: string) {}
  /** Fetch a record.
   * @param id Record identifier.
   * @returns The selected record.
   * @example client.fetch('one');
   */
  fetch(id: string): Record;
  fetch(id: number): Record;
  fetch(id: string | number): Record { return { id: String(id) }; }
  [Symbol.iterator](): Iterator<string> { return ['one'][Symbol.iterator](); }
  static create(token: string): Client { return new Client(token); }
}
function privateHelper(): void {}
/** @internal */
export const internalValue = 'InternalMarker';
`);
  const first = f.extract();
  assert.deepEqual(first, f.extract());
  const symbols = new Map(first.symbols.map(s => [s.id, s]));
  assert.equal(symbols.get('example.sdk.Client.fetch').signatures.length, 2);
  assert.equal(symbols.get('example.sdk.Client.fetch').returns.description, 'The selected record.');
  assert.equal(symbols.get('example.sdk.Client.fetch').parameters[0].description, 'Record identifier.');
  assert.equal(symbols.get('example.sdk.Client.fetch').typeReferences.Record, 'example.sdk.Record');
  assert.equal(symbols.get('example.sdk.Record.id').required, true);
  assert.equal(symbols.get('example.sdk.Record.label').required, false);
  assert.match(symbols.get('example.sdk.Client').constructorSignature, /^new Client\(/);
  assert.ok(symbols.has('example.sdk.Client.%5BSymbol.iterator%5D'));
  assert.match(symbols.get('example.sdk.Client.static.create').signatures[0], /^static create\(/);
  assert.doesNotMatch(JSON.stringify(first), /NeverPublishInitializer|privateHelper|secret|hidden|InternalMarker/);
  assert.ok(!JSON.stringify(first).includes(f.root));
});

test('TypeScript conversion rejects escaped exports and unresolved declarations rather than omitting them', async t => {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.root, 'public'));
  await fs.writeFile(path.join(f.root, 'public/index.ts'), "export { hidden } from '../outside.js';");
  await fs.writeFile(path.join(f.root, 'outside.ts'), 'export const hidden = 42;');
  assert.throws(() => f.extract('public/index.ts', path.join(f.root, 'public')), /escapes the source root/);
  await fs.writeFile(path.join(f.root, 'index.ts'), "export * from './missing.js';");
  assert.throws(() => f.extract(), /Cannot find module/);
});

test('entry extraction preserves type aliases, anonymous interface signatures and aliases while excluding @internal exports', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'index.ts'), `
/** @internal */ export const privateValue = 'HiddenMarker';
export interface Parser<T> { (source: string): T; [key: string]: unknown; }
export type Choice = { kind: 'a'; value: string } | { kind: 'b'; count: number };
export { parse as read };
function parse(value: string): Choice { return { kind: 'a', value }; }
`);
  const symbols = new Map(f.extract().symbols.map(s => [s.id, s]));
  assert.match(symbols.get('example.sdk.Parser').signatures.join('\n'), /\(source: string\): T/);
  assert.match(symbols.get('example.sdk.Parser').signatures.join('\n'), /\[key: string\]/);
  assert.match(symbols.get('example.sdk.Choice').signatures[0], /count: number/);
  assert.match(symbols.get('example.sdk.read').signatures[0], /^read\(/);
  assert.equal(symbols.has('example.sdk.privateValue'), false);
});


test('structural aliases with excluded members fail instead of leaking parent signatures', async t => {
  const f = await fixture(t);
  for (const type of [
    `{\n/** @internal */\nHiddenAliasMemberMarker: string;\npublic: string;\n}`,
    `{ nested: {\n/** @private */\nHiddenNestedMemberMarker: number;\nvisible: number;\n} } | { other: boolean }`
  ]) {
    await fs.writeFile(path.join(f.root, 'index.ts'), `export type Options = ${type};`);
    assert.throws(() => f.extract(), /structural type contains an @internal or @private member/);
  }
});

test('optional methods, readonly properties, merged interfaces and constructors retain their declarations', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'index.ts'), `
export interface API { readonly revision: string; fetch?(id: string): number; }
export interface Parse { (value: string): string; }
export interface Parse { (value: number): number; }
export class Client {
  constructor(value: string);
  constructor(value: number);
  constructor(value: string | number) {}
  readonly code: string = 'ok';
}
`);
  const symbols = new Map(f.extract().symbols.map(s => [s.id, s]));
  const optional = symbols.get('example.sdk.API.fetch');
  assert.match(optional.signatures[0], /^fetch\?\(id: string\): number$/);
  assert.equal(optional.parameters[0].type, 'string'); assert.equal(optional.returns.type, 'number');
  assert.equal(symbols.get('example.sdk.API.revision').signatures[0], 'readonly revision: string');
  assert.equal(symbols.get('example.sdk.Client.code').signatures[0], 'readonly code: string');
  for (const kind of ['string', 'number']) {
    assert.ok(symbols.get('example.sdk.Parse').signatures.some(signature => signature.includes('value: ' + kind)), kind);
    assert.ok(symbols.get('example.sdk.Client').constructorSignature.includes('value: ' + kind), kind);
  }
});

test('source evidence changes with compiler options and external type dependency bytes', async t => {
  const f = await fixture(t);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'shoalrun-external-types-'));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  const types = path.join(outside, 'types.ts');
  await fs.writeFile(types, 'export interface External { value: string }');
  await fs.writeFile(path.join(f.root, 'index.ts'), `import type { External } from ${JSON.stringify(types)}; export interface API { value: External; optional?: string }`);
  const settings = JSON.parse(await fs.readFile(f.project, 'utf8'));
  settings.compilerOptions.allowImportingTsExtensions = true; await fs.writeFile(f.project, JSON.stringify(settings));
  const first = f.extract();
  settings.compilerOptions.strictNullChecks = false; await fs.writeFile(f.project, JSON.stringify(settings));
  const second = f.extract(); assert.notEqual(first.sourceDigest, second.sourceDigest);
  await fs.writeFile(types, 'export interface External { value: number }');
  assert.notEqual(second.sourceDigest, f.extract().sourceDigest);
});

test('snapshot output rejects source and configuration collisions, including symlinks, without altering inputs', async t => {
  const f = await fixture(t);
  const entry = path.join(f.root, 'index.ts'); const original = 'export const answer = 42;';
  await fs.writeFile(entry, original);
  let inputs;
  const snapshot = convertTypeScript({ typescript: ts, project: f.project, root: f.root, entry: 'index.ts', moduleName: 'example.sdk', onInputs: value => { inputs = value; } });
  for (const file of [entry, f.project]) assert.throws(() => writeTypeScriptSnapshot(file, snapshot, inputs), /cannot overwrite a compiler input/);
  const alias = path.join(f.root, 'alias.json'); await fs.symlink(entry, alias);
  assert.throws(() => writeTypeScriptSnapshot(alias, snapshot, inputs), /cannot overwrite a compiler input/);
  assert.equal(await fs.readFile(entry, 'utf8'), original);
  const output = path.join(f.root, 'reference.json'); writeTypeScriptSnapshot(output, snapshot, inputs);
  assert.deepEqual(JSON.parse(await fs.readFile(output, 'utf8')), snapshot);
});


test('inferred nested containers and callbacks cannot print excluded members', async t => {
  const f = await fixture(t);
  for (const code of [
    `export function list() { return [{\n/** @internal */\nHiddenArrayMemberMarker: 1, public: 2 }]; }`,
    `export function factory() { return () => ({\n/** @internal */\nHiddenCallbackMemberMarker: 1, public: 2 }); }`
  ]) {
    await fs.writeFile(path.join(f.root, 'index.ts'), code);
    assert.throws(() => f.extract(), /structural type contains an @internal or @private member/);
  }
});

test('internal anonymous signatures and constructor overloads are omitted', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'index.ts'), `
export interface Call {
  /** @internal */
  (HiddenCallMarker: number): number;
  (publicValue: string): string;
}
export class Client {
  /** @internal */
  constructor(HiddenConstructorMarker: number);
  constructor(publicValue: string);
  constructor(value: number | string) {}
}
`);
  const snapshot = f.extract();
  assert.doesNotMatch(JSON.stringify(snapshot), /HiddenCallMarker|HiddenConstructorMarker/);
  const client = snapshot.symbols.find(s => s.id === 'example.sdk.Client');
  assert.match(client.constructorSignature, /publicValue: string/);
  assert.match(snapshot.symbols.find(s => s.id === 'example.sdk.Call').signatures.join('\n'), /publicValue: string/);
});

test('explicit broad types cannot expose excluded members through printed initializers or parameter defaults', async t => {
  const f = await fixture(t);
  for (const code of [
    `export const options: Record<string, unknown> = {\n/** @internal */\nHiddenInitializerMarker: 'PrivateValueMarker', public: 2 };`,
    `export function configure(options: Record<string, unknown> = {\n/** @private */\nHiddenDefaultMarker: 'PrivateValueMarker', public: 2 }) {}`
  ]) {
    await fs.writeFile(path.join(f.root, 'index.ts'), code);
    assert.throws(() => f.extract(), /printed declaration or initializer contains/);
  }
});


test('constructor inference, private class expressions and conditional substitutions cannot publish excluded content', async t => {
  const f = await fixture(t);
  for (const code of [
    `export class Client { constructor(options = {\n/** @internal */\nHiddenConstructorMember: 1 }) {} }`,
    `export const Factory = class { #HiddenPrivateMarker = 'SecretMarker'; };`,
    `export function condition() { const original = {\n/** @internal */\nHiddenConditionalMember: 1 }; return original as typeof original extends object ? typeof original : never; }`
  ]) {
    await fs.writeFile(path.join(f.root, 'index.ts'), code);
    assert.throws(() => f.extract(), /excluded members|structural type contains|printed declaration or initializer contains/);
  }
});
