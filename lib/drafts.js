// Device-only workbench drafts. Never use the catalog/review publication stores.
export function packDraft(state,params,palettes){
 const doc={schema:1,name:String(state.name||'我的图案').slice(0,100),width:state.grid[0]?.length,height:state.grid.length,chartBrand:state.chartBrand,selectedBrand:state.selectedBrand,boardColumns:state.boardColumns,boardRows:state.boardRows,chartCredit:structuredClone(state.chartCredit??null),chartDraft:!!state.chartDraft,gridLines:state.gridLines??true,codes:state.codes??true,origin:state.draftOrigin??null,available:[...state.available],availableByBrand:[...state.availableByBrand].map(([id,keys])=>[id,[...keys]]),params:structuredClone(params),paletteVersions:Object.fromEntries([...palettes].map(([id,p])=>[id,p.version])),cells:state.grid.flat().map(c=>c.isExternal?null:[c.key,c.color])};
 unpackDraft(doc,palettes);return doc;
}
export function unpackDraft(doc,palettes){
 if(doc?.schema!==1)throw Error('草稿版本不兼容，未恢复');
 const valid=n=>Number.isInteger(n)&&n>=1&&n<=128;
 if(!valid(doc.width)||!valid(doc.height)||!valid(doc.boardColumns)||!valid(doc.boardRows)||!Array.isArray(doc.cells)||doc.cells.length!==doc.width*doc.height)throw Error('草稿尺寸或数据不完整，未恢复');
 const palette=palettes.get(doc.chartBrand);if(!palette||!palettes.has(doc.selectedBrand)||doc.paletteVersions?.[doc.chartBrand]!==palette.version)throw Error('色板版本已变化，草稿未改动，请先导出备份');
 const colors=new Map(palette.colors.map(c=>[c.key,c.hex.toUpperCase()]));
 const flat=doc.cells.map(c=>{if(c===null)return {key:'ERASE',color:'#FFFFFF',isExternal:true};if(!Array.isArray(c)||c.length!==2||colors.get(c[0])!==String(c[1]).toUpperCase())throw Error('草稿有无法核对的色号，未恢复');return {key:c[0],color:c[1]};});
 if(!Array.isArray(doc.available)||!Array.isArray(doc.availableByBrand)||!doc.params||typeof doc.params!=='object')throw Error('草稿参数不完整，未恢复');
 for(const [id,keys] of [[doc.selectedBrand,doc.available],...doc.availableByBrand]){const p=palettes.get(id);if(!p||!Array.isArray(keys)||keys.some(k=>!p.colors.some(c=>c.key===k)))throw Error('草稿可用色板已变化，未恢复');}
 return {...structuredClone(doc),grid:Array.from({length:doc.height},(_,y)=>flat.slice(y*doc.width,(y+1)*doc.width))};
}
export function assertRevision(existing,expected){if((existing?.revision??0)!==expected)throw Error('这份草稿已在另一页面修改或清除。请另存为新草稿。');}
export function createDraftStore(name='douzuojian-workbench-drafts'){
 let opening;
 const open=()=>opening??=new Promise((resolve,reject)=>{if(!globalThis.indexedDB){reject(Error('浏览器不支持本机草稿'));return;}const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'id'});r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};r.onerror=()=>{opening=null;reject(r.error);};r.onblocked=()=>{opening=null;reject(Error('请关闭其他旧页面后重试草稿保存'));};});
 async function transact(mode,run){const db=await open();return new Promise((resolve,reject)=>{let result,error;const tx=db.transaction('drafts',mode),store=tx.objectStore('drafts');tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(error??tx.error);tx.onabort=()=>reject(error??tx.error??Error('草稿未保存'));try{run(store,v=>{result=v;},e=>{error=e;tx.abort();});}catch(e){error=e;tx.abort();}});}
 const get=id=>transact('readonly',(s,done)=>{const r=s.get(id);r.onsuccess=()=>done(r.result);});
 return {get,list:()=>transact('readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result.sort((a,b)=>b.updatedAt-a.updatedAt));}),
  save:(id,doc,expected=0)=>transact('readwrite',(s,done,fail)=>{const r=s.get(id);r.onsuccess=()=>{try{assertRevision(r.result,expected);const saved={...structuredClone(doc),id,revision:expected+1,updatedAt:Date.now()};s.put(saved);done(saved);}catch(e){fail(e);}};}),
  remove:(id,expected)=>transact('readwrite',(s,done,fail)=>{const r=s.get(id);r.onsuccess=()=>{try{assertRevision(r.result,expected);s.delete(id);done(true);}catch(e){fail(e);}};})};
}
