# TypeScript code-reference adapter

This optional adapter uses the project's installed TypeScript 5.9.x compiler API to extract one public entry point into Shoalrun's version 1 snapshot format. The maintained dependency is `typescript@5.9.3`. TypeScript 6/7 compiler APIs aren't covered by this adapter.

Install the dependency explicitly, then run from your documentation or library project:

```sh
npm install --save-dev --save-exact typescript@5.9.3
node node_modules/@shoalrun/cli/adapters/typescript/shoalrun-reference.mjs \
  --project tsconfig.json \
  --entry src/index.ts \
  --module example.sdk \
  --out reference.json
npx --no-install shoalrun references check reference.json
```

Set `--root DIRECTORY` to bound declarations and provenance to a narrower source tree. Entry paths resolve relative to the project's compiler configuration. The output path resolves relative to the current directory. The module ID is a stable logical prefix for exported symbol IDs; use the same value when refreshing the snapshot.

Public local re-exports are followed. Functions and overloads, classes, interfaces, aliases, enums, constants, declared members, and static members are represented. Private/protected declarations and `@internal` or `@private` symbols are skipped. A structural alias or inferred structural type containing an excluded member stops extraction instead of printing private details in a parent signature; expose a separate public type. Copied initializers and parameter defaults containing excluded declarations also stop extraction rather than publishing those values. Inherited members aren't expanded. Anonymous call/index signatures are retained in interface declarations, and union alternatives remain in their alias declaration. Unsupported declarations, unresolved imports, and exported declarations outside the declared source root stop extraction.

JSDoc descriptions, parameter descriptions, return descriptions, and examples are retained. Other JSDoc tags aren't converted into runtime constraints. Source initializers used as defaults are copied as expressions, never evaluated. Some conditional type expansions stop extraction when their visibility cannot be verified. Type references link known public targets; built-ins and unavailable types remain text. Source locations refer to the actual input, including `.d.ts` files when those are used.

The adapter calls `createProgram` without emitting files. It doesn't execute the documented module or run project transformers/plugins, install dependencies, or fetch remote inputs. The TypeScript compiler package and local configuration remain trusted development inputs. Use a reviewed project and inspect the JSON before publication.

The source digest covers effective compiler options and all compiler source files, including external type dependencies. Graph accounting limits include those dependencies; they are checked after TypeScript loads the graph and are not execution or memory isolation. Run extraction only on trusted local projects. The output cannot overwrite a compiler input, including through symlinks, and is replaced atomically after validation.

A site build needs only the saved JSON. Configure it through `codeReferences` as described in [CODE-REFERENCES.md](../../CODE-REFERENCES.md). This keeps extraction separate from rendering, publication selection, and content delivery.
