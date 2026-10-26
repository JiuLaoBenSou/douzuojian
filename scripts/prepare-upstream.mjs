// Codex adaptation, 2026-10-25. Retain upstream AGPL and authorship.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const root = new URL('../', import.meta.url);
await mkdir(new URL('src/lib/', root), {recursive:true});
for (const [input, output] of [['pixelation.ts','upstream-pixelation.js'],['pixelEditingUtils.ts','upstream-editing.js']]) {
  const original=await readFile(new URL(`upstream/Zippland-perler-beads/src/utils/${input}`, root),'utf8');
  const source=original.replace("import { MappedPixel } from './pixelation';", "import type { MappedPixel } from './pixelation';");
  let js=stripTypeScriptTypes(source,{mode:'transform',sourceMap:false});
  js=js.replaceAll("'./pixelEditingUtils'","'./upstream-editing.js'").replaceAll("'./pixelation'","'./upstream-pixelation.js'");
  js=js.replace(/^\s*console\.log\(.*\);\s*$/gm,'');
  const notice=`// Derived from Zippland/perler-beads @2efee730f73dd4eb472ebde443a022d11f98bc21\n// Original authors: Zippland and contributors. AGPL-3.0, see /LICENSE.\n// Modified by Codex, 2026-10-25: TS→browser JS, .js imports, remove debug logs.\n`;
  await writeFile(new URL(`src/lib/${output}`,root),notice+js);
}
console.log('UPSTREAM_PREPARED pixelation + editing (AGPL-3.0)');
