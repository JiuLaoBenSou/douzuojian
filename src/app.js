// Douzuojian chart reader by Codex, 2026-10-25; brand palettes added 2026-10-27. AGPL-3.0.
import {pushEdit,moveEdit} from './lib/edit-history.js';
import {patterns,patternGrid} from './library.js';
import {createCatalog,escapeHtml as esc} from './catalog.js';
import {createLibraryView} from './catalog-view.js';
import {summarize,paintCell,materialCsv,mirrorHorizontal} from './lib/engine.js';
import {thumbnailSvg,drawVectorGrid,chartSvg} from './lib/render.js';
import {downloadBlob,exportPng} from './lib/export.js';
import {chartGeometry,hitCell,boardLayout,boardPresets,chartDimensions,fitBoardDimensions,lineCells,codeInk,wheelScale,zoomScroll} from './lib/chart.js';
import {guides} from './guides.js';
import {createPaletteRegistry,convertChartPalette,findPaletteColor} from './lib/palettes.js';
import {createTouchSession,pinchScale,pinchScroll,cancelTouchStroke} from './lib/gestures.js';
const $=s=>document.querySelector(s),canvas=$('#pattern-canvas'),scroller=$('#canvas-scroller');
const state={palette:[],selectedBrand:'mard',chartBrand:'mard',availableByBrand:new Map(),available:new Set(),grid:[],image:null,chartCredit:null,name:'春日小花',sourceName:'春日小花',gridLines:true,codes:true,tool:'pan',brush:null,history:[],future:[],busy:false,dirty:false,filter:'全部',zoom:0,boardColumns:52,boardRows:52};
let palettes=new Map();
const libraryView=createLibraryView({getPalette:()=>palettes.get('mard').colors,getRevision:()=>uploadSerial,onOpen:loadPattern,notify:toast});
const chartPalette=()=>palettes.get(state.chartBrand);
const exportMetadata=()=>({paletteLabel:chartPalette()?.label,paletteVersion:chartPalette()?.version});
function rememberChart(grid=state.grid){const next=pushEdit({past:state.history,future:state.future},{grid,chartBrand:state.chartBrand},20);state.history=next.past;state.future=next.future;}
function updateBrushPicker(){const palette=chartPalette();$('#brush-options').innerHTML=palette.colors.map(c=>'<option value="'+c.key+'">'+c.hex+'</option>').join('');$('#brush-query').placeholder=palette.example;$('#brush-query').value=state.brush?.key??'';}
let renderedGrid=null,renderedOptions='',currentScale=1,wheelFrame=0,pendingZoom=null,pendingPointer=null;
let worker=null,toastTimer=null,uploadSerial=0,dimensionAnchor='width',drawing=false,lastPoint=null,strokeBefore=null,strokeSaved=false,panOrigin=null;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').hidden=true;},5500);}
function route(){
 const hash=location.hash.slice(1)||'patterns',view=hash.startsWith('studio')?'studio':hash.startsWith('guides')?'guides':hash.startsWith('library/')?'pattern-detail':hash==='library'?'library':'patterns';
 document.querySelectorAll('[data-view]').forEach(el=>{el.hidden=el.dataset.view!==view;});
 document.querySelectorAll('[data-nav]').forEach(el=>{if(el.dataset.nav===(view==='pattern-detail'?'library':view))el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 $('#about-panel').hidden=hash!=='about';
 if(view==='guides'){const key=hash.split('/')[1]||'prep',guide=guides[key]||guides.prep;$('#guide-content').innerHTML='<h2>'+guide.title+'</h2>'+guide.body;document.querySelectorAll('.guide-nav a').forEach(a=>{if(a.hash==='#guides/'+(guides[key]?key:'prep'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
 if(view==='studio')requestAnimationFrame(draw);libraryView.route(view,hash.split('/')[1]);
 if(hash==='about')requestAnimationFrame(()=>$('#about-panel').scrollIntoView({block:'start'}));else scrollTo({top:0,behavior:'instant'});
}
function sourceImageFromGrid(p){const grid=p.grid??patternGrid(p,state.palette),data=new Uint8ClampedArray(p.width*p.height*4);grid.flat().forEach((c,i)=>{if(!c.isExternal)data.set([parseInt(c.color.slice(1,3),16),parseInt(c.color.slice(3,5),16),parseInt(c.color.slice(5,7),16),255],i*4);});return {width:p.width,height:p.height,data};}
function drawOriginal(){if(!state.image)return;const source=document.createElement('canvas');source.width=state.image.width;source.height=state.image.height;source.getContext('2d').putImageData(new ImageData(state.image.data,state.image.width,state.image.height),0,0);const preview=$('#source-preview'),scale=Math.min(220/source.width,150/source.height);preview.width=Math.max(1,Math.round(source.width*scale));preview.height=Math.max(1,Math.round(source.height*scale));const ctx=preview.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(source,0,0,preview.width,preview.height);}
function stopWorker(){if(worker){worker.terminate();worker=null;}state.busy=false;$('#cancel-generate').hidden=true;$('#processing-status').hidden=true;}
function resetView(){cancelWheel();resetTouch(true);$('#cell-info').textContent='移到格子上查看坐标和色号';state.tool='pan';state.zoom=0;scroller.scrollTo(0,0);}
function loadPattern(p){if(!p||!state.palette.length)return;state.chartDraft=p.status==='draft';stopWorker();uploadSerial++;state.grid=p.grid;state.chartBrand='mard';state.chartCredit={author:p.author,source:p.source.label+(state.chartDraft?' · 本地草稿，未经逐格核对':''),license:p.license};state.image=sourceImageFromGrid(p);state.name=p.name;state.sourceName=p.name;state.history=[];state.future=[];state.dirty=false;resetView();$('#grid-width').value=String(p.width);$('#grid-height').value=String(p.height);$('#keep-aspect').checked=true;$('#image-name').textContent=p.source.label+' · '+p.name;state.brush=summarize(state.grid).colors[0];$('#max-colors').value=String(Math.max(Number($('#max-colors').value),summarize(state.grid).colors.length));$('#colors-output').value=$('#max-colors').value+' 色';updateBrushPicker();$('#conversion-status').hidden=true;drawOriginal();refresh();convertPalette();location.hash='studio';}
function paperOptions(){return {lines:state.gridLines,codes:state.codes,majorEvery:Number($('#major-every').value),majorColor:$('#major-color').value,majorOffset:Number($('#major-offset').value),boardColumns:state.boardColumns,boardRows:state.boardRows,seams:$('#show-seams').checked};}
function draw(){
 if(!state.grid.length||$('#studio-view').hidden)return;
 const g=chartGeometry(state.grid[0].length,state.grid.length),options={...paperOptions(),codes:true},key=JSON.stringify(options);
 if(renderedGrid!==state.grid||renderedOptions!==key){drawVectorGrid(canvas,state.grid,options);renderedGrid=state.grid;renderedOptions=key;}
 const fit=Math.min(1,Math.max(100,scroller.clientWidth-32)/g.width,560/g.height);
 currentScale=state.zoom===0?fit:state.zoom;
 const width=g.width*currentScale,height=g.height*currentScale;
 scroller.classList.add('zoomed');canvas.style.width=width+'px';canvas.style.height=height+'px';
 canvas.style.marginLeft=Math.max(0,(scroller.clientWidth-32-width)/2)+'px';canvas.style.marginTop=Math.max(0,(scroller.clientHeight-32-height)/2)+'px';
 canvas.classList.toggle('editing',['paint','erase'].includes(state.tool));canvas.classList.toggle('panning',state.tool==='pan');
 $('#zoom').value=String(Math.round(currentScale*1000)/10);$('#zoom-detail').textContent=(Math.round(g.cell*currentScale*10)/10)+' px/格';
 $('#reader-help').textContent='双指缩放，单指平移；画笔模式下单指涂色。电脑可用滚轮缩放。';
}
function setZoom(scale,pointer){
 if(!state.grid.length)return;
 const rect=scroller.getBoundingClientRect(),point=pointer??{x:rect.left+scroller.clientWidth/2,y:rect.top+scroller.clientHeight/2};
 const before=canvas.getBoundingClientRect(),scroll={left:scroller.scrollLeft,top:scroller.scrollTop};
 state.zoom=Math.max(.01,Math.min(32,scale));draw();
 const position=zoomScroll(scroll,point,before,canvas.getBoundingClientRect());scroller.scrollLeft=position.left;scroller.scrollTop=position.top;
}
function cancelWheel(){if(wheelFrame)cancelAnimationFrame(wheelFrame);wheelFrame=0;pendingZoom=null;pendingPointer=null;}

// Capture on the stable viewport: repainting SVG children must not interrupt a gesture.
let pinchOrigin=null,pinchFrame=0,pendingPinch=null,touchHistoryBefore=null,touchFutureBefore=null;
const touchEvent=point=>({clientX:point.x,clientY:point.y});
function clearStroke(){drawing=false;lastPoint=null;strokeBefore=null;strokeSaved=false;panOrigin=null;touchHistoryBefore=null;touchFutureBefore=null;}
function cancelTouchDrawing(){
 const previous=cancelTouchStroke(state.grid,state.history,strokeBefore,strokeSaved,touchHistoryBefore),changed=previous.grid!==state.grid;
 state.grid=previous.grid;state.history=previous.history;if(touchFutureBefore)state.future=touchFutureBefore;clearStroke();if(changed)refresh();
}
function beginPinch(pair){
 const rect=canvas.getBoundingClientRect();
 pinchOrigin=pair&&rect.width&&rect.height?{scale:currentScale,distance:pair.distance,anchor:{x:(pair.center.x-rect.left)/rect.width,y:(pair.center.y-rect.top)/rect.height}}:null;
}
function applyPinch(pair){
 if(!pair||!pinchOrigin)return;
 if(pinchOrigin.distance<1){beginPinch(pair);return;}
 state.zoom=pinchScale(pinchOrigin.scale,pinchOrigin.distance,pair.distance);draw();
 const position=pinchScroll({left:scroller.scrollLeft,top:scroller.scrollTop},pinchOrigin.anchor,pair.center,canvas.getBoundingClientRect());
 scroller.scrollLeft=position.left;scroller.scrollTop=position.top;
}
function cancelPinchFrame(){if(pinchFrame)cancelAnimationFrame(pinchFrame);pinchFrame=0;pendingPinch=null;}
const touchSession=createTouchSession({
 onSingleStart(point,{navigationOnly}){
  if(navigationOnly||state.tool==='pan'||state.busy||state.dirty){panOrigin={x:point.x,y:point.y,left:scroller.scrollLeft,top:scroller.scrollTop};return;}
  drawing=true;lastPoint=pointAt(touchEvent(point));strokeBefore=state.grid;strokeSaved=false;touchHistoryBefore=[...state.history];touchFutureBefore=[...state.future];
 },
 onSingleMove(point){
  const e=touchEvent(point);readCell(e);
  if(panOrigin){scroller.scrollLeft=panOrigin.left+panOrigin.x-point.x;scroller.scrollTop=panOrigin.top+panOrigin.y-point.y;}
  else if(drawing)paintAt(e);
 },
 onSingleEnd(point,{cancelled}){if(cancelled)cancelTouchDrawing();else{if(drawing)paintAt(touchEvent(point));clearStroke();}},
 onCancelDraw:cancelTouchDrawing,
 onPinchStart:beginPinch,
 onPinchMove(pair){pendingPinch=pair;if(!pinchFrame)pinchFrame=requestAnimationFrame(()=>{const next=pendingPinch;pinchFrame=0;pendingPinch=null;applyPinch(next);});},
 onPinchEnd(pair,{cancelled}){cancelPinchFrame();if(!cancelled)applyPinch(pair);pinchOrigin=null;},
});
function resetTouch(discardStroke=false){
 const ids=touchSession.ids;if(discardStroke)clearStroke();touchSession.reset();clearStroke();cancelPinchFrame();pinchOrigin=null;
 for(const id of ids)if(scroller.hasPointerCapture(id))scroller.releasePointerCapture(id);
}
scroller.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch'||!state.grid.length)return;
 cancelWheel();e.preventDefault();scroller.setPointerCapture(e.pointerId);touchSession.start(e.pointerId,{x:e.clientX,y:e.clientY});
});
scroller.addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&touchSession.has(e.pointerId)){e.preventDefault();touchSession.move(e.pointerId,{x:e.clientX,y:e.clientY});}});
function finishTouch(e){
 if(e.pointerType!=='touch'||!touchSession.has(e.pointerId))return;
 touchSession.end(e.pointerId,{x:e.clientX,y:e.clientY},e.type!=='pointerup');
 if(scroller.hasPointerCapture(e.pointerId))scroller.releasePointerCapture(e.pointerId);
}
for(const name of ['pointerup','pointercancel','lostpointercapture'])scroller.addEventListener(name,finishTouch);

function chooseBrush(key){const color=findPaletteColor(chartPalette(),key);if(!color){toast('未找到色号，请从下拉列表选择。');return;}state.brush=color;state.tool='paint';$('#brush-query').value=color.key;refresh();}
function updateBoardSummary(){if(!state.grid.length)return;const b=boardLayout(state.grid[0].length,state.grid.length,state.boardColumns,state.boardRows);$('#board-layout').textContent='拼板：横向 '+b.columns+' 块 × 纵向 '+b.rows+' 块，共 '+b.tiles.length+' 块';}
function refresh(){if(!state.grid.length)return;$('#chart-draft-note').hidden=!state.chartDraft;const stats=summarize(state.grid);$('#pattern-title').textContent=state.name;$('#grid-size').textContent=state.grid[0].length+' × '+state.grid.length;$('#bead-count').textContent=stats.total;$('#chart-total').textContent=stats.total;$('#color-count').textContent=stats.colors.length+' 种颜色';
 $('#color-counts').innerHTML=stats.colors.map(c=>'<tr><td><button class="material-color" data-brush="'+c.key+'" aria-label="选择画笔色 '+c.key+'" aria-pressed="'+(state.brush?.key===c.key)+'"><i style="background:'+c.color+'"></i>'+c.key+'</button></td><td>'+c.count+'</td></tr>').join('');
 $('#chart-legend').innerHTML=stats.colors.map(c=>'<button class="legend-color" data-brush="'+c.key+'" aria-label="'+c.key+'，'+c.count+' 颗，选择画笔" aria-pressed="'+(state.brush?.key===c.key)+'"><i style="background:'+c.color+';color:'+codeInk(c.color)+'">'+c.key+'</i><small>'+c.count+' 颗</small></button>').join('');
 document.querySelectorAll('[data-brush]').forEach(b=>b.addEventListener('click',()=>chooseBrush(b.dataset.brush)));
 $('#selected-code').textContent=state.tool==='erase'?'橡皮':state.tool==='pan'?'平移':'画笔：'+(state.brush?.key??'先选颜色');$('#canvas-hint').textContent=state.dirty?'参数已修改，请重新生成。':'空格留空；白格有色号时放白豆。';
 document.querySelectorAll('[data-tool]').forEach(b=>{const active=b.dataset.tool===state.tool;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 const selected=palettes.get(state.selectedBrand);$('#chart-palette').textContent='当前图纸：'+chartPalette().name+(state.selectedBrand===state.chartBrand?'':'；所选色板：'+selected.name);$('#palette-select').disabled=state.busy;
 $('#undo').disabled=!state.history.length||state.busy||state.dirty;$('#redo').disabled=!state.future.length||state.busy||state.dirty;$('#mirror-horizontal').disabled=state.busy||state.dirty||stats.total===0;$('#generate').disabled=state.busy;$('#export-png').disabled=state.busy||state.dirty||stats.total===0;$('#export-csv').disabled=state.busy||state.dirty||stats.total===0;
 document.querySelectorAll('#grid-width,#grid-height,#keep-aspect,#max-colors,#mode-select,#all-colors,#no-colors,#available-palette button').forEach(el=>{el.disabled=state.busy;});
 updateBoardSummary();draw();}
function markDirty(){state.dirty=true;refresh();}
function renderAvailable(){const query=$('#palette-search').value.trim().toUpperCase(),found=state.palette.filter(c=>c.key.includes(query));$('#available-count').textContent=state.available.size+'/'+state.palette.length;$('#available-palette').innerHTML=found.length?found.map(c=>'<button class="palette-chip" data-available="'+c.key+'" aria-label="'+c.key+' '+(state.available.has(c.key)?'已选':'未选')+'" aria-pressed="'+state.available.has(c.key)+'"><i style="background:'+c.hex+'"></i>'+c.key+'</button>').join(''):'<p class="palette-empty">没有找到这个色号。</p>';$('#available-palette').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(state.available.has(b.dataset.available))state.available.delete(b.dataset.available);else state.available.add(b.dataset.available);renderAvailable();markDirty();}));}
function selectPalette(id,{convert=true}={}){
 const selected=palettes.get(id);if(!selected)return;
 state.availableByBrand.set(state.selectedBrand,new Set(state.available));state.selectedBrand=id;state.palette=selected.colors;
 state.available=new Set(state.availableByBrand.get(id)??selected.colors.map(c=>c.key));$('#palette-select').value=id;
 $('#palette-search').value='';$('#palette-search').placeholder=selected.example;$('#palette-search').setAttribute('aria-label','搜索 '+selected.name+' 色号');
 $('#palette-note').textContent='选择色板后自动换号，图案和颗数不变。实物颜色请核对色卡。';$('#conversion-status').hidden=true;renderAvailable();refresh();if(convert)convertPalette();
}
function convertPalette(){
 if(state.busy||!state.grid.length||state.selectedBrand===state.chartBrand)return;
 const target=palettes.get(state.selectedBrand),result=convertChartPalette(state.grid,chartPalette(),target,{availableKeys:state.available});
 const status=$('#conversion-status');status.hidden=false;
 if(!result.ok){const reasons={'unavailable':'未选中','missing-target':'缺少对照','unknown-source':'来源不明','ambiguous-source':'来源有冲突','ambiguous-target':'对照有冲突'};status.textContent='无法换号：'+result.missing.slice(0,6).map(c=>c.key+'（'+(reasons[c.reason]??'待核对')+'，'+c.count+'颗）').join('、')+(result.missing.length>6?'等 '+result.missing.length+' 种颜色':'')+'。图纸已保留。';toast('有颜色缺少可靠对应，图纸未更改。');return;}
 rememberChart();state.grid=result.grid;state.chartBrand=target.id;state.brush=summarize(state.grid).colors[0]??target.colors[0];updateBrushPicker();refresh();
 status.textContent='已换成'+target.name+'色号，共 '+result.total+' 颗；可点“撤销”恢复。';toast('已换成'+target.name+'色号。');
}
function syncDimensions(changed=dimensionAnchor){dimensionAnchor=changed;const s=state.image??{width:1,height:1},d=chartDimensions(s.width,s.height,$('#grid-width').value,$('#grid-height').value,$('#keep-aspect').checked,changed);$('#grid-width').value=d.width;$('#grid-height').value=d.height;return d;}
function generate(){if(!state.image){toast('请先选择图片。');return;}const palette=state.palette.filter(c=>state.available.has(c.key));if(!palette.length){toast('请至少选择一种可用颜色。');return;}const {width,height}=syncDimensions();stopWorker();state.busy=true;state.dirty=true;$('#processing-status').textContent='正在生成图纸…';$('#processing-status').hidden=false;$('#cancel-generate').hidden=false;refresh();worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});const active=worker,name=state.sourceName,brand=state.selectedBrand;
 active.onmessage=e=>{if(worker!==active)return;stopWorker();if(e.data.error){toast(e.data.error);refresh();return;}state.grid=e.data.grid;state.chartBrand=brand;state.name=name;state.history=[];state.future=[];state.dirty=false;state.brush=summarize(state.grid).colors[0]??state.palette[0];updateBrushPicker();$('#conversion-status').hidden=true;resetView();refresh();toast('图纸已生成。');};active.onerror=()=>{if(worker!==active)return;stopWorker();toast('生成失败，请缩小图片后重试。');refresh();};active.postMessage({image:state.image,width,height,palette,mode:$('#mode-select').value,maxColors:Number($('#max-colors').value)});}
