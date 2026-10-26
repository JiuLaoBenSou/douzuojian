import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const args=process.argv.slice(2),portIndex=args.indexOf('--port');
const port=portIndex===-1?0:Number(args[portIndex+1]);
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid --port');
const root=new URL('../dist/',import.meta.url);
const allowed=new Set(JSON.parse(await readFile(new URL('manifest.json',root),'utf8')));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.md':'text/plain; charset=utf-8','.zip':'application/zip'};
const server=createServer(async(request,response)=>{
 response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');
 response.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; img-src 'self' blob: data:; worker-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'");
 if(!['GET','HEAD'].includes(request.method)){response.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
 const pathname=new URL(request.url,'http://127.0.0.1').pathname;
 if(pathname==='/__qa-mobile'&&args.includes('--qa')){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>390px 响应式验收</title><body style="margin:0;background:#d7e5ed"><iframe title="390px 豆作间" src="/" width="390" height="844" style="display:block;border:0;margin:0 auto"></iframe></body></html>');return;}
 const path=pathname==='/'?'index.html':pathname.slice(1);
 if(!allowed.has(path)){response.writeHead(404).end('Not found');return;}
 try{const body=await readFile(new URL(path,root));const ext=path.slice(path.lastIndexOf('.'));if(path==='source.zip')response.setHeader('Content-Disposition','attachment; filename="douzuojian-source.zip"');response.writeHead(200,{'Content-Type':mime[ext]||'text/plain; charset=utf-8'});response.end(request.method==='HEAD'?undefined:body);}catch{response.writeHead(500).end('Static file unavailable; run npm run build.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`LOCAL_PREVIEW http://127.0.0.1:${server.address().port} (dist)`));
const stop=()=>server.close(()=>process.exit(0));process.on('SIGINT',stop);process.on('SIGTERM',stop);
