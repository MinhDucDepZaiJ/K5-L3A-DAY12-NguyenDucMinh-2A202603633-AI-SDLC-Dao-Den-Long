import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {addEntry,readLeaderboard} from './leaderboard.mjs';

const types={'/':['index.html','text/html; charset=utf-8'],'/view.mjs':['view.mjs','text/javascript'],
  '/may.mjs':['may.mjs','text/javascript'],'/world.mjs':['world.mjs','text/javascript'],
  '/camera.mjs':['camera.mjs','text/javascript'],'/game.mjs':['game.mjs','text/javascript'],
  '/bench-scene.mjs':['bench-scene.mjs','text/javascript'],'/game.contract.json':['game.contract.json','application/json']};
const port=Number(process.env.PORT??8000);
export function gameServer(extra=()=>false){
  return createServer(async (req,res)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    const json=(status,value)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value));
    try {
      if(await extra(req,res,path)) return;
      if(path==='/leaderboard'){
        if(req.method==='GET') return json(200,readLeaderboard());
        if(req.method!=='POST') return json(405,{error:'Method not allowed'});
        if(req.headers['content-type']!=='application/json') return json(415,{error:'Expected JSON'});
        let body='';
        for await(const chunk of req){
          body+=chunk;
          if(body.length>4096) return json(413,{error:'Payload too large'});
        }
        return json(200,addEntry(JSON.parse(body)));
      }
      const file=Object.hasOwn(types,path)?types[path]:null;
      if(!file) return res.writeHead(404).end();
      const content=await readFile(new URL(file[0],import.meta.url));
      res.writeHead(200,{'Content-Type':file[1]}).end(content);
    }catch(error){
      json(error instanceof SyntaxError||error instanceof RangeError||error instanceof TypeError?400:500,{error:error.message});
    }
  });
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  if(process.argv[2]==='--export-leaderboard'){
    if(!process.argv[3]) throw new Error('Thiếu đường dẫn tệp xuất.');
    writeFileSync(process.argv[3],JSON.stringify(readLeaderboard(),null,2)+'\n');
  }else gameServer().listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port));
}
