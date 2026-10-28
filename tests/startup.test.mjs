import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareEntry} from '../scripts/startup-html.mjs';
const root=new URL('../',import.meta.url);
test('first paint needs no external stylesheet; app dependency chains are discovered in the entry response',async()=>{
 const html=await prepareEntry(root);
 assert(html.includes('<style data-startup-css>'));assert(!/<link[^>]*rel="stylesheet"/.test(html));
 assert(html.includes('rel="modulepreload" href="/lib/engine.js"'));assert(html.includes('rel="modulepreload" href="/lib/upstream-pixelation.js"'));
 assert(!/<link[^>]*modulepreload[^>]*googlesyndication/.test(html));
 const original=await readFile(new URL('src/index.html',root),'utf8');
 assert.equal((html.match(/data-ad-slot="4917532094"/g)||[]).length,1);
 assert(html.includes(original.match(/<h1>[\s\S]*?<\/h1>/)[0]));
});
