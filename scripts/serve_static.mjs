import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve('out');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff'};
const server=createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url||'/','http://localhost').pathname);
    let file=resolve(root,'.'+pathname);
    if(file!==root&&!file.startsWith(root+sep)){response.writeHead(403);response.end();return;}
    try{if((await stat(file)).isDirectory())file=resolve(file,'index.html');}catch{file=resolve(root,'404.html');response.statusCode=404;}
    const body=await readFile(file);
    response.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
    response.setHeader('Cache-Control',pathname.startsWith('/_next/static/')?'public, max-age=31536000, immutable':'no-cache');
    response.setHeader('X-Content-Type-Options','nosniff');
    response.end(request.method==='HEAD'?undefined:body);
  }catch{response.writeHead(404);response.end('Not found');}
});
server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log(`Local web app: http://127.0.0.1:${process.env.PORT||3000}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
