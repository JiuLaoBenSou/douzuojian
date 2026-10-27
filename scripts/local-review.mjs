// Local-only human chart review. Originals and frozen audit inputs stay read-only. Codex 2026-10-27, AGPL-3.0.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,relative,isAbsolute,basename,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import {validateCatalogIndex,decodePatternDocument} from '../src/lib/catalog-store.js';
import {createPaletteRegistry} from '../src/lib/palettes.js';
import {catalogPng} from './catalog-image.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const error=(status,message)=>Object.assign(new Error(message),{status});
const json=async path=>JSON.parse(await readFile(path,'utf8'));
async function atomic(path,data){await mkdir(dirname(path),{recursive:true});const temp=path+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(temp,data);await rename(temp,path);}
export async function createLocalReview({root,batch,onSaved=()=>{},syncService=null}){
 const project=typeof root==='string'?resolve(root):fileURLToPath(root),batchPath=resolve(project,batch),inside=relative(project,batchPath);
 if(inside.startsWith('..')||isAbsolute(inside))throw error(400,'批次目录必须在本项目内');
 const indexBytes=await readFile(resolve(batchPath,'index.json')),index=validateCatalogIndex(JSON.parse(indexBytes));
 if(!index.localPreview||index.entries.some(p=>p.status!=='draft'))throw error(400,'只能校对本地草稿批次');
 const fingerprint=hash(indexBytes),metadata=new Map(index.entries.map(p=>[p.id,p]));
 const manifest=new Map((await json(resolve(batchPath,'batch-manifest.json'))).map(p=>[p.id,p]));
 const inventory=new Map((await json(resolve(batchPath,'../inventory.json'))).map(p=>[p.number,p]));
 const mapping=await json(resolve(project,'src/data/upstream-color-mapping.json')),palette=createPaletteRegistry(mapping).get('mard').colors,colors=new Map(palette.map(c=>[c.key,c.hex]));
 const docs=new Map();
 for(const p of index.entries){const doc=await json(resolve(batchPath,p.data.slice(1)));decodePatternDocument(doc,p,palette,{allowDraft:true});docs.set(p.id,doc);if(!manifest.has(p.id)||!inventory.has(p.number))throw error(400,'缺少原图清单');}
 const stateFile=resolve(project,'.local-review/state.json');let state;
 try{state=await json(stateFile);}catch(e){if(e.code!=='ENOENT')throw e;state={schema:1,batch:fingerprint,charts:{}};}
 if(state.schema!==1||state.batch!==fingerprint)throw error(409,'人工记录对应另一版批次，请保留记录后核对批次');
 const token=randomBytes(24).toString('hex');let pending=Promise.resolve();
 function meta(id){const p=metadata.get(id);if(!p)throw error(404,'找不到图纸');return p;}
 function baseValues(id){const d=docs.get(id),cells=d.encoding==='flat'?d.cells:d.runs.flatMap(([n,c])=>Array(n).fill(c));return cells.map(c=>c===null?null:c<0?'?':d.colorCodes[c]);}
 function current(id){const p=meta(id),record=state.charts[id],values=record?.values??baseValues(id),version=record?.version??0;
  if(values.length!==p.width*p.height||values.some(v=>v!==null&&v!=='?'&&!colors.has(v)))throw error(500,'人工记录格子无效');
  const colorCodes=[...new Set(values.filter(v=>v!==null&&v!=='?'))];if(!colorCodes.length)colorCodes.push('H07');
  const doc={schema:1,id,width:p.width,height:p.height,colorCodes,encoding:'flat',cells:values.map(v=>v===null?null:v==='?'?-1:colorCodes.indexOf(v))};
  const unknownCount=values.filter(v=>v==='?').length,total=values.filter(v=>v!==null).length,colorCount=new Set(values.filter(v=>v!==null)).size;
  const revised={...p,total,colorCount,unknownCount};decodePatternDocument(doc,revised,palette,{allowDraft:true});
  const source=manifest.get(id),original=inventory.get(p.number),roi=source.sourceROI??[0,0,original.width,original.height];
  return {meta:revised,document:doc,values:[...values],revision:hash(JSON.stringify([fingerprint,id,version,values])),version,canUndo:record?.history.at(-1)?.kind==='edit',history:record?.history.slice(-8)??[],source:{url:'/__review/source/'+id,fileName:basename(source.sourcePath),width:original.width,height:original.height,gridRect:roi,sha256:source.sourceSha256}};
 }
 async function publish(ids){
  for(const id of ids){const p=current(id),grid=decodePatternDocument(p.document,p.meta,palette,{allowDraft:true}).grid,bytes=JSON.stringify(p.document),png=catalogPng(grid);
   for(const area of ['.local-catalog','dist']){await atomic(resolve(project,area,p.meta.data.slice(1)),bytes);await atomic(resolve(project,area,p.meta.thumbnail.slice(1)),png);}
  }
  const entries=index.entries.map(p=>current(p.id).meta);await atomic(resolve(project,'.local-catalog/index.json'),JSON.stringify({schema:1,localPreview:true,entries}));
  const output=await json(resolve(project,'dist/catalog/index.json'));const replacements=new Map(entries.map(p=>[p.id,p]));
  if(!output.localPreview||entries.some(p=>!output.entries.some(x=>x.id===p.id)))throw error(409,'请先构建这批本地图库');
  await atomic(resolve(project,'dist/catalog/index.json'),JSON.stringify({...output,entries:output.entries.map(p=>replacements.get(p.id)??p)}));
 }
 async function source(id){meta(id);const m=manifest.get(id),bytes=await readFile(m.sourcePath);if(hash(bytes)!==m.sourceSha256)throw error(409,'原图已变化，已停止读取，请核对来源');return bytes;}
 function normalize(code){if(code===null||code==='?')return code;if(typeof code!=='string')throw error(400,'请输入MARD色号');const m=code.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/),value=m?m[1]+m[2].padStart(2,'0'):'';if(!colors.has(value))throw error(400,'未找到这个MARD色号');return value;}
 function serial(fn){const next=pending.then(fn);pending=next.catch(()=>{});return next;}
 async function change(id,body,undo=false){return serial(async()=>{
  const before=current(id);if(body.revision!==before.revision)throw error(409,'图纸已被另一页修改，请重新读取后再保存');await source(id);
  let changes=body.changes;
  if(undo){const last=state.charts[id]?.history.at(-1);if(last?.kind!=='edit')throw error(400,'没有可撤回的保存');changes=last.changes.map(c=>({row:c.row,column:c.column,code:c.before}));}
  if(!Array.isArray(changes)||!changes.length||changes.length>16384)throw error(400,'修改格数无效');
  const values=[...before.values],seen=new Set(),log=[];
  for(const c of changes){if(!Number.isInteger(c.row)||!Number.isInteger(c.column)||c.row<1||c.row>before.meta.height||c.column<1||c.column>before.meta.width)throw error(400,'修改位置超出图纸');const at=(c.row-1)*before.meta.width+c.column-1;if(seen.has(at))throw error(400,'同一格不能重复提交');seen.add(at);const after=normalize(c.code);if(values[at]!==after){log.push({row:c.row,column:c.column,before:values[at],after});values[at]=after;}}
  if(!log.length)throw error(400,'没有需要保存的修改');
  const previous=state.charts[id],record={version:before.version+1,values,history:[...(previous?.history??[]),{kind:undo?'undo':'edit',at:new Date().toISOString(),changes:log}]};
  const next={...state,charts:{...state.charts,[id]:record}};await atomic(stateFile,JSON.stringify(next,null,2));state=next;
  // Journal is authoritative. Derived PNG, public draft JSON and counts are rebuilt on startup after interrupted writes.
  await publish([id]);onSaved({id,version:record.version});return current(id);
 });}
 async function handle(req,res){
  const path=new URL(req.url,'http://127.0.0.1').pathname;if(!path.startsWith('/__review/'))return false;
  const origin='http://127.0.0.1:'+req.socket.localPort;
  const send=(status,value,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:Buffer.isBuffer(value)?value:type.startsWith('application/json')?JSON.stringify(value):value);};
  try{
   if(req.headers.host!==origin.slice(7))throw error(403,'仅限本机访问');
   if(req.method==='POST'){
    if(req.headers.origin!==origin||req.headers['x-review-token']!==token||!/^application\/json(?:;|$)/.test(req.headers['content-type']??''))throw error(403,'请从本机校对页面保存');
    if(path==='/__review/api/retry-sync'&&syncService){syncService.request();send(200,syncService.status());return true;}
    const match=path.match(/^\/__review\/api\/(save|undo)\/([a-z0-9-]+)$/);if(!match)throw error(404,'接口不存在');
    let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>1048576)throw error(413,'修改内容过大');chunks.push(chunk);}let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw error(400,'修改格式无效');}
    send(200,await change(match[2],body,match[1]==='undo'));return true;
   }
   if(!['GET','HEAD'].includes(req.method))throw error(405,'不支持这个请求');
   if(path==='/__review/api/sync'){send(200,syncService?.status()??{enabled:false,phase:'disabled'});return true;}
   if(path==='/__review/api/index'){send(200,{token,syncEnabled:Boolean(syncService),palette:palette.map(c=>({key:c.key,hex:c.hex})),entries:index.entries.map(p=>current(p.id).meta)});return true;}
   const match=path.match(/^\/__review\/(api\/chart|source)\/([a-z0-9-]+)$/);
   if(match){send(200,match[1]==='source'?await source(match[2]):current(match[2]),match[1]==='source'?'image/jpeg':'application/json; charset=utf-8');return true;}
   const assets={'/__review/':['index.html','text/html; charset=utf-8'],'/__review/review.js':['review.js','text/javascript; charset=utf-8'],'/__review/review-edits.js':['review-edits.js','text/javascript; charset=utf-8'],'/__review/review.css':['review.css','text/css; charset=utf-8']};
   const asset=assets[path];if(!asset)throw error(404,'页面不存在');send(200,await readFile(new URL('review-ui/'+asset[0],import.meta.url)),asset[1]);
  }catch(e){send(e.status??500,{error:e.status?e.message:'校对文件暂时无法读取；如保存曾中断，请重启校对服务恢复。'});}
  return true;
 }
 if(Object.keys(state.charts).length)await publish(Object.keys(state.charts));
 return {chart:async id=>current(id),source,save:(id,body)=>change(id,body),undo:(id,body)=>change(id,body,true),handle};
}
