import test from 'node:test';
import assert from 'node:assert/strict';
const engine = await import('../src/lib/engine.js').catch(() => ({}));
const palette = [{key:'RED',hex:'#FF0000',rgb:{r:255,g:0,b:0}},{key:'BLUE',hex:'#0000FF',rgb:{r:0,g:0,b:255}},{key:'WHITE',hex:'#FFFFFF',rgb:{r:255,g:255,b:255}}];

test('an uploaded red/blue image retains its colors and transparent cells',()=>{
  assert.equal(typeof engine.quantize,'function','quantization is not implemented');
  const result=engine.quantize({width:2,height:2,data:new Uint8ClampedArray([255,0,0,255,0,0,255,255,0,0,0,0,255,0,0,255])},2,2,palette,'dominant',3);
  assert.deepEqual(result.map(row=>row.map(c=>c.isExternal?null:c.key)),[['RED','BLUE'],[null,'RED']]);
  assert.equal(engine.summarize(result).total,3);
});
test('limiting colors respects the chosen available palette and maximum count',()=>{
  assert.equal(typeof engine.quantize,'function');
  const result=engine.quantize({width:2,height:2,data:new Uint8ClampedArray([255,0,0,255,0,0,255,255,255,255,255,255,255,0,0,255])},2,2,palette,'average',1);
  assert.equal(engine.summarize(result).colors.length,1);
  assert.equal(engine.summarize(result).total,4);
});
test('erasing one cell removes it from material counts without mutating the original',()=>{
  assert.equal(typeof engine.paintCell,'function');
  const before=[[{key:'RED',color:'#FF0000'}]];
  const after=engine.paintCell(before,0,0,null);
  assert.equal(engine.summarize(after).total,0);
  assert.equal(engine.summarize(before).total,1);
});
test('CSV quantities add up and use the real pattern color codes',()=>{
  assert.equal(typeof engine.materialCsv,'function');
  const csv=engine.materialCsv([[{key:'A01',color:'#FAF4C8'},{key:'A01',color:'#FAF4C8'},{key:'H07',color:'#000000'}]],'原创小图');
  assert.match(csv,/A01,#FAF4C8,2/);
  assert.match(csv,/H07,#000000,1/);
});
test('invalid grid sizes and an empty palette are rejected rather than producing fake results',()=>{
  assert.equal(typeof engine.quantize,'function');
  assert.throws(()=>engine.quantize({width:1,height:1,data:new Uint8ClampedArray(4)},0,1,palette),/网格/);
  assert.throws(()=>engine.quantize({width:1,height:1,data:new Uint8ClampedArray(4)},1,1,[]),/颜色/);
});
test('CSV escapes quotes and neutralizes spreadsheet formulas in image names',()=>{
  const csv=engine.materialCsv([[{key:'A01',color:'#FAF4C8'}]],'  =HYPERLINK("x")');
  assert.match(csv,/图案,"_  =HYPERLINK\(""x""\)"/);
});

const chart = await import('../src/lib/chart.js').catch(()=>({}));
test('four-sided coordinates do not take away any bead cells',()=>{
  assert.equal(typeof chart.chartGeometry,'function','chart geometry is not implemented');
  assert.deepEqual(chart.chartGeometry(104,78,36),{columns:104,rows:78,cell:36,inset:36,width:3816,height:2880});
});
test('editing maps the first bead correctly and ignores coordinate bands',()=>{
  assert.equal(typeof chart.hitCell,'function');
  const g=chart.chartGeometry(16,16,36),rect={left:10,top:20,width:648,height:648};
  assert.deepEqual(chart.hitCell(47,57,rect,g),{row:0,col:0});
  assert.equal(chart.hitCell(15,60,rect,g),null);
  assert.equal(chart.hitCell(623,60,rect,g),null);
});
test('board layout preserves partial edge boards and global coordinates',()=>{
  assert.equal(typeof chart.boardLayout,'function');
  const b=chart.boardLayout(78,78,52,52);
  assert.equal(b.tiles.length,4);
  assert.deepEqual(b.tiles[3],{number:4,boardRow:2,boardCol:2,x:52,y:52,width:26,height:26});
});
test('exact chart dimensions allow 29 and 50 while aspect lock caps portrait height honestly',()=>{
  assert.equal(typeof chart.chartDimensions,'function');
  assert.deepEqual(chart.chartDimensions(100,400,104,104,true,'width'),{width:32,height:128});
  assert.deepEqual(chart.chartDimensions(100,400,29,50,false,'width'),{width:29,height:50});
});
test('a fast brush drag fills intervening cells instead of leaving holes',()=>{
  assert.equal(typeof chart.lineCells,'function');
  assert.deepEqual(chart.lineCells({row:1,col:1},{row:1,col:5}),[1,2,3,4,5].map(col=>({row:1,col})));
});
test('dark and light bead colors get legible contrasting code text',()=>{
  assert.equal(typeof chart.codeInk,'function');
  assert.equal(chart.codeInk('#FFFFFF'),'#172c3c');
  assert.equal(chart.codeInk('#000000'),'#ffffff');
  assert.equal(chart.codeInk('#1655A5'),'#ffffff');
});

test('wheel zoom is continuous, reversible, and normalizes line-based wheels',()=>{
  assert.equal(typeof chart.wheelScale,'function','continuous wheel zoom is not implemented');
  const zoomed=chart.wheelScale(1,-37,0,600);
  assert(zoomed>1&&zoomed<1.1);
  assert(Math.abs(chart.wheelScale(zoomed,37,0,600)-1)<1e-10);
  assert.equal(chart.wheelScale(1,-1,1,600),chart.wheelScale(1,-16,0,600));
  assert.equal(chart.wheelScale(32,-500,0,600),32);
  assert.equal(chart.wheelScale(.01,500,0,600),.01);
});
test('zooming keeps the same chart point underneath the pointer',()=>{
  assert.equal(typeof chart.zoomScroll,'function');
  const before={left:20,top:30,width:1000,height:800},after={left:20,top:30,width:1200,height:960};
  const next=chart.zoomScroll({left:100,top:80},{x:200,y:160},before,after);
  assert(Math.abs(next.left-136)<1e-10);
  assert(Math.abs(next.top-106)<1e-10);
  assert(Math.abs((200-before.left)/before.width-(200-(after.left-(next.left-100)))/after.width)<1e-10);
});

test('single-board adaptation fits portrait and landscape without distorting or exceeding pins',()=>{
  assert.equal(typeof chart.fitBoardDimensions,'function','board adaptation is missing');
  assert.deepEqual(chart.fitBoardDimensions(100,200,52,52),{width:26,height:52,anchor:'height'});
  assert.deepEqual(chart.fitBoardDimensions(200,100,78,52),{width:78,height:39,anchor:'width'});
  assert.deepEqual(chart.fitBoardDimensions(100,200,29,17),{width:9,height:17,anchor:'height'});
});

const catalog=await import('../src/catalog.js').catch(()=>({}));
test('catalog search combines category, tags, size and color filters with a real empty state',()=>{
  assert.equal(typeof catalog.filterPatterns,'function','searchable catalog is missing');
  const entries=[{id:'a',name:'云',category:'风景',tags:['天空'],author:'甲',width:16,height:16,total:40,colorCount:3},{id:'b',name:'花',category:'植物',tags:['春天'],author:'乙',width:67,height:73,total:3000,colorCount:7}];
  assert.deepEqual(catalog.filterPatterns(entries,{query:'天空',category:'风景',size:'small',colors:'5'}).map(p=>p.id),['a']);
  assert.deepEqual(catalog.filterPatterns(entries,{query:'不存在'}),[]);
  assert.deepEqual(catalog.filterPatterns(entries,{sort:'beads-desc'}).map(p=>p.id),['b','a']);
});
test('curated color-code charts retain exact codes and reject invalid grids before entering the catalog',()=>{
  assert.equal(typeof catalog.createCatalog,'function');
  const p={id:'test',name:'测试',category:'几何',tags:[],author:'测试作者',source:{label:'作者提供'},license:'授权测试',permissionStatus:'ready',palette:'MARD',width:2,height:2,colorCodes:['BLUE','WHITE'],cells:[0,null,1,0]};
  const entry=catalog.createCatalog([p],palette)[0];
  assert.equal(entry.total,3);assert.equal(entry.colorCount,2);
  assert.deepEqual(entry.grid.map(row=>row.map(c=>c.isExternal?null:c.key)),[['BLUE',null],['WHITE','BLUE']]);
  assert.throws(()=>catalog.createCatalog([{...p,cells:[0]}],palette),/格/);
  assert.throws(()=>catalog.createCatalog([{...p,colorCodes:['MISSING','WHITE']}],palette),/色号/);
  assert.throws(()=>catalog.createCatalog([{...p,palette:'OtherBrand'}],palette),/色板/);
  assert.equal(catalog.createCatalog([{...p,permissionStatus:'pending'}],palette).length,0);
});

const render=await import('../src/lib/render.js');
test('screen charts use vector text per bead, keep real white beads and escape labels',()=>{
  assert.equal(typeof render.chartSvg,'function','vector chart rendering is missing');
  const svg=render.chartSvg([[{key:'H02',color:'#FFFFFF'},{key:'H07',color:'#000000'},{key:'ERASE',color:'#FFFFFF',isExternal:true},{key:'<bad>',color:'#FFFFFF'}]]);
  assert(svg.includes('<text'));assert(svg.includes('H02'));assert(svg.includes('H07'));
  assert(!svg.includes('ERASE'));assert(!svg.includes('<bad>'));assert(svg.includes('&lt;bad&gt;'));
  assert(!svg.includes('<image'));assert(svg.includes('viewBox="0 0 216 108"'));
});

test('exported materials include the official site without changing bead quantities',()=>{
 const csv=engine.materialCsv([[{key:'A01',color:'#FAF4C8'},{key:'A01',color:'#FAF4C8'}]],'花朵');
 assert.match(csv,/网站,https:\/\/douzuojian\.com\//);
 assert.match(csv,/A01,#FAF4C8,2/);
});
const site=await import('../src/site.js').catch(()=>({}));
test('example credits use the site brand while retaining other chart authors',()=>{
 assert.equal(typeof site.creditLabel,'function','branded chart credits are missing');
 assert.equal(site.creditLabel({author:'豆作间',source:'豆作间原创几何示例',license:'AGPL-3.0'}),'豆作间原创几何示例 · AGPL-3.0');
 assert.match(site.creditLabel({author:'小林',source:'作者提供',license:'授权使用'}),/作者：小林/);
});
