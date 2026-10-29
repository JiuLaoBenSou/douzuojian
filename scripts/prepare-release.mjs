// Whitelisted public release only. Codex, 2026-10-26. AGPL-3.0.
import {mkdir,readFile,writeFile,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SITE_URL} from '../src/site.js';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root),version=JSON.parse(await readFile(new URL('package.json',root),'utf8')).version;
const allowed=JSON.parse(await readFile(new URL('manifest.json',dist),'utf8'));
if(JSON.parse(await readFile(new URL('catalog/index.json',dist),'utf8')).localPreview)throw new Error('本地草稿构建仅供预览；请先运行默认 npm run build，再准备发布。');
const release=new URL('releases/'+version+'/',root);
await mkdir(release,{recursive:true});
for(const path of allowed){
 if(!/^[a-zA-Z0-9_./-]+$/.test(path)||path.includes('..'))throw new Error('Unsafe public path');
 await mkdir(new URL(path.includes('/')?path.slice(0,path.lastIndexOf('/')+1):'./',release),{recursive:true});
 await copyFile(new URL(path,dist),new URL(path,release));
}
await writeFile(new URL('_headers',release),`/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; connect-src 'self'; img-src 'self' blob: data:; worker-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  Cache-Control: no-cache
/LICENSE
  Content-Type: text/plain; charset=utf-8
/THIRD-PARTY-NOTICES.md
  Content-Type: text/plain; charset=utf-8
/source.zip
  Content-Type: application/zip
  Content-Disposition: attachment; filename="douzuojian-source.zip"
`);
if(!allowed.includes('robots.txt'))await writeFile(new URL('robots.txt',release),'User-agent: *\nAllow: /\nSitemap: '+SITE_URL+'sitemap.xml\n');
if(!allowed.includes('sitemap.xml'))await writeFile(new URL('sitemap.xml',release),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+SITE_URL+'</loc></url></urlset>');
await writeFile(new URL('404.html',release),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>找不到页面｜豆作间</title><meta name="robots" content="noindex,follow"><link rel="stylesheet" href="/styles.css"><main class="page-shell"><h1>找不到这个页面</h1><p><a href="/">返回豆作间</a></p></main></html>');
const files=[...new Set([...allowed,'_headers','robots.txt','sitemap.xml','404.html'])];
const fingerprints=[];
for(const path of files){const bytes=await readFile(new URL(path,release));if((await stat(new URL(path,release))).size>25*1024*1024)throw new Error('Asset too large');fingerprints.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(new URL('releases/'+version+'-manifest.json',root),JSON.stringify(fingerprints,null,2));
console.log('RELEASE_READY '+fileURLToPath(release)+' files='+files.length);
