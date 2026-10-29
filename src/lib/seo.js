export function patternPage(id){if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid pattern id');return '/patterns/'+id+'.html';}
export function patternLink(p,publicPages=true){const url=patternPage(p.id);return publicPages&&p.status==='ready'?url:'#library/'+p.id;}
