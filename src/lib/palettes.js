// Codex, 2026-10-27. Community reference codes, not brand-calibrated RGB.
// Original five-brand rows: Zippland/perler-beads @2efee730, AGPL-3.0.
// Reviewed against four user-supplied 色号对比图 JPEGs; original images are not distributed.
export const PALETTE_VERSION='reference-2026-10-27';
const definitions=[
 {id:'mard',name:'MARD',column:'MARD',zeroAliases:true,example:'如 A01、H07'},
 {id:'coco',name:'COCO',column:'COCO',zeroAliases:true,example:'如 E02、B09'},
 {id:'manman',name:'漫漫',column:'漫漫',example:'如 E2、F7'},
 {id:'xiaowu',name:'小舞',zeroAliases:true,example:'如 A1、H7'},
 {id:'panpan',name:'盼盼',column:'盼盼',example:'如 65、14'},
 {id:'mixiaowo',name:'咪小窝',column:'咪小窝',example:'如 77、14'},
 {id:'huangdoudou',name:'黄豆豆',zeroAliases:true,example:'如 A1、H7'},
];
// These two entries are legible in 色号对比图（1）; keep the upstream file unchanged.
const reviewedManman={R13:'L7',R24:'S7'};
// Comparison-only additions for 小舞 and 黄豆豆; never add to or replace MARD master rows.
const imageOnly=[['Y6','#F7D4E8'],['Y7','#F1FA7D'],['Y8','#5EE88C'],['Y9','#F8F5FE']];
const rgb=hex=>({r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)});
const imageCode=code=>code.replace(/^ZG/,'Z').replace(/^([A-Z]+)0+(\d+)$/,'$1$2');
export function normalizePaletteCode(palette,value){let code=String(value??'').trim().toUpperCase();if(palette.id==='mard')code=code.replace(/^ZG(?=\d)/,'Z');return palette.zeroAliases?code.replace(/^([A-Z]+)0+(\d+)$/,'$1$2'):code;}
export function findPaletteColor(palette,key){const code=normalizePaletteCode(palette,key),matches=palette.colors.filter(c=>normalizePaletteCode(palette,c.key)===code);return matches.length===1?matches[0]:null;}
export function createPaletteRegistry(mapping){
 const registry=new Map();
 for(const definition of definitions){
  const colors=[],excluded=[];
  for(const [hex,codes]of Object.entries(mapping)){
   if(!/^#[0-9a-f]{6}$/i.test(hex)||!codes.MARD)throw new Error('参考色板数据不完整');
   const referenceId=codes.MARD,fromImage=!definition.column;
   let key=fromImage?imageCode(referenceId):String(codes[definition.column]??'');
   let reason='';
   // Q rows are not present in the comparison images; do not export guessed W codes.
   if(definition.id!=='mard'&&referenceId.startsWith('Q'))reason='not-in-chart';
   if(definition.id==='manman'){
    key=reviewedManman[referenceId]??key;
    if(referenceId.startsWith('ZG'))reason='missing-in-chart';
   }
   // The 小舞 cell in the B5 row reads E5, conflicting with its E5 row. Do not guess B5.
   if(definition.id==='xiaowu'&&referenceId==='B05')reason='conflicting-image-entry';
   if(!/^[A-Z0-9]+$/i.test(key)||key==='-')reason='missing';
   if(reason){excluded.push({referenceId,key,reason});continue;}
   colors.push({key,hex,rgb:rgb(hex),referenceId});
  }
  if(['xiaowu','huangdoudou'].includes(definition.id))for(const[key,hex]of imageOnly)colors.push({key,hex,rgb:rgb(hex),referenceId:'image:'+key});
  // Never let two different reference colors collapse into one purchasable code.
  const counts=new Map();for(const color of colors){const code=normalizePaletteCode(definition,color.key);counts.set(code,(counts.get(code)??0)+1);}
  const unique=colors.filter(color=>{if(counts.get(normalizePaletteCode(definition,color.key))===1)return true;excluded.push({referenceId:color.referenceId,key:color.key,reason:'duplicate'});return false;});
  if(new Set(unique.map(c=>c.referenceId)).size!==unique.length)throw new Error('参考色板包含重复对应行');
  registry.set(definition.id,{...definition,version:PALETTE_VERSION,colors:unique,excluded,label:definition.name+(definition.id==='mard'?' 主色板（':' 参考色板（')+unique.length+' 色）'});
 }
 return registry;
}
export function convertChartPalette(grid,source,target,{availableKeys}={}){
 const missing=new Map(),changes=new Map(),sourceIndex=new Map(),targetIndex=new Map();let total=0;
 for(const c of source.colors){const key=normalizePaletteCode(source,c.key);sourceIndex.set(key,[...(sourceIndex.get(key)??[]),c]);}
 for(const c of target.colors)targetIndex.set(c.referenceId,[...(targetIndex.get(c.referenceId)??[]),c]);
 const absent=(cell,reason)=>{const id=cell.key+'|'+reason,entry=missing.get(id);if(entry)entry.count++;else missing.set(id,{key:cell.key,count:1,reason});};
 for(const row of grid)for(const cell of row){
  if(cell.isExternal||cell.key==='ERASE')continue;total++;
  const candidates=sourceIndex.get(normalizePaletteCode(source,cell.key))??[];
  if(candidates.length!==1){absent(cell,candidates.length?'ambiguous-source':'unknown-source');continue;}
  const destinations=targetIndex.get(candidates[0].referenceId)??[];
  if(destinations.length!==1){absent(cell,destinations.length?'ambiguous-target':'missing-target');continue;}
  if(availableKeys&&!availableKeys.has(destinations[0].key)){absent(cell,'unavailable');continue;}
  changes.set(cell.key,destinations[0].key);
 }
 if(missing.size)return {ok:false,grid,missing:[...missing.values()],total};
 // Only code labels change. Preserve actual colors, all edits, and external/empty cells.
 const converted=grid.map(row=>row.map(cell=>cell.isExternal||cell.key==='ERASE'?cell:{...cell,key:changes.get(cell.key)}));
 return {ok:true,grid:converted,missing:[],total};
}
