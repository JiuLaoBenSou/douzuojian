import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const publication=await import('../scripts/catalog-publication.mjs').catch(()=>({}));
const edits=await import('../scripts/review-ui/review-edits.js').catch(()=>({}));
const queues=await import('../scripts/catalog-sync-service.mjs').catch(()=>({}));
test('bulk color replacement targets exact current codes, preserves empty/white beads and can be staged without mutating input',()=>{
 assert.equal(typeof edits.planColorReplace,'function');const v=['H07',null,'H01','H07','?'];const result=edits.planColorReplace(v,'H07','G02');assert.deepEqual(result.indices,[0,3]);assert.deepEqual(result.values,['G02',null,'H01','G02','?']);assert.deepEqual(v,['H07',null,'H01','H07','?']);assert.equal(edits.planColorReplace(v,'H07','H07').indices.length,0);
});
test('publication is deterministic, keeps corrected codes and strips local-only metadata; unknown edits hold the previous public chart',async t=>{
 assert.equal(typeof publication.preparePublicCatalog,'function');const root=await mkdtemp(join(tmpdir(),'douzuojian-public-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const put=async(p,v)=>{await mkdir(join(root,p,'..'),{recursive:true});await writeFile(join(root,p),JSON.stringify(v));};
 await put('src/data/upstream-color-mapping.json',JSON.parse(await readFile(new URL('../src/data/upstream-color-mapping.json',import.meta.url),'utf8')));
 const p={id:'one',name:'图纸',category:'动漫游戏',series:'宝可梦',author:'作者待核对',source:{label:'用户提供的第一代151只图纸',fileName:'one.jpg',privatePath:'F:/private/original.jpg'},license:'仅本地预览',palette:'MARD',status:'draft',width:2,height:2,total:3,colorCount:2,unknownCount:0,data:'/catalog/charts/one.json',thumbnail:'/catalog/thumbs/one.png'};
 const d={schema:1,id:'one',width:2,height:2,colorCodes:['H01','G02'],encoding:'flat',cells:[1,null,0,1]};await put('.local-catalog/index.json',{schema:1,localPreview:true,entries:[p]});await put('.local-catalog/catalog/charts/one.json',d);
 const first=await publication.preparePublicCatalog({root});assert.equal(first.entries,1);assert.equal(first.changed,true);
 const index=JSON.parse(await readFile(join(root,'catalog-content/index.json'),'utf8'));assert.equal(index.localPreview,false);assert.equal(index.entries[0].status,'ready');assert.equal(index.entries[0].collectionId,'pokemon-gen1-pokedex');assert(!JSON.stringify(index).includes('private'));assert(!JSON.stringify(index).includes('仅本地预览'));
 const second=await publication.preparePublicCatalog({root});assert.equal(second.version,first.version);assert.equal(second.changed,false);
 d.cells[0]=-1;p.unknownCount=1;p.colorCount=3;await put('.local-catalog/index.json',{schema:1,localPreview:true,entries:[p]});await put('.local-catalog/catalog/charts/one.json',d);
 const held=await publication.preparePublicCatalog({root});assert.equal(held.version,first.version);assert.deepEqual(held.held,['one']);
});
test('sync queue coalesces saves and retries a failed job without losing later edits',async()=>{
 assert.equal(typeof queues.createSyncQueue,'function');let release,fail=true,runs=0;
 const queue=queues.createSyncQueue({delayMs:5,run:async()=>{runs++;if(fail){fail=false;throw new Error('offline');}await new Promise(r=>{release=r;});return {phase:'synced',version:'ok'};}});
 queue.request();queue.request();await queue.flush();assert.equal(runs,1);assert.equal(queue.status().phase,'error');
 queue.request();const flushing=queue.flush();await new Promise(r=>setTimeout(r,10));queue.request();release();await new Promise(r=>setTimeout(r,10));release();await flushing;assert.equal(runs,3);assert.equal(queue.status().phase,'synced');queue.close();
});

const liveChecks=await import('../scripts/sync-catalog.mjs');
test('live HTML verification accepts only the exact known Cloudflare injection and still rejects changed page bytes',()=>{
 const original=Buffer.from('<!doctype html><body>图纸</body>\r\n');
 const injection="<script>(function(){function c(){var b=a.contentDocument||(a.contentWindow&&a.contentWindow.document);if(b){var d=b.createElement('script');d.innerHTML=\"window.__CF$cv$params={r:'a5105fdf8a652b25',t:'MTc5MzA5MDIwMQ=='};var a=document.createElement('script');a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);\";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script>";
 const live=Buffer.from(original.toString().replace('</body>',injection+'</body>'));
 assert.equal(typeof liveChecks.liveFileMatch,'function');
 assert.equal(liveChecks.liveFileMatch('index.html',original,live),'cloudflare-jsd');
 assert.equal(liveChecks.liveFileMatch('index.html',original,original),'exact');
 assert.equal(liveChecks.liveFileMatch('index.html',original,Buffer.from(live.toString().replace('图纸','改字'))),null);
 assert.equal(liveChecks.liveFileMatch('index.html',original,Buffer.from(live.toString().replace("a.height=1","a.height=2"))),null);
 assert.equal(liveChecks.liveFileMatch('app.js',original,live),null);
});
