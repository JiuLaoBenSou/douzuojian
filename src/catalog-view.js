// Library UI with image cards and single-chart loading. Codex, 2026-10-27. AGPL-3.0.
import {filterPatterns,classifyCatalogEntry,escapeHtml as esc} from './catalog.js';
import {validateCatalogIndex,createPatternStore,catalogPage} from './lib/catalog-store.js';
import {chartSvg} from './lib/render.js';
import {codeInk} from './lib/chart.js';
import {patternLink} from './lib/seo.js';
import {featuredPatterns} from './lib/featured.js';
import {browseCatalog,catalogLabels,catalogPath} from './lib/catalog-navigation.js';
import {renderFolderCards} from './lib/catalog-cards.js';
const $=s=>document.querySelector(s);
const taxonomyFields=['catalog-series','catalog-section','catalog-collection'];
const taxonomyLabels=['全部系列与主题','全部角色与分组','全部合集'];
export function createLibraryView({getPalette,getRevision,onOpen,notify}){
 let entries=[],store=null,page=1,detailSerial=0,openSerial=0,view='',detailId='',phase='loading',contentVersion='',publicUpdates=false,checking=false,reviewIds=new Set();
 let directCollection=document.body.dataset.collection||'',publicPages=false;
 let folderPath=[],showAll=false,pendingFolder='';
 const folderGrid=$('#catalog-folders');
 function navigate(path){
  folderPath=path;
  directCollection='';
  showAll=false;
  page=1;
  list();
 }
 function displayPath(labels){
  const crumb=$('#catalog-folder-path');
  const steps=['全部图纸',...labels];
  crumb.innerHTML=steps.map((label,i)=>i===steps.length-1
   ? '<span aria-current="page">'+esc(label)+'</span>'
   : '<button type="button" class="folder-crumb" data-depth="'+i+'">'+esc(label)+'</button>').join('<span class="folder-divider" aria-hidden="true">/</span>');
  crumb.querySelectorAll('[data-depth]').forEach(b=>b.addEventListener('click',()=>{
   navigate(folderPath.slice(0,Number(b.dataset.depth)));
   $('#library-title').focus({preventScroll:true});
  }));
 }
 function folders(state,browsing){
  folderGrid.hidden=!browsing;
  $('#pattern-list').hidden=browsing;
  $('#catalog-pagination').hidden=browsing;
  const html=browsing?renderFolderCards(state,folderPath,contentVersion):'';
  if(folderGrid.innerHTML!==html)folderGrid.innerHTML=html;
 }
 folderGrid.addEventListener('click',event=>{
  const button=event.target.closest('button[data-folder]');
  if(!button)return;
  const key=button.dataset.folder;
  if(phase!=='ready'){pendingFolder=key;return;}
  navigate([...folderPath,key]);
  $('#library-title').focus({preventScroll:true});
 });
 const fetchJson=async path=>{const suffix=path==='/catalog/index.json'?'t='+Math.floor(Date.now()/30000):contentVersion?'v='+encodeURIComponent(contentVersion):'',response=await fetch(path+(suffix?'?'+suffix:''),{cache:'no-store'});if(!response.ok)throw new Error('图纸文件暂时无法读取');return response.json();};
 const reviewLink=p=>reviewIds.has(p.id)?'<a class="small-button review-chart-link" href="/__review/?id='+encodeURIComponent(p.id)+'&amp;all=1" aria-label="校对'+esc(p.name)+'">校对这张图</a>':'';
 function card(p){
  const labels=catalogLabels(p);
  const badges=labels.slice(0,p.collection?-1:undefined).map(label=>'<span>'+esc(label)+'</span>').join('');
  return '<article class="pattern-card"><a class="pattern-preview" href="'+patternLink(p,publicPages)+'" aria-label="查看'+esc(p.name)+'详情"><img class="thumbnail" src="'+p.thumbnail+(contentVersion?'?v='+contentVersion:'')+'" alt="'+esc(p.name)+'拼豆图案" width="160" height="160" loading="lazy" decoding="async"></a><div class="pattern-info"><div class="pattern-badges">'+badges+(p.status==='draft'?'<span class="draft-badge">'+(p.unknownCount?'待确认 '+p.unknownCount+' 格':'本地草稿')+'</span>':'')+'</div><h3>'+esc(p.name)+'</h3><p class="pattern-stats"><span>'+p.width+' × '+p.height+' 格</span><span>'+(p.unknownCount?(p.colorCount-1)+' 色＋待确认':p.colorCount+' 色')+'</span><span>'+p.total+' 颗</span></p>'+(p.collection?'<p class="pattern-tags">'+esc(p.collection)+'</p>':'')+'<div class="pattern-actions"><a class="small-button" href="'+patternLink(p,publicPages)+'">查看详情</a>'+(p.unknownCount?'<span class="pending-chart">色号待确认</span>':'<button class="button yellow" data-pattern="'+p.id+'" aria-label="使用'+esc(p.name)+'">开始拼</button>')+reviewLink(p)+'</div></div></article>';
 }
 function bind(root){root.querySelectorAll('[data-pattern]').forEach(button=>button.addEventListener('click',()=>open(button.dataset.pattern)));}
 function refinements(){
  const labels=[];
  taxonomyFields.forEach((id,i)=>{
   const groups=folderPath.length>=i?browseCatalog(entries,folderPath.slice(0,i)).groups:[];
   const selected=groups.find(group=>group.value===folderPath[i]);
   const el=$('#'+id);
   el.innerHTML='<option value="">'+taxonomyLabels[i]+'</option>'+groups.map(group=>'<option value="'+esc(group.value)+'">'+esc(group.label)+'（'+group.count+'）</option>').join('');
   el.value=selected?.value||'';
   el.disabled=!groups.length;
   if(selected)labels.push(selected.label);
  });
  return labels;
 }
 function list(){
  if(phase!=='ready')return;
  const labels=refinements();
  const state=browseCatalog(entries,folderPath);
  const directRows=directCollection?entries.filter(entry=>entry.collectionId===directCollection):null;
  if(directRows?.length)labels.push(directRows[0].collection);
  displayPath(labels);
  const options={query:$('#pattern-search').value,size:$('#catalog-size').value,colors:$('#catalog-colors').value,sort:$('#catalog-sort').value};
  const filtering=Boolean(options.query.trim())||options.size!=='all'||options.colors!=='all'||options.sort!=='default';
  const canBrowse=!directRows&&!state.leaf&&!filtering;
  const browsing=canBrowse&&!showAll;
  $('#library-title').textContent=labels.at(-1)||(browsing?'按分类找图':'全部图纸');
  const browseToggle=$('#catalog-show-all');
  browseToggle.hidden=!canBrowse;
  browseToggle.textContent=browsing?(folderPath.length?'查看本分类图纸':'查看全部图纸'):'返回分类浏览';
  folders(state,browsing);
  if(browsing){
   $('#catalog-results').textContent=state.groups.length+' 个分类 · '+state.entries.length+' 张图纸';
   return;
  }
  const rows=directRows||state.entries;
  const found=filterPatterns(rows,options),result=catalogPage(found,page,entries.length>24?24:6);page=result.page;
  $('#catalog-results').textContent=filtering?'找到 '+found.length+' 张图纸 · 当前范围 '+rows.length+' 张':found.length+' 张图纸';
  $('#pattern-list').innerHTML=found.length?result.items.map(card).join(''):'<div class="catalog-empty"><p>没有找到图纸，换个关键词试试。</p><button class="small-button" data-reset-catalog>清空筛选</button></div>';bind($('#pattern-list'));$('#pattern-list').querySelector('[data-reset-catalog]')?.addEventListener('click',reset);
  $('#catalog-pagination').innerHTML=found.length?'<button class="small-button" id="catalog-prev" '+(page===1?'disabled':'')+'>上一页</button><span>第 '+page+' / '+result.pageCount+' 页</span><button class="small-button" id="catalog-next" '+(page===result.pageCount?'disabled':'')+'>下一页</button>':'';
  for(const [id,delta]of [['catalog-prev',-1],['catalog-next',1]])$('#'+id)?.addEventListener('click',()=>{page+=delta;list();$('#library-title').scrollIntoView({block:'start'});});
 }
 function reset(){
  $('#pattern-search').value='';
  for(const id of ['catalog-size','catalog-colors'])$('#'+id).value='all';
  $('#catalog-sort').value='default';
  showAll=false;
  page=1;
  list();
 }
 async function detail(id){
  const request=++detailSerial;if(phase!=='ready'&&document.body.dataset.route==='library/'+id&&$('#pattern-detail [data-seo-static]'))return;if(phase!=='ready'){$('#pattern-detail').innerHTML=phase==='error'?'<div class="catalog-empty"><p>图纸目录没有加载成功。</p><button class="small-button" id="retry-detail-index">重新读取目录</button></div>':'<p class="loading-copy">图纸目录正在加载…</p>';$('#retry-detail-index')?.addEventListener('click',()=>init());return;}
  const meta=entries.find(p=>p.id===id);if(!meta){$('#pattern-detail').innerHTML='<div class="pixel-frame catalog-empty"><p>找不到这张图纸。</p><a href="#library">返回图纸库</a></div>';return;}
  if(!$('#pattern-detail [data-seo-static]'))$('#pattern-detail').innerHTML='<p class="loading-copy" role="status">正在读取'+esc(meta.name)+'…</p>';
  try{
   const p=await store.load(id);if(request!==detailSerial||view!=='pattern-detail'||detailId!==id)return;
   const sourceUrl=/^https?:\/\//.test(p.source.url??'')?p.source.url:null;
   const collection=p.collectionId&&publicPages&&/^[a-z0-9-]+$/.test(p.collectionId)?'<a href="/collections/'+p.collectionId+'.html">'+esc(p.collection)+'</a>':esc(p.collection||'');
   $('#pattern-detail').innerHTML='<article class="pixel-frame catalog-detail"><div class="catalog-detail-preview">'+chartSvg(p.grid)+(p.unknownCount?'<p class="draft-notice">洋红色 ? 格：'+p.unknownCount+' 格色号待确认。</p>':'')+'</div><div class="catalog-detail-info"><h2>'+esc(p.name)+'</h2>'+(p.status==='draft'?'<p class="draft-notice">本地草稿，尚未逐格核对。'+(p.unknownCount?'色号确认后才能开始拼。':'可先打开查看和试用。')+'</p>':'')+'<p>'+esc(p.note??'')+'</p><dl class="catalog-facts"><dt>尺寸 / 用量</dt><dd>'+p.width+' × '+p.height+' 格 / '+(p.unknownCount?(p.colorCount-1)+' 色＋待确认':p.colorCount+' 色')+' / '+p.total+' 颗'+(p.unknownCount?'（含待确认格）':'')+'</dd><dt>所属合集</dt><dd>'+catalogLabels(meta).slice(0,meta.collection?-1:undefined).map(esc).join(' / ')+(collection?' / '+collection:'')+'</dd><dt>图纸作者</dt><dd>'+esc(p.author)+'</dd><dt>来源</dt><dd>'+(sourceUrl?'<a href="'+esc(sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(p.source.label)+'</a>':esc(p.source.label))+'</dd><dt>使用范围</dt><dd>'+esc(p.license)+'</dd><dt>色板</dt><dd>MARD · '+(p.paletteSource==='source-folder-labelled'?'原资料标注 MARD':p.status==='draft'?'按原图标签整理，品牌待核对':'参考色板')+'</dd></dl>'+(p.unknownCount?'<p class="pending-chart">'+p.unknownCount+' 格待确认，暂不能开始拼。</p>':'<button class="button blue" data-pattern="'+p.id+'">使用这张图纸</button>')+(reviewIds.has(p.id)?'<p>'+reviewLink(p)+'</p>':'')+'<div class="chart-legend">'+p.materials.map(c=>'<span class="legend-color"><i style="background:'+c.color+';color:'+codeInk(c.color)+'">'+esc(c.key)+'</i><small>'+c.count+' 颗</small></span>').join('')+'</div></div></article>';bind($('#pattern-detail'));
  }catch{if(request!==detailSerial||view!=='pattern-detail')return;$('#pattern-detail').innerHTML='<div class="catalog-empty"><p>图纸暂时没有加载成功。</p><button class="small-button" id="retry-detail">重新读取</button></div>';$('#retry-detail').addEventListener('click',()=>detail(id));}
 }
 async function open(id){
  if(!store)return;const request=++openSerial,origin=location.hash,revision=getRevision();
  try{const p=await store.load(id);if(request!==openSerial||origin!==location.hash||revision!==getRevision())return;if(p.unknownCount){notify('这张图纸仍有色号待确认，请先查看详情。');return;}onOpen(p);}catch{if(request===openSerial&&origin===location.hash&&revision===getRevision())notify('图纸没有加载成功，请再试一次。');}
 }
 async function init(provided){
  phase='loading';
  try{
   const index=validateCatalogIndex(provided??await fetchJson('/catalog/index.json'));publicPages=!index.localPreview;contentVersion=index.contentVersion??'';publicUpdates=!index.localPreview&&Boolean(contentVersion);$('#catalog-public-note').hidden=!index.publicTranscribed;entries=index.entries.map(classifyCatalogEntry);store=createPatternStore({entries,palette:getPalette(),fetchJson,allowDraft:index.localPreview});phase='ready';
   if(directCollection){
    const rows=entries.filter(entry=>entry.collectionId===directCollection);
    const path=rows.length?catalogPath(rows[0]):[];
    if(path.every(Boolean)&&rows.length&&rows.every(entry=>catalogPath(entry).every((key,i)=>key===path[i]))){
     folderPath=path;
     directCollection='';
    }
   }
   reviewIds=new Set();if(index.localPreview&&['127.0.0.1','localhost','[::1]'].includes(location.hostname)){try{const r=await fetch('/__review/api/index',{cache:'no-store'});if(r.ok){const review=await r.json();if(Array.isArray(review.entries))reviewIds=new Set(review.entries.map(p=>p.id));}}catch{}}
   $('#catalog-review-entry').hidden=!reviewIds.size;
   $('#catalog-local-note').hidden=!index.localPreview;$('#catalog-local-note').textContent=index.localPreview?'本地预览：含 '+entries.filter(p=>p.status==='draft').length+' 张数据化草稿，色号与来源仍待核对。':'';
   if(pendingFolder&&browseCatalog(entries,folderPath).groups.some(group=>group.value===pendingFolder))folderPath=[...folderPath,pendingFolder];
   pendingFolder='';
   list();$('#featured-patterns').innerHTML=featuredPatterns(entries).map(card).join('');bind($('#featured-patterns'));if(view==='pattern-detail')detail(detailId);
  }catch{phase='error';$('#pattern-list').hidden=false;$('#pattern-list').innerHTML='<div class="catalog-empty"><p>图纸目录没有加载成功。</p><button class="small-button" id="retry-catalog">重新读取目录</button></div>';$('#retry-catalog').addEventListener('click',()=>init());if(view==='pattern-detail')detail(detailId);notify('图纸目录暂时无法读取，其他编辑功能仍可使用。');}
 }
 async function checkUpdates(){if(checking||!publicUpdates||document.hidden||!['library','pattern-detail'].includes(view))return;checking=true;try{const next=validateCatalogIndex(await fetchJson('/catalog/index.json'));if(next.contentVersion&&next.contentVersion!==contentVersion)await init(next);}catch{}finally{checking=false;}}
 setInterval(checkUpdates,30000);document.addEventListener('visibilitychange',checkUpdates);
 $('#pattern-search').addEventListener('input',()=>{page=1;list();});
 for(const id of ['catalog-size','catalog-colors','catalog-sort'])$('#'+id).addEventListener('change',()=>{page=1;list();});
 taxonomyFields.forEach((id,i)=>$('#'+id).addEventListener('change',event=>{
  const prefix=folderPath.slice(0,i);
  navigate(event.target.value?[...prefix,event.target.value]:prefix);
 }));
 $('#catalog-reset').addEventListener('click',reset);
 $('#catalog-show-all').addEventListener('click',()=>{showAll=!showAll;page=1;list();});
 return {init,route(next,id){view=next;detailId=id??'';detailSerial++;if(next==='library'){list();checkUpdates();}else if(next==='pattern-detail'){detail(id);checkUpdates();}}};
}
