// Exact-code replacement for the current chart. Codex, AGPL-3.0.
export function planColorReplace(values,from,to){const indices=[];const result=values.map((value,index)=>{if(value!==null&&value===from&&from!==to){indices.push(index);return to;}return value;});return {values:result,indices};}
