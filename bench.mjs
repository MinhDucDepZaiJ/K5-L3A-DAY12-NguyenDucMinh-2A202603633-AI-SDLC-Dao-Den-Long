import {parseArgs} from 'node:util';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir,platform,release,arch} from 'node:os';
import {performance} from 'node:perf_hooks';
import {gameServer} from './serve.mjs';

const {values:{seed,duration,out}}=parseArgs({options:{seed:{type:'string'},duration:{type:'string'},out:{type:'string'}}});
if(!/^-?\d+$/.test(seed)||!Number.isSafeInteger(Number(seed))||!Number.isFinite(Number(duration))||Number(duration)<=0||!out)
  throw new Error('Dùng --seed <int> --duration <giây dương> --out <file>');
const candidates=process.platform==='win32'?
  [join(process.env.PROGRAMFILES??'C:/Program Files','Google/Chrome/Application/chrome.exe'),
   join(process.env['PROGRAMFILES(X86)']??'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe')]:
  process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']:['chromium','google-chrome','chromium-browser'];
const name=process.env.BENCH_BROWSER??candidates.find(exe=>spawnSync(exe,['--version'],{stdio:'ignore',timeout:2000}).status===0);
if(!name) throw new Error('Cài Chromium/Chrome hoặc đặt BENCH_BROWSER tới trình duyệt.');
const profile=mkdtempSync(join(tmpdir(),'lantern-bench-'));
const started=performance.timeOrigin;
let browser,finished=false,timer;
const server=gameServer(async(req,res,path)=>{
  if(path!=='/benchmark-result'||req.method!=='POST') return false;
  try {
    let body='';
    for await(const part of req) body+=part;
    const result=JSON.parse(body);
    if(!result.frames) throw new Error(result.error??'Benchmark failed');
    writeFileSync(out,JSON.stringify({contract_version:'1.3',avg_fps:result.avg_fps,p1_low_fps:result.p1_low_fps,
      frame_ms_p95:result.frame_ms_p95,frames:result.frames,load_ms:result.first_frame_epoch_ms-started,
      peak_mem_mb:null,vsync_off:false,renderer:'Canvas 2D perspective · '+result.browser,
      os:`${platform()} ${release()} ${arch()}`},null,2)+'\n');
    finished=true;
    res.writeHead(200).end('OK',()=>finish());
  }catch(error){res.writeHead(500).end();finish(error);}
  return true;
});
function finish(error){
  clearTimeout(timer);
  if(error){console.error(error.message);process.exitCode=1;}
  server.close();
  browser?.kill();
}
server.listen(0,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${server.address().port}/?bench=${seed}&duration=${duration}`;
  const flags=[`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--window-size=1280,720',
    '--disable-background-timer-throttling','--disable-renderer-backgrounding'];
  if(process.env.BENCH_HEADLESS==='1') flags.push('--headless=new');
  browser=spawn(name,[...flags,'--app='+url],{stdio:['ignore','ignore','inherit']});
  browser.once('error',finish);
  browser.once('exit',()=>{if(!finished)finish(new Error('Trình duyệt đóng trước khi đo xong.'));});
  timer=setTimeout(()=>finish(new Error('Benchmark quá thời gian.')),Number(duration)*1000+20000);
});
process.on('exit',()=>{try{rmSync(profile,{recursive:true,force:true});}catch{}});
