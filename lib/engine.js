// Douzuojian integration by Codex, 2026-10-25. AGPL-3.0.
import { calculatePixelGrid, findClosestPaletteColor } from './upstream-pixelation.js?v=669908800f8c5daa';
import { paintSinglePixel, recalculateColorStats, transparentColorData } from './upstream-editing.js?v=669908800f8c5daa';
import {SITE_URL} from '../site.js?v=669908800f8c5daa';
export { findClosestPaletteColor };
export function quantize(image, width, height, palette, mode='dominant', maxColors=12) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>128||height>128)throw new Error('网格尺寸应在 1–128 格之间');
  if(!palette.length)throw new Error('请至少保留一种可用颜色');
  if(!Number.isInteger(maxColors)||maxColors<1||maxColors>291)throw new Error('颜色上限无效');
  if(!image.width||!image.height||image.data.length!==image.width*image.height*4)throw new Error('图片数据不完整');
  const grid=calculatePixelGrid({getImageData:()=>image},image.width,image.height,width,height,palette,mode,palette[0]);
  const {colors}=summarize(grid);if(colors.length<=maxColors)return grid;
  const used=new Set(colors.slice(0,maxColors).map(c=>c.key));const available=palette.filter(c=>used.has(c.key));const remap=new Map();
  return grid.map(row=>row.map(cell=>{if(cell.isExternal||used.has(cell.key))return cell;if(!remap.has(cell.key)){const hex=cell.color.slice(1);const nearest=findClosestPaletteColor({r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16)},available);remap.set(cell.key,{key:nearest.key,color:nearest.hex});}return {...remap.get(cell.key)};}));
}
export function summarize(grid) {
  const stats=recalculateColorStats(grid);const byKey=new Map();for(const row of grid)for(const cell of row){if(cell.isExternal||cell.key==='ERASE')continue;const old=byKey.get(cell.key);if(old)old.count++;else byKey.set(cell.key,{key:cell.key,color:cell.color,count:1});}
  return {total:stats.totalCount,colors:[...byKey.values()].sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key,'en',{numeric:true}))};
}
export function paintCell(grid,row,col,color){return paintSinglePixel(grid,row,col,color?{key:color.key,color:color.hex??color.color}:transparentColorData).newPixelData;}
export function mirrorHorizontal(grid){return grid.map(row=>[...row].reverse().map(cell=>({...cell})));}
export function materialCsv(grid,name='豆作间图纸',options={}) {
  const clean=String(name).replace(/[\r\n]/g,' ').replace(/^(?=\s*[=+@-])/,'_').replaceAll('"','""');
  const label=options.paletteLabel??'MARD 主色板（291 色）';
  return '\uFEFF图案,"'+clean+'"\r\n色板,'+label+'\r\n'+(options.paletteVersion?'色板版本,'+options.paletteVersion+'\r\n':'')+'网站,'+SITE_URL+'\r\n色号,参考HEX,颗数\r\n'+summarize(grid).colors.map(c=>`${c.key},${c.color},${c.count}`).join('\r\n')+'\r\n';
}
