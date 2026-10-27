// Library UI with image cards and single-chart loading. Codex, 2026-10-27. AGPL-3.0.
import {filterPatterns,classifyCatalogEntry,catalogFacets,escapeHtml as esc} from './catalog.js';
import {validateCatalogIndex,createPatternStore,catalogPage} from './lib/catalog-store.js';
import {chartSvg} from './lib/render.js';
import {codeInk} from './lib/chart.js';
const $=s=>document.querySelector(s);
export function createLibraryView({getPalette,getRevision,onOpen,notify}){
 let entries=[],store=null,page=1,detailSerial=0,openSerial=0,view='',detailId='',phase='loading',category='全部',contentVersion='',publicUpdates=false,checking=false;
 const fetchJson=async path=>{const suffix=path==='/catalog/index.json'?'t='+Math.floor(Date.now()/30000):contentVersion?'v='+encodeURIComponent(contentVersion):'',response=await fetch(path+(suffix?'?'+suffix:''),{cache:'no-store'});if(!response.ok)throw new Error('图纸文件暂时无法读取');return response.json();};
 function card(p){return '<article class="pattern-card"><a class="pattern-preview" href="#library/'+p.id+'" aria-label="查看'+esc(p.name)+'详情"><img class="thumbnail" src="'+p.thumbnail+(contentVersion?'?v='+contentVersion:'')+'" alt="'+esc(p.name)+'拼豆图案" width="160" height="160" loading="lazy" decoding="async"></a><div class="pattern-info"><div class="pattern-badges">'+(p.series?'<span>'+esc(p.series)+'</span>':'')+(p.section?'<span>'+esc(p.section)+'</span>':'')+(p.status==='draft'?'<span class="draft-badge">'+(p.unknownCount?'待确认 '+p.unknownCount+' 格':'本地草稿')+'</span>':'')+'</div><h3>'+esc(p.name)+'</h3><p class="pattern-stats"><span>'+p.width+' × '+p.height+' 格</span><span>'+(p.unknownCount?(p.colorCount-1)+' 色＋待确认':p.colorCount+' 色')+'</span><span>'+p.total+' 颗</span></p><p class="pattern-tags">'+esc(p.collection||p.section||p.category)+'</p><div class="pattern-actions"><a class="small-button" href="#library/'+p.id+'">查看详情</a>'+(p.unknownCount?'<span class="pending-chart">色号待确认</span>':'<button class="button yellow" data-pattern="'+p.id+'" aria-label="使用'+esc(p.name)+'">开始拼</button>')+'</div></div></article>';}
 function bind(root){root.querySelectorAll('[data-pattern]').forEach(button=>button.addEventListener('click',()=>open(button.dataset.pattern)));}
 function categories(){const all=['全部',...new Set(entries.map(p=>p.category))];$('#catalog-categories').innerHTML=all.map(c=>'<button class="filter '+(category===c?'active':'')+'" data-filter="'+esc(c)+'" aria-pressed="'+(category===c)+'">'+esc(c)+' <small>'+entries.filter(p=>c==='全部'||p.category===c).length+'</small></button>').join('');$('#catalog-categories').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.filter;page=1;categories();refinements();list();}));}
 function refinements(){
  function options(id,items,label){const el=$('#'+id),previous=el.value;el.innerHTML='<option value="all">'+label+'</option>'+items.map(p=>'<option value="'+esc(p.value)+'">'+esc(p.label)+'（'+p.count+'）</option>').join('');el.value=items.some(p=>p.value===previous)?previous:'all';el.disabled=!items.length;}
  options('catalog-series',catalogFacets(entries,{category}).series,'全部系列');
  options('catalog-section',catalogFacets(entries,{category,series:$('#catalog-series').value}).sections,'全部类型');
  options('catalog-collection',catalogFacets(entries,{category,series:$('#catalog-series').value,section:$('#catalog-section').value}).collections,'全部合集');
 }
 function list(){
  if(phase!=='ready')return;
  const found=filterPatterns(entries,{query:$('#pattern-search').value,category,series:$('#catalog-series').value,section:$('#catalog-section').value,collection:$('#catalog-collection').value,size:$('#catalog-size').value,colors:$('#catalog-colors').value,sort:$('#catalog-sort').value}),result=catalogPage(found,page,entries.length>24?24:6);page=result.page;
  const selectedCollection=entries.find(p=>p.collectionId===$('#catalog-collection').value);$('#library-title').textContent=selectedCollection?.collection??'全部图纸';$('#catalog-breadcrumb').textContent=[category==='全部'?'':category,$('#catalog-series').value==='all'?'':$('#catalog-series').value,$('#catalog-section').value==='all'?'':$('#catalog-section').value,selectedCollection?.collection??''].filter(Boolean).join(' / ');
  $('#catalog-results').textContent='找到 '+found.length+' 张图纸 · 共 '+entries.length+' 张';
  $('#pattern-list').innerHTML=found.length?result.items.map(card).join(''):'<div class="catalog-empty"><p>没有找到图纸，换个关键词试试。</p><button class="small-button" data-reset-catalog>清空筛选</button></div>';bind($('#pattern-list'));$('#pattern-list').querySelector('[data-reset-catalog]')?.addEventListener('click',reset);
  $('#catalog-pagination').innerHTML=found.length?'<button class="small-button" id="catalog-prev" '+(page===1?'disabled':'')+'>上一页</button><span>第 '+page+' / '+result.pageCount+' 页</span><button class="small-button" id="catalog-next" '+(page===result.pageCount?'disabled':'')+'>下一页</button>':'';
  for(const [id,delta]of [['catalog-prev',-1],['catalog-next',1]])$('#'+id)?.addEventListener('click',()=>{page+=delta;list();$('#library-title').scrollIntoView({block:'start'});});
 }
 function reset(){category='全部';page=1;$('#pattern-search').value='';for(const id of ['catalog-series','catalog-section','catalog-collection','catalog-size','catalog-colors'])$('#'+id).value='all';$('#catalog-sort').value='default';categories();refinements();list();}
 async function detail(id){
  const request=++detailSerial;if(phase!=='ready'){$('#pattern-detail').innerHTML=phase==='error'?'<div class="catalog-empty"><p>图纸目录没有加载成功。</p><button class="small-button" id="retry-detail-index">重新读取目录</button></div>':'<p class="loading-copy">图纸目录正在加载…</p>';$('#retry-detail-index')?.addEventListener('click',init);return;}
  const meta=entries.find(p=>p.id===id);if(!meta){$('#pattern-detail').innerHTML='<div class="pixel-frame catalog-empty"><p>找不到这张图纸。</p><a href="#library">返回图纸库</a></div>';return;}
  $('#pattern-detail').innerHTML='<p class="loading-copy" role="status">正在读取'+esc(meta.name)+'…</p>';
  try{
   const p=await store.load(id);if(request!==detailSerial||view!=='pattern-detail'||detailId!==id)return;
   const sourceUrl=/^https?:\/\//.test(p.source.url??'')?p.source.url:null;
   $('#pattern-detail').innerHTML='<article class="pixel-frame catalog-detail"><div class="catalog-detail-preview">'+chartSvg(p.grid)+(p.unknownCount?'<p class="draft-notice">洋红色 ? 格：'+p.unknownCount+' 格色号待确认。</p>':'')+'</div><div class="catalog-detail-info"><h2>'+esc(p.name)+'</h2>'+(p.status==='draft'?'<p class="draft-notice">本地草稿，尚未逐格核对。'+(p.unknownCount?'色号确认后才能开始拼。':'可先打开查看和试用。')+'</p>':'')+'<p>'+esc(p.note??'')+'</p><dl class="catalog-facts"><dt>尺寸 / 用量</dt><dd>'+p.width+' × '+p.height+' 格 / '+(p.unknownCount?(p.colorCount-1)+' 色＋待确认':p.colorCount+' 色')+' / '+p.total+' 颗'+(p.unknownCount?'（含待确认格）':'')+'</dd><dt>所属合集</dt><dd>'+[p.category,p.series,p.section,p.collection].filter(Boolean).map(esc).join(' / ')+'</dd><dt>图纸作者</dt><dd>'+esc(p.author)+'</dd><dt>来源</dt><dd>'+(sourceUrl?'<a href="'+esc(sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(p.source.label)+'</a>':esc(p.source.label))+'</dd><dt>使用范围</dt><dd>'+esc(p.license)+'</dd><dt>色板</dt><dd>MARD · '+(p.paletteSource==='source-folder-labelled'?'原资料标注 MARD':p.status==='draft'?'按原图标签整理，品牌待核对':'参考色板')+'</dd></dl>'+(p.unknownCount?'<p class="pending-chart">'+p.unknownCount+' 格待确认，暂不能开始拼。</p>':'<button class="button blue" data-pattern="'+p.id+'">使用这张图纸</button>')+(p.status==='draft'?'<p><a class="small-button" href="/__review/?id='+p.id+'">对照原图 / 补色号</a></p>':'')+'<div class="chart-legend">'+p.materials.map(c=>'<span class="legend-color"><i style="background:'+c.color+';color:'+codeInk(c.color)+'">'+esc(c.key)+'</i><small>'+c.count+' 颗</small></span>').join('')+'</div></div></article>';bind($('#pattern-detail'));
  }catch{if(request!==detailSerial||view!=='pattern-detail')return;$('#pattern-detail').innerHTML='<div class="catalog-empty"><p>图纸暂时没有加载成功。</p><button class="small-button" id="retry-detail">重新读取</button></div>';$('#retry-detail').addEventListener('click',()=>detail(id));}
 }
 async function open(id){
  if(!store)return;const request=++openSerial,origin=location.hash,revision=getRevision();
  try{const p=await store.load(id);if(request!==openSerial||origin!==location.hash||revision!==getRevision())return;if(p.unknownCount){notify('这张图纸仍有色号待确认，请先查看详情。');return;}onOpen(p);}catch{if(request===openSerial&&origin===location.hash&&revision===getRevision())notify('图纸没有加载成功，请再试一次。');}
 }
 async function init(provided){
  phase='loading';
  try{
   const index=validateCatalogIndex(provided??await fetchJson('/catalog/index.json'));contentVersion=index.contentVersion??'';publicUpdates=!index.localPreview&&Boolean(contentVersion);$('#catalog-public-note').hidden=!index.publicTranscribed;entries=index.entries.map(classifyCatalogEntry);store=createPatternStore({entries,palette:getPalette(),fetchJson,allowDraft:index.localPreview});phase='ready';
   $('#catalog-local-note').hidden=!index.localPreview;$('#catalog-local-note').textContent=index.localPreview?'本地预览：含 '+entries.filter(p=>p.status==='draft').length+' 张数据化草稿，色号与来源仍待核对。':'';
   refinements();
   categories();list();$('#featured-patterns').innerHTML=entries.filter(p=>p.status==='ready').slice(0,3).map(card).join('');bind($('#featured-patterns'));if(view==='pattern-detail')detail(detailId);
  }catch{phase='error';$('#pattern-list').innerHTML='<div class="catalog-empty"><p>图纸目录没有加载成功。</p><button class="small-button" id="retry-catalog">重新读取</button></div>';$('#retry-catalog').addEventListener('click',init);if(view==='pattern-detail')detail(detailId);notify('图纸目录暂时无法读取，其他编辑功能仍可使用。');}
 }
 async function checkUpdates(){if(checking||!publicUpdates||document.hidden||!['library','pattern-detail'].includes(view))return;checking=true;try{const next=validateCatalogIndex(await fetchJson('/catalog/index.json'));if(next.contentVersion&&next.contentVersion!==contentVersion)await init(next);}catch{}finally{checking=false;}}
 setInterval(checkUpdates,30000);document.addEventListener('visibilitychange',checkUpdates);
 $('#pattern-search').addEventListener('input',()=>{page=1;list();});for(const id of ['catalog-size','catalog-colors','catalog-sort'])$('#'+id).addEventListener('change',()=>{page=1;list();});for(const id of ['catalog-series','catalog-section','catalog-collection'])$('#'+id).addEventListener('change',()=>{page=1;if(id==='catalog-series'){$('#catalog-section').value='all';$('#catalog-collection').value='all';}if(id==='catalog-section')$('#catalog-collection').value='all';if(id==='catalog-collection'){const p=entries.find(p=>p.collectionId===$('#catalog-collection').value);if(p){$('#catalog-series').value=p.series;$('#catalog-section').value=p.section;}}refinements();list();});$('#catalog-reset').addEventListener('click',reset);
 return {init,route(next,id){view=next;detailId=id??'';detailSerial++;if(next==='library'){list();checkUpdates();}else if(next==='pattern-detail'){detail(id);checkUpdates();}}};
}
