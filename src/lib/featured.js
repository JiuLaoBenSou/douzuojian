// Keep the homepage selection identical before and after JavaScript loads.
const featuredIds=['pokemon-kanto-025','demon-slayer-f9290bf6181e','hello-kitty-pink-dress'];
export function featuredPatterns(entries){
 const ready=entries.filter(p=>p.status==='ready'&&!p.unknownCount),byId=new Map(ready.map(p=>[p.id,p]));
 const selected=featuredIds.map(id=>byId.get(id)).filter(Boolean),seen=new Set(selected.map(p=>p.id));
 for(const p of ready){if(selected.length>=3)break;if(!seen.has(p.id)){selected.push(p);seen.add(p.id);}}
 return selected;
}
