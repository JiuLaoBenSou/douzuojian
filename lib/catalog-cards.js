import {escapeHtml as esc} from '../catalog.js?v=357b387ecd51994c';
import {browseCatalog,folderCover} from './catalog-navigation.js?v=357b387ecd51994c';

const folderTones = new Map([
 ['宝可梦','lemon'], ['三丽鸥','rose'], ['迪士尼','lavender'],
 ['鬼灭之刃','sky'], ['主题图案','mint'],
]);

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
