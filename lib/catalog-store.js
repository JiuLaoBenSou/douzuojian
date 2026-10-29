// Metadata-only library and bounded, on-demand chart decoding. Codex, 2026-10-27. AGPL-3.0.
import {createCatalog} from '../catalog.js?v=669908800f8c5daa';
import {summarize} from './engine.js?v=669908800f8c5daa';
const safeId=id=>typeof id==='string'&&/^[a-z0-9-]+$/.test(id);
export function validateCatalogIndex(index){
 if(index?.schema!==1||!Array.isArray(index.entries))throw new Error('图纸目录格式无效');
 const ids=new Set();
 for(const p of index.entries){
  if(!safeId(p.id)||ids.has(p.id))throw new Error('图纸ID重复或无效');ids.add(p.id);
  if(['cells','grid','runs','colorCodes','materials'].some(key=>key in p))throw new Error('目录只能包含图纸摘要');
  if(!p.name||!p.category||!p.author||!p.source?.label||!p.license||p.palette!=='MARD')throw new Error('图纸资料不完整');
  if(p.data!==`/catalog/charts/${p.id}.json`||!new RegExp(`^/catalog/thumbs/${p.id}\\.(png|svg|webp)$`).test(p.thumbnail))throw new Error('图纸资源路径无效');
  for(const n of ['width','height'])if(!Number.isInteger(p[n])||p[n]<1||p[n]>128)throw new Error('图纸尺寸无效');
  if(!Number.isInteger(p.total)||p.total<0||p.total>p.width*p.height||!Number.isInteger(p.colorCount)||p.colorCount<0||p.colorCount>292||!Number.isInteger(p.unknownCount)||p.unknownCount<0||p.unknownCount>p.total)throw new Error('图纸数量无效');
  if(!['ready','draft'].includes(p.status)||p.status==='draft'&&!index.localPreview||p.status==='ready'&&p.unknownCount)throw new Error('未确认草稿不能进入正式目录');
  for(const key of ['tags','aliases'])if(p[key]!==undefined&&(!Array.isArray(p[key])||p[key].some(s=>typeof s!=='string')))throw new Error('图纸标签无效');
  for(const key of ['series','section','collection','collectionId'])if(p[key]!==undefined&&(typeof p[key]!=='string'||p[key].length>256))throw new Error('图纸合集字段无效');
  if((p.collection||p.collectionId)&&(!p.series||!p.section||!p.collection))throw new Error('图纸合集需要系列、类型和名称');
 }
 return index;
}
export function decodePatternDocument(doc,meta,palette,{allowDraft=false}={}){
 if(meta.status==='draft'&&!allowDraft)throw new Error('草稿仅供本地预览');
 if(doc?.schema!==1||doc.id!==meta.id||doc.width!==meta.width||doc.height!==meta.height||!Number.isInteger(doc.width)||!Number.isInteger(doc.height)||doc.width<1||doc.height<1||doc.width>128||doc.height>128)throw new Error('图纸文件与目录不一致');
 if(!Array.isArray(doc.colorCodes)||!doc.colorCodes.length||doc.colorCodes.length>291||new Set(doc.colorCodes).size!==doc.colorCodes.length)throw new Error('图纸色号表无效');
 const length=doc.width*doc.height;let cells=[];
 if(doc.encoding==='flat'){if(!Array.isArray(doc.cells)||doc.cells.length!==length)throw new Error('图纸格数无效');cells=doc.cells;}
 else if(doc.encoding==='rle'){
  if(!Array.isArray(doc.runs)||doc.runs.length>length)throw new Error('图纸压缩数据无效');
  for(const run of doc.runs){if(!Array.isArray(run)||run.length!==2||!Number.isInteger(run[0])||run[0]<1||cells.length+run[0]>length)throw new Error('图纸压缩长度无效');for(let n=0;n<run[0];n++)cells.push(run[1]);}
 }else throw new Error('不支持的图纸编码');
 if(cells.length!==length||cells.some(c=>c!==null&&(!Number.isInteger(c)||c< -1||c>=doc.colorCodes.length)))throw new Error('图纸格子无效');
 const unknownCount=cells.filter(c=>c===-1).length;
 if(unknownCount&&(!allowDraft||meta.status!=='draft'))throw new Error('图纸仍有待确认色号');
 const base=createCatalog([{...meta,permissionStatus:'ready',colorCodes:doc.colorCodes,cells:cells.map(c=>c===-1?null:c)}],palette)[0];
 for(let i=0;i<cells.length;i++)if(cells[i]===-1)base.grid[Math.floor(i/doc.width)][i%doc.width]={key:'?',color:'#ff00ff',isUnresolved:true};
 const stats=summarize(base.grid);
 if(stats.total!==meta.total||stats.colors.length!==meta.colorCount||unknownCount!==meta.unknownCount)throw new Error('图纸数量与目录不一致');
 return {...base,total:stats.total,colorCount:stats.colors.length,materials:stats.colors.filter(c=>c.key!=='?'),unknownCount};
}
export function createPatternStore({entries,palette,fetchJson,allowDraft=false,cacheSize=12}){
 const metadata=new Map(entries.map(p=>[p.id,p])),cache=new Map();
 return {async load(id){
  const meta=metadata.get(id);if(!meta)throw new Error('找不到这张图纸');
  if(cache.has(id)){const promise=cache.get(id);cache.delete(id);cache.set(id,promise);return promise;}
  const promise=Promise.resolve().then(()=>fetchJson(meta.data)).then(doc=>decodePatternDocument(doc,meta,palette,{allowDraft}));cache.set(id,promise);
  while(cache.size>Math.max(1,cacheSize))cache.delete(cache.keys().next().value);
  try{return await promise;}catch(error){if(cache.get(id)===promise)cache.delete(id);throw error;}
 }};
}
export function catalogPage(entries,page=1,pageSize=24){
 pageSize=Math.max(1,Math.min(48,Math.floor(pageSize)||24));const pageCount=Math.max(1,Math.ceil(entries.length/pageSize));page=Math.max(1,Math.min(pageCount,Math.floor(page)||1));
 return {items:entries.slice((page-1)*pageSize,page*pageSize),page,pageCount,total:entries.length};
}
