// Immutable snapshot history shared by the workbench and local review previews. AGPL-3.0.
export function pushEdit(history,current,limit=50){
 return {past:[...history.past,current].slice(-limit),future:[]};
}
export function moveEdit(history,current,direction,limit=50){
 if(!['undo','redo'].includes(direction))throw new Error('Invalid history direction');
 const source=direction==='undo'?'past':'future',target=direction==='undo'?'future':'past';
 if(!history[source].length)return {...history,value:current,changed:false};
 return {...history,[source]:history[source].slice(0,-1),[target]:[...history[target],current].slice(-limit),value:history[source].at(-1),changed:true};
}
