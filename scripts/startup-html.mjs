// Inline the small stylesheet and expose the module graph without serial network discovery.
import {readFile} from 'node:fs/promises';
export async function prepareEntry(root){
 const src=new URL('src/',root),seen=new Set(),queue=['app.js','ads.js'];
 for(let n=0;n<queue.length;n++){
  const path=queue[n];if(seen.has(path))continue;seen.add(path);
  const code=await readFile(new URL(path,src),'utf8');
  for(const match of code.matchAll(/\bimport\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g)){
   const url=new URL(match[1],new URL(path,src));if(!url.href.startsWith(src.href))throw Error('Startup module outside src');
   const child=decodeURIComponent(url.href.slice(src.href.length));if(!seen.has(child))queue.push(child);
  }
 }
 const html=await readFile(new URL('index.html',src),'utf8'),css=await readFile(new URL('styles.css',src),'utf8');
 if(css.includes('</style'))throw Error('Unsafe inline stylesheet');
 const hints=[...seen].filter(p=>p!=='app.js'&&p!=='ads.js').map(p=>`<link rel="modulepreload" href="/${p}">`).join('');
 return html.replace('<link rel="stylesheet" href="/styles.css">','<style data-startup-css>'+css+'</style>'+hints);
}
