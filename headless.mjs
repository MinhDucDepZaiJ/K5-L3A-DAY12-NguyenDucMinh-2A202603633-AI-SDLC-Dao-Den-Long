import {readFileSync,writeFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {createGame,initialInput} from './game.mjs';

const object = x => x!==null && typeof x==='object' && !Array.isArray(x);
const vector = (x,n) => Array.isArray(x) && x.length===n && x.every(Number.isFinite);
const count = x => Number.isSafeInteger(x) && x>=0;
const read = path => JSON.parse(readFileSync(path,'utf8'));
function requireValid(ok,label) {
  if (!ok) throw new Error('Dữ liệu không hợp lệ: '+label);
}
function fields(value, checks, label) {
  requireValid(object(value),label);
  for (const [key,check] of Object.entries(checks)) {
    if (Object.hasOwn(value,key)) requireValid(check(value[key]),label+'.'+key);
  }
}
function validateScenario(s,t) {
  const bool = x=>typeof x==='boolean';
  const pos = x=>vector(x,3);
  fields(s,{time_left_s:x=>Number.isFinite(x)&&x>=0,random_motes:bool,random_shades:bool,
    player:x=>object(x),motes:x=>Array.isArray(x)&&x.every(pos),
    shades:Array.isArray,lanterns:Array.isArray},'scenario');
  if (s.player) fields(s.player,{pos,carried:x=>count(x)&&x<=t.carry_capacity,flames:count},'player');
  for (const [key,items] of [['shades',s.shades??[]],['lanterns',s.lanterns??[]]]) {
    const ids=new Set();
    for (const item of items) {
      fields(item,{pos,id:x=>typeof x==='string'&&x.length>0,lit:bool,
        deposited:x=>count(x)&&x<=t.lantern_cost},key);
      if (key==='lanterns') requireValid(/^L[1-5]$/.test(item.id),key+'.id');
      else requireValid(pos(item.pos),key+'.pos');
      if (item.id!==undefined) {
        requireValid(!ids.has(item.id),key+'.id trùng');
        ids.add(item.id);
      }
    }
  }
}
function inputFrames(data) {
  requireValid(object(data)&&Array.isArray(data.frames),'frames');
  let last=-1;
  for (const f of data.frames) {
    fields(f,{move:x=>vector(x,2)&&x.every(n=>Math.abs(n)<=1),
      cam_yaw_deg:Number.isFinite,jump:x=>typeof x==='boolean',
      interact:x=>typeof x==='boolean',pulse:x=>typeof x==='boolean'},'frame');
    requireValid(count(f.tick)&&f.tick>last,'frame.tick');
    last=f.tick;
  }
  return data.frames;
}
try {
  const {values:a}=parseArgs({options:Object.fromEntries(
    ['seed','night','scenario','inputs','ticks','out','snapshot-every'].map(k=>[k,{type:'string'}]))});
  const integer = s=>typeof s==='string' && /^-?\d+$/.test(s) && Number.isSafeInteger(Number(s));
  requireValid(integer(a.seed)&&a.night==='1'&&integer(a.ticks)&&count(Number(a.ticks))&&a.out,'tham số CLI');
  const interval=a['snapshot-every']??'10';
  requireValid(integer(interval)&&Number(interval)>0,'snapshot-every');
  const {tuning}=JSON.parse(readFileSync(new URL('./game.contract.json',import.meta.url),'utf8'));
  const scenario=a.scenario?read(a.scenario):{};
  validateScenario(scenario,tuning);
  const frames=a.inputs?inputFrames(read(a.inputs)):[];
  const game=createGame(tuning,Number(a.seed),scenario);
  const lines=[game.snapshot()];
  const input=initialInput();
  let cursor=0;
  for (let k=0;k<Number(a.ticks)&&game.state==='playing';k++) {
    if (frames[cursor]?.tick===k) Object.assign(input,frames[cursor++]);
    lines.push(...game.step(input));
    if (game.tick%Number(interval)===0) lines.push(game.snapshot());
  }
  lines.push({type:'end',ticks:game.tick,state:game.state,score:game.score});
  writeFileSync(a.out,lines.map(x=>JSON.stringify(x)).join('\n')+'\n');
} catch (error) {
  console.error(error.message);
  process.exitCode=2;
}
