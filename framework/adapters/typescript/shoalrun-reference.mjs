#!/usr/bin/env node
/** Static public-entry-point extraction. Never imports or emits documented code. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { validateCodeReference } from '../../dist/code-reference-model.js';

const inside = (root, file) => file === root || file.startsWith(root + path.sep);
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function convertTypeScript({ project, entry, moduleName, root, typescript, onInputs }) {
  project = fs.realpathSync(project);
  root = fs.realpathSync(root ?? path.dirname(project));
  entry = fs.realpathSync(path.resolve(path.dirname(project), entry));
  if (!inside(root, entry)) throw new Error('Entry must stay inside the declared source root');
  if (!moduleName || /\s|[\x00-\x1f]/.test(moduleName)) throw new Error('Provide a nonempty module ID without whitespace');
  const ts = typescript ?? createRequire(project)('typescript');
  if (!/^5\.9\./.test(ts.version)) throw new Error('This adapter supports TypeScript 5.9.x; install typescript@5.9.3 in the project');
  const diagnostics = messages => messages.map(message => ts.flattenDiagnosticMessageText(message.messageText, '\n')).join('\n');
  const configInputs = new Set([project]);
  const readConfig = file => { if (fs.existsSync(file)) configInputs.add(fs.realpathSync(file)); return ts.sys.readFile(file); };
  const config = ts.readConfigFile(project, readConfig);
  if (config.error) throw new Error(diagnostics([config.error]));
  const parsed = ts.parseJsonConfigFileContent(config.config, { ...ts.sys, readFile: readConfig }, path.dirname(project));
  // A reference entry need not be included in the project's ordinary build files.
  const configErrors = parsed.errors.filter(error => error.code !== 18003);
  if (configErrors.length) throw new Error(diagnostics(configErrors));
  const program = ts.createProgram({ rootNames: [entry], options: { ...parsed.options, noEmit: true, incremental: false, composite: false } });
  const files = program.getSourceFiles().map(file => ({ file, path: fs.realpathSync(file.fileName) })).sort((a, b) => order(a.path, b.path));
  if (files.length > 10000) throw new Error('Source graph exceeds 10,000 files');
  if (files.reduce((bytes, { file }) => bytes + Buffer.byteLength(file.text), 0) > 32 * 1024 * 1024) throw new Error('Source graph exceeds 32 MiB');
  onInputs?.([...configInputs, ...files.map(item => item.path)]);
  const errors = ts.getPreEmitDiagnostics(program).filter(message => message.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(diagnostics(errors));
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry);
  const entrySymbol = source && checker.getSymbolAtLocation(source);
  if (!entrySymbol) throw new Error('The entry must be an external TypeScript module with public exports');
  const canonical = symbol => symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const exports = checker.getExportsOfModule(entrySymbol).sort((a, b) => order(a.name, b.name));
  const ids = new Map();
  const publicId = symbol => symbol && ids.get(canonical(symbol))?.[0];
  const format = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
  const text = parts => ts.displayPartsToString(parts ?? []);
  const description = symbol => text(symbol.getDocumentationComment(checker));
  const tags = symbol => symbol.getJsDocTags(checker);
  const declaration = symbol => symbol.valueDeclaration ?? symbol.declarations?.[0];
  const location = node => {
    const file = fs.realpathSync(node.getSourceFile().fileName);
    if (!inside(root, file)) throw new Error('An exported declaration escapes the source root; choose a local public entry');
    return { path: path.relative(root, file).split(path.sep).join('/'), line: node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1 };
  };
  const excludedNode = node => !!node && ((node.name && ts.isPrivateIdentifier(node.name)) || ts.isPrivateIdentifier(node) || ts.getJSDocTags(node).some(tag => ['internal', 'private'].includes(tag.tagName.text)) || !!(ts.getCombinedModifierFlags(node) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)));
  const visible = symbol => !tags(symbol).some(tag => tag.name === 'internal' || tag.name === 'private') &&
    !symbol.declarations?.some(node => (node.name && ts.isPrivateIdentifier(node.name)) || ts.getCombinedModifierFlags(node) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected));
  for (const exported of exports) {
    const target = canonical(exported);
    if (!visible(exported) || !visible(target)) continue;
    const list = ids.get(target) ?? [];
    list.push(`${moduleName}.${exported.name}`); ids.set(target, list);
  }
  // The snapshot cannot express a partially hidden structural type faithfully.
  // Fail instead of printing excluded members inside a parent signature.
  const assertPublicStructure = node => {
    if (ts.isBlock(node)) return;
    if (ts.isTypeElement(node)) {
      const symbol = node.name && checker.getSymbolAtLocation(node.name);
      if ((symbol && !visible(symbol)) || ts.getJSDocTags(node).some(tag => ['internal', 'private'].includes(tag.tagName.text))) {
        if (node.parent && ts.isTypeLiteralNode(node.parent)) throw new Error('A structural type contains an @internal or @private member; expose a separate public type');
        return; // Direct interface/class members are omitted individually.
      }
    }
    ts.forEachChild(node, assertPublicStructure);
  };
  const assertPrintable = node => {
    if (excludedNode(node)) throw new Error('A printed declaration or initializer contains an @internal, @private, private or protected member; expose a separate public value');
    ts.forEachChild(node, assertPrintable);
  };
  const snippet = (node, kind = ts.EmitHint.Unspecified) => {
    assertPrintable(node);
    return ts.createPrinter({ removeComments: true }).printNode(kind, node, node.getSourceFile()).trim();
  };
  const typeText = (type, node) => {
    const value = checker.typeToString(type, node, format);
    const inspect = (current, seen = new Set()) => {
      if (!current || seen.has(current)) return; seen.add(current);
      if (current.isUnionOrIntersection()) { for (const part of current.types) inspect(part, seen); return; }
      if (current.flags & ts.TypeFlags.Substitution) { inspect(current.baseType, seen); inspect(current.constraint, seen); return; }
      if (current.flags & ts.TypeFlags.Conditional) throw new Error('A conditional type expansion cannot be verified for excluded members; expose a named public type');
      if (!(current.flags & ts.TypeFlags.Object)) return;
      for (const argument of current.aliasTypeArguments ?? []) inspect(argument, seen);
      if (current.objectFlags & ts.ObjectFlags.Reference) for (const argument of checker.getTypeArguments(current)) inspect(argument, seen);
      // A separately emitted public type is already validated at its own declaration.
      if (publicId(current.aliasSymbol ?? current.symbol)) return;
      for (const signature of [...current.getCallSignatures(), ...current.getConstructSignatures()]) {
        inspect(checker.getReturnTypeOfSignature(signature), seen);
        for (const parameter of signature.getParameters()) {
          const decl = declaration(parameter);
          if (decl) inspect(checker.getTypeOfSymbolAtLocation(parameter, decl), seen);
        }
      }
      // Named references print their name; anonymous structures print their members.
      if (current.aliasSymbol || current.symbol && !['__type', '__object'].includes(current.symbol.name)) return;
      for (const property of checker.getPropertiesOfType(current)) {
        if (!visible(property)) throw new Error('An inferred structural type contains an @internal or @private member; expose a separate public type');
        const decl = declaration(property);
        if (decl) inspect(checker.getTypeOfSymbolAtLocation(property, decl), seen);
      }
    };
    inspect(type);
    if (/import\(["'](?:\/|[A-Za-z]:[\\/])/.test(value)) throw new Error('An inferred public type contains a machine-local import path; declare an exported type explicitly');
    return value;
  };
  const references = new Map();
  const collectReferences = (node, output) => {
    if (!node) return;
    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      const target = symbol && publicId(symbol);
      if (target) output.set(node.text, target);
    }
    // Only declarations/types, never walk a function body or initializer.
    ts.forEachChild(node, child => { if (!ts.isBlock(child) && child !== node.initializer) collectReferences(child, output); });
  };
  const symbols = [{ id: moduleName, name: moduleName, kind: 'module', visibility: 'public', source: location(source) }];
  const append = (symbol, id, name, parent, member = false) => {
    if (!visible(symbol)) return;
    const node = declaration(symbol);
    if (!node) throw new Error(`No declaration for exported symbol ${name}`);
    const decls = symbol.declarations ?? [node];
    for (const decl of decls) { location(decl); assertPublicStructure(decl); }
    const ref = new Map(); references.set(id, ref);
    const doc = description(symbol);
    const base = { id, name, parent, visibility: 'public', source: location(node), ...(doc ? { summary: doc.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').slice(0, 1000), description: doc } : {}) };
    const type = checker.getTypeOfSymbolAtLocation(symbol, node);
    const declared = checker.getDeclaredTypeOfSymbol(symbol);
    let signatures = [];
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isMethodSignature(node) || ts.isFunctionTypeNode(node) || type.getCallSignatures().length && !ts.isTypeAliasDeclaration(node)) {
      base.kind = member ? 'method' : 'function';
      signatures = checker.getNonNullableType(type).getCallSignatures();
      base.signatures = signatures.map(signature => `${name}${symbol.flags & ts.SymbolFlags.Optional ? '?' : ''}${checker.signatureToString(signature, node, format, ts.SignatureKind.Call)}`);
      const parameterDocs = new Map(tags(symbol).filter(tag => tag.name === 'param').flatMap(tag => { const match = /^(\S+)\s+([\s\S]*)$/.exec(text(tag.text)); return match ? [[match[1], match[2]]] : []; }));
      const primary = signatures.at(-1);
      if (primary) {
        base.parameters = primary.getParameters().map(parameter => {
          const decl = declaration(parameter);
          const parameterName = decl?.name && (ts.isObjectBindingPattern(decl.name) || ts.isArrayBindingPattern(decl.name)) ? snippet(decl.name) : parameter.name;
          const initializer = decl?.initializer;
          const parameterDescription = description(parameter) || parameterDocs.get(parameter.name);
          collectReferences(decl?.type, ref);
          return { name: parameterName, type: typeText(checker.getTypeOfSymbolAtLocation(parameter, decl ?? node), decl ?? node),
            ...(parameterDescription ? { description: parameterDescription } : {}), ...(initializer ? { default: snippet(initializer) } : {}) };
        });
        base.returns = { type: typeText(checker.getReturnTypeOfSignature(primary), node) };
        const returns = tags(symbol).find(tag => ['returns', 'return'].includes(tag.name));
        if (returns) base.returns.description = text(returns.text);
      }
      for (const signature of signatures) {
        typeText(checker.getReturnTypeOfSignature(signature), node);
        for (const parameter of signature.getParameters()) typeText(checker.getTypeOfSymbolAtLocation(parameter, declaration(parameter) ?? node), declaration(parameter) ?? node);
        const decl = signature.getDeclaration();
        if (decl) collectReferences(decl.type, ref);
        for (const parameter of decl?.parameters ?? []) collectReferences(parameter.type, ref);
      }
    } else if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      base.kind = ts.isClassDeclaration(node) ? 'class' : 'interface';
      const generics = node.typeParameters?.map(parameter => snippet(parameter)).join(', ');
      const heritageClauses = decls.flatMap(owner => owner.heritageClauses ?? []);
      const heritage = [[ts.SyntaxKind.ExtendsKeyword, 'extends'], [ts.SyntaxKind.ImplementsKeyword, 'implements']].map(([token, label]) => { const types = [...new Set(heritageClauses.filter(clause => clause.token === token).flatMap(clause => clause.types.map(type => snippet(type))))]; return types.length ? label + ' ' + types.join(', ') : ''; }).filter(Boolean).join(' ');
      base.signatures = [`${base.kind} ${name}${generics ? `<${generics}>` : ''}${heritage ? ` ${heritage}` : ''}`];
      base.bases = heritageClauses.length ? heritageClauses.flatMap(clause => clause.types.map(type => snippet(type))) : undefined;
      for (const clause of heritageClauses) collectReferences(clause, ref);
      for (const parameter of node.typeParameters ?? []) collectReferences(parameter, ref);
      for (const owner of decls.filter(item => ts.isClassDeclaration(item) || ts.isInterfaceDeclaration(item))) for (const member of owner.members) if (!excludedNode(member) && (ts.isCallSignatureDeclaration(member) || ts.isConstructSignatureDeclaration(member) || ts.isIndexSignatureDeclaration(member))) { base.signatures.push(snippet(member)); collectReferences(member, ref); }
      if (base.kind === 'class') {
        const constructors = type.getConstructSignatures().filter(ctor => !excludedNode(ctor.getDeclaration() ?? node));
        if (constructors.length) {
          base.constructorSignature = constructors.map(ctor => `new ${name}${checker.signatureToString(ctor, node, format, ts.SignatureKind.Call)}`).join('\n');
          for (const ctor of constructors) {
            for (const parameter of ctor.getParameters()) {
              const decl = declaration(parameter);
              typeText(checker.getTypeOfSymbolAtLocation(parameter, decl ?? node), decl ?? node);
              if (decl?.initializer) assertPrintable(decl.initializer);
            }
            for (const parameter of ctor.getDeclaration()?.parameters ?? []) collectReferences(parameter.type, ref);
          }
        }
      }
    } else if (ts.isTypeAliasDeclaration(node)) {
      base.kind = 'type';
      const generics = node.typeParameters?.map(parameter => snippet(parameter)).join(', ');
      assertPublicStructure(node.type);
      const publicType = node.type;
      base.signatures = [`type ${name}${generics ? `<${generics}>` : ''} = ${snippet(publicType)};`];
      collectReferences(publicType, ref);
    } else if (ts.isEnumDeclaration(node)) {
      base.kind = 'enum'; base.signatures = [`enum ${name}`];
    } else if (ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isPropertySignature(node) || ts.isParameter(node) || ts.isGetAccessorDeclaration(node) || ts.isEnumMember(node)) {
      base.kind = member ? 'property' : 'constant';
      base.annotation = typeText(type, node);
      const readonly = ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Readonly || ts.isGetAccessorDeclaration(node) && !symbol.declarations?.some(ts.isSetAccessorDeclaration);
      base.signatures = [`${readonly ? 'readonly ' : ''}${name}${symbol.flags & ts.SymbolFlags.Optional ? '?' : ''}: ${base.annotation}`];
      if (ts.isEnumMember(node)) base.kind = 'constant';
      if (member && !ts.isEnumMember(node)) base.required = !(symbol.flags & ts.SymbolFlags.Optional);
      if (node.initializer) base.default = snippet(node.initializer);
      collectReferences(node.type, ref);
    } else throw new Error(`Unsupported exported declaration ${name}: ${ts.SyntaxKind[node.kind]}`);
    const examples = tags(symbol).filter(tag => tag.name === 'example').map(tag => ({ code: text(tag.text).replace(/^```(?:ts|typescript|js|javascript)?\s*\n([\s\S]*?)\n```\s*$/, '$1') }));
    if (examples.length) base.examples = examples;
    symbols.push(base);
    const owns = decl => decls.some(owner => { for (let current = decl; current; current = current.parent) if (current === owner) return true; return false; });
    if (['class', 'interface', 'type'].includes(base.kind) && !(declared.flags & ts.TypeFlags.Union)) {
      for (const property of checker.getPropertiesOfType(declared).sort((a, b) => order(a.name, b.name))) {
        if (property.declarations?.some(owns)) { const memberNode = declaration(property); const name = ts.isComputedPropertyName(memberNode.name) ? snippet(memberNode.name) : property.name; append(property, `${id}.${encodeURIComponent(name)}`, name, id, true); }
      }
    }
    if (base.kind === 'class') for (const property of checker.getPropertiesOfType(type).sort((a, b) => order(a.name, b.name))) {
      if (property.declarations?.some(owns)) { const memberNode = declaration(property); const name = ts.isComputedPropertyName(memberNode.name) ? snippet(memberNode.name) : property.name; const before = symbols.length; append(property, `${id}.static.${encodeURIComponent(name)}`, name, id, true); const added = symbols[before]; if (added?.signatures) added.signatures = added.signatures.map(signature => `static ${signature}`); }
    }
    if (base.kind === 'enum') for (const property of checker.getExportsOfModule(symbol)) if (ts.isEnumMember(declaration(property))) append(property, `${id}.${property.name}`, property.name, id, true);
  };
  for (const exported of exports) if (visible(exported)) append(canonical(exported), `${moduleName}.${exported.name}`, exported.name, moduleName);
  const known = new Set(symbols.map(symbol => symbol.id));
  for (const symbol of symbols) {
    const mapped = Object.fromEntries([...(references.get(symbol.id) ?? [])].filter(([, target]) => known.has(target)));
    if (Object.keys(mapped).length) symbol.typeReferences = mapped;
  }
  const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => order(a, b)).map(([key, item]) => [key, normalize(item)])) : typeof value === 'string' && path.isAbsolute(value) ? (inside(root, value) ? '$ROOT/' + path.relative(root, value).split(path.sep).join('/') : '$EXTERNAL/' + path.basename(value)) : value;
  const digest = createHash('sha256').update(`typescript:${ts.version}\nentry:${path.relative(root, entry)}\nmodule:${moduleName}\noptions:${JSON.stringify(normalize(program.getCompilerOptions()))}\n`);
  const evidence = files.map(({ file, path: filePath }) => [inside(root, filePath) ? path.relative(root, filePath).split(path.sep).join('/') : '$EXTERNAL/' + path.basename(filePath), file.text]).sort((a, b) => order(JSON.stringify(a), JSON.stringify(b)));
  for (const file of evidence) digest.update(JSON.stringify(file));
  return validateCodeReference({ schemaVersion: 1, kind: 'shoalrun-code-reference', programmingLanguage: 'typescript', producer: { name: 'shoalrun-typescript', version: '1.0.0', extractorVersion: ts.version }, sourceDigest: digest.digest('hex'), symbols });
}

/** Never overwrite a compiler input, including through an output symlink or parent. */
export function writeTypeScriptSnapshot(output, snapshot, inputs) {
  const resolved = fs.existsSync(output) ? fs.realpathSync(output) : path.join(fs.realpathSync(path.dirname(output)), path.basename(output));
  if (inputs.some(file => fs.realpathSync(file) === resolved)) throw new Error('Snapshot output cannot overwrite a compiler input');
  const temporary = path.join(path.dirname(output), `.shoalrun-reference-${randomUUID()}.json`);
  try { fs.writeFileSync(temporary, JSON.stringify(snapshot, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' }); fs.renameSync(temporary, output); }
  finally { fs.rmSync(temporary, { force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = {}; const allowed = ['--project', '--entry', '--module', '--root', '--out'];
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = process.argv[i], value = process.argv[i + 1];
      if (!allowed.includes(key) || args[key] || !value || value.startsWith('--')) throw new Error('Usage: node shoalrun-reference.mjs --project tsconfig.json --entry src/index.ts --module sdk --out reference.json [--root DIRECTORY]');
      args[key] = value;
    }
    for (const key of ['--project', '--entry', '--module', '--out']) if (!args[key]) throw new Error(`Missing ${key}`);
    let inputs;
    const snapshot = convertTypeScript({ onInputs: value => { inputs = value; }, project: path.resolve(args['--project']), entry: args['--entry'], moduleName: args['--module'], root: args['--root'] && path.resolve(args['--root']) });
    writeTypeScriptSnapshot(path.resolve(args['--out']), snapshot, inputs);
    console.log(JSON.stringify({ status: 'ok', symbols: snapshot.symbols.length, programmingLanguage: snapshot.programmingLanguage }));
  } catch (error) { console.error(error.code === 'MODULE_NOT_FOUND' ? 'Install typescript@5.9.3 in the project before running this optional adapter.' : error.message); process.exitCode = 1; }
}
