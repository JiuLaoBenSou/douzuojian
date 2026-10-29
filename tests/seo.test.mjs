import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {buildSeo} from '../scripts/seo-build.mjs';
import {patternLink} from '../src/lib/seo.js';
const entry={id:'flower',name:'春日小花',category:'几何',author:'豆作间',source:{label:'豆作间原创几何示例'},license:'AGPL-3.0',palette:'MARD',status:'ready',width:1,height:1,total:1,colorCount:1,unknownCount:0,data:'/catalog/charts/flower.json',thumbnail:'/catalog/thumbs/flower.png'};
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
});
test('private local previews are noindex and publish no chart landing pages or sitemap entries',async t=>{
 const dir=await mkdtemp(tmpdir()+'/dou-seo-local-');t.after(()=>rm(dir,{recursive:true,force:true}));
 const out=pathToFileURL(dir+'/'),r=await buildSeo(new URL('../',import.meta.url),out,{localPreview:true,entries:[{...entry,status:'draft'}]},()=>{throw Error('Private draft decoded');});
 assert(!r.files.some(p=>p.startsWith('patterns/')));const html=await readFile(new URL('index.html',out),'utf8');assert(html.includes('noindex,nofollow'));assert(!r.files.includes('sitemap.xml'));
});
