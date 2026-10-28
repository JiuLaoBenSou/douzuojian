import assert from 'node:assert/strict';
import {prepareEntry} from './startup-html.mjs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {patterns,patternGrid,summarize} from '../src/library.js';
import {createCatalog} from '../src/catalog.js';
import {createPaletteRegistry} from '../src/lib/palettes.js';
import {validateCatalogIndex,decodePatternDocument} from '../src/lib/catalog-store.js';
import {catalogPng} from './catalog-image.mjs';
const root=new URL('../',import.meta.url),mapping=JSON.parse(await readFile(new URL('src/data/upstream-color-mapping.json',root),'utf8'));
const registry=createPaletteRegistry(mapping),palette=registry.get('mard').colors;
assert.deepEqual(palette.map(c=>[c.key,c.hex]),Object.entries(mapping).map(([hex,c])=>[c.MARD,hex]));
assert.equal(Object.keys(mapping).length,291);assert.equal(registry.size,7);assert.equal(palette.length,291);
for(const entry of registry.values()){assert.equal(new Set(entry.colors.map(c=>c.key)).size,entry.colors.length);assert(entry.colors.every(c=>/^[a-z0-9]+$/i.test(c.key)));}
console.log('PALETTE_REGISTRY_OK brands=7 defaultMARD=291; missing codes excluded');
for(const pattern of createCatalog(patterns,palette)){const stats=summarize(pattern.grid);assert.equal(stats.total,pattern.cells.filter(c=>c!==null).length);assert.equal(stats.colors.reduce((s,c)=>s+c.count,0),stats.total);console.log(`PATTERN_OK ${pattern.id} ${pattern.width}x${pattern.height} beads=${stats.total} colors=${stats.colors.length}`);}
assert.deepEqual(await readFile(new URL('src/data/upstream-color-mapping.json',root)),await readFile(new URL('upstream/Zippland-perler-beads/src/app/colorSystemMapping.json',root)));
assert.deepEqual(await readFile(new URL('LICENSE',root)),await readFile(new URL('upstream/Zippland-perler-beads/LICENSE',root)));
console.log('PROVENANCE_OK MARD=291 unique keys; mapping + LICENSE byte-exact');
const manifest=JSON.parse(await readFile(new URL('dist/manifest.json',root),'utf8'));
const copied=manifest.filter(p=>!p.startsWith('catalog/')&&!['LICENSE','THIRD-PARTY-NOTICES.md','source.zip'].includes(p));
for(const path of copied)assert.deepEqual(path==='index.html'?Buffer.from(await prepareEntry(root)):await readFile(new URL('src/'+path,root)),await readFile(new URL('dist/'+path,root)));
console.log('DIST_MATCH '+copied.length+'/'+copied.length+' source app files');
const catalog=validateCatalogIndex(JSON.parse(await readFile(new URL('dist/catalog/index.json',root),'utf8'))),originals=createCatalog(patterns,palette);
for(const p of catalog.entries){
 const bytes=await readFile(new URL('dist'+p.data,root)),doc=JSON.parse(bytes),decoded=decodePatternDocument(doc,p,palette,{allowDraft:catalog.localPreview});
 assert(manifest.includes(p.data.slice(1)));assert(manifest.includes(p.thumbnail.slice(1)));
 if(p.status==='ready'){const original=originals.find(x=>x.id===p.id);if(original){assert.deepEqual(decoded.grid,original.grid);assert.deepEqual(await readFile(new URL('dist'+p.thumbnail,root)),catalogPng(original.grid));}else{assert(catalog.publicTranscribed);assert.deepEqual(bytes,await readFile(new URL('catalog-content/'+p.data.slice('/catalog/'.length),root)));assert.deepEqual(await readFile(new URL('dist'+p.thumbnail,root)),catalogPng(decoded.grid));}}
 else{assert.deepEqual(bytes,await readFile(new URL('.local-catalog'+p.data,root)));assert.deepEqual(await readFile(new URL('dist'+p.thumbnail,root)),await readFile(new URL('.local-catalog'+p.thumbnail,root)));}
}
assert.equal(catalog.entries.filter(p=>p.status==='ready'&&originals.some(o=>o.id===p.id)).length,4);
console.log('CATALOG_OK metadata='+catalog.entries.length+' unknown='+catalog.entries.reduce((s,p)=>s+p.unknownCount,0)+' localPreview='+catalog.localPreview);
const css=await readFile(new URL('src/styles.css',root),'utf8');assert(!/gradient\(|blur\(|border-radius:\s*[1-9]|(?<![-\w])serif[;,]/i.test(css.replaceAll('monospace','')));console.log('STYLE_OK no CSS gradient, blur, rounded corners or serif');
const server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{stdio:['ignore','pipe','pipe']});let url;
try{
 url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Startup timeout')),10000);let out='';server.stdout.on('data',chunk=>{out+=chunk;const m=out.match(/LOCAL_PREVIEW (http:\/\/127\.0\.0\.1:\d+)/);if(m){clearTimeout(timer);console.log(out.trim());resolve(m[1]);}});server.once('error',reject);server.once('exit',code=>reject(new Error('Early server exit '+code)));});
 for(const path of ['/',...manifest.map(p=>'/'+p)]){const response=await fetch(url+path);assert.equal(response.status,200,path);const data=Buffer.from(await response.arrayBuffer());assert(data.length>0);if(path==='/source.zip')assert.equal(data.readUInt32LE(0),0x04034b50);console.log(`HTTP_OK GET ${path} status=200 bytes=${data.length}`);}
 for(const path of ['/package.json','/manifest.json','/../package.json','/.env','/__qa-mobile','/docs/PRODUCT-BRIEF.md','/__review/','/__review/api/index','/__review/source/local-probe-03','/.local-review/state.json'])assert.equal((await fetch(url+path)).status,404,path);
 assert.match((await fetch(url+'/assets/favicon.svg')).headers.get('content-type'),/image\/svg\+xml/);assert.match((await fetch(url+'/catalog/thumbs/bow.png')).headers.get('content-type'),/image\/png/);
 if(!catalog.localPreview){assert.equal((await fetch(url+'/catalog/charts/local-probe-01.json')).status,404);assert.equal((await fetch(url+'/catalog/thumbs/local-probe-01.png')).status,404);console.log('LOCAL_FIXTURES_EXCLUDED public build serves no local probe IDs or original images');}
 assert.equal((await fetch(url,{method:'POST'})).status,405);assert.equal((await fetch(url,{method:'HEAD'})).status,200);console.log('BOUNDARY_OK private paths=404; POST=405; HEAD=200; QA off by default');
}finally{const closed=once(server,'exit');server.kill();await closed;console.log('SERVER_STOPPED verification child process');}
await assert.rejects(fetch(url));console.log('LOOPBACK_CLOSED fetch rejected after shutdown');console.log('VERIFY_OK');
