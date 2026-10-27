// Chart-local touch navigation. Codex, 2026-10-27. AGPL-3.0.
const clamp=value=>Math.max(.01,Math.min(32,value));
const valid=point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y);
export function touchPair(points){
 const [a,b]=Array.from(points);if(!valid(a)||!valid(b))return null;
 return {center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(b.x-a.x,b.y-a.y)};
}
export function pinchScale(scale,startDistance,distance){
 const base=Number.isFinite(scale)&&scale>0?scale:1;
 return clamp(startDistance>=1&&Number.isFinite(distance)&&distance>=0?base*distance/startDistance:base);
}
export function pinchScroll(scroll,anchor,midpoint,rect){
 return {left:Math.max(0,scroll.left+rect.left+anchor.x*rect.width-midpoint.x),top:Math.max(0,scroll.top+rect.top+anchor.y*rect.height-midpoint.y)};
}
export function cancelTouchStroke(grid,history,before,saved,historyBefore){
 return saved&&before&&history.at(-1)?.grid===before?{grid:before,history:historyBefore??history.slice(0,-1)}:{grid,history};
}
export function createTouchSession(handlers={}){
 const contacts=new Map();let pinching=false,navigationOnly=false;
 const emit=(name,...args)=>handlers[name]?.(...args),pair=()=>touchPair(contacts.values());
 return {
  get activeCount(){return contacts.size;},get ids(){return [...contacts.keys()];},has:id=>contacts.has(id),
  start(id,point){
   if(!valid(point)||contacts.has(id))return false;contacts.set(id,{...point});
   if(contacts.size===1)emit('onSingleStart',point,{navigationOnly:false});
   else if(!pinching){emit('onCancelDraw');navigationOnly=true;pinching=true;emit('onPinchStart',pair());}
   return true;
  },
  move(id,point){
   if(!contacts.has(id)||!valid(point))return false;contacts.set(id,{...point});
   if(pinching)emit('onPinchMove',pair());else emit('onSingleMove',point,{navigationOnly});return true;
  },
  end(id,point,cancelled=false){
   if(!contacts.has(id))return false;if(valid(point))contacts.set(id,{...point});
   if(pinching)emit('onPinchEnd',pair(),{cancelled});else emit('onSingleEnd',contacts.get(id),{navigationOnly,cancelled});
   contacts.delete(id);pinching=false;
   if(contacts.size>=2){pinching=true;emit('onPinchStart',pair());}
   else if(contacts.size===1){navigationOnly=true;emit('onSingleStart',contacts.values().next().value,{navigationOnly:true});}
   else navigationOnly=false;
   return true;
  },
  reset(){if(pinching)emit('onPinchEnd',pair(),{cancelled:true});if(contacts.size)emit('onCancelDraw');contacts.clear();pinching=false;navigationOnly=false;},
 };
}
