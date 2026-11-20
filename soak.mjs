import {parseArgs} from 'node:util';
import {writeFileSync,readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createGame,initialInput} from './game.mjs';
import {rngFor} from './bench-scene.mjs';

const {values:{seed,nights,out}}=parseArgs({options:{seed:{type:'string'},nights:{type:'string'},out:{type:'string'}}});
if(!/^-?\d+$/.test(seed)||!Number.isSafeInteger(Number(seed))||!/^[1-9]\d*$/.test(nights)||!Number.isSafeInteger(Number(nights))||!out)
  throw new Error('Dùng --seed <int> --nights <int dương> --out <file>');
const {tuning}=JSON.parse(readFileSync(new URL('./game.contract.json',import.meta.url)));
const rss=()=>{globalThis.gc?.();return process.memoryUsage.rss()/1048576;};
const start=performance.now(),results=[];
let game=createGame(tuning,Number(seed));
const mem_start_mb=rss();
let crashes=0;
for(let i=0;i<Number(nights);i++){
  const night=i%3+1,nightSeed=Number(seed)+i;
  try {
    if(i) game=createGame(tuning,nightSeed,{},night);
    const random=rngFor(nightSeed),input=initialInput();
    for(let tick=0;tick<tuning[`night${night}_duration_s`]*60&&game.state==='playing';tick++){
      if(tick%30===0){const a=random()*2*Math.PI;input.move=[Math.cos(a),Math.sin(a)];}
      Object.assign(input,{jump:random()<.05,dash:random()<.03,pulse:random()<.02,interact:random()<.10});
      game.step(input);
    }
    results.push(game.state);
  }catch(error){crashes++;results.push('crash');console.error(error);}
  game=null;
}
game=createGame(tuning,Number(seed)+Number(nights),{},Number(nights)%3+1);
const mem_end_mb=rss();
writeFileSync(out,JSON.stringify({nights:Number(nights),crashes,results,mem_start_mb,mem_end_mb,duration_s:(performance.now()-start)/1000},null,2)+'\n');
if(crashes) process.exitCode=1;
