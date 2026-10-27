// Build separate index, chart documents and image resources. Codex, 2026-10-27. AGPL-3.0.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {patterns} from '../src/library.js';
import {createCatalog,classifyCatalogEntry} from '../src/catalog.js';
import {createPaletteRegistry} from '../src/lib/palettes.js';
import {catalogPng} from './catalog-image.mjs';
import {validateCatalogIndex,decodePatternDocument} from '../src/lib/catalog-store.js';
export async function buildCatalog(root,dist,{localPreview=false}={}){
 const mapping=JSON.parse(await readFile(new URL('src/data/upstream-color-mapping.json',root),'utf8')),palette=createPaletteRegistry(mapping).get('mard').colors,entries=[],files=[];
 async function save(path,data){await mkdir(new URL(path.slice(0,path.lastIndexOf('/')+1),dist),{recursive:true});await writeFile(new URL(path,dist),data);files.push(path);}
 for(const p of createCatalog(patterns,palette)){
  const colorCodes=p.materials.map(c=>c.key),cells=p.grid.flat().map(c=>c.isExternal?null:colorCodes.indexOf(c.key));
  const meta={id:p.id,name:p.name,category:p.category,tags:p.tags,aliases:[],series:'原创几何',note:p.note,author:p.author,source:p.source,license:p.license,palette:'MARD',status:'ready',width:p.width,height:p.height,total:p.total,colorCount:p.colorCount,unknownCount:0,data:`/catalog/charts/${p.id}.json`,thumbnail:`/catalog/thumbs/${p.id}.png`};
  await save(meta.data.slice(1),JSON.stringify({schema:1,id:p.id,width:p.width,height:p.height,colorCodes,encoding:'flat',cells}));
  await save(meta.thumbnail.slice(1),catalogPng(p.grid));entries.push(meta);
 }
 if(localPreview){
  const local=new URL('.local-catalog/',root),index=validateCatalogIndex(JSON.parse(await readFile(new URL('index.json',local),'utf8')));
  if(!index.localPreview)throw new Error('Local catalog flag missing');
  const localEntries=index.entries.map(classifyCatalogEntry);
  for(const meta of localEntries){
   const data=await readFile(new URL(meta.data.slice(1),local));decodePatternDocument(JSON.parse(data),meta,palette,{allowDraft:true});
   await save(meta.data.slice(1),data);await save(meta.thumbnail.slice(1),await readFile(new URL(meta.thumbnail.slice(1),local)));
  }
  entries.unshift(...localEntries);
 }
 let publicInfo={};
 if(!localPreview){let published;try{published=validateCatalogIndex(JSON.parse(await readFile(new URL('catalog-content/index.json',root),'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(published){if(published.localPreview||published.entries.some(p=>p.status!=='ready'||p.unknownCount))throw new Error('Public catalog contains incomplete charts');
   for(const meta of published.entries){const bytes=await readFile(new URL('catalog-content/'+meta.data.slice('/catalog/'.length),root));const decoded=decodePatternDocument(JSON.parse(bytes),meta,palette);await save(meta.data.slice(1),bytes);await save(meta.thumbnail.slice(1),catalogPng(decoded.grid));}
   entries.unshift(...published.entries);publicInfo={publicTranscribed:true,contentVersion:published.contentVersion};await save('catalog/content-version.json',await readFile(new URL('catalog-content/content-version.json',root)));
  }
 }
 const index=validateCatalogIndex({schema:1,localPreview,...publicInfo,entries});await save('catalog/index.json',JSON.stringify(index));
 return {files,index};
}
