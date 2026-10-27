// Local human review: exact-code edits, provenance, persistence and HTTP boundaries. Codex 2026-10-27.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createServer,request as httpRequest} from 'node:http';
const {createLocalReview}=await import('../scripts/local-review.mjs').catch(()=>({}));
const mapping=JSON.parse(await readFile(new URL('../src/data/upstream-color-mapping.json',import.meta.url),'utf8'));
async function fixture(t){
 assert.equal(typeof createLocalReview,'function','Local review backend is required');
 const dir=await mkdtemp(join(tmpdir(),'douzuojian-review-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const put=async(p,value)=>{await mkdir(join(dir,p,'..'),{recursive:true});await writeFile(join(dir,p),typeof value==='string'?value:JSON.stringify(value));};
 const meta={id:'draft-one',number:1,name:'测试图纸',category:'动漫游戏',series:'宝可梦',tags:[],author:'原作者',source:{label:'测试原图'},license:'本地',palette:'MARD',status:'draft',width:2,height:2,total:3,colorCount:3,unknownCount:1,data:'/catalog/charts/draft-one.json',thumbnail:'/catalog/thumbs/draft-one.png'};
 const doc={schema:1,id:meta.id,width:2,height:2,colorCodes:['H01','H07'],encoding:'flat',cells:[-1,0,null,1]};
 const image=Buffer.from('original-image-kept-byte-exact');const source=join(dir,'original.jpg');await writeFile(source,image);
 const hash=createHash('sha256').update(image).digest('hex');const index={schema:1,localPreview:true,entries:[meta]};
 await put('src/data/upstream-color-mapping.json',mapping);await put('batch/final/index.json',index);await put('batch/final/catalog/charts/draft-one.json',doc);
 await put('batch/inventory.json',[{number:1,path:source,width:45,height:45,sha256:hash}]);
 await put('batch/final/batch-manifest.json',[{number:1,id:meta.id,sourcePath:source,sourceSha256:hash,sourceROI:null}]);
 await put('dist/catalog/index.json',index);await put('.local-catalog/index.json',index);
 return {dir,source,image,root:pathToFileURL(dir+'/'),batch:join(dir,'batch/final'),doc};
}
test('manual exact-code fill survives restart and updates library counts and PNG without changing source or frozen JSON',async t=>{
 const f=await fixture(t),r=await createLocalReview({root:f.root,batch:f.batch});
 const before=await r.chart('draft-one');assert.deepEqual(before.values,['?', 'H01',null,'H07']);assert.equal(before.source.fileName,'original.jpg');assert(!JSON.stringify(before).includes(f.dir));
 const saved=await r.save('draft-one',{revision:before.revision,changes:[{row:1,column:1,code:'G2'}]});
 assert.deepEqual(saved.values,['G02','H01',null,'H07']);assert.equal(saved.meta.unknownCount,0);assert.equal(saved.meta.total,3);
 const restart=await createLocalReview({root:f.root,batch:f.batch});assert.deepEqual((await restart.chart('draft-one')).values,saved.values);
 const index=JSON.parse(await readFile(join(f.dir,'dist/catalog/index.json'),'utf8'));assert.equal(index.entries[0].unknownCount,0);assert.equal(index.entries[0].status,'draft');
 const png=await readFile(join(f.dir,'dist/catalog/thumbs/draft-one.png'));assert.equal(png.readUInt32BE(0),0x89504e47);
 assert.deepEqual(await readFile(f.source),f.image);assert.deepEqual(JSON.parse(await readFile(join(f.batch,'catalog/charts/draft-one.json'),'utf8')),f.doc);
 const journal=JSON.parse(await readFile(join(f.dir,'.local-review/state.json'),'utf8'));assert.equal(journal.charts['draft-one'].history[0].changes[0].before,'?');assert.equal(journal.charts['draft-one'].history[0].changes[0].after,'G02');
});
test('stale revision, unknown codes, duplicate and out-of-grid edits reject atomically',async t=>{
 const f=await fixture(t),r=await createLocalReview({root:f.root,batch:f.batch}),base=await r.chart('draft-one');
 for(const changes of [[{row:1,column:1,code:'FAKE'}],[{row:3,column:1,code:'H01'}],[{row:1,column:1,code:'G02'},{row:1,column:1,code:'H01'}]])await assert.rejects(r.save('draft-one',{revision:base.revision,changes}));
 assert.equal((await r.chart('draft-one')).revision,base.revision);
 await r.save('draft-one',{revision:base.revision,changes:[{row:1,column:1,code:'H01'}]});
 await assert.rejects(r.save('draft-one',{revision:base.revision,changes:[{row:1,column:2,code:'H07'}]}),e=>e.status===409);
});
test('undo restores white, unknown and empty separately and records a new manual revision',async t=>{
 const f=await fixture(t),r=await createLocalReview({root:f.root,batch:f.batch}),base=await r.chart('draft-one');
 const changed=await r.save('draft-one',{revision:base.revision,changes:[{row:1,column:1,code:'H01'},{row:2,column:1,code:'H07'},{row:1,column:2,code:null}]});
 assert.equal(changed.meta.total,3);
 const undone=await r.undo('draft-one',{revision:changed.revision});assert.deepEqual(undone.values,base.values);assert.notEqual(undone.revision,base.revision);assert.equal(undone.meta.unknownCount,1);
});
test('source delivery is allowlisted and rejects changed originals',async t=>{
 const f=await fixture(t),r=await createLocalReview({root:f.root,batch:f.batch});assert.deepEqual(await r.source('draft-one'),f.image);
 await assert.rejects(r.source('../original.jpg'));
 await writeFile(f.source,'changed');await assert.rejects(r.source('draft-one'),e=>e.status===409);
});
test('HTTP save needs exact localhost Host, Origin and session token; GET is read-only',async t=>{
 const f=await fixture(t),r=await createLocalReview({root:f.root,batch:f.batch});
 const s=createServer(async(req,res)=>{if(!await r.handle(req,res))res.writeHead(404).end();});await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>s.close(resolve)));const origin='http://127.0.0.1:'+s.address().port;
 const index=await (await fetch(origin+'/__review/api/index')).json();assert.equal(index.entries.length,1);assert(index.token);
 // Node fetch rewrites Host to the URL hostname. Use raw HTTP so this really tests the server's Host boundary.
 const foreignHostStatus=await new Promise((resolve,reject)=>{const req=httpRequest(origin+'/__review/api/index',{headers:{Host:'evil.example'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});assert.equal(foreignHostStatus,403);
 const base=await r.chart('draft-one'),body=JSON.stringify({revision:base.revision,changes:[{row:1,column:1,code:'G02'}]});
 for(const headers of [{'Content-Type':'application/json'},{'Content-Type':'application/json',Origin:'https://evil.example','X-Review-Token':index.token}])assert.equal((await fetch(origin+'/__review/api/save/draft-one',{method:'POST',headers,body})).status,403);
 assert.equal((await r.chart('draft-one')).revision,base.revision);
 const good=await fetch(origin+'/__review/api/save/draft-one',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Review-Token':index.token},body});assert.equal(good.status,200);
 assert.equal((await fetch(origin+'/__review/source/no-such-id')).status,404);
});

test('a whole 1600-bead color can be replaced in one save and undone; only saved revisions trigger sync',async t=>{
 const f=await fixture(t),index=JSON.parse(await readFile(join(f.dir,'batch/final/index.json'),'utf8'));Object.assign(index.entries[0],{width:40,height:40,total:1600,colorCount:1,unknownCount:0});
 await writeFile(join(f.dir,'batch/final/index.json'),JSON.stringify(index));await writeFile(join(f.dir,'dist/catalog/index.json'),JSON.stringify(index));
 await writeFile(join(f.dir,'batch/final/catalog/charts/draft-one.json'),JSON.stringify({schema:1,id:'draft-one',width:40,height:40,colorCodes:['H07'],encoding:'flat',cells:Array(1600).fill(0)}));
 const savedEvents=[],r=await createLocalReview({root:f.root,batch:f.batch,onSaved:e=>savedEvents.push(e)}),before=await r.chart('draft-one');assert.equal(savedEvents.length,0);
 const saved=await r.save('draft-one',{revision:before.revision,changes:Array.from({length:1600},(_,i)=>({row:Math.floor(i/40)+1,column:i%40+1,code:'H01'}))});assert(saved.values.every(v=>v==='H01'));assert.equal(saved.meta.total,1600);assert.equal(savedEvents.length,1);
 const undone=await r.undo('draft-one',{revision:saved.revision});assert(undone.values.every(v=>v==='H07'));assert.equal(savedEvents.length,2);
});
