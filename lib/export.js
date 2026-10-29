import {drawGrid} from './render.js?v=669908800f8c5daa';
import {summarize} from './engine.js?v=669908800f8c5daa';
import {boardLayout,codeInk} from './chart.js?v=669908800f8c5daa';
import {EXPORT_GUIDANCE,creditLabel} from '../site.js?v=669908800f8c5daa';
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,90);document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export async function exportPng(grid,name,options={}){
 const {colors,total}=summarize(grid),cell=36,n=grid[0].length,m=grid.length,top=108,pad=28;
 const plot=document.createElement('canvas');drawGrid(plot,grid,{...options,lines:true,codes:true,cell});
 const width=Math.max(760,plot.width+pad*2),legendTop=top+plot.height+28,legendColumns=Math.max(1,Math.floor((width-pad*2)/92));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=legendTop+Math.ceil(colors.length/legendColumns)*94+158;const ctx=canvas.getContext('2d');
 const font=(size,bold=false)=>`${bold?'bold ':''}${size}px Consolas,"Microsoft YaHei UI",Arial,sans-serif`;
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#29465f';ctx.font=font(22,true);ctx.fillText('豆作间',pad,36);ctx.textAlign='right';ctx.fillText(name.slice(0,40),width-pad,36,width-180);ctx.textAlign='left';ctx.font=font(14);ctx.fillText(`${n} × ${m} 格 · ${colors.length} 色 · ${options.paletteLabel??'MARD 参考色板'}`,pad,70,width-pad*2);
 if(options.credit){ctx.font=font(11);ctx.fillText(creditLabel(options.credit).slice(0,120),pad,94,width-pad*2);}
 ctx.drawImage(plot,Math.floor((width-plot.width)/2),top);
 colors.forEach((c,i)=>{const x=pad+i%legendColumns*92,y=legendTop+Math.floor(i/legendColumns)*94;ctx.fillStyle=c.color;ctx.fillRect(x,y,68,44);ctx.strokeStyle='#6d7d88';ctx.lineWidth=1;ctx.strokeRect(x,y,68,44);ctx.fillStyle=codeInk(c.color);ctx.textAlign='center';ctx.font=font(14,true);ctx.fillText(c.key,x+34,y+23);ctx.fillStyle='#20394d';ctx.font=font(15);ctx.fillText(String(c.count),x+34,y+66);});
 ctx.textAlign='left';ctx.fillStyle='#20394d';ctx.font=font(19,true);ctx.fillText('总用豆量：'+total,pad,canvas.height-114);
 ctx.font=font(12);if(options.seams){const layout=boardLayout(n,m,options.boardColumns??52,options.boardRows??52);ctx.fillText(`分区按 ${options.boardColumns??52} × ${options.boardRows??52} 针 · ${layout.columns} × ${layout.rows} 区；拼接需核对同款板`,pad,canvas.height-89);}
 ctx.fillStyle='#29465f';ctx.font=font(15,true);ctx.fillText(EXPORT_GUIDANCE,pad,canvas.height-62,width-pad*2);ctx.fillStyle='#20394d';ctx.font=font(12);
 ctx.fillText('有色号的白格放白豆；无色号的白格不放豆。屏幕配色仅供参考，非 1:1 校准打印图。',pad,canvas.height-38);
 ctx.font=font(11);ctx.fillText('基于 Zippland / Perler Beads Generator · AGPL-3.0 · 源码见豆作间页脚',pad,canvas.height-17);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('浏览器未能生成 PNG')),'image/png'));
 downloadBlob(blob,`豆作间-${name}-图纸.png`);return {width:canvas.width,height:canvas.height,bytes:blob.size};
}
