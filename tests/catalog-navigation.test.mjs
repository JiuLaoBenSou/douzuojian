import test from 'node:test';
import assert from 'node:assert/strict';
import * as navigation from '../src/lib/catalog-navigation.js';
const {browseCatalog}=navigation;
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

const mixed=[
 {id:'hello-kitty-flower-hat',series:'三丽鸥',section:'Hello Kitty',collectionId:'charms',collection:'凯蒂猫小图',thumbnail:'/kitty.png'},
 {id:'kitty-card',name:'KITTY 卡片',series:'三丽鸥·凯蒂猫',section:'文字牌',collectionId:'cards',collection:'凯蒂猫卡片',thumbnail:'/cards.png'},
 {id:'melody',series:'三丽鸥',section:'美乐蒂',collectionId:'cards',collection:'凯蒂猫卡片',thumbnail:'/melody.png'},
 {id:'duo',series:'其他主题',section:'双人造型'},
 {id:'unknown-cat',name:'戴帽白猫',series:'其他角色',section:'人物与小兽',thumbnail:'/cat.png'},
 {id:'dessert',series:'生活小物',section:'甜点',thumbnail:'/cake.png'},
 {id:'festival',series:'节日主题',section:'福字贺年',thumbnail:'/festival.png'}
];

test('series aliases and thematic imports share one browse path with matching counts',()=>{
 const root=browseCatalog(mixed);
 assert.deepEqual(root.groups.map(g=>[g.label,g.count]),[['三丽鸥',3],['主题图案',4]]);
 const sanrio=browseCatalog(mixed,['三丽鸥']);
 assert.deepEqual(sanrio.groups.map(g=>[g.label,g.count]),[['凯蒂猫',2],['美乐蒂',1]]);
 assert.deepEqual(browseCatalog(mixed,['三丽鸥','凯蒂猫','cards']).entries.map(p=>p.id),['kitty-card']);
 assert.deepEqual(browseCatalog(mixed,['主题图案']).groups.map(g=>[g.label,g.count]),[['角色与场景',2],['甜点与小物',1],['节日贺年',1]]);
 assert.deepEqual(navigation.catalogLabels(mixed[1]),['三丽鸥','凯蒂猫','凯蒂猫卡片']);
 assert.deepEqual(navigation.catalogLabels(mixed[4]),['主题图案','角色与场景']);
});

test('folder cards choose a single thumbnail within their own scope',()=>{
 assert.equal(navigation.folderCover(mixed,[],'三丽鸥')?.id,'hello-kitty-flower-hat');
 assert.equal(navigation.folderCover(mixed,['三丽鸥','凯蒂猫'],'cards')?.id,'kitty-card');
 assert.equal(navigation.folderCover(mixed,['三丽鸥'],'不存在'),undefined);
});
