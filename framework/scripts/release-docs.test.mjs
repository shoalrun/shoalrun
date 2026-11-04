import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
const root=new URL('../',import.meta.url);
test('current installation examples and lockfile match the framework package version',async()=>{
  const pkg=JSON.parse(await readFile(new URL('package.json',root),'utf8'));
  const lock=JSON.parse(await readFile(new URL('package-lock.json',root),'utf8'));
  assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  const readme=await readFile(new URL('README.md',root),'utf8');
  const installs=[...readme.matchAll(/^npm install[^\n]*@shoalrun\/cli@([^\s]+)[^\n]*$/gm)];
  assert.ok(installs.length>=1,'the package README must include a versioned install command');
  for(const match of installs)assert.equal(match[1],pkg.version,'current install examples must match this package; historical changelogs remain unchanged');
});
