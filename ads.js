// One manual placement; never generate ad traffic in local previews. Codex, 2026-10-28. AGPL-3.0.
const CLIENT='ca-pub-4153958256787466';
const LOCAL_HOSTS=new Set(['localhost','127.0.0.1','[::1]']);
const LIVE_HOSTS=new Set(['douzuojian.com','www.douzuojian.com']);

export function initStudioAd({win=window,doc=document}={}){
 const frame=doc.querySelector('#studio-ad'),view=doc.querySelector('#studio-view'),slot=doc.querySelector('#studio-ad-slot'),preview=doc.querySelector('#studio-ad-preview');
 if(!frame||!view||!slot||frame.dataset.adsMounted)return;
 frame.dataset.adsMounted='true';
 if(LOCAL_HOSTS.has(win.location.hostname)){
  frame.dataset.mode='preview';preview.hidden=false;slot.hidden=true;return;
 }
 if(win.location.protocol!=='https:'||!LIVE_HOSTS.has(win.location.hostname)){
  frame.hidden=true;return;
 }
 let queued=false,near=false;
 const collapse=()=>{frame.hidden=true;};
 const status=()=>{if(slot.getAttribute('data-ad-status')==='unfilled')collapse();};
 if(win.MutationObserver)new win.MutationObserver(status).observe(slot,{attributes:true,attributeFilter:['data-ad-status']});
 function request(){
  if(queued||!near||view.hidden||frame.hidden||slot.getBoundingClientRect().width<=0)return;
  queued=true;
  try{
   if(!doc.getElementById('douzuojian-adsense')){
    const script=doc.createElement('script');script.id='douzuojian-adsense';script.async=true;script.crossOrigin='anonymous';
    script.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
    script.onerror=collapse;doc.head.append(script);
   }
   (win.adsbygoogle=win.adsbygoogle||[]).push({});
  }catch{collapse();}
 }
 const observer=win.IntersectionObserver?new win.IntersectionObserver(entries=>{
  near=entries.some(e=>e.isIntersecting);request();
 },{rootMargin:'150px 0px'}):null;
 function watch(){
  if(queued)return;
  near=false;
  win.requestAnimationFrame(()=>{
   if(observer){observer.disconnect();observer.observe(frame);}
   else{near=true;request();}
  });
 }
 win.addEventListener('hashchange',watch);watch();
}
if(typeof window!=='undefined'&&typeof document!=='undefined')initStudioAd();
