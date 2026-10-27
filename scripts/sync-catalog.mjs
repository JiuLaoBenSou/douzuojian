// Saved local chart -> deterministic source snapshot -> GitHub main -> GitHub Pages. No local review runtime is deployed.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,mkdtemp,readFile,writeFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {preparePublicCatalog,digest} from './catalog-publication.mjs';
import {walk} from './source-zip.mjs';
const exec=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url)),repo='JiuLaoBenSou/douzuojian',remote='https://github.com/'+repo+'.git',site='https://douzuojian.com/';
const event=value=>console.log('SYNC_EVENT '+JSON.stringify(value));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function command(program,args,cwd,{optional=false}={}){try{return {ok:true,...await exec(program,args,{cwd,windowsHide:true,maxBuffer:4*1024*1024,timeout:180000})};}catch(e){await mkdir(resolve(root,'.local-review'),{recursive:true});await appendFile(resolve(root,'.local-review/sync-command.log'),[program,args.join(' '),e.stderr??e.message,'\n'].join('\n'));if(optional)return {ok:false,stdout:e.stdout??'',stderr:e.stderr??''};throw new Error(program+' command failed; details saved locally');}}
const git=(args,cwd,opts)=>command('git',args,cwd,opts);
async function identity(dir){for(const [key,fallback]of [['user.name','Codex'],['user.email','codex@local.invalid']]){const old=await git(['config',key],root,{optional:true});await git(['config',key,old.stdout.trim()||fallback],dir);}}
async function liveVersion(){try{const r=await fetch(site+'catalog/content-version.json?t='+Date.now(),{signal:AbortSignal.timeout(20000),cache:'no-store'});return r.ok?(await r.json()).version:null;}catch{return null;}}
// Cloudflare JSD appends this exact script at the edge. All other bytes must match.
const cfTemplate="<script>(function(){function c(){var b=a.contentDocument||(a.contentWindow&&a.contentWindow.document);if(b){var d=b.createElement('script');d.innerHTML=\"window.__CF$cv$params={r:__R__,t:__T__};var a=document.createElement('script');a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);\";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script>";
export function liveFileMatch(path,expected,received){
 if(digest(expected)===digest(received))return 'exact';
 if(!path.endsWith('.html'))return null;
 const text=received.toString('utf8'),scripts=text.match(/<script>\(function\(\)\{function c\(\)\{var b=a\.contentDocument[\s\S]*?<\/script>/g)??[];
 if(scripts.length!==1||scripts[0].replace(/r:'[a-f0-9]+',t:'[A-Za-z0-9+/=]+'/,'r:__R__,t:__T__')!==cfTemplate)return null;
 const cleaned=text.replace(scripts[0],'');
 // The edge can append one final newline in addition to the injected script.
 return [cleaned,cleaned.endsWith('\n')?cleaned.slice(0,-1):cleaned].some(value=>digest(Buffer.from(value))===digest(expected))?'cloudflare-jsd':null;
}
async function verifyLive(stage,version){const paths=JSON.parse(await readFile(resolve(stage,'releases/github-pages-manifest.json'),'utf8').catch(()=> 'null'));
 const files=paths??(await walk(pathToFileURL(resolve(stage,'releases/github-pages')+'/'))).filter(p=>!p.startsWith('.git/'));
 // The current release manifest also includes app, license and source archive resources.
 const release=resolve(stage,'releases/github-pages');let done=0;const edgeHtml=[];
 for(let offset=0;offset<files.length;offset+=8){await Promise.all(files.slice(offset,offset+8).map(async path=>{const bytes=await readFile(resolve(release,path));for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(site+path+'?v='+version,{signal:AbortSignal.timeout(45000),cache:'no-store'});const match=response.ok&&liveFileMatch(path,bytes,Buffer.from(await response.arrayBuffer()));if(match){done++;if(match==='cloudflare-jsd')edgeHtml.push(path);return;}}catch{}await pause(5000);}throw new Error('Live file differs: '+path);}));event({phase:'verifying',checked:done,total:files.length,version});}
 for(const path of ['__review/','__review/api/index','.local-review/state.json']){const r=await fetch(site+path,{signal:AbortSignal.timeout(20000)});if(r.status!==404)throw new Error('Private route is unexpectedly public');}
 return {checked:done,edgeHtml};
}
export async function syncCatalog({deploy=false,full=false}={}){
 if(!deploy){const result=await preparePublicCatalog({root});event({phase:'snapshot',...result,changedFiles:result.changedFiles.length});return result;}
 const configured=(await git(['remote','get-url','origin'],root)).stdout.trim();if(configured!==remote)throw new Error('Unexpected repository target');
 await mkdir(resolve(root,'releases'),{recursive:true});const stage=await mkdtemp(resolve(root,'releases/sync-'));event({phase:'snapshot'});
 await git(['clone','--branch','main','--single-branch','--no-tags',remote,stage],root);await identity(stage);
 const snapshot=await preparePublicCatalog({root,output:resolve(stage,'catalog-content')});
 event({phase:'source',version:snapshot.version,changedFiles:snapshot.changedFiles.length,held:snapshot.held});
 await git(['add','--','catalog-content'],stage);if(!(await git(['diff','--cached','--quiet'],stage,{optional:true})).ok){await git(['commit','-m','Update saved bead chart data '+snapshot.version.slice(0,12)],stage);await git(['push','origin','HEAD:main'],stage);}
 const sourceCommit=(await git(['rev-parse','HEAD'],stage)).stdout.trim();
 if(!full&&await liveVersion()===snapshot.version){const result={phase:'noop',version:snapshot.version,sourceCommit,held:snapshot.held,changedFiles:0};event(result);return result;}
 await command(process.execPath,['scripts/build.mjs'],stage);await command(process.execPath,['scripts/prepare-release.mjs'],stage);await command(process.execPath,['scripts/prepare-github.mjs'],stage);await command(process.execPath,['scripts/verify.mjs'],stage);
 const publicDir=resolve(stage,'releases/github-pages'),siteDir=await mkdtemp(resolve(root,'releases/site-'));await git(['clone','--branch','gh-pages','--single-branch','--no-tags',remote,siteDir],root);await identity(siteDir);
 const publicFiles=await walk(pathToFileURL(publicDir+'/')),expected=new Set(publicFiles),oldFiles=(await git(['ls-files'],siteDir)).stdout.trim().split(/\r?\n/).filter(Boolean);
 for(const old of oldFiles)if(!expected.has(old))throw new Error('Unexpected existing public file; retain it for manual review: '+old);
 for(const path of publicFiles){const target=resolve(siteDir,path);await mkdir(resolve(target,'..'),{recursive:true});await writeFile(target,await readFile(resolve(publicDir,path)));}
 await git(['add','--all'],siteDir);let commit=(await git(['rev-parse','HEAD'],siteDir)).stdout.trim();
 if(!(await git(['diff','--cached','--quiet'],siteDir,{optional:true})).ok){await git(['commit','-m','Publish chart revision '+snapshot.version.slice(0,12)],siteDir);commit=(await git(['rev-parse','HEAD'],siteDir)).stdout.trim();await git(['push','origin','HEAD:gh-pages'],siteDir);}
 event({phase:'deploying',version:snapshot.version,sourceCommit,commit});let built=false;
 for(let n=0;n<48;n++){const r=await command('gh',['api','repos/'+repo+'/pages/builds/latest'],root);const b=JSON.parse(r.stdout);if(b.commit===commit&&b.status==='built'){built=true;break;}if(b.commit===commit&&b.status==='errored')throw new Error('GitHub Pages build failed');await pause(5000);}
 if(!built)throw new Error('Pages build not confirmed yet; retry sync later');event({phase:'verifying',version:snapshot.version,commit});const verification=await verifyLive(stage,snapshot.version);
 const result={phase:'synced',version:snapshot.version,sourceCommit,commit,held:snapshot.held,changedFiles:snapshot.changedFiles.length,...verification};event(result);await writeFile(resolve(root,'.local-review/last-publication.json'),JSON.stringify(result,null,2));return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){syncCatalog({deploy:process.argv.includes('--deploy'),full:process.argv.includes('--full')}).catch(e=>{event({phase:'error',error:e.message});process.exitCode=1;});}
