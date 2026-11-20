import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const baseline={random_motes:false,random_shades:false};
function run(t,{scenario=baseline,frames=[],ticks=120,status=0}={}){
  const dir=mkdtempSync(join(tmpdir(),'lantern-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const [sc,inputs,out]=['scenario.json','inputs.json','out.jsonl'].map(f=>join(dir,f));
  writeFileSync(sc,JSON.stringify(scenario));
  writeFileSync(inputs,JSON.stringify({frames}));
  const p=spawnSync(process.execPath,['headless.mjs','--seed','42','--night','1','--scenario',sc,
    '--inputs',inputs,'--ticks',String(ticks),'--snapshot-every','1','--out',out],{encoding:'utf8'});
  assert.equal(p.status,status,p.stderr);
  if (status) return p.stderr;
  return readFileSync(out,'utf8').trim().split('\n').map(JSON.parse);
}
const events=(rows,name)=>rows.filter(r=>r.name===name);

test('tick 0, yaw, movement normalization, held frame fields and jump',t=>{
  const rows=run(t,{frames:[{tick:0,move:[1,1],cam_yaw_deg:90,jump:true},{tick:30,jump:false}],ticks:60});
  assert.deepEqual(rows[0].player.pos,[0,0,0]);
  assert.ok(rows[1].player.pos[1]>0);
  assert.deepEqual(rows.at(-2).player.pos,[4.95,0,-4.95]);
  assert.equal(rows.at(-2).time_left_s,179);
  assert.equal(rows.at(-2).sim_tick,60);
});
test('pickup, partial deposit, held interact, relight and win',t=>{
  const lanterns=[{id:'L1',pos:[0,0,0],deposited:1},...['L2','L3','L4','L5'].map(id=>({id,lit:true}))];
  const rows=run(t,{scenario:{...baseline,lanterns,motes:[[0,0,0],[0,0,0],[0,0,0]]},frames:[{tick:0,interact:true}]});
  assert.deepEqual(events(rows,'mote_picked').map(e=>e.data.carried),[1,2,3]);
  assert.deepEqual(events(rows,'deposit')[0].data,{lantern_id:'L1',amount:3,deposited:4});
  assert.equal(events(rows,'lantern_lit').length,1);
  assert.deepEqual(rows.at(-1),{type:'end',ticks:1,state:'won',score:638});
  const more=run(t,{scenario:{...baseline,lanterns:[{id:'L1',pos:[0,0,0]}],motes:[[0,0,0],[3,0,0]]},
    frames:[{tick:0,interact:true,move:[1,0]},{tick:30,move:[0,0]}],ticks:35});
  assert.equal(events(more,'deposit').length,1);
  assert.equal(more.at(-2).player.carried,1);
});
test('pulse consumes light once, pushes shade and reports stun',t=>{
  const rows=run(t,{scenario:{...baseline,player:{carried:6},shades:[{id:'ink',pos:[2,1,0]}]},
    frames:[{tick:0,pulse:true}],ticks:60});
  assert.deepEqual(events(rows,'pulse')[0].data,{stunned_ids:['ink']});
  assert.equal(events(rows,'pulse').length,1);
  assert.equal(rows.at(-2).player.carried,4);
  assert.deepEqual(rows.at(-2).shades[0],{id:'ink',pos:[5,1,0],state:'stunned'});
});
test('invulnerability, flame loss, safe lantern and dawn',t=>{
  const rows=run(t,{scenario:{...baseline,player:{flames:2},shades:[{pos:[0,1,0]}]},ticks:140});
  assert.deepEqual(events(rows,'player_hit').map(e=>e.tick),[1,121]);
  assert.equal(events(rows,'game_over')[0].data.reason,'no_flames');
  const safe=run(t,{scenario:{...baseline,lanterns:[{id:'L1',lit:true,pos:[0,0,0]}],
    shades:[{pos:[4.1,1,0]}],time_left_s:1}});
  assert.equal(events(safe,'player_hit').length,0);
  assert.equal(events(safe,'game_over')[0].data.reason,'dawn');
  assert.equal(safe.at(-1).ticks,60);
});
test('malformed input and scenario exit 2',t=>{
  assert.match(run(t,{frames:[{tick:0},{tick:0}],status:2}),/frame.tick/);
  assert.match(run(t,{scenario:{shades:[{}]},status:2}),/shades.pos/);
});
