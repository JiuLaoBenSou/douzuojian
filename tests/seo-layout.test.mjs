import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';import {buildSeo} from '../scripts/seo-build.mjs';
test('static catalog keeps collection links out of the heading and preserves local SVG symbol references',async t=>{
 const dir=await mkdtemp(tmpdir()+'/dou-seo-layout-');t.after(()=>rm(dir,{recursive:true,force:true}));const out=pathToFileURL(dir+'/');
 const entries=Array.from({length:3},(_,i)=>({id:'layout-'+i,name:'测试',category:'图案',series:'系列',section:'类型',collectionId:'collection-'+i,collection:'合集'+i,author:'作者',source:{label:'原图'},license:'待核',palette:'MARD',status:'ready',width:1,height:1,total:1,colorCount:1,unknownCount:0,data:'/catalog/charts/layout-'+i+'.json',thumbnail:'/catalog/thumbs/layout-'+i+'.png'}));
 await buildSeo(new URL('../',import.meta.url),out,{localPreview:false,entries},async()=>({grid:[[{key:'H01',color:'#ffffff'}]],materials:[{key:'H01',color:'#ffffff',count:1}]}));
 const html=await readFile(new URL('patterns/index.html',out),'utf8'),heading=html.slice(html.indexOf('<h1 id="catalog-title"'),html.indexOf('<section id="library"'));
 assert(!heading.includes('aria-label="图纸合集"'),'collection index must not squeeze the heading or return link');
 assert.match(html,/<details class="catalog-directory"><summary>/);
 assert(!html.includes('<details class="catalog-directory" open'));
 for(const p of entries)assert(html.includes('href="/collections/'+p.collectionId+'.html"'));
 assert(html.includes('<use href="#i-grid"'));
 assert(!/<use\b[^>]*href="\/#/.test(html),'SVG use must remain local to the current document');
 assert(html.includes('href="#main"'),'skip link should target this page');
 assert(html.includes('href="/#patterns"'));
});


test('category path follows search, and public catalog excludes retired geometric examples',async t=>{
 const root=new URL('../',import.meta.url),html=await readFile(new URL('src/index.html',root),'utf8');
 assert(html.indexOf('id="catalog-folder-path"')>html.indexOf('id="pattern-search"'));
 assert(html.indexOf('id="catalog-folder-path"')<html.indexOf('id="catalog-public-note"'),'category path belongs directly under search, above the notice');
 const dir=await mkdtemp(tmpdir()+'/dou-catalog-no-samples-');t.after(()=>rm(dir,{recursive:true,force:true}));
 const fixture=pathToFileURL(dir+'/');await mkdir(new URL('src/data/',fixture),{recursive:true});
 await writeFile(new URL('src/data/upstream-color-mapping.json',fixture),await readFile(new URL('src/data/upstream-color-mapping.json',root)));
 const {buildCatalog}=await import('../scripts/catalog-build.mjs');
 for(const localPreview of [false,true]){
  if(localPreview){await mkdir(new URL('.local-catalog/',fixture),{recursive:true});await writeFile(new URL('.local-catalog/index.json',fixture),JSON.stringify({schema:1,localPreview:true,entries:[]}));}
  const result=await buildCatalog(fixture,new URL(localPreview?'local/':'public/',fixture),{localPreview});
  assert.deepEqual(result.index.entries,[],'do not re-inject four demo charts into public or local catalogs');
  assert(!result.files.some(p=>/catalog\/(charts|thumbs)\/(bow|cloud|rainbow|flower)\./.test(p)));
 }
});
