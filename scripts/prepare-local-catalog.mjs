// Explicit local fixture import; never marks supplied third-party charts ready. Codex, 2026-10-27.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createPaletteRegistry} from '../src/lib/palettes.js';
import {decodePatternDocument} from '../src/lib/catalog-store.js';
import {catalogPng} from './catalog-image.mjs';
import {validateCatalogIndex} from '../src/lib/catalog-store.js';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url),local=new URL('.local-catalog/',root),input=new URL('docs/catalog-research-2026-10-27/',root);
const aliases=[['Charizard','penhuolong','006'],['Ivysaur','miaowacao','002'],['Venusaur','miaowahua','003'],['Charmander','xiaohuolong','004'],['Charmeleon','huokonglong','005'],['Bulbasaur','miaowazhongzi','001']];
const entries=[];
const palette=createPaletteRegistry(JSON.parse(await readFile(new URL('src/data/upstream-color-mapping.json',root),'utf8'))).get('mard').colors;
const batchIndex=process.argv.indexOf('--batch');
if(batchIndex!==-1){
 const value=process.argv[batchIndex+1];if(!value)throw new Error('Missing batch folder');
 const projectPath=fileURLToPath(root),batchPath=resolve(projectPath,value),inside=relative(projectPath,batchPath);
 if(inside.startsWith('..')||isAbsolute(inside))throw new Error('Batch data must be inside this project');
 const batch=pathToFileURL(batchPath+'/'),index=validateCatalogIndex(JSON.parse(await readFile(new URL('index.json',batch),'utf8')));
 if(!index.localPreview||index.entries.some(p=>p.status!=='draft'))throw new Error('Local batch must retain draft status');
 const prepared=[];
 for(const p of index.entries){
  if(!p.thumbnail.endsWith('.png'))throw new Error('Local batch thumbnails must be PNG');
  const data=await readFile(new URL(p.data.slice(1),batch)),doc=decodePatternDocument(JSON.parse(data),p,palette,{allowDraft:true});prepared.push({p,data,grid:doc.grid});
 }
 if(process.argv.includes('--check')){console.log('LOCAL_BATCH_VALIDATED drafts='+prepared.length+' unknownCells='+index.entries.reduce((n,p)=>n+p.unknownCount,0));process.exit(0);}
 for(const {p,data,grid} of prepared){
  for(const dir of ['catalog/charts/','catalog/thumbs/'])await mkdir(new URL(dir,local),{recursive:true});
  await writeFile(new URL(p.data.slice(1),local),data);await writeFile(new URL(p.thumbnail.slice(1),local),catalogPng(grid));
 }
 await writeFile(new URL('index.json',local),JSON.stringify(index));console.log('LOCAL_BATCH_READY drafts='+index.entries.length+' unknownCells='+index.entries.reduce((n,p)=>n+p.unknownCount,0));
 process.exit(0);
}
for(let n=1;n<=6;n++){
 const sourceId='probe-'+String(n).padStart(2,'0'),p=JSON.parse(await readFile(new URL(`drafts/${sourceId}.json`,input),'utf8')),id='local-'+sourceId,review=p.review;
 const meta={id,name:p.suggestedName,category:'动漫游戏',series:'宝可梦',tags:['角色','第一世代',n===1||n===4||n===5?'火焰':'植物'],aliases:aliases[n-1],note:'用户提供图纸的数据化草稿，尚未逐格核对。',author:'原图水印作者（待核对）',source:{label:'用户提供的图纸 · 原作者与原帖待核对'},license:'仅本地预览，来源使用范围待核对',palette:'MARD',status:'draft',width:p.width,height:p.height,total:review.totalCandidate,colorCount:Object.keys(review.knownCounts).length+(review.unresolved.length?1:0),unknownCount:review.unresolved.length,data:`/catalog/charts/${id}.json`,thumbnail:`/catalog/thumbs/${id}.png`};
 const colorCodes=[...p.colorCodes];
 // DeepSeek independent audit: image 02's F5 labels were merged with other images' F4 print fill.
 // Change only this chart's 19 verified positions; retain original audit inputs and all other charts.
 if(n===2){assert.equal(review.knownCounts.F04,19);assert(!colorCodes.includes('F05'));colorCodes[colorCodes.indexOf('F04')]='F05';}
 const doc={schema:1,id,width:p.width,height:p.height,colorCodes,encoding:'rle',runs:p.runs};
 for(const dir of ['catalog/charts/','catalog/thumbs/'])await mkdir(new URL(dir,local),{recursive:true});
 await writeFile(new URL(meta.data.slice(1),local),JSON.stringify(doc));await writeFile(new URL(meta.thumbnail.slice(1),local),catalogPng(decodePatternDocument(doc,meta,palette,{allowDraft:true}).grid));entries.push(meta);
}
await writeFile(new URL('index.json',local),JSON.stringify({schema:1,localPreview:true,entries}));console.log('LOCAL_CATALOG_READY drafts=6; publish status unchanged');
