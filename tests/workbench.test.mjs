import test from 'node:test';
import assert from 'node:assert/strict';
import {pushEdit,moveEdit} from '../src/lib/edit-history.js';
import {summarize} from '../src/lib/engine.js';
const edit=await import('../src/lib/workbench-edit.js').catch(()=>({}));
const red={key:'F01',color:'#FF0000'},white={key:'H01',color:'#FFFFFF'},empty={key:'ERASE',color:'#FFFFFF',isExternal:true};
test('full-color replacement preserves white beads, holes and original grid, and merges material counts',()=>{
 assert.equal(typeof edit.replaceChartColor,'function');
 const before=[[red,empty,white],[red,white,empty]],r=edit.replaceChartColor(before,'F01',{key:'H01',hex:'#FFFFFF'});
 assert.equal(r.changed,2);assert.equal(summarize(r.grid).total,4);assert.deepEqual(summarize(r.grid).colors.map(c=>[c.key,c.count]),[['H01',4]]);
 assert.deepEqual(before,[[red,empty,white],[red,white,empty]]);assert.deepEqual(r.grid.flat().map(c=>!!c.isExternal),before.flat().map(c=>!!c.isExternal));
 assert.equal(edit.replaceChartColor(before,'F01',{key:'F01',hex:'#FF0000'}).grid,before);
 assert.equal(edit.replaceChartColor(before,'C01',{key:'H01',hex:'#FFFFFF'}).changed,0);
});
test('regeneration undo/redo restores grid, brand, input image and applied parameters without aliasing sets',()=>{
 assert.equal(typeof edit.captureWorkbench,'function');
 const state={grid:[[red,empty,white]],chartBrand:'mard',selectedBrand:'mard',name:'old',image:{width:3,height:1},boardColumns:52,boardRows:52,available:new Set(['F01','H01']),availableByBrand:new Map([['mard',new Set(['F01'])]])};
 const params={'grid-width':'3','grid-height':'1','board-preset':'mini-52'};
 const old=edit.captureWorkbench(state,params);
 state.available.delete('H01');state.availableByBrand.get('mard').clear();params['grid-width']='29';
 assert.deepEqual(old.available,['F01','H01']);assert.deepEqual(old.availableByBrand,[['mard',['F01']]]);assert.equal(old.params['grid-width'],'3');
 const next=edit.captureWorkbench({...state,grid:[[white]],chartBrand:'coco',selectedBrand:'coco',name:'new',boardColumns:29},params);
 const saved=pushEdit({past:[],future:[]},old,20),undo=moveEdit(saved,next,'undo',20),redo=moveEdit(undo,undo.value,'redo',20);
 assert.deepEqual(undo.value,old);assert.equal(undo.value.image,state.image);assert.deepEqual(redo.value,next);
 const recolored=edit.replaceChartColor(old.grid,'F01',{key:'H01',hex:'#FFFFFF'});
 const changed=pushEdit(undo,{...old,grid:recolored.grid},20);assert.equal(changed.future.length,0);
});
