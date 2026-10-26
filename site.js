// Public site identity. Original integration by Codex, 2026-10-26. AGPL-3.0.
export const SITE_URL='https://douzuojian.com/';
export const EXPORT_GUIDANCE='更多拼豆图纸： '+SITE_URL;
export function creditLabel(credit){
 if(!credit)return '';
 return credit.author==='豆作间'?`${credit.source||'豆作间'} · ${credit.license}`:`作者：${credit.author} · 来源：${credit.source} · ${credit.license}`;
}
