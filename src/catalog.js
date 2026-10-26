// Curated chart catalog and validation by Codex, 2026-10-26. AGPL-3.0.
import {patternGrid} from './library.js';
import {summarize} from './lib/engine.js';
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
   const colors=p.colorCodes.map(key=>{const color=palette.find(c=>c.key===key);if(!color)throw new Error('图纸色号不在当前色板中：'+key);return color;});
   grid=Array.from({length:p.height},(_,y)=>p.cells.slice(y*p.width,(y+1)*p.width).map(c=>c===null?{key:'ERASE',color:'#FFFFFF',isExternal:true}:{key:colors[c].key,color:colors[c].hex}));
  }else grid=patternGrid(p,palette);
  const stats=summarize(grid);return {...p,tags:p.tags??[],grid,total:stats.total,colorCount:stats.colors.length,materials:stats.colors};
 });
}
export function filterPatterns(entries,{query='',category='全部',size='all',colors='all',sort='default'}={}){
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const found=entries.filter(p=>{
  const text=[p.name,p.note,p.category,p.author,...(p.tags??[])].join(' ').toLocaleLowerCase(),edge=Math.max(p.width,p.height);
  return (category==='全部'||p.category===category)&&words.every(word=>text.includes(word))&&(size==='all'||(size==='small'?edge<=29:size==='medium'?edge>29&&edge<=52:edge>52))&&(colors==='all'||p.colorCount<=Number(colors));
 });
 if(sort==='beads-asc')found.sort((a,b)=>a.total-b.total);if(sort==='beads-desc')found.sort((a,b)=>b.total-a.total);return found;
}
