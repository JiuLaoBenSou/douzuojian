// Folder navigation derives counts and levels from the available catalog only.
const fields=['series','section','collectionId'];
const value=(p,level)=>level===0?(p.series||p.category||'其他'):(p[fields[level]]||'__loose__');
export function browseCatalog(entries,path=[]){
 let rows=entries;
 for(let level=0;level<path.length;level++)rows=rows.filter(p=>value(p,level)===path[level]);
 const level=path.length;
 if(level>=fields.length||!rows.length||(level>0&&rows.every(p=>!p[fields[level]])))return {leaf:true,entries:rows,groups:[],level};
 const groups=new Map();
 for(const p of rows){
  const key=value(p,level),label=level===2?(p.collection||'其他图纸'):(key==='__loose__'?'其他图纸':key);
  if(!groups.has(key))groups.set(key,{value:key,label,count:0,sample:p});
  groups.get(key).count++;
 }
 return {leaf:false,entries:rows,groups:[...groups.values()],level};
}
