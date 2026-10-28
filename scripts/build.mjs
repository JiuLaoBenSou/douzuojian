import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {walk,sourceZip} from './source-zip.mjs';
import {buildCatalog} from './catalog-build.mjs';
import {prepareEntry} from './startup-html.mjs';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root);
const files=(await walk(new URL('src/',root))).filter(p=>p!=='patterns.js');
await mkdir(dist,{recursive:true});
for(const path of files){await mkdir(new URL(path.includes('/')?path.slice(0,path.lastIndexOf('/')+1):'./',dist),{recursive:true});await copyFile(new URL('src/'+path,root),new URL(path,dist));}
await writeFile(new URL('index.html',dist),await prepareEntry(root));
for(const path of ['LICENSE','THIRD-PARTY-NOTICES.md'])await copyFile(new URL(path,root),new URL(path,dist));
const catalog=await buildCatalog(root,dist,{localPreview:process.argv.includes('--local-catalog')});files.push(...catalog.files);
const archive=await sourceZip(root);await writeFile(new URL('source.zip',dist),archive.data);
await writeFile(new URL('manifest.json',dist),JSON.stringify([...files,'LICENSE','THIRD-PARTY-NOTICES.md','source.zip']));
console.log(`BUILD_OK ${files.length} app files -> ${fileURLToPath(dist)}`);
console.log(`SOURCE_ZIP ${archive.count} files ${archive.data.length} bytes`);
console.log(`CATALOG_BUILD entries=${catalog.index.entries.length} localPreview=${catalog.index.localPreview}`);
