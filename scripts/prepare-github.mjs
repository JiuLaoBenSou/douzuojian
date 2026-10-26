// Codex, 2026-10-26. Publish only the static release to GitHub Pages.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SITE_URL} from '../src/site.js';
import {walk} from './source-zip.mjs';
const root=new URL('../',import.meta.url),target=new URL('releases/github-pages/',root);
const version=JSON.parse(await readFile(new URL('package.json',root),'utf8')).version;
const release=new URL('releases/'+version+'/',root);
const manifest=JSON.parse(await readFile(new URL('releases/'+version+'-manifest.json',root),'utf8'));
// _headers is Cloudflare Pages-specific and has no effect on GitHub Pages.
const publicFiles=manifest.filter(entry=>entry.path!=='_headers');
await mkdir(target,{recursive:true});
const expected=new Set([...publicFiles.map(entry=>entry.path),'.nojekyll','CNAME']);
const existing=await walk(target);
for(const path of existing)if(!path.startsWith('.git/')&&!expected.has(path))throw new Error('Unexpected existing publish file: '+path);
for(const entry of publicFiles){
 if(!/^[a-zA-Z0-9_./-]+$/.test(entry.path)||entry.path.includes('..'))throw new Error('Unsafe public path');
 const bytes=await readFile(new URL(entry.path,release));
 if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error('Release hash mismatch: '+entry.path);
 await mkdir(new URL(entry.path.includes('/')?entry.path.slice(0,entry.path.lastIndexOf('/')+1):'./',target),{recursive:true});
 await writeFile(new URL(entry.path,target),bytes);
}
await writeFile(new URL('.nojekyll',target),'');
await writeFile(new URL('CNAME',target),new URL(SITE_URL).hostname+'\n');
console.log('GITHUB_PAGES_READY '+fileURLToPath(target)+' files='+expected.size+' CNAME='+new URL(SITE_URL).hostname);
