import {chartGeometry,codeInk} from './chart.js?v=669908800f8c5daa';
export function thumbnailSvg(grid,name='原创几何图案'){
 const w=grid[0].length,h=grid.length;
 const cells=grid.flatMap((row,y)=>row.map((c,x)=>c.isExternal?'':`<rect x="${x*10+1}" y="${y*10+1}" width="9" height="9" fill="${c.color}"/>`)).join('');
 const lines=Array.from({length:w+1},(_,x)=>`<path d="M${x*10} 0V${h*10}"/>`).join('')+Array.from({length:h+1},(_,y)=>`<path d="M0 ${y*10}H${w*10}"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w*10} ${h*10}" role="img" aria-label="${name}" class="thumbnail"><rect width="100%" height="100%" fill="white"/><g stroke="#dce5ec" stroke-width=".6">${lines}</g>${cells}</svg>`;
}
export function drawGrid(canvas,grid,{lines=true,codes=true,cell=36,majorEvery=5,majorColor='#29465f',majorOffset=0,boardColumns=52,boardRows=52,seams=false}={}){
 const g=chartGeometry(grid[0].length,grid.length,cell),{width,height,inset}=g;
 canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.fillStyle='#d7e9fa';ctx.fillRect(0,0,width,cell);ctx.fillRect(0,height-cell,width,cell);ctx.fillRect(0,0,cell,height);ctx.fillRect(width-cell,0,cell,height);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${Math.round(cell*.36)}px Consolas,Arial,sans-serif`;
 for(let y=0;y<g.rows;y++)for(let x=0;x<g.columns;x++){
  const bead=grid[y][x];if(bead.isExternal)continue;ctx.fillStyle=bead.color;ctx.fillRect(inset+x*cell,inset+y*cell,cell,cell);
  if(codes){ctx.fillStyle=codeInk(bead.color);ctx.fillText(bead.key,inset+(x+.5)*cell,inset+(y+.5)*cell,cell-4);}
 }
 if(lines){ctx.strokeStyle='#9ba6b0';ctx.lineWidth=.8;ctx.beginPath();for(let x=0;x<=g.columns+2;x++){ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,height);}for(let y=0;y<=g.rows+2;y++){ctx.moveTo(0,y*cell);ctx.lineTo(width,y*cell);}ctx.stroke();
  if(majorEvery){ctx.strokeStyle=majorColor;ctx.lineWidth=2.4;ctx.beginPath();for(let x=1;x<g.columns;x++)if((x-majorOffset)%majorEvery===0){ctx.moveTo(inset+x*cell,0);ctx.lineTo(inset+x*cell,height);}for(let y=1;y<g.rows;y++)if((y-majorOffset)%majorEvery===0){ctx.moveTo(0,inset+y*cell);ctx.lineTo(width,inset+y*cell);}ctx.stroke();}
 }
 ctx.strokeStyle='#29465f';ctx.lineWidth=2.2;ctx.strokeRect(inset,inset,g.columns*cell,g.rows*cell);
 ctx.fillStyle='#20394d';ctx.font=`${Math.round(cell*.34)}px Consolas,Arial,sans-serif`;
 for(let x=0;x<g.columns;x++){const at=inset+(x+.5)*cell;ctx.fillText(String(x+1),at,cell/2);ctx.fillText(String(x+1),at,height-cell/2);}
 for(let y=0;y<g.rows;y++){const at=inset+(y+.5)*cell;ctx.fillText(String(y+1),cell/2,at);ctx.fillText(String(y+1),width-cell/2,at);}
 if(seams){ctx.save();ctx.strokeStyle='#be5c24';ctx.lineWidth=3;ctx.setLineDash([10,5]);ctx.beginPath();for(let x=boardColumns;x<g.columns;x+=boardColumns){ctx.moveTo(inset+x*cell,0);ctx.lineTo(inset+x*cell,height);}for(let y=boardRows;y<g.rows;y+=boardRows){ctx.moveTo(0,inset+y*cell);ctx.lineTo(width,inset+y*cell);}ctx.stroke();ctx.restore();}
 return g;
}

// Screen charts stay vector-based at every zoom; PNG export retains drawGrid above.
export function chartSvg(grid,{lines=true,codes=true,cell=36,majorEvery=5,majorColor='#29465f',majorOffset=0,boardColumns=52,boardRows=52,seams=false}={}){
 const g=chartGeometry(grid[0].length,grid.length,cell),{width,height,inset}=g;
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rect=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${esc(fill)}"/>`;
 const text=(x,y,value,fill,size=13)=>`<text x="${x}" y="${y}" fill="${esc(fill)}" font-size="${size}">${esc(value)}</text>`;
 let body=rect(0,0,width,height,'#ffffff')+rect(0,0,width,cell,'#d7e9fa')+rect(0,height-cell,width,cell,'#d7e9fa')+rect(0,0,cell,height,'#d7e9fa')+rect(width-cell,0,cell,height,'#d7e9fa'),labels='';
 for(let y=0;y<g.rows;y++)for(let x=0;x<g.columns;x++){const bead=grid[y][x];if(bead.isExternal)continue;body+=rect(inset+x*cell,inset+y*cell,cell,cell,bead.color);if(codes)labels+=text(inset+(x+.5)*cell,inset+(y+.5)*cell,bead.key,codeInk(bead.color));}
 const path=(d,color,width,dash='')=>`<path d="${d}" fill="none" stroke="${esc(color)}" stroke-width="${width}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
 if(lines){let fine='',major='';for(let x=0;x<=g.columns+2;x++)fine+=`M${x*cell} 0V${height}`;for(let y=0;y<=g.rows+2;y++)fine+=`M0 ${y*cell}H${width}`;body+=path(fine,'#9ba6b0',.8);if(majorEvery){for(let x=1;x<g.columns;x++)if((x-majorOffset)%majorEvery===0)major+=`M${inset+x*cell} 0V${height}`;for(let y=1;y<g.rows;y++)if((y-majorOffset)%majorEvery===0)major+=`M0 ${inset+y*cell}H${width}`;body+=path(major,majorColor,2.4);}}
 body+=`<rect x="${inset}" y="${inset}" width="${g.columns*cell}" height="${g.rows*cell}" fill="none" stroke="#29465f" stroke-width="2.2"/>`;
 for(let x=0;x<g.columns;x++){const at=inset+(x+.5)*cell;labels+=text(at,cell/2,x+1,'#20394d',12)+text(at,height-cell/2,x+1,'#20394d',12);}
 for(let y=0;y<g.rows;y++){const at=inset+(y+.5)*cell;labels+=text(cell/2,at,y+1,'#20394d',12)+text(width-cell/2,at,y+1,'#20394d',12);}
 if(seams){let d='';for(let x=boardColumns;x<g.columns;x+=boardColumns)d+=`M${inset+x*cell} 0V${height}`;for(let y=boardRows;y<g.rows;y+=boardRows)d+=`M0 ${inset+y*cell}H${width}`;body+=path(d,'#be5c24',3,'10 5');}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}<g font-family="Consolas,Arial,sans-serif" font-weight="500" text-anchor="middle" dominant-baseline="central" text-rendering="geometricPrecision" pointer-events="none">${labels}</g></svg>`;
}
export function drawVectorGrid(svg,grid,options){const source=chartSvg(grid,options);svg.setAttribute('viewBox',source.match(/viewBox="([^"]+)"/)[1]);svg.innerHTML=source.slice(source.indexOf('>')+1,-6);}
