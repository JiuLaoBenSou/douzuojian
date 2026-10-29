import test from 'node:test';
import assert from 'node:assert/strict';
import {browseCatalog} from '../src/lib/catalog-navigation.js';
const entries=[
 {id:'a',series:'宝可梦',section:'图鉴',collectionId:'gen1',collection:'第一代'},
 {id:'b',series:'宝可梦',section:'图鉴',collectionId:'gen1',collection:'第一代'},
 {id:'c',series:'宝可梦',section:'图鉴',collectionId:'gen2',collection:'第二代'},
 {id:'d',series:'原创几何',category:'几何'},
 {id:'e',category:'其他'}
];
test('library starts with series folders and drills into actual collections before charts',()=>{
 const root=browseCatalog(entries,[]);assert.equal(root.leaf,false);
 assert.deepEqual(root.groups.map(g=>[g.label,g.count]),[['宝可梦',3],['原创几何',1],['其他',1]]);
 const series=browseCatalog(entries,['宝可梦']);assert.deepEqual(series.groups.map(g=>g.label),['图鉴']);
 const albums=browseCatalog(entries,['宝可梦','图鉴']);assert.deepEqual(albums.groups.map(g=>g.value),['gen1','gen2']);
 const leaf=browseCatalog(entries,['宝可梦','图鉴','gen2']);assert.equal(leaf.leaf,true);assert.deepEqual(leaf.entries.map(p=>p.id),['c']);
});
test('series without artificial subcategories opens its charts, and unknown paths never expose unrelated charts',()=>{
 assert.equal(browseCatalog(entries,['原创几何']).leaf,true);
 assert.deepEqual(browseCatalog(entries,['不存在']).entries,[]);
 assert.deepEqual(browseCatalog(entries,['其他']).entries.map(p=>p.id),['e']);
 assert.equal(entries.length,5);
});
