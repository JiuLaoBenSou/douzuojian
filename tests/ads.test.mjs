import test from 'node:test';
import assert from 'node:assert/strict';
import {initStudioAd} from '../src/ads.js';

// Exercise the request boundary without contacting Google or generating impressions.
function fixture(hostname='douzuojian.com',protocol='https:'){
 const listeners={},scripts=[],observers=[];
 const frame={dataset:{},hidden:false},view={hidden:false};
 const slot={hidden:false,getBoundingClientRect:()=>({width:view.hidden?0:720}),getAttribute:name=>slot[name]};
 const preview={hidden:true};
 const doc={querySelector:s=>({'#studio-ad':frame,'#studio-view':view,'#studio-ad-slot':slot,'#studio-ad-preview':preview}[s]),createElement:()=>({}),head:{append:s=>scripts.push(s)},getElementById:id=>scripts.find(s=>s.id===id)};
 const win={location:{hostname,protocol},requestAnimationFrame:fn=>fn(),addEventListener:(n,fn)=>listeners[n]=fn,
  IntersectionObserver:class{constructor(fn){observers.push(this);this.fire=visible=>fn([{isIntersecting:visible}]);}observe(){}disconnect(){}},
  MutationObserver:class{constructor(fn){slot.changed=fn;}observe(){}}};
 return {win,doc,view,frame,slot,preview,scripts,observers,route:()=>listeners.hashchange()};
}
test('local preview never requests or queues real ads',()=>{
 const f=fixture('127.0.0.1','http:');initStudioAd(f);
 assert.equal(f.scripts.length,0);assert.equal(f.win.adsbygoogle,undefined);
 assert.equal(f.preview.hidden,false);assert.equal(f.slot.hidden,true);
});
test('unapproved hosts and HTTP production do not request ads',()=>{
 for(const f of [fixture('example.com'),fixture('douzuojian.com','http:')]){
  initStudioAd(f);assert.equal(f.scripts.length,0);assert.equal(f.frame.hidden,true);
 }
});
test('waits for visible studio and viewport; requests once across route changes',()=>{
 const f=fixture();f.view.hidden=true;initStudioAd(f);
 f.observers[0].fire(true);assert.equal(f.scripts.length,0);
 f.view.hidden=false;f.route();f.observers[0].fire(false);assert.equal(f.scripts.length,0);
 f.observers[0].fire(true);
 assert.equal(f.scripts.length,1);assert.equal(f.scripts[0].async,true);
 assert.equal(f.scripts[0].crossOrigin,'anonymous');
 assert.equal(f.scripts[0].src,'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4153958256787466');
 assert.equal(f.win.adsbygoogle.length,1);
 f.view.hidden=true;f.route();f.view.hidden=false;f.route();f.observers[0].fire(true);initStudioAd(f);
 assert.equal(f.scripts.length,1);assert.equal(f.win.adsbygoogle.length,1);
});
test('unfilled inventory and SDK failures collapse the frame',()=>{
 for(const reason of ['unfilled','error','queue']){
  const f=fixture();if(reason==='queue')f.win.adsbygoogle={push(){throw new Error('blocked');}};
  initStudioAd(f);f.observers[0].fire(true);
  if(reason==='unfilled'){f.slot['data-ad-status']='unfilled';f.slot.changed();}
  if(reason==='error')f.scripts[0].onerror();
  assert.equal(f.frame.hidden,true,reason);
 }
});
