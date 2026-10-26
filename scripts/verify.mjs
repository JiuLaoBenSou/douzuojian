import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {patterns,patternGrid,summarize} from '../src/library.js';
import {createCatalog} from '../src/catalog.js';
const root=new URL('../',import.meta.url),mapping=JSON.parse(await readFile(new URL('src/data/upstream-color-mapping.json',root),'utf8'));
const palette=Object.entries(mapping).map(([hex,c])=>({hex,key:c.MARD,rgb:{r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)}}));
assert.equal(palette.length,291);assert.equal(new Set(palette.map(c=>c.key)).size,291);
for(const pattern of createCatalog(patterns,palette)){const stats=summarize(pattern.grid);assert.equal(stats.total,pattern.cells.filter(c=>c!==null).length);assert.equal(stats.colors.reduce((s,c)=>s+c.count,0),stats.total);console.log(`PATTERN_OK ${pattern.id} ${pattern.width}x${pattern.height} beads=${stats.total} colors=${stats.colors.length}`);}
assert.deepEqual(await readFile(new URL('src/data/upstream-color-mapping.json',root)),await readFile(new URL('upstream/Zippland-perler-beads/src/app/colorSystemMapping.json',root)));
assert.deepEqual(await readFile(new URL('LICENSE',root)),await readFile(new URL('upstream/Zippland-perler-beads/LICENSE',root)));
console.log('PROVENANCE_OK MARD=291 unique keys; mapping + LICENSE byte-exact');
const manifest=JSON.parse(await readFile(new URL('dist/manifest.json',root),'utf8'));
for(const path of manifest.filter(p=>!['LICENSE','THIRD-PARTY-NOTICES.md','source.zip'].includes(p)))assert.deepEqual(await readFile(new URL('src/'+path,root)),await readFile(new URL('dist/'+path,root)));
console.log('DIST_MATCH '+(manifest.length-3)+'/'+(manifest.length-3)+' app files');
const css=await readFile(new URL('src/styles.css',root),'utf8');assert(!/gradient\(|blur\(|border-radius:\s*[1-9]|(?<![-\w])serif[;,]/i.test(css.replaceAll('monospace','')));console.log('STYLE_OK no CSS gradient, blur, rounded corners or serif');
const server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{stdio:['ignore','pipe','pipe']});let url;
try{
 url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Startup timeout')),10000);let out='';server.stdout.on('data',chunk=>{out+=chunk;const m=out.match(/LOCAL_PREVIEW (http:\/\/127\.0\.0\.1:\d+)/);if(m){clearTimeout(timer);console.log(out.trim());resolve(m[1]);}});server.once('error',reject);server.once('exit',code=>reject(new Error('Early server exit '+code)));});
 for(const path of ['/',...manifest.map(p=>'/'+p)]){const response=await fetch(url+path);assert.equal(response.status,200,path);const data=Buffer.from(await response.arrayBuffer());assert(data.length>0);if(path==='/source.zip')assert.equal(data.readUInt32LE(0),0x04034b50);console.log(`HTTP_OK GET ${path} status=200 bytes=${data.length}`);}
 for(const path of ['/package.json','/manifest.json','/../package.json','/.env','/__qa-mobile','/docs/PRODUCT-BRIEF.md'])assert.equal((await fetch(url+path)).status,404,path);
 assert.equal((await fetch(url,{method:'POST'})).status,405);assert.equal((await fetch(url,{method:'HEAD'})).status,200);console.log('BOUNDARY_OK private paths=404; POST=405; HEAD=200; QA off by default');
}finally{const closed=once(server,'exit');server.kill();await closed;console.log('SERVER_STOPPED verification child process');}
await assert.rejects(fetch(url));console.log('LOOPBACK_CLOSED fetch rejected after shutdown');console.log('VERIFY_OK');
