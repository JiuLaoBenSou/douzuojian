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

// Brand conversion: retain layout and counts, never guess missing cross-brand codes.
const brandPalettes=await import('../src/lib/palettes.js').catch(()=>({}));
const brandMapping=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../src/data/upstream-color-mapping.json',import.meta.url),'utf8'));
test('reference registry exposes seven brands and quarantines missing, conflicting and unreviewed codes',()=>{
 assert.equal(typeof brandPalettes.createPaletteRegistry,'function','multi-brand reference palettes are missing');
 const registry=brandPalettes.createPaletteRegistry(brandMapping);
 assert.equal(registry.size,7);assert.equal(registry.get('mard').colors.length,291);
 const manman=registry.get('manman'),xiaowu=registry.get('xiaowu');
 assert.equal(manman.colors.find(c=>c.referenceId==='R24').key,'S7');
 assert.equal(manman.colors.find(c=>c.referenceId==='R13').key,'L7');
 assert(!manman.colors.some(c=>c.key==='-'||c.referenceId.startsWith('ZG')||c.referenceId.startsWith('Q')));
 assert(registry.get('mard').colors.some(c=>c.referenceId==='Q01'));
 assert.deepEqual(registry.get('mard').colors.map(c=>[c.key,c.hex]),Object.entries(brandMapping).map(([hex,c])=>[c.MARD,hex]),'MARD primary palette must retain every original code and HEX unchanged');
 assert(!registry.get('mard').colors.some(c=>c.key==='Y06'),'comparison-only codes must not replace the MARD master palette');
 assert(!xiaowu.colors.some(c=>c.referenceId==='B05'),'ambiguous B5/E5 image entry must not be guessed');
 assert(registry.get('huangdoudou').colors.some(c=>c.key==='Y6'&&c.hex==='#F7D4E8'));
 for(const palette of registry.values())assert.equal(new Set(palette.colors.map(c=>c.key)).size,palette.colors.length,palette.id);
});
test('one-click reference conversion preserves editing, transparent gaps, real white beads and exact quantities',()=>{
 assert.equal(typeof brandPalettes.convertChartPalette,'function','one-click brand conversion is missing');
 const registry=brandPalettes.createPaletteRegistry(brandMapping),grid=[[{key:'A01',color:'#FAF4C8'},{key:'H02',color:'#FEFFFF'},{key:'ERASE',color:'#FFFFFF',isExternal:true}],[{key:'H07',color:'#000000'},{key:'A01',color:'#FAF4C8'},{key:'R24',color:'#F3C1C0'}]],original=structuredClone(grid);
 const result=brandPalettes.convertChartPalette(grid,registry.get('mard'),registry.get('coco'));
 assert.equal(result.ok,true);assert.deepEqual(result.grid.map(row=>row.map(c=>c.isExternal?null:c.key)),[['E02','A01',null],['B09','E02','S11']]);
 assert.deepEqual(grid,original);assert.equal(engine.summarize(result.grid).total,5);
 assert.deepEqual(result.grid.map(r=>r.map(c=>c.color)),grid.map(r=>r.map(c=>c.color)));
 const back=brandPalettes.convertChartPalette(result.grid,registry.get('coco'),registry.get('mard'));
 assert.equal(back.ok,true);assert.deepEqual(back.grid,grid);
 const toManman=brandPalettes.convertChartPalette(grid,registry.get('mard'),registry.get('manman'));
 assert.equal(toManman.ok,true);assert.equal(toManman.grid[1][2].key,'S7');
});
test('unsupported brand rows, ambiguous source codes and unavailable colors never partially convert a chart',()=>{
 assert.equal(typeof brandPalettes.convertChartPalette,'function');
 const registry=brandPalettes.createPaletteRegistry(brandMapping),grid=[[{key:'A01',color:'#FAF4C8'},{key:'Q01',color:'#F2A5E8'}]];
 const result=brandPalettes.convertChartPalette(grid,registry.get('mard'),registry.get('coco'));
 assert.equal(result.ok,false);assert.equal(result.grid,grid);assert.deepEqual(result.missing.map(c=>c.key),['Q01']);
 const noStock=brandPalettes.convertChartPalette([[grid[0][0]]],registry.get('mard'),registry.get('coco'),{availableKeys:new Set(['B09'])});
 assert.equal(noStock.ok,false);assert.equal(noStock.missing[0].reason,'unavailable');
 const ambiguous={id:'test',name:'test',colors:[{key:'S4',referenceId:'R18'},{key:'S4',referenceId:'R24'}]};
 const blocked=brandPalettes.convertChartPalette([[{key:'S4',color:'#FFFFFF'}]],ambiguous,registry.get('mard'));
 assert.equal(blocked.ok,false);assert.equal(blocked.missing[0].reason,'ambiguous-source');
});
test('brand palette codes work in quantization and exports carry the actual brand',()=>{
 assert.equal(typeof brandPalettes.createPaletteRegistry,'function');
 const registry=brandPalettes.createPaletteRegistry(brandMapping),coco=registry.get('coco'),black=coco.colors.find(c=>c.key==='B09');
 const grid=engine.quantize({width:1,height:1,data:new Uint8ClampedArray([0,0,0,255])},1,1,[black],'dominant',1);
 assert.equal(grid[0][0].key,'B09');
 const csv=engine.materialCsv(grid,'黑色',{paletteLabel:coco.label,paletteVersion:coco.version});
 assert(csv.includes('色板,'+coco.label));assert(!csv.includes('色板,MARD'));assert(csv.includes('B09,#000000,1'));
});

