// Chart geometry and layout by Codex, 2026-10-25. AGPL-3.0.
export function chartGeometry(columns,rows,cell=36){return {columns,rows,cell,inset:cell,width:(columns+2)*cell,height:(rows+2)*cell};}
export function hitCell(x,y,rect,g){const col=Math.floor(((x-rect.left)/rect.width*g.width-g.inset)/g.cell),row=Math.floor(((y-rect.top)/rect.height*g.height-g.inset)/g.cell);return row>=0&&row<g.rows&&col>=0&&col<g.columns?{row,col}:null;}
export function boardLayout(width,height,columns,rows){const tiles=[];for(let y=0;y<height;y+=rows)for(let x=0;x<width;x+=columns)tiles.push({number:tiles.length+1,boardRow:y/rows+1,boardCol:x/columns+1,x,y,width:Math.min(columns,width-x),height:Math.min(rows,height-y)});return {columns:Math.ceil(width/columns),rows:Math.ceil(height/rows),tiles};}
export function chartDimensions(sourceWidth,sourceHeight,width,height,lock=true,changed='width'){
 width=Math.max(1,Math.min(128,Math.round(Number(width)||1)));height=Math.max(1,Math.min(128,Math.round(Number(height)||1)));
 if(lock&&sourceWidth&&sourceHeight){let scale=changed==='height'?height/sourceHeight:width/sourceWidth;scale=Math.min(scale,128/sourceWidth,128/sourceHeight);width=Math.max(1,Math.round(sourceWidth*scale));height=Math.max(1,Math.round(sourceHeight*scale));}
 return {width,height};
}
export function fitBoardDimensions(sourceWidth,sourceHeight,columns,rows){
 const scale=Math.min(columns/sourceWidth,rows/sourceHeight,128/sourceWidth,128/sourceHeight);
 return {width:Math.max(1,Math.round(sourceWidth*scale)),height:Math.max(1,Math.round(sourceHeight*scale)),anchor:columns/sourceWidth<=rows/sourceHeight?'width':'height'};
}
export function lineCells(start,end){const cells=[];let x=start.col,y=start.row;const dx=Math.abs(end.col-x),dy=-Math.abs(end.row-y),sx=x<end.col?1:-1,sy=y<end.row?1:-1;let error=dx+dy;while(true){cells.push({row:y,col:x});if(x===end.col&&y===end.row)break;const twice=error*2;if(twice>=dy){error+=dy;x+=sx;}if(twice<=dx){error+=dx;y+=sy;}}return cells;}
export function codeInk(hex){const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);const l=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;return l>.179?'#172c3c':'#ffffff';}
export function wheelScale(current,delta,mode=0,viewportHeight=600){const pixels=delta*(mode===1?16:mode===2?viewportHeight:1);return Math.max(.01,Math.min(32,current*Math.exp(-Math.max(-1000,Math.min(1000,pixels))*.0016)));}
export function zoomScroll(scroll,pointer,before,after){return {left:Math.max(0,scroll.left+after.left+(pointer.x-before.left)/before.width*after.width-pointer.x),top:Math.max(0,scroll.top+after.top+(pointer.y-before.top)/before.height*after.height-pointer.y)};}
export const boardPresets=[
 {id:'52',label:'2.6mm · 52 × 52 针',columns:52,rows:52},
 {id:'78',label:'2.6mm · 78 × 78 针',columns:78,rows:78},
 {id:'104',label:'2.6mm · 104 × 104 针',columns:104,rows:104},
 {id:'50',label:'2.6mm · 50 × 50 针',columns:50,rows:50},
 {id:'26',label:'2.6mm · 26 × 26 针',columns:26,rows:26},
 {id:'29',label:'5mm · 29 × 29 针',columns:29,rows:29},
 {id:'57',label:'Hama Mini 2.5mm · 57 × 57 针',columns:57,rows:57},
];
