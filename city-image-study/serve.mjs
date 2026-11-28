import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.map':'application/json'};
http.createServer(async(req,res)=>{
 try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);const rel=path.relative(root,file);if(rel.startsWith('..')||path.isAbsolute(rel)){res.writeHead(403).end();return;}const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}
 catch{res.writeHead(404).end('Not found');}
}).listen(8766,'127.0.0.1',()=>console.log('http://127.0.0.1:8766/city-image-study/index.html'));