test('all supported brand pairs round-trip their shared references without code collisions or bead loss',()=>{
 const registry=brandPalettes.createPaletteRegistry(brandMapping);
 for(const source of registry.values())for(const target of registry.values()){
  const refs=new Set(target.colors.map(c=>c.referenceId)),shared=source.colors.filter(c=>refs.has(c.referenceId));
  const grid=[shared.map(c=>({key:c.key,color:c.hex})).concat({key:'ERASE',color:'#FFFFFF',isExternal:true})];
  const switched=brandPalettes.convertChartPalette(grid,source,target);assert.equal(switched.ok,true,source.id+' -> '+target.id);
  assert.equal(engine.summarize(switched.grid).total,shared.length);
  const restored=brandPalettes.convertChartPalette(switched.grid,target,source);assert.equal(restored.ok,true);assert.deepEqual(restored.grid,grid);
 }
});

const touchGestures=await import('../src/lib/gestures.js').catch(()=>({}));
test('pinch uses two-dimensional finger distance and clamps continuous chart scale',()=>{
 assert.equal(typeof touchGestures.touchPair,'function','touch/pinch geometry is missing');
 assert.equal(typeof touchGestures.pinchScale,'function');
 assert.deepEqual(touchGestures.touchPair([{x:0,y:0},{x:3,y:4}]),{center:{x:1.5,y:2},distance:5});
 assert.equal(touchGestures.touchPair([{x:0,y:0}]),null);
 assert(Math.abs(touchGestures.pinchScale(.8,100,150)-1.2)<1e-12);
 assert.equal(touchGestures.pinchScale(1,100,25),.25);
 assert.equal(touchGestures.pinchScale(20,100,300),32);
 assert.equal(touchGestures.pinchScale(.1,100,1),.01);
 assert.equal(touchGestures.pinchScale(.8,0,100),.8);
});
test('pinch keeps the original bead under the moving finger midpoint while zooming',()=>{
 assert.equal(typeof touchGestures.pinchScroll,'function','moving pinch anchor is missing');
 const scroll={left:100,top:80},anchor={x:.25,y:.4},midpoint={x:250,y:300},rect={left:20,top:30,width:1200,height:1000};
 const next=touchGestures.pinchScroll(scroll,anchor,midpoint,rect);
 assert.deepEqual(next,{left:170,top:210});
 assert.equal(rect.left-(next.left-scroll.left)+anchor.x*rect.width,midpoint.x);
 assert.equal(rect.top-(next.top-scroll.top)+anchor.y*rect.height,midpoint.y);
 assert.deepEqual(touchGestures.pinchScroll(scroll,anchor,{x:220,y:340},rect),{left:200,top:170});
});
test('second finger cancels drawing before pinch and remaining finger only pans until all fingers lift',()=>{
 assert.equal(typeof touchGestures.createTouchSession,'function','multi-pointer lifecycle is missing');
 const log=[],session=touchGestures.createTouchSession(Object.fromEntries(['onSingleStart','onSingleMove','onSingleEnd','onCancelDraw','onPinchStart','onPinchMove','onPinchEnd'].map(name=>[name,(...args)=>log.push([name,...args])])));
 session.start(1,{x:10,y:20});session.move(1,{x:20,y:30});session.start(2,{x:100,y:30});
 const cancelled=log.findIndex(e=>e[0]==='onCancelDraw'),pinched=log.findIndex(e=>e[0]==='onPinchStart');
 assert(cancelled>=0&&cancelled<pinched);
 const singleMoves=log.filter(e=>e[0]==='onSingleMove').length;
 session.move(2,{x:140,y:30});assert.equal(log.filter(e=>e[0]==='onSingleMove').length,singleMoves);
 assert.equal(log.at(-1)[0],'onPinchMove');
 session.end(2,{x:140,y:30});assert.equal(log.at(-1)[0],'onSingleStart');assert.equal(log.at(-1)[2].navigationOnly,true);
 session.move(1,{x:30,y:40});assert.equal(log.at(-1)[2].navigationOnly,true);
 session.end(1,{x:30,y:40});assert.equal(session.activeCount,0);
 session.start(3,{x:1,y:2});assert.equal(log.at(-1)[2].navigationOnly,false);
});
test('touch cancellation and third-finger replacement do not leave a stuck pinch',()=>{
 assert.equal(typeof touchGestures.createTouchSession,'function');
 const starts=[],ends=[],session=touchGestures.createTouchSession({onPinchStart:p=>starts.push(p),onPinchEnd:(p,options)=>ends.push(options)});
 session.start(1,{x:0,y:0});session.start(2,{x:10,y:0});session.start(3,{x:20,y:0});
 session.end(1,{x:0,y:0});assert.equal(session.activeCount,2);assert.equal(starts.length,2);assert.equal(starts.at(-1).distance,10);
 session.end(2,{x:10,y:0},true);assert.equal(ends.at(-1).cancelled,true);assert.equal(session.activeCount,1);
 session.reset();assert.equal(session.activeCount,0);assert.deepEqual(session.ids,[]);
 assert.equal(session.move(3,{x:99,y:99}),false);assert.equal(session.end(3,{x:20,y:0}),false);
});
test('starting a pinch rolls back only the in-progress touch stroke and keeps completed edits undoable',()=>{
 assert.equal(typeof touchGestures.cancelTouchStroke,'function');
 const completed=[[{key:'A01',color:'#FAF4C8'}]],drawing=engine.paintCell(completed,0,0,{key:'H07',hex:'#000000'}),past={grid:[],chartBrand:'mard'},history=[past,{grid:completed,chartBrand:'mard'}];
 const cancelled=touchGestures.cancelTouchStroke(drawing,history,completed,true);
 assert.equal(cancelled.grid,completed);assert.deepEqual(cancelled.history,[past]);assert.equal(history.length,2);
 const untouched=touchGestures.cancelTouchStroke(drawing,history,completed,false);assert.equal(untouched.grid,drawing);
 const fullHistory=Array.from({length:20},(_,i)=>({grid:[[i]],chartBrand:'mard'})),trimmed=[...fullHistory.slice(1),{grid:completed,chartBrand:'mard'}];
 const restored=touchGestures.cancelTouchStroke(drawing,trimmed,completed,true,fullHistory);
 assert.equal(restored.history,fullHistory);assert.equal(restored.history.length,20);assert.equal(restored.history[0],fullHistory[0]);
});

