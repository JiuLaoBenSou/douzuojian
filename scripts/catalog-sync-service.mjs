// Save-triggered local publisher queue. Does not run on the public static site.
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export function createSyncQueue({run,delayMs=1500,onStatus=()=>{}}){
 let timer=null,running=null,dirty=false,closed=false,value={phase:'idle',enabled:true};
 const set=next=>{value={...value,...next,updatedAt:new Date().toISOString()};onStatus({...value,pending:dirty});};
 async function flush(){clearTimeout(timer);timer=null;if(running)return running;if(!dirty||closed)return;
  running=(async()=>{while(dirty&&!closed){dirty=false;set({phase:'running',error:null});try{const result=await run(set);set({...result,phase:result.phase??'synced'});}catch(e){set({phase:'error',error:e.message});break;}}})();
  try{await running;}finally{running=null;}
 }
 return {request(){if(closed)return;dirty=true;if(!running)set({phase:'pending',error:null});clearTimeout(timer);timer=setTimeout(()=>flush(),delayMs);timer.unref?.();},flush,status:()=>({...value,pending:dirty}),close(){closed=true;clearTimeout(timer);}};
}
export async function createCatalogSyncService(root){
 const folder=resolve(root,'.local-review');await mkdir(folder,{recursive:true});const path=resolve(folder,'sync-state.json'),log=resolve(folder,'sync.log');let writes=Promise.resolve();
 const queue=createSyncQueue({onStatus:s=>{writes=writes.catch(()=>{}).then(()=>writeFile(path,JSON.stringify(s,null,2)));},run:set=>new Promise((done,reject)=>{
  const child=spawn(process.execPath,[resolve(root,'scripts/sync-catalog.mjs'),'--deploy'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});let lines='',result=null;
  child.stdout.on('data',chunk=>{const text=chunk.toString();appendFile(log,text).catch(()=>{});lines+=text;let at;while((at=lines.indexOf('\n'))!==-1){const line=lines.slice(0,at);lines=lines.slice(at+1);if(line.startsWith('SYNC_EVENT ')){try{const event=JSON.parse(line.slice(11));set(event);result=event;}catch{}}}});
  child.stderr.on('data',chunk=>appendFile(log,chunk).catch(()=>{}));child.once('error',reject);child.once('exit',code=>code===0?done(result??{phase:'synced'}):reject(new Error('线上同步失败；本地修改已保存，可点击重试。')));
 })});
 try{const old=JSON.parse(await readFile(path,'utf8'));if(old.pending||['pending','running','snapshot','source','deploying','verifying'].includes(old.phase))queue.request();}catch(e){if(e.code!=='ENOENT')throw e;}
 return queue;
}
