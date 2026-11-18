const depth = 3;
const loose = '__loose__';
const looseLabel = '未归入合集';
const themeSections = {
 '其他角色': '角色与场景',
 '其他主题': '角色与场景',
 '生活小物': '甜点与小物',
 '节日主题': '节日贺年',
};
const sanrioCharacters = [
 ['凯蒂猫', /凯蒂猫|\bkitty\b/i],
 ['美乐蒂', /美乐蒂|\bmell?ody\b/i],
 ['库洛米', /库洛米|\bkuromi\b/i],
 ['人鱼汉顿', /人鱼汉顿|\bhangyodon\b/i],
 ['小羊', /小羊|\bmy sweet piano\b/i],
];
const groupOrder = {
 root: ['宝可梦', '三丽鸥', '迪士尼', '鬼灭之刃', '主题图案'],
 三丽鸥: [...sanrioCharacters.map(([name]) => name), '多角色组合', '其他三丽鸥图案'],
 主题图案: ['角色与场景', '甜点与小物', '节日贺年', '字样与相框'],
};

export function catalogPath(entry) {
 const series = entry.series || entry.category || '其他';
 const section = entry.section || '';
 const collection = entry.collectionId || (entry.collection ? loose : '');

 if (series === '三丽鸥·凯蒂猫') return ['三丽鸥', '凯蒂猫', collection];
 if (series === '三丽鸥') {
  const roles = sanrioCharacters.filter(([, pattern]) => pattern.test(section + ' ' + (entry.name || '')));
  const subgroup = section === '三丽鸥组合' || roles.length > 1
   ? '多角色组合' : roles[0]?.[0] || '其他三丽鸥图案';
  return [series, subgroup, collection];
 }
 if (Object.hasOwn(themeSections, series)) {
  return ['主题图案', section === '文字牌' ? '字样与相框' : themeSections[series], collection];
 }
 return [series, section, collection];
}

export function catalogLabels(entry) {
 const [series, section] = catalogPath(entry);
 return [series, section, entry.collection].filter(Boolean);
}

export function browseCatalog(entries, path = []) {
 const matches = entries.map(entry => ({entry, keys: catalogPath(entry)}))
  .filter(({keys}) => path.every((key, i) => (keys[i] || loose) === key));
 const rows = matches.map(({entry}) => entry);
 const level = path.length;
 if (level >= depth || !matches.some(({keys}) => keys[level])) {
  return {leaf: true, entries: rows, groups: [], level};
 }

 const groups = new Map();
 for (const {entry, keys} of matches) {
  const key = keys[level] || loose;
  const label = key === loose ? (level === 1 ? '未分组图纸' : looseLabel)
   : level === 2 ? entry.collection || key : key;
  if (!groups.has(key)) groups.set(key, {value: key, label, count: 0});
  groups.get(key).count++;
 }
 const order = level === 0 ? groupOrder.root : level === 1 && Object.hasOwn(groupOrder, path[0]) ? groupOrder[path[0]] : [];
 const rank = key => order.includes(key) ? order.indexOf(key) : key === loose ? order.length + 1 : order.length;
 return {leaf: false, entries: rows, groups: [...groups.values()].sort((a, b) => rank(a.value) - rank(b.value)), level};
}

const covers = {
 宝可梦: 'pokemon-kanto-025',
 三丽鸥: 'hello-kitty-flower-hat',
 迪士尼: 'a882-4cd78f4c2356',
 鬼灭之刃: 'demon-slayer-074c987c2135',
 主题图案: 'sanrio-xgdj-dcf38e6192dc-dessert-1',
 凯蒂猫: 'hello-kitty-flower-hat',
 美乐蒂: 'a488-dc4af558ac8a',
 小羊: 'sanrio-xgdj-59f05cc9ba0f',
 其他三丽鸥图案: 'a488-9cd53ca2d061',
 角色与场景: 'a488-b4d15216962d',
 甜点与小物: 'sanrio-xgdj-dcf38e6192dc-dessert-1',
 图鉴: 'pokemon-kanto-025',
 主题小图: 'pokemon-ball-quick-ball',
 公主邮票: 'a882-4cd78f4c2356',
 'pokemon-gen1-pokedex': 'pokemon-kanto-025',
 'pokemon-johto-100': 'pokemon-johto-152',
 'pokemon-hoenn-135': 'pokemon-hoenn-252',
 'pokemon-sinnoh-107': 'pokemon-sinnoh-387',
};

export function folderCover(entries, path, value) {
 const rows = browseCatalog(entries, [...path, value]).entries.filter(entry => entry.thumbnail);
 if (!rows.length) return;
 const preferred = covers[value] || covers[path.at(-1)];
 return rows.find(entry => entry.id === preferred) || rows[0];
}