const storedCatalog=await import('../src/lib/catalog-store.js').catch(()=>({}));
const storedMeta={id:'test-data',name:'数据图',category:'动漫游戏',series:'宝可梦',tags:['角色'],aliases:['小火龙','xiaohuolong','Charmander','004'],author:'测试作者',source:{label:'测试来源'},license:'测试许可',palette:'MARD',status:'ready',width:2,height:2,total:3,colorCount:2,unknownCount:0,data:'/catalog/charts/test-data.json',thumbnail:'/catalog/thumbs/test-data.svg'};
const storedDoc={schema:1,id:'test-data',width:2,height:2,colorCodes:['BLUE','WHITE'],encoding:'rle',runs:[[1,0],[1,null],[1,1],[1,0]]};
test('stored catalog decoding preserves exact positions, white beads and bounded runs',()=>{
 assert.equal(typeof storedCatalog.decodePatternDocument,'function');
 const p=storedCatalog.decodePatternDocument(storedDoc,storedMeta,palette);
 assert.deepEqual(p.grid.map(row=>row.map(c=>c.isExternal?null:c.key)),[['BLUE',null],['WHITE','BLUE']]);assert.equal(p.total,3);
 for(const runs of [[[5,0]],[[0,0]],[[1e9,0]],[[1,-1]],[[1,99]],[[1,0]]])assert.throws(()=>storedCatalog.decodePatternDocument({...storedDoc,runs},storedMeta,palette));
 assert.throws(()=>storedCatalog.decodePatternDocument({...storedDoc,id:'other'},storedMeta,palette));
 assert.throws(()=>storedCatalog.decodePatternDocument(storedDoc,{...storedMeta,total:4},palette));
});
test('local draft unknown cells remain visible and are never silently converted to empty beads',()=>{
 assert.equal(typeof storedCatalog.decodePatternDocument,'function');
 const doc={...storedDoc,runs:[[1,0],[1,null],[1,1],[1,-1]]},meta={...storedMeta,status:'draft',unknownCount:1,colorCount:3};
 assert.throws(()=>storedCatalog.decodePatternDocument(doc,meta,palette),/草稿/);
 const p=storedCatalog.decodePatternDocument(doc,meta,palette,{allowDraft:true});
 assert.equal(p.unknownCount,1);assert.equal(p.grid[1][1].key,'?');assert.equal(p.grid[1][1].isExternal,undefined);assert.equal(p.total,3);
});
test('catalog index stays metadata-only and rejects unsafe asset paths and duplicate IDs',()=>{
 assert.equal(typeof storedCatalog.validateCatalogIndex,'function');
 assert.equal(storedCatalog.validateCatalogIndex({schema:1,localPreview:false,entries:[storedMeta]}).entries.length,1);
 for(const entries of [[storedMeta,storedMeta],[{...storedMeta,data:'https://other.test/data'}],[{...storedMeta,thumbnail:'/../secret'}],[{...storedMeta,cells:[0]}]])assert.throws(()=>storedCatalog.validateCatalogIndex({schema:1,entries}));
 assert.throws(()=>storedCatalog.validateCatalogIndex({schema:1,localPreview:false,entries:[{...storedMeta,status:'draft'}]}));
 assert.throws(()=>storedCatalog.validateCatalogIndex({schema:1,entries:[{...storedMeta,section:{name:'图鉴'}}]}));
 assert.throws(()=>storedCatalog.validateCatalogIndex({schema:1,entries:[{...storedMeta,collection:'缺少类型'}]}));
});
test('single-pattern loading deduplicates pending reads, retries failures and does not eagerly fetch the library',async()=>{
 assert.equal(typeof storedCatalog.createPatternStore,'function');let reads=0,fail=true;
 const store=storedCatalog.createPatternStore({entries:[storedMeta],palette,fetchJson:async()=>{reads++;if(fail)throw new Error('offline');return storedDoc;}});
 assert.equal(reads,0);await assert.rejects(store.load('test-data'),/offline/);fail=false;
 const [a,b]=await Promise.all([store.load('test-data'),store.load('test-data')]);assert.equal(a,b);assert.equal(reads,2);
 await store.load('test-data');assert.equal(reads,2);await assert.rejects(store.load('missing'));
});
test('catalog combines aliases, series and category across all pages with bounded pagination',()=>{
 const entries=Array.from({length:61},(_,i)=>({...storedMeta,id:'p-'+i,total:i}));
 assert.equal(catalog.filterPatterns(entries,{query:'charmander 004',series:'宝可梦',category:'动漫游戏'}).length,61);
 assert.equal(catalog.filterPatterns(entries,{query:'xiaohuolong',series:'其他'}).length,0);
 assert.equal(typeof storedCatalog.catalogPage,'function');
 const result=storedCatalog.catalogPage(entries,3,24);assert.equal(result.items.length,13);assert.equal(result.items[0].id,'p-48');assert.equal(result.pageCount,3);
 assert.equal(storedCatalog.catalogPage(entries,99,24).page,3);assert.equal(storedCatalog.catalogPage([],9,24).page,1);
});

