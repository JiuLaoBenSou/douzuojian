// One content version for the app module graph; changed child modules invalidate the entry and its preloads.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {walk} from './source-zip.mjs';
export async function moduleVersion(root){const h=createHash('sha256');for(const path of (await walk(new URL('src/',root))).filter(p=>p.endsWith('.js'))){h.update(path);h.update(await readFile(new URL('src/'+path,root)));}return h.digest('hex').slice(0,16);}
export function versionModule(code,version){return code.replace(/((?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\bnew\s+URL\(\s*)['"])(\.{1,2}\/[^'"?]+\.js)(['"])/g,(_,before,path,after)=>before+path+'?v='+version+after);}
export function versionHtml(html,version){return html.replace(/((?:src|href)=")((?:\/)[^"?]+\.js)(")/g,(_,before,path,after)=>before+path+'?v='+version+after);}
