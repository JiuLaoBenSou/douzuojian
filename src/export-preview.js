import {downloadBlob} from './lib/export.js';
export function createExportPreview(){
 const dialog=document.getElementById('export-preview'),img=document.getElementById('export-image'),large=document.getElementById('export-open'),share=document.getElementById('export-share'),status=document.getElementById('export-message');
 let current=null,url=null;
 const release=()=>{if(url)URL.revokeObjectURL(url);url=null;current=null;img.removeAttribute('src');large.removeAttribute('href');};
 document.getElementById('export-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',release);window.addEventListener('pagehide',release);
 document.getElementById('export-download').addEventListener('click',()=>{if(!current)return;downloadBlob(current.blob,current.filename);status.textContent='已请求下载，请查看浏览器下载记录；这不代表已保存到相册。';});
 share.addEventListener('click',async()=>{if(!current)return;const file=new File([current.blob],current.filename,{type:'image/png'});try{await navigator.share({files:[file],title:current.filename});status.textContent='已交给系统分享，请在所选应用中确认保存。';}catch(e){status.textContent=e.name==='AbortError'?'已取消分享，图纸仍在这里。':'此浏览器未能分享，可下载图片或查看大图。';}});
 return {open(result){
  release();current=result;url=URL.createObjectURL(result.blob);img.src=url;large.href=url;document.getElementById('export-size').textContent=result.width+' × '+result.height+' 像素 · '+Math.ceil(result.bytes/1024)+' KB';
  status.textContent='图纸已生成。可以下载图片，或查看大图后尝试长按保存。';
  try{share.hidden=!(navigator.canShare?.({files:[new File([result.blob],result.filename,{type:'image/png'})]})&&navigator.share);}catch{share.hidden=true;}
  if(!dialog.open)dialog.showModal();
 }};
}
