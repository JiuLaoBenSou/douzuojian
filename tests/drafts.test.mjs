import test from 'node:test';import assert from 'node:assert/strict';
const d=await import('../src/lib/drafts.js').catch(()=>({}));
const palette={id:'mard',version:'v1',colors:[{key:'H01',hex:'#FFFFFF'},{key:'H07',hex:'#000000'}]},palettes=new Map([['mard',palette]]);
const state={grid:[[{key:'H01',color:'#FFFFFF'},{key:'ERASE',color:'#FFFFFF',isExternal:true}],[{key:'H07',color:'#000000'},{key:'H01',color:'#FFFFFF'}]],name:'测试',chartBrand:'mard',selectedBrand:'mard',available:new Set(['H01','H07']),availableByBrand:new Map(),boardColumns:29,boardRows:29,chartCredit:{source:'保留来源'},chartDraft:false};
test('draft round trip keeps white beads distinct from holes, exact colors, brands and settings',()=>{
 assert.equal(typeof d.packDraft,'function');const doc=d.packDraft(state,{majorEvery:'5','keep-aspect':true},palettes);const restored=d.unpackDraft(doc,palettes);
 assert.deepEqual(restored.grid,state.grid);assert.deepEqual(restored.params,{'majorEvery':'5','keep-aspect':true});assert.equal(restored.boardColumns,29);assert.deepEqual(restored.chartCredit,state.chartCredit);assert.deepEqual(doc.cells,[['H01','#FFFFFF'],null,['H07','#000000'],['H01','#FFFFFF']]);assert(!JSON.stringify(doc).includes('image'));
 state.grid[0][0]={key:'H07',color:'#000000'};assert.equal(doc.cells[0][0],'H01');state.grid[0][0]={key:'H01',color:'#FFFFFF'};
});
test('invalid, newer schema and changed palette snapshots never silently re-quantize',()=>{
 assert.equal(typeof d.packDraft,'function');const doc=d.packDraft(state,{},palettes);
 for(const bad of [{...doc,schema:2},{...doc,cells:[]},{...doc,cells:[['BAD','#FFFFFF'],...doc.cells.slice(1)]},{...doc,paletteVersions:{mard:'v2'}}])assert.throws(()=>d.unpackDraft(bad,palettes));
});
test('revision compare protects independent drafts, concurrent writes and deleted drafts',()=>{
 assert.equal(typeof d.assertRevision,'function');assert.doesNotThrow(()=>d.assertRevision(undefined,0));assert.doesNotThrow(()=>d.assertRevision({revision:2},2));assert.throws(()=>d.assertRevision({revision:2},1),/另一/);assert.throws(()=>d.assertRevision(undefined,2),/另一/);
});