test('thumbnail PNG retains white beads and unresolved markers against transparent empty cells',async()=>{
 const images=await import('../scripts/catalog-image.mjs').catch(()=>({}));assert.equal(typeof images.catalogPng,'function');
 const {inflateSync}=await import('node:zlib');
 for(const [bead,expected] of [[{key:'H01',color:'#FFFFFF'},[255,255,255,255]],[{key:'?',color:'#ff00ff'},[255,0,255,255]]]){
  const png=images.catalogPng([[bead,{key:'ERASE',color:'#FFFFFF',isExternal:true}]]);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),160);assert.equal(png.readUInt32BE(20),160);
  let offset=8,idat=[];while(offset<png.length){const length=png.readUInt32BE(offset),type=png.subarray(offset+4,offset+8).toString();if(type==='IDAT')idat.push(png.subarray(offset+8,offset+8+length));offset+=length+12;}
  const raw=inflateSync(Buffer.concat(idat)),pixel=(x,y)=>[...raw.subarray(y*641+1+x*4,y*641+5+x*4)];
  assert.deepEqual(pixel(40,80),expected);assert.equal(pixel(120,80)[3],0);assert.equal(pixel(0,0)[3],0);
 }
});

test('horizontal mirror reverses each row without changing colors, white beads, empty cells or the original grid',()=>{
 assert.equal(typeof engine.mirrorHorizontal,'function','Horizontal chart mirror is missing');
 const grid=[[{key:'H07',color:'#000000'},{key:'H01',color:'#FDFBFF'},{key:'ERASE',color:'#FFFFFF',isExternal:true}],[{key:'?',color:'#ff00ff',isUnresolved:true},{key:'A01',color:'#ffeeaa'},{key:'H07',color:'#000000'}]],before=structuredClone(grid);
 const flipped=engine.mirrorHorizontal(grid);
 assert.deepEqual(flipped.map(row=>row.map(c=>c.key)),[['ERASE','H01','H07'],['H07','A01','?']]);
 assert.deepEqual(grid,before);assert.notEqual(flipped[0],grid[0]);assert.notEqual(flipped[0][2],grid[0][0]);
 assert.deepEqual(engine.summarize(flipped),engine.summarize(grid));assert.deepEqual(engine.mirrorHorizontal(flipped),grid);
});

