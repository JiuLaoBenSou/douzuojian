import {readFile,readdir} from 'node:fs/promises';
import {deflateRawSync} from 'node:zlib';
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(data){let c=0xffffffff;for(const byte of data)c=table[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export async function walk(root,base=''){const files=[];for(const entry of await readdir(new URL(base,root),{withFileTypes:true})){const path=base+entry.name;if(entry.isDirectory())files.push(...await walk(root,path+'/'));else files.push(path);}return files.sort();}
export async function sourceZip(root){
 const paths=[...(await walk(new URL('src/',root))).map(p=>'src/'+p),...['build','catalog-build','catalog-image','serve','dev','prepare-upstream','source-zip','startup-html','seo-build','verify','prepare-release','prepare-github'].map(p=>'scripts/'+p+'.mjs'),'tests/engine.test.mjs','package.json','.node-version','LICENSE','THIRD-PARTY-NOTICES.md','README-SOURCE.md','docs/UPSTREAM-CHANGES.md','docs/CATALOG.md','docs/DEPLOYMENT.md','docs/PALETTES.md',...['src/utils/pixelation.ts','src/utils/pixelEditingUtils.ts','src/app/colorSystemMapping.json','LICENSE','README.md'].map(p=>'upstream/Zippland-perler-beads/'+p)];
 paths.push('scripts/local-review.mjs','scripts/prepare-local-catalog.mjs','tests/local-review.test.mjs',...(await walk(new URL('scripts/review-ui/',root))).map(p=>'scripts/review-ui/'+p));
 paths.push('scripts/catalog-publication.mjs','scripts/catalog-sync-service.mjs','scripts/sync-catalog.mjs','tests/publication.test.mjs','tests/ads.test.mjs','tests/startup.test.mjs','tests/seo.test.mjs','tests/catalog-navigation.test.mjs','docs/ADS.md');
 try{paths.push(...(await walk(new URL('catalog-content/',root))).map(p=>'catalog-content/'+p));}catch(e){if(e.code!=='ENOENT')throw e;}
 const local=[],central=[];let offset=0;
 for(const path of paths){const name=Buffer.from('douzuojian/'+path);const data=await readFile(new URL(path,root));const compressed=deflateRawSync(data);const crc=crc32(data);const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);head.writeUInt16LE(8,8);head.writeUInt16LE(0x5d59,12);head.writeUInt32LE(crc,14);head.writeUInt32LE(compressed.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(name.length,26);local.push(head,name,compressed);
 const dir=Buffer.alloc(46);dir.writeUInt32LE(0x02014b50);dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);dir.writeUInt16LE(0x800,8);dir.writeUInt16LE(8,10);dir.writeUInt16LE(0x5d59,14);dir.writeUInt32LE(crc,16);dir.writeUInt32LE(compressed.length,20);dir.writeUInt32LE(data.length,24);dir.writeUInt16LE(name.length,28);dir.writeUInt32LE(offset,42);central.push(dir,name);offset+=head.length+name.length+compressed.length;
 }
 const directory=Buffer.concat(central);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(paths.length,8);end.writeUInt16LE(paths.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return {data:Buffer.concat([...local,directory,end]),count:paths.length};
}
