// Deterministic lossless RGBA PNG, rendered from decoded chart cells. Codex, 2026-10-27. AGPL-3.0.
import {deflateSync} from 'node:zlib';
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,data){const name=Buffer.from(type),body=Buffer.concat([name,data]),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);let crc=0xffffffff;for(const b of body)crc=table[(crc^b)&255]^(crc>>>8);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
export function catalogPng(grid,size=160){
 if(!Number.isInteger(size)||size<16||size>1024||!grid.length||!grid[0].length)throw new Error('Thumbnail dimensions invalid');
 const cols=grid[0].length,rows=grid.length,scale=(size-8)/Math.max(cols,rows),width=Math.max(1,Math.round(cols*scale)),height=Math.max(1,Math.round(rows*scale)),left=Math.floor((size-width)/2),top=Math.floor((size-height)/2),raw=Buffer.alloc(size*(size*4+1));
 for(let y=top;y<top+height;y++)for(let x=left;x<left+width;x++){
  const cell=grid[Math.min(rows-1,Math.floor((y-top)*rows/height))][Math.min(cols-1,Math.floor((x-left)*cols/width))];if(cell.isExternal)continue;
  if(!/^#[0-9a-f]{6}$/i.test(cell.color))throw new Error('Thumbnail color invalid');
  const offset=y*(size*4+1)+1+x*4;for(let c=0;c<3;c++)raw[offset+c]=parseInt(cell.color.slice(1+c*2,3+c*2),16);raw[offset+3]=255;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
