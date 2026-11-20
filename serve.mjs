import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const types={'/':['index.html','text/html; charset=utf-8'],'/view.mjs':['view.mjs','text/javascript'],
  '/camera.mjs':['camera.mjs','text/javascript'],'/game.mjs':['game.mjs','text/javascript'],'/game.contract.json':['game.contract.json','application/json']};
const port=Number(process.env.PORT??8000);
createServer(async (req,res)=>{
  const file=Object.hasOwn(types,req.url)?types[req.url]:null;
  if (!file) {res.writeHead(404).end();return;}
  try {
    const content=await readFile(new URL(file[0],import.meta.url));
    res.writeHead(200,{'Content-Type':file[1]}).end(content);
  } catch {res.writeHead(500).end();}
}).listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port));
