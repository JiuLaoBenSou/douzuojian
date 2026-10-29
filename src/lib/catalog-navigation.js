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

// Choose small, real examples from this category; never reference an absent chart.
export function folderPreviews(entries,path,value){
 const next=[...path,value],rows=browseCatalog(entries,next).entries;
 const key=next.at(-1),series=next[0];
 const preferred=key==='pokemon-gen1-pokedex'?['pokemon-kanto-025','pokemon-kanto-007','pokemon-kanto-004']:key==='pokemon-johto-100'?['pokemon-johto-152','pokemon-johto-155','pokemon-johto-158']:key==='pokemon-ball-charms'||key==='主题小图'?['pokemon-ball-quick-ball','pokemon-ball-dusk-ball','pokemon-ball-4107066dc649']:series==='三丽鸥'?['hello-kitty-flower-hat','hello-kitty-bunny-ears','hello-kitty-green-apple']:series==='宝可梦'?['pokemon-kanto-025','pokemon-johto-152','pokemon-ball-quick-ball']:['flower','cloud','rainbow'];
 const selected=[];const add=p=>{if(p?.thumbnail&&!selected.some(x=>x.id===p.id))selected.push(p);};
 preferred.forEach(id=>add(rows.find(p=>p.id===id)));
 for(const p of [rows[0],rows[Math.floor(rows.length/2)],rows.at(-1),...rows]){if(selected.length===3)break;add(p);}
 return selected;
}
