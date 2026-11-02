// Immutable workbench edits; source images are immutable buffers retained by reference.
export function captureWorkbench(state,params,grid=state.grid){
 const result={};
 for(const key of ['chartBrand','selectedBrand','name','sourceName','image','imageLabel','chartCredit','chartDraft','draftOrigin','boardColumns','boardRows','gridLines','codes'])result[key]=state[key];
 return {...result,grid:grid.map(row=>row.map(c=>({...c}))),available:[...state.available],availableByBrand:[...state.availableByBrand].map(([id,keys])=>[id,[...keys]]),params:structuredClone(params)};
}
export function replaceChartColor(grid,key,target){
 if(!target||!/^#[0-9a-f]{6}$/i.test(target.hex??''))throw Error('请选择有效的目标色号');
 if(key===target.key)return {grid,changed:0};
 let changed=0;
 const next=grid.map(row=>row.map(c=>{if(c.isExternal||c.key!==key)return c;changed++;return {key:target.key,color:target.hex};}));
 return {grid:changed?next:grid,changed};
}
