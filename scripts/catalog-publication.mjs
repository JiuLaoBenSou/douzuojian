// Deterministic public snapshot from saved local edits. Originals and review history never leave the workstation.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {validateCatalogIndex,decodePatternDocument} from '../src/lib/catalog-store.js';
import {classifyCatalogEntry} from '../src/catalog.js';
import {createPaletteRegistry} from '../src/lib/palettes.js';
import {catalogPng} from './catalog-image.mjs';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const readOptional=async p=>{try{return await readFile(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}};
export async function preparePublicCatalog({root,output=resolve(root,'catalog-content')}){
 const local=resolve(root,'.local-catalog'),indexBytes=await readFile(resolve(local,'index.json')),journalPath=resolve(root,'.local-review/state.json'),journal=await readOptional(journalPath);
 const input=validateCatalogIndex(JSON.parse(indexBytes));if(!input.localPreview)throw new Error('Expected saved local catalog');
 const palette=createPaletteRegistry(JSON.parse(await readFile(resolve(root,'src/data/upstream-color-mapping.json'),'utf8'))).get('mard').colors;
 const oldBytes=await readOptional(resolve(output,'index.json')),old=oldBytes?validateCatalogIndex(JSON.parse(oldBytes)):{entries:[]};const previous=new Map(old.entries.map(p=>[p.id,p]));
 const entries=[],files=new Map(),held=[];
 // A local review catalog manages its own collections, not every published collection.
 const managedCollections=new Set(input.entries.map(p=>classifyCatalogEntry(p).collectionId));
 const oldOrder=new Map(old.entries.map((p,i)=>[p.id,i]));
 for(const item of old.entries){
  if(managedCollections.has(classifyCatalogEntry(item).collectionId))continue;
  entries.push(item);
  for(const path of [item.data,item.thumbnail])files.set(path.slice('/catalog/'.length),await readFile(resolve(output,path.slice('/catalog/'.length))));
 }
 for(const item of input.entries){
  const p=classifyCatalogEntry(item),doc=JSON.parse(await readFile(resolve(local,p.data.slice(1)),'utf8')),decoded=decodePatternDocument(doc,p,palette,{allowDraft:true});
  const publicId=p.number&&p.collectionId==='pokemon-gen1-pokedex'?'pokemon-kanto-'+String(p.number).padStart(3,'0'):p.id,publicData='/catalog/charts/'+publicId+'.json',publicThumb='/catalog/thumbs/'+publicId+'.png';
  if(p.unknownCount){held.push(p.id);const keep=previous.get(publicId);if(keep){entries.push(keep);for(const path of [keep.data,keep.thumbnail])files.set(path.slice('/catalog/'.length),await readFile(resolve(output,path.slice('/catalog/'.length))));}continue;}
  const source={label:p.source.label};if(/^https?:\/\//.test(p.source.url??''))source.url=p.source.url;
  if(p.source.fileName)source.fileName=String(p.source.fileName).replaceAll('\\','/').split('/').at(-1);
  if(/^[0-9a-f]{64}$/i.test(p.source.imageSha256??''))source.imageSha256=p.source.imageSha256;
  const meta={id:publicId,...(p.number?{number:p.number}:{}),name:p.name,category:p.category,series:p.series??'',section:p.section??'',collection:p.collection??'',collectionId:p.collectionId??'',tags:p.tags??[],aliases:p.aliases??[],note:['pokemon-johto-100','sanrio-hello-kitty-charms','pokemon-ball-charms'].includes(p.collectionId)?'按原图配色经 AI 辅助转译，色号和用量请对照原图与实物色卡。':'按原图色号整理，屏幕颜色请对照实物色卡。',author:p.author,source,license:'原作者与原帖信息待补充，请核对原始资料及使用范围。',palette:'MARD',status:'ready',width:p.width,height:p.height,total:p.total,colorCount:p.colorCount,unknownCount:0,data:publicData,thumbnail:publicThumb,dataDate:previous.get(publicId)?.dataDate??new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())};
  const colorCodes=[...new Set(decoded.grid.flat().filter(c=>!c.isExternal).map(c=>c.key))].sort();if(!colorCodes.length)colorCodes.push('H07');
  const canonical={schema:1,id:publicId,width:p.width,height:p.height,colorCodes,encoding:'flat',cells:decoded.grid.flat().map(c=>c.isExternal?null:colorCodes.indexOf(c.key))};
  decodePatternDocument(canonical,meta,palette);entries.push(meta);files.set(publicData.slice('/catalog/'.length),Buffer.from(JSON.stringify(canonical)));files.set(publicThumb.slice('/catalog/'.length),catalogPng(decoded.grid));
 }
 const afterIndex=await readFile(resolve(local,'index.json')),afterJournal=await readOptional(journalPath);
 if(!indexBytes.equals(afterIndex)||(journal?.toString()??'')!==(afterJournal?.toString()??''))throw new Error('Local edits changed while taking snapshot; retry');
 entries.sort((a,b)=>(oldOrder.get(a.id)??Infinity)-(oldOrder.get(b.id)??Infinity)||a.id.localeCompare(b.id));
 const version=digest(JSON.stringify([entries,[...files].sort(([a],[b])=>a.localeCompare(b)).map(([path,bytes])=>[path,digest(bytes)])]));
 const index=validateCatalogIndex({schema:1,localPreview:false,publicTranscribed:true,contentVersion:version,entries});files.set('index.json',Buffer.from(JSON.stringify(index)));files.set('content-version.json',Buffer.from(JSON.stringify({schema:1,version,charts:entries.length})));
 const list=[...files].sort(([a],[b])=>a.localeCompare(b)).map(([path,bytes])=>({path,bytes:bytes.length,sha256:digest(bytes)}));files.set('manifest.json',Buffer.from(JSON.stringify(list)));
 let changed=false,changedFiles=[];for(const [path,bytes]of files){const target=resolve(output,path),before=await readOptional(target);if(!before?.equals(bytes)){await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);changed=true;changedFiles.push(path);}}
 return {version,entries:entries.length,held,changed,changedFiles};
}
