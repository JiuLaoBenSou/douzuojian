// Curated chart catalog and validation by Codex, 2026-10-26. AGPL-3.0.
import {patternGrid} from './library.js?v=276e23ae488ae51f';
import {summarize} from './lib/engine.js?v=276e23ae488ae51f';
import {findPaletteColor} from './lib/palettes.js?v=276e23ae488ae51f';
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCatalog(patterns,palette){
 const ids=new Set();
 return patterns.filter(p=>p.permissionStatus==='ready').map(p=>{
  if(!/^[a-z0-9-]+$/.test(p.id)||ids.has(p.id))throw new Error('图纸 ID 无效或重复');ids.add(p.id);
  if(!p.name||!p.category||!p.author||!p.source?.label||!p.license)throw new Error('图纸缺少名称、分类或来源信息');
  if(p.palette!=='MARD')throw new Error('当前图纸库只支持MARD参考色板');
  if(!Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<1||p.height<1||p.width>128||p.height>128||p.cells.length!==p.width*p.height)throw new Error('图纸格数与尺寸不一致');
  const count=(p.colorCodes??p.colors)?.length;
  if(!count||p.cells.some(c=>c!==null&&(!Number.isInteger(c)||c<0||c>=count)))throw new Error('图纸格子包含无效颜色索引');
  let grid;
  if(p.colorCodes){
   const colors=p.colorCodes.map(key=>{const color=findPaletteColor({id:'mard',zeroAliases:true,colors:palette},key);if(!color)throw new Error('图纸色号不在当前色板中：'+key);return color;});
   grid=Array.from({length:p.height},(_,y)=>p.cells.slice(y*p.width,(y+1)*p.width).map(c=>c===null?{key:'ERASE',color:'#FFFFFF',isExternal:true}:{key:colors[c].key,color:colors[c].hex}));
  }else grid=patternGrid(p,palette);
  const stats=summarize(grid);return {...p,tags:p.tags??[],grid,total:stats.total,colorCount:stats.colors.length,materials:stats.colors};
 });
}
export function classifyCatalogEntry(p){
 // Compatibility for the frozen first batch: add collection metadata without changing its fingerprint or manual edits.
 if(!p.collection&&!p.collectionId&&p.series==='宝可梦'&&p.source?.label==='用户提供的第一代151只图纸')return {...p,section:'图鉴',collection:'第一代宝可梦图鉴 · 151只',collectionId:'pokemon-gen1-pokedex',tags:[...new Set([...(p.tags??[]),'第一代','第一世代','151只'])]};
 return {...p,section:p.section??'',collection:p.collection??'',collectionId:p.collectionId??(p.collection?encodeURIComponent([p.series,p.section,p.collection].join('/')):'')};
}
export function catalogFacets(entries,{category='全部',series='all',section='all'}={}){
 const rows=entries.map(classifyCatalogEntry).filter(p=>category==='全部'||p.category===category);
 const options=(items,key,label=key)=>{const found=new Map();for(const p of items){if(!p[key])continue;const old=found.get(p[key]);if(old)old.count++;else found.set(p[key],{value:p[key],label:p[label],count:1});}return [...found.values()];};
 const bySeries=rows.filter(p=>series==='all'||p.series===series),bySection=bySeries.filter(p=>section==='all'||p.section===section);
 return {series:options(rows,'series'),sections:options(bySeries,'section'),collections:options(bySection,'collectionId','collection')};
}
export function filterPatterns(entries,{query='',category='全部',series='all',section='all',collection='all',size='all',colors='all',sort='default'}={}){
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const found=entries.filter(entry=>{
  const p=classifyCatalogEntry(entry),text=[p.name,p.note,p.category,p.series,p.section,p.collection,p.author,...(p.tags??[]),...(p.aliases??[])].join(' ').toLocaleLowerCase(),edge=Math.max(p.width,p.height);
  return (category==='全部'||p.category===category)&&(series==='all'||p.series===series)&&(section==='all'||p.section===section)&&(collection==='all'||p.collectionId===collection)&&words.every(word=>text.includes(word))&&(size==='all'||(size==='small'?edge<=29:size==='medium'?edge>29&&edge<=52:edge>52))&&(colors==='all'||p.colorCount<=Number(colors));
 });
 if(sort==='beads-asc')found.sort((a,b)=>a.total-b.total);if(sort==='beads-desc')found.sort((a,b)=>b.total-a.total);return found;
}
