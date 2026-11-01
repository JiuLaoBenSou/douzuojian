import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {buildSeo} from '../scripts/seo-build.mjs';
import {patternLink} from '../src/lib/seo.js';
const entry={id:'flower',name:'春日小花',category:'几何',collectionId:'spring-flowers',collection:'春日小花合集',author:'豆作间',source:{label:'豆作间原创几何示例'},license:'AGPL-3.0',palette:'MARD',status:'ready',width:1,height:1,total:1,colorCount:1,unknownCount:0,data:'/catalog/charts/flower.json',thumbnail:'/catalog/thumbs/flower.png'};
test('local review cards retain working hash links while public ready cards use canonical page URLs',()=>{
 assert.equal(patternLink(entry,true),'/patterns/flower.html');assert.equal(patternLink(entry,false),'#library/flower');assert.equal(patternLink({...entry,status:'draft'},true),'#library/flower');
});
test('real URLs have server-rendered content, self canonicals and sitemap discovery, without false ratings or private drafts',async t=>{
 const dir=await mkdtemp(tmpdir()+'/dou-seo-');t.after(()=>rm(dir,{recursive:true,force:true}));const out=pathToFileURL(dir+'/');
 const result=await buildSeo(new URL('../',import.meta.url),out,{localPreview:false,entries:[entry]},async()=>({grid:[[{key:'H01',color:'#ffffff'}]],materials:[{key:'H01',color:'#ffffff',count:1}]}));
 const detail=await readFile(new URL('patterns/flower.html',out),'utf8');
 assert(detail.includes('https://douzuojian.com/patterns/flower.html'));assert(detail.includes('春日小花拼豆图纸'));assert(detail.includes('1 × 1 格'));assert(detail.includes('H01'));assert(!detail.includes('href="/__review/'));assert(detail.includes('豆作间原创几何示例'));
 assert.equal((detail.match(/rel="canonical"/g)||[]).length,1);assert(!detail.includes('aggregateRating'));assert(detail.includes('data-route="library/flower"'));
 const sitemap=await readFile(new URL('sitemap.xml',out),'utf8');assert(sitemap.includes('/patterns/flower.html'));assert(!sitemap.includes('#'));assert(!sitemap.includes('lastmod'));
 const robots=await readFile(new URL('robots.txt',out),'utf8');assert(robots.includes('Sitemap: https://douzuojian.com/sitemap.xml'));assert(!robots.includes('Disallow: /\n'));
 const listing=await readFile(new URL('patterns/index.html',out),'utf8');assert(listing.includes('href="/patterns/flower.html"'));assert(listing.includes('1 × 1 格'));assert(result.files.includes('guides/prep.html'));assert(result.files.includes('image-to-beads.html'));
 const home=await readFile(new URL('index.html',out),'utf8'),studio=await readFile(new URL('image-to-beads.html',out),'utf8'),collection=await readFile(new URL('collections/spring-flowers.html',out),'utf8');
 assert.match(home,/<h1>拼豆图纸与<br>图片转拼豆<\/h1>/);
 assert(home.includes('免费在线拼豆工具'));assert(home.includes('MARD 291 色'));assert(home.includes('href="/image-to-beads.html"'));
 assert.equal((home.match(/id="features-title"/g)||[]).length,1,'selling points appear once');
 assert.equal((listing.match(/id="catalog-intro"/g)||[]).length,1,'catalog introduction appears once');
 assert.equal((studio.match(/class="studio-benefits"/g)||[]).length,1,'workbench summary appears once');
 assert.match(studio,/<h1 id="studio-title">图片转拼豆图纸<\/h1>/);
 assert(studio.includes('图片怎么转成拼豆图纸？'));assert(studio.includes('用量 CSV'));assert(studio.includes('本机草稿'));assert(studio.includes('图片在当前浏览器内处理，不上传服务器'));
 assert.match(collection,/<h1 id="catalog-title">春日小花合集拼豆图纸<\/h1>/);
 assert(collection.includes('共 1 张'));assert(collection.includes('MARD 色号'));assert(collection.includes('href="/image-to-beads.html"'));
 const detailBody=detail.slice(detail.indexOf('<div id="pattern-detail">'),detail.indexOf('</section><section id="studio-view"'));
 assert(detailBody.includes('href="/collections/spring-flowers.html"'),'a chart links back to its real collection');
 assert(detailBody.includes('逐格色号与用豆清单'));
});
test('private local previews are noindex and publish no chart landing pages or sitemap entries',async t=>{
 const dir=await mkdtemp(tmpdir()+'/dou-seo-local-');t.after(()=>rm(dir,{recursive:true,force:true}));
 const out=pathToFileURL(dir+'/'),r=await buildSeo(new URL('../',import.meta.url),out,{localPreview:true,entries:[{...entry,status:'draft'}]},()=>{throw Error('Private draft decoded');});
 assert(!r.files.some(p=>p.startsWith('patterns/')));const html=await readFile(new URL('index.html',out),'utf8');assert(html.includes('noindex,nofollow'));assert(!r.files.includes('sitemap.xml'));
});
