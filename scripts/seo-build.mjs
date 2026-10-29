// Real, server-readable HTML generated from the same catalog used by the editor. AGPL-3.0.
import {mkdir,writeFile} from 'node:fs/promises';
import {prepareEntry} from './startup-html.mjs';
import {guides} from '../src/guides.js';
import {escapeHtml as esc} from '../src/catalog.js';
import {patternPage} from '../src/lib/seo.js';
import {chartSvg} from '../src/lib/render.js';
import {codeInk} from '../src/lib/chart.js';
const SITE='https://douzuojian.com';
const json=v=>JSON.stringify(v).replaceAll('<','\\u003c');
function metadata(html,{path='/',title,description,image='/assets/craft-island.webp',type='website',schema}){
 const url=SITE+path;
 return html.replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(title)}</title>`)
 .replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description)}">`)
 .replace(/<link rel="canonical" href="[^"]*">/,`<link rel="canonical" href="${url}">`)
 .replace('</head>',`<meta name="robots" content="index,follow"><meta property="og:locale" content="zh_CN"><meta property="og:site_name" content="豆作间"><meta property="og:type" content="${type}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE+image}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${SITE+image}"><script type="application/ld+json">${json({'@context':'https://schema.org','@type':path==='/'?'WebSite':'WebPage',name:title,url,description,inLanguage:'zh-CN',...schema})}</script></head>`);
}
function view(html,route,collection=''){
 const selected=route.startsWith('library/')?'pattern-detail':route==='library'?'library':route.startsWith('guides')?'guides':route==='studio'?'studio':'patterns';
 return html.replace('<body>',`<body data-route="${esc(route)}"${collection?` data-collection="${esc(collection)}"`:''}>`)
 .replace(/<section\b[^>]*\bdata-view="([^"]+)"[^>]*>/g,(tag,name)=>{const clean=tag.replace(/\s+hidden\b/g,'');return name===selected?clean:clean.slice(0,-1)+' hidden>';});
}
function card(p){return `<article class="pattern-card"><a class="pattern-preview" href="${patternPage(p.id)}"><img src="${p.thumbnail}" alt="${esc(p.name)}拼豆图案" width="160" height="160" loading="lazy" decoding="async"></a><div class="pattern-info"><h3><a href="${patternPage(p.id)}">${esc(p.name)}拼豆图纸</a></h3><p>${p.width} × ${p.height} 格 · ${p.colorCount} 色 · ${p.total} 颗</p><p>${esc(p.collection||p.category)}</p><a class="small-button" href="${patternPage(p.id)}">查看图纸</a></div></article>`;}
export async function buildSeo(root,out,index,load){
 const files=[],urls=[],base=await prepareEntry(root);
 async function save(path,html){await mkdir(new URL(path.includes('/')?path.slice(0,path.lastIndexOf('/')+1):'./',out),{recursive:true});await writeFile(new URL(path,out),html);files.push(path);}
 if(index.localPreview){await save('index.html',base.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>'));await save('robots.txt','User-agent: *\nDisallow: /\n');return {files,urls};}
 const entries=index.entries.filter(p=>p.status==='ready'&&!p.unknownCount);
 const shared=base.replace('href="/__review/?all=1"','href="/#library"').replace(/href="#studio"/g,'href="/image-to-beads.html"').replace(/href="#guides"/g,'href="/guides/prep.html"').replace(/href="#library"/g,'href="/patterns/index.html"').replace(/href="#guides\/(prep|brands|problems)"/g,'href="/guides/$1.html"').replace(/href="#([^\"]*)"/g,'href="/#$1"').replace('<a href="/#about">关于豆作间</a>','<a href="/#about">关于豆作间</a> · <a href="/image-to-beads.html">图片转拼豆</a> · <a href="/guides/prep.html">拼豆入门</a>');
 async function page(path,html,meta){const link=path==='index.html'?'/':'/'+path;await save(path,metadata(html,{...meta,path:link}));urls.push(SITE+link);}
 const home=shared.replace(/(<div[^>]*id="featured-patterns"[^>]*>)[\s\S]*?<\/div>/,(_,tag)=>tag+entries.slice(0,3).map(card).join('')+'</div>');
 await page('index.html',home,{title:'豆作间｜拼豆图纸、图片转拼豆与色号用量',description:'挑选拼豆图纸，上传图片生成拼豆图案，查看 MARD 色号和用豆量，编辑并导出图纸。附拼豆入门与烫豆参考。',schema:{name:'豆作间',alternateName:'豆作间拼豆'}});
 async function listing(path,title,rows,collection=''){
  let html=view(shared,'library',collection).replace(/(<div[^>]*id="pattern-list"[^>]*>)[\s\S]*?<\/div>/,(_,tag)=>tag+rows.map(card).join('')+'</div>');
  html=html.replace('<h2 id="library-title">全部图纸</h2>',`<h2 id="library-title">${esc(title)}</h2>`).replace('<h1 id="catalog-title">图纸库</h1>',`<h1 id="catalog-title">${esc(title)}</h1><nav aria-label="图纸合集">${[...new Map(entries.filter(p=>p.collectionId&&/^[a-z0-9-]+$/.test(p.collectionId)).map(p=>[p.collectionId,p.collection])).entries()].map(([id,label])=>`<a class="text-link" href="/collections/${id}.html">${esc(label)}</a>`).join(' · ')}</nav>`);
  await page(path,html,{title:title+'｜豆作间',description:`浏览${title}，共 ${rows.length} 张。查看每张图纸的尺寸、MARD 色号、用豆量和来源，打开工坊编辑并导出。`});
 }
 await listing('patterns/index.html','拼豆图纸库',entries);
 const collections=[...new Map(entries.filter(p=>p.collectionId&&/^[a-z0-9-]+$/.test(p.collectionId)).map(p=>[p.collectionId,p.collection])).entries()];
 for(const [id,label]of collections)await listing('collections/'+id+'.html',label,entries.filter(p=>p.collectionId===id),id);
 for(const p of entries){
  const decoded=await load(p),path=patternPage(p.id).slice(1);
  const body=`<nav aria-label="面包屑"><a href="/">豆作间</a> / <a href="/patterns/index.html">图纸库</a> / ${esc(p.name)}</nav><article class="pixel-frame catalog-detail" data-seo-static><div class="catalog-detail-preview">${chartSvg(decoded.grid)}</div><div class="catalog-detail-info"><h2>${esc(p.name)}拼豆图纸</h2><p>${esc(p.note||'查看图纸尺寸、色号和用豆量，打开工坊编辑并导出。')}</p><dl class="catalog-facts"><dt>尺寸 / 用量</dt><dd>${p.width} × ${p.height} 格 / ${p.colorCount} 色 / ${p.total} 颗</dd><dt>所属合集</dt><dd>${esc([p.category,p.series,p.section,p.collection].filter(Boolean).join(' / '))}</dd><dt>作者</dt><dd>${esc(p.author)}</dd><dt>来源</dt><dd>${/^https?:\/\//.test(p.source.url||'')?`<a href="${esc(p.source.url)}" rel="noopener">${esc(p.source.label)}</a>`:esc(p.source.label)}</dd><dt>使用范围</dt><dd>${esc(p.license)}</dd><dt>色板</dt><dd>MARD 参考色板，屏幕颜色请对照实物色卡。</dd></dl>${p.id.startsWith('pokemon-')?'<p class="reference-note">图纸经 AI 辅助转译，可能存在色号或用量误差，请核对原图与实物色卡。</p>':''}<a class="button blue" href="/#library/${p.id}">打开编辑器</a><div class="chart-legend">${decoded.materials.map(c=>`<span class="legend-color"><i style="background:${c.color};color:${codeInk(c.color)}">${esc(c.key)}</i><small>${c.count} 颗</small></span>`).join('')}</div></div></article>`;
  let html=view(shared,'library/'+p.id).replace('<div id="pattern-detail"></div>',`<div id="pattern-detail">${body}</div>`).replace('<h1 id="detail-title">图纸详情</h1>',`<h1 id="detail-title">${esc(p.name)}拼豆图纸</h1>`);
  await page(path,html,{title:`${p.name}拼豆图纸｜${p.width}×${p.height}格·${p.colorCount}色｜豆作间`,description:`${p.name}拼豆图纸，${p.width}×${p.height}格，${p.colorCount}种颜色，共${p.total}颗。查看 MARD 色号与用量，${p.collection||p.category}，可在工坊编辑、镜像并导出。`,image:p.thumbnail});
 }
 for(const [key,g]of Object.entries(guides)){
  const html=view(shared,'guides/'+key).replace(/(<article\b[^>]*id="guide-content"[^>]*>)[\s\S]*?<\/article>/,(_,tag)=>tag+`<h2>${esc(g.title)}</h2>`+g.body+'</article>');
  await page('guides/'+key+'.html',html,{title:g.title+'｜拼豆烫豆手册·豆作间',description:key==='prep'?'拼豆入门需要哪些材料？了解豆子、豆板、镊子、熨烫纸与熨斗的准备方法，以及拼豆和试烫步骤。':key==='brands'?'了解不同品牌和规格的拼豆熨烫参考、试烫注意事项与厂家说明来源。':'拼豆翘边、粘纸、连接不牢怎么办？查看常见问题和处理参考，以材料包装说明为准。'});
 }
 await page('image-to-beads.html',view(shared,'studio'),{title:'图片转拼豆图纸｜色号、用量与图纸导出·豆作间',description:'上传图片，在浏览器内生成拼豆图纸，调整网格尺寸、选择品牌色板、修改色号、镜像图案，导出图纸 PNG 和用量 CSV。图片不会上传。'});
 for(const path of ['about.html','contact.html','privacy.html','how-to.html'])urls.push(SITE+'/'+path);
 await save('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(url=>'<url><loc>'+esc(url)+'</loc></url>').join('')+'</urlset>\n');
 await save('robots.txt','User-agent: *\nAllow: /\nDisallow: /__review/\nDisallow: /.local-review/\nDisallow: /.local-catalog/\nSitemap: '+SITE+'/sitemap.xml\n');
 return {files,urls};
}
