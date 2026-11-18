import {escapeHtml as esc} from '../catalog.js';
import {browseCatalog,catalogLabels,folderCover} from './catalog-navigation.js';
import {featuredPatterns} from './featured.js';
import {patternLink} from './seo.js';

const folderTones = new Map([
 ['宝可梦','lemon'], ['三丽鸥','rose'], ['迪士尼','lavender'],
 ['鬼灭之刃','sky'], ['主题图案','mint'],
]);

export function renderFeaturedCards(entries, publicPages = true, contentVersion = '') {
 const version = contentVersion ? '?v='+encodeURIComponent(contentVersion) : '';
 return featuredPatterns(entries).map(chart => {
  const [series,section] = catalogLabels(chart);
  const theme = folderTones.get(series)||'sky';
  const name = esc(chart.name);
  const href = patternLink(chart,publicPages);
  const taxonomy = section&&section!==chart.collection ? series+' · '+section : series;
  return `<article class="featured-card">
   <a class="collection-cover featured-cover category-${theme}" href="${href}" aria-label="查看${name}详情"><img class="category-preview" src="${esc(chart.thumbnail+version)}" alt="" width="160" height="160" loading="lazy" decoding="async"></a>
   <div class="featured-info">
    <p class="featured-taxonomy">${esc(taxonomy)}</p>
    <h3><a href="${href}">${name}</a></h3>
    <p class="featured-specs">${chart.width} × ${chart.height} 格 · ${chart.colorCount} 色 · ${chart.total} 颗</p>
    <div class="featured-actions"><a class="button yellow" href="${href}" data-pattern="${chart.id}" aria-label="开始拼${name}">开始拼</a><a class="text-link" href="${href}">查看详情</a></div>
   </div>
  </article>`;
 }).join('');
}

export function renderFolderCards(state, path, contentVersion = '') {
 const version = contentVersion ? '?v='+encodeURIComponent(contentVersion) : '';
 return state.groups.map(group => {
  const cover = folderCover(state.entries,path,group.value);
  const children = browseCatalog(state.entries,[...path,group.value]).groups;
  const summary = children.slice(0,3).map(child=>child.label).join(' · ')+(children.length>3?' 等':'');
  const tone = folderTones.get(path[0]||group.value)||'sky';
  const img = cover
   ? `<img class="category-preview" src="${esc(cover.thumbnail+version)}" alt="" width="160" height="160" decoding="async" loading="${path.length?'lazy':'eager'}">`
   : '';
  return `<button type="button" class="collection-door" data-folder="${esc(group.value)}"><span class="collection-cover category-${tone}" aria-hidden="true">${img}</span><span class="collection-door-info"><strong>${esc(group.label)}</strong><span class="folder-count">${group.count} 张图纸</span>${summary?`<small>${esc(summary)}</small>`:''}</span><span class="door-arrow" aria-hidden="true">›</span></button>`;
 }).join('');
}