async function upload(file){if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('请选择 JPG、PNG 或 WebP 图片。');return;}if(file.size>12*1024*1024){toast('图片超过 12 MB，请压缩后重试。');return;}const serial=++uploadSerial;stopWorker();const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();if(serial!==uploadSerial)return;if(img.naturalWidth*img.naturalHeight>20000000||img.naturalWidth/img.naturalHeight>8||img.naturalHeight/img.naturalWidth>8)throw new Error('图片需小于 2000 万像素，长宽比不超过 8:1。请压缩或裁剪后重试。');const scale=Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight)),source=document.createElement('canvas');source.width=Math.max(1,Math.round(img.naturalWidth*scale));source.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,source.width,source.height);const data=ctx.getImageData(0,0,source.width,source.height);state.image={width:data.width,height:data.height,data:data.data};state.chartDraft=false;state.chartCredit=null;state.sourceName=file.name.replace(/\.[^.]+$/,'').slice(0,40)||'我的图案';$('#image-name').textContent=file.name;$('#keep-aspect').checked=true;if($('#auto-fit-board').checked)fitCurrentBoard();else{$('#grid-width').value=32;syncDimensions('width');}drawOriginal();location.hash='studio';generate();}catch(e){toast(e.message?.startsWith('图片')?e.message:'无法读取这张图片，请换一张再试。');}finally{URL.revokeObjectURL(url);$('#image-upload').value='';}}
function pointAt(e){return hitCell(e.clientX,e.clientY,canvas.getBoundingClientRect(),chartGeometry(state.grid[0].length,state.grid.length));}
function paintAt(e){const point=pointAt(e);if(!point){lastPoint=null;return;}if(state.busy||state.dirty)return;const color=state.tool==='erase'?null:state.brush;if(state.tool==='paint'&&!color)return;const cells=lastPoint?lineCells(lastPoint,point):[point];let changed=false;for(const {row,col}of cells){const old=state.grid[row][col];if(color?old.key===color.key&&!old.isExternal:old.isExternal)continue;if(!strokeSaved){rememberChart(strokeBefore);strokeSaved=true;}state.grid=paintCell(state.grid,row,col,color);changed=true;}lastPoint=point;if(changed)refresh();}
function readCell(e){const point=pointAt(e);$('#cell-info').textContent=point?'第 '+(point.row+1)+' 行 · 第 '+(point.col+1)+' 列 · '+(state.grid[point.row][point.col].isExternal?'空格，不放豆':state.grid[point.row][point.col].key):'坐标尺，不放豆';}
document.querySelectorAll('[data-upload]').forEach(b=>b.addEventListener('click',()=>$('#image-upload').click()));$('#image-upload').addEventListener('change',e=>upload(e.target.files[0]));
for(const dimension of['width','height']){const input=$('#grid-'+dimension);input.addEventListener('input',()=>{if(input.value===''||!input.checkValidity()){state.dirty=true;refresh();return;}syncDimensions(dimension);markDirty();});input.addEventListener('change',()=>{syncDimensions(dimension);markDirty();});}$('#keep-aspect').addEventListener('change',()=>{syncDimensions();markDirty();});
$('#board-preset').innerHTML=boardPresets.map(b=>'<option value="'+b.id+'">'+b.label+'</option>').join('')+'<option value="custom">自定义板行列</option>';
function fitCurrentBoard(){if(!state.image)return;const d=fitBoardDimensions(state.image.width,state.image.height,state.boardColumns,state.boardRows);$('#grid-width').value=d.width;$('#grid-height').value=d.height;$('#keep-aspect').checked=true;dimensionAnchor=d.anchor;}
function boardChanged(){if($('#auto-fit-board').checked&&state.image){fitCurrentBoard();generate();}else{updateBoardSummary();draw();}}
$('#board-preset').addEventListener('change',()=>{const b=boardPresets.find(b=>b.id===$('#board-preset').value);$('#custom-board').hidden=!!b;if(b){state.boardColumns=b.columns;state.boardRows=b.rows;$('#board-columns').value=b.columns;$('#board-rows').value=b.rows;}boardChanged();});
for(const [id,key]of[['board-columns','boardColumns'],['board-rows','boardRows']]){const input=$('#'+id);input.addEventListener('input',()=>{if(input.value===''||!input.checkValidity())return;state[key]=Number(input.value);boardChanged();});input.addEventListener('change',()=>{const value=Math.max(1,Math.min(128,Math.round(Number(input.value)||1)));if(state[key]===value&&Number(input.value)===value)return;state[key]=value;input.value=value;boardChanged();});}
$('#auto-fit-board').addEventListener('change',()=>{if($('#auto-fit-board').checked)boardChanged();});
$('#max-colors').addEventListener('input',()=>{$('#colors-output').value=$('#max-colors').value+' 色';markDirty();});$('#mode-select').addEventListener('change',markDirty);$('#generate').addEventListener('click',generate);$('#cancel-generate').addEventListener('click',()=>{stopWorker();refresh();toast('已取消，保留原图纸。');});
$('#palette-select').addEventListener('change',()=>selectPalette($('#palette-select').value));
$('#palette-search').addEventListener('input',renderAvailable);$('#all-colors').addEventListener('click',()=>{state.available=new Set(state.palette.map(c=>c.key));renderAvailable();markDirty();});$('#no-colors').addEventListener('click',()=>{state.available.clear();renderAvailable();markDirty();});$('#choose-brush').addEventListener('click',()=>chooseBrush($('#brush-query').value));$('#brush-query').addEventListener('keydown',e=>{if(e.key==='Enter')chooseBrush($('#brush-query').value);});
for(const [id,key]of[['toggle-grid','gridLines']])$('#'+id).addEventListener('click',()=>{state[key]=!state[key];$('#'+id).setAttribute('aria-pressed',String(state[key]));$('#'+id).classList.toggle('active',state[key]);draw();});
for(const id of['major-every','major-color','major-offset','show-seams'])$('#'+id).addEventListener('change',draw);
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>{state.tool=b.dataset.tool;refresh();}));$('#mirror-horizontal').addEventListener('click',()=>{if(state.busy||state.dirty||!state.grid.length)return;resetTouch();clearStroke();cancelWheel();rememberChart();state.grid=mirrorHorizontal(state.grid);refresh();toast('已左右镜像，可点“撤销”恢复。');});function travelChart(direction){if(state.busy||state.dirty)return;resetTouch();clearStroke();cancelWheel();const next=moveEdit({past:state.history,future:state.future},{grid:state.grid,chartBrand:state.chartBrand},direction,20);if(!next.changed)return;state.history=next.past;state.future=next.future;state.grid=next.value.grid;state.chartBrand=next.value.chartBrand;state.brush=summarize(state.grid).colors[0]??chartPalette().colors[0];updateBrushPicker();selectPalette(state.chartBrand,{convert:false});}
$('#undo').addEventListener('click',()=>travelChart('undo'));$('#redo').addEventListener('click',()=>travelChart('redo'));
document.addEventListener('keydown',e=>{if($('#studio-view').hidden||e.target.closest('input,textarea,select,[contenteditable=true]')||!(e.ctrlKey||e.metaKey)||e.altKey)return;const key=e.key.toLowerCase(),direction=key==='y'||key==='z'&&e.shiftKey?'redo':key==='z'?'undo':null;if(direction&&!state.busy&&!state.dirty&&(direction==='undo'?state.history:state.future).length){e.preventDefault();travelChart(direction);}});
function applyZoomInput(){cancelWheel();const value=Number($('#zoom').value);if(!Number.isFinite(value)||value<=0){draw();return;}setZoom(value/100);}
$('#zoom').addEventListener('change',applyZoomInput);$('#zoom').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyZoomInput();}});
$('#zoom-in').addEventListener('click',()=>{cancelWheel();setZoom(currentScale*1.15);});$('#zoom-out').addEventListener('click',()=>{cancelWheel();setZoom(currentScale/1.15);});
$('#zoom-fit').addEventListener('click',()=>{cancelWheel();state.zoom=0;scroller.scrollTo(0,0);draw();});$('#zoom-actual').addEventListener('click',()=>{cancelWheel();setZoom(1);});
scroller.addEventListener('wheel',e=>{if(!e.deltaY||!state.grid.length)return;e.preventDefault();if(touchSession.activeCount)return;pendingZoom=wheelScale(pendingZoom??currentScale,e.deltaY,e.deltaMode,scroller.clientHeight);pendingPointer={x:e.clientX,y:e.clientY};if(!wheelFrame)wheelFrame=requestAnimationFrame(()=>{const scale=pendingZoom,point=pendingPointer;wheelFrame=0;pendingZoom=null;pendingPointer=null;setZoom(scale,point);});},{passive:false});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||touchSession.activeCount||e.button!==0)return;if(state.tool==='pan'){panOrigin={x:e.clientX,y:e.clientY,left:scroller.scrollLeft,top:scroller.scrollTop};canvas.setPointerCapture(e.pointerId);e.preventDefault();return;}if(state.busy)return;if(state.dirty){toast('请先重新生成，再修改图纸。');return;}drawing=true;lastPoint=null;strokeBefore=state.grid;strokeSaved=false;canvas.setPointerCapture(e.pointerId);paintAt(e);e.preventDefault();});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||touchSession.activeCount)return;readCell(e);if(panOrigin){scroller.scrollLeft=panOrigin.left+panOrigin.x-e.clientX;scroller.scrollTop=panOrigin.top+panOrigin.y-e.clientY;}else if(drawing)paintAt(e);});
function finishStroke(e){if(e.pointerType==='touch')return;clearStroke();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
canvas.addEventListener('pointerup',finishStroke);canvas.addEventListener('pointercancel',finishStroke);
$('#export-png').addEventListener('click',async()=>{try{const r=await exportPng(state.grid,state.name,{...paperOptions(),...exportMetadata(),credit:state.chartCredit});toast('图纸已生成，请查看浏览器下载记录。');}catch{toast('图纸导出失败，请缩小尺寸后重试。');}});$('#export-csv').addEventListener('click',()=>{downloadBlob(new Blob([materialCsv(state.grid,state.name,exportMetadata())],{type:'text/csv;charset=utf-8'}),'豆作间-'+state.name+'-用量.csv');toast('用量表已生成，请查看浏览器下载记录。');});
window.addEventListener('hashchange',()=>{resetTouch();route();});window.addEventListener('resize',()=>{resetTouch();draw();});window.addEventListener('blur',()=>resetTouch());window.addEventListener('beforeunload',()=>{if(worker)worker.terminate();});
async function init(){route();try{const response=await fetch('/data/upstream-color-mapping.json');if(!response.ok)throw new Error('色板未能加载');const mapping=await response.json();palettes=createPaletteRegistry(mapping);state.palette=palettes.get('mard').colors;state.available=new Set(state.palette.map(c=>c.key));$('#palette-select').innerHTML=[...palettes.values()].map(p=>'<option value="'+p.id+'">'+esc(p.label)+'</option>').join('');const p=createCatalog(patterns,palettes.get('mard').colors).find(p=>p.id==='flower');state.grid=p.grid;state.chartBrand='mard';state.chartCredit={author:p.author,source:p.source.label,license:p.license};state.image=sourceImageFromGrid(p);state.brush=summarize(state.grid).colors[0];updateBrushPicker();renderAvailable();drawOriginal();refresh();await libraryView.init();route();}catch(e){$('#pattern-list').textContent='图纸加载失败，请刷新页面。';toast('图纸加载失败，请刷新页面。');}}
init();
