// Original code-drawn geometric patterns by Codex, 2026-10-25. No third-party IP artwork.
import { findClosestPaletteColor, summarize } from './lib/engine.js?v=276e23ae488ae51f';
const make=(id,name,category,note,colors,rule)=>({id,name,category,note,tags:[category,'小图'],width:16,height:16,author:'豆作间',source:{label:'豆作间原创几何示例'},license:'AGPL-3.0',permissionStatus:'ready',palette:'MARD',colors,cells:Array.from({length:256},(_,i)=>rule(i%16,Math.floor(i/16)))});
export const patterns=[
  make('bow','像素蝴蝶结','几何','左右对称的蝴蝶结。',['#497da7','#ffb8c7','#ffe3d6','#d7effa'],(x,y)=>{const d=Math.abs(y-7.5);if(x>=7&&x<=8&&d<=1.5)return 0;const local=x<8?x:15-x;if(local>=2&&local<=6&&d<=(local-1)*.8&&d<=(7-local)*1.8)return d>(local-1)*.8-1.2?0:(y<8?1:2);return null;}),
  make('rainbow','小小彩虹','小风景','四种颜色的彩虹图案。',['#f6a8b7','#f7cf79','#a4d4bc','#77b9e6'],(x,y)=>{const d=Math.sqrt((x-7.5)**2+(y-12)**2);if(y>12||d>7||d<3)return null;return Math.min(3,Math.floor(7-d));}),
  make('cloud','微笑云朵','小风景','白色云朵配蓝色边线。',['#77b9e6','#f8faff','#29465f','#ffb8c7'],(x,y)=>{const inside=(x>=2&&x<=13&&y>=7&&y<=11)||(x>=4&&x<=11&&y>=5&&y<=11)||(x>=6&&x<=9&&y>=3&&y<=11);if(!inside)return null;if((x===5||x===10)&&y===8)return 2;if((x===7||x===8)&&y===10)return 2;if((x===4||x===11)&&y===9)return 3;return y===11||y===3||x===2||x===13?0:1;}),
  make('flower','春日小花','几何','粉色花瓣、黄色花心和绿色枝叶。',['#ee9fb7','#ffcfce','#ffe28b','#91c7ad'],(x,y)=>{if(y>=10&&y<=14&&x===7)return 3;if(y===12&&(x===5||x===6||x===8||x===9))return 3;const d=Math.abs(x-7)+Math.abs(y-6);if(d<=1)return 2;if(((x>=4&&x<=6||x>=8&&x<=10)&&y>=4&&y<=8)||x>=6&&x<=8&&(y>=2&&y<=4||y>=8&&y<=10))return (x+y)%3===0?0:1;return null;}),
];
export function patternGrid(pattern,palette){const mapped=pattern.colors.map(hex=>findClosestPaletteColor({r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)},palette));return Array.from({length:pattern.height},(_,y)=>pattern.cells.slice(y*pattern.width,(y+1)*pattern.width).map(c=>c===null?{key:'ERASE',color:'#FFFFFF',isExternal:true}:{key:mapped[c].key,color:mapped[c].hex}));}
export {summarize};