test('catalog collections separate generation pokedex, special forms and other franchises',()=>{
 assert.equal(typeof catalog.classifyCatalogEntry,'function','Detailed catalog classification is missing');
 assert.equal(typeof catalog.catalogFacets,'function');
 const first=catalog.classifyCatalogEntry({...storedMeta,id:'first',source:{label:'用户提供的第一代151只图纸'}});
 assert.equal(first.section,'图鉴');assert.equal(first.collection,'第一代宝可梦图鉴 · 151只');assert.equal(first.collectionId,'pokemon-gen1-pokedex');
 const second={...storedMeta,id:'second',section:'图鉴',collection:'第二代宝可梦图鉴 · 100只',collectionId:'pokemon-gen2-pokedex'};
 const mega={...storedMeta,id:'mega',section:'特殊形态',collection:'超级进化（Mega）',collectionId:'pokemon-mega'};
 const other={...storedMeta,id:'other',series:'三丽鸥',section:'角色合集',collection:'角色小图',collectionId:'sanrio-small'};
 const entries=[first,second,mega,other];
 assert.deepEqual(catalog.filterPatterns(entries,{series:'宝可梦',section:'图鉴',collection:'pokemon-gen1-pokedex'}).map(p=>p.id),['first']);
 assert.equal(catalog.filterPatterns(entries,{query:'第一代 151'}).length,1);
 const facets=catalog.catalogFacets(entries,{series:'宝可梦',section:'图鉴'});
 assert.deepEqual(facets.sections.map(p=>[p.value,p.count]),[['图鉴',2],['特殊形态',1]]);
 assert.deepEqual(facets.collections.map(p=>p.value),['pokemon-gen1-pokedex','pokemon-gen2-pokedex']);
 assert.equal(catalog.filterPatterns(entries,{series:'三丽鸥',collection:'pokemon-gen1-pokedex'}).length,0);
});

const editHistory=await import('../src/lib/edit-history.js').catch(()=>({}));
test('edit history redoes complete snapshots including palette, bounds undo, and drops redo after a new edit',()=>{
 assert.equal(typeof editHistory.pushEdit,'function');const a={grid:[[null,'H01']],chartBrand:'mard'},b={grid:[['H07','H01']],chartBrand:'coco'},c={grid:[['H07',null]],chartBrand:'coco'};
 let h=editHistory.pushEdit({past:[],future:[]},a,2),u=editHistory.moveEdit(h,b,'undo');assert.deepEqual(u.value,a);assert.equal(u.past.length,0);assert.equal(u.future.length,1);
 const r=editHistory.moveEdit(u,a,'redo');assert.deepEqual(r.value,b);assert.equal(r.future.length,0);assert.equal(editHistory.moveEdit(r,b,'redo').changed,false);
 h=editHistory.pushEdit(u,a,2);assert.deepEqual(h.future,[]);assert.equal(editHistory.moveEdit(h,c,'redo').changed,false);h=editHistory.pushEdit(editHistory.pushEdit(h,b,2),c,2);assert.equal(h.past.length,2);
});
