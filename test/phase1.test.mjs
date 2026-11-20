import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const baseline={random_motes:false,random_shades:false};
function run(t,{scenario=baseline,frames=[],ticks=120,status=0,night=1}={}){
  const dir=mkdtempSync(join(tmpdir(),'lantern-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const [sc,inputs,out]=['scenario.json','inputs.json','out.jsonl'].map(f=>join(dir,f));
  writeFileSync(sc,JSON.stringify(scenario));
  writeFileSync(inputs,JSON.stringify({frames}));
  const p=spawnSync(process.execPath,[fileURLToPath(new URL('../headless.mjs',import.meta.url)),'--seed','42','--night',String(night),'--scenario',sc,
    '--inputs',inputs,'--ticks',String(ticks),'--snapshot-every','1','--out',out],{encoding:'utf8'});
  assert.equal(p.status,status,p.stderr);
  if (status) return p.stderr;
  return readFileSync(out,'utf8').trim().split('\n').map(JSON.parse);
}
const events=(rows,name)=>rows.filter(r=>r.name===name);

test('tick 0, yaw, movement normalization, held frame fields and jump',t=>{
  const rows=run(t,{frames:[{tick:0,move:[1,1],cam_yaw_deg:90,jump:true},{tick:30,jump:false}],ticks:60});
  assert.deepEqual(rows[0].player.pos,[0,0,0]);
  assert.ok(rows.find(r=>r.type==='snapshot'&&r.tick===1).player.pos[1]>0);
  assert.deepEqual(rows.at(-2).player.pos,[4.243,0,-4.243]);
  assert.equal(rows.at(-2).time_left_s,299);
  assert.equal(rows.at(-2).sim_tick,60);
});
test('pickup, partial deposit, held interact, relight and win',t=>{
  const lanterns=[{id:'L1',pos:[0,0,0],deposited:7},...['L2','L3','L4','L5'].map(id=>({id,lit:true}))];
  const rows=run(t,{scenario:{...baseline,lanterns,motes:[[0,0,0],[0,0,0],[0,0,0]]},frames:[{tick:0,interact:true}]});
  assert.deepEqual(events(rows,'mote_picked').map(e=>e.data.carried),[1,2,3]);
  assert.deepEqual(events(rows,'deposit')[0].data,{lantern_id:'L1',amount:3,deposited:10});
  assert.equal(events(rows,'lantern_lit').length,1);
  assert.deepEqual(rows.at(-1),{type:'end',ticks:1,state:'won',score:878});
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
  assert.equal(rows.at(-2).player.carried,3);
  assert.deepEqual(rows.at(-2).shades[0],{id:'ink',pos:[6,1,0],state:'stunned'});
});
test('invulnerability, flame loss, safe lantern and dawn',t=>{
  const rows=run(t,{scenario:{...baseline,player:{flames:2},shades:[{pos:[0,1,0]}]},ticks:140});
  assert.deepEqual(events(rows,'player_hit').map(e=>e.tick),[1,91]);
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

test('pause separates tick and sim_tick without advancing dash cooldown',t=>{
  const rows=run(t,{frames:[{tick:0,dash:true},{tick:1,pause:true},{tick:4,pause:false},{tick:7,pause:true}],ticks:20});
  const snaps=rows.filter(r=>r.type==='snapshot');
  assert.equal(snaps[4].state,'paused');
  assert.equal(snaps[7].sim_tick,1);
  assert.deepEqual(snaps[7].player,snaps[1].player);
  assert.equal(snaps[8].sim_tick,2);
  assert.equal(snaps.at(-1).sim_tick,14);
  assert.equal(snaps.at(-1).player.pos[2],2.8);
  assert.equal(events(rows,'dash').length,1);
});
test('fall costs one flame, loses carried motes and respawns after 60 ticks',t=>{
  const rows=run(t,{scenario:{...baseline,player:{pos:[41,-10.1,0],carried:7,invuln_ticks:90}},ticks:62});
  assert.deepEqual(events(rows,'player_hit').map(x=>x.data),[{by:'fall',flames:2,dropped:0,lost:7}]);
  assert.deepEqual(rows.at(-2).player.pos,[0,0,0]);
  assert.equal(rows.at(-2).player.invuln,true);
});
test('Night 2 pad launches toward other island and charm allows repeated dashes',t=>{
  const pad=run(t,{night:2,scenario:{...baseline,player:{pos:[20,0,18]}},ticks:85});
  assert.equal(pad[0].lanterns.length,6);
  assert.ok(pad.at(-2).player.pos[0]>45);
  assert.equal(pad.at(-2).player.grounded,true);
  const charm=run(t,{night:2,scenario:{...baseline,player:{pos:[35,0,0]}},
    frames:[{tick:1,dash:true},{tick:2,dash:false},{tick:15,dash:true}],ticks:28});
  assert.deepEqual(events(charm,'charm_picked')[0].data,{charm_id:'C1',charm_ticks:600});
  assert.equal(events(charm,'dash').length,2);
  assert.equal(charm.at(-2).charms[0].available,false);
});
test('Night 2 drifter steals once and pulse drops stolen motes',t=>{
  const rows=run(t,{night:2,scenario:{...baseline,player:{carried:6},drifters:[{pos:[1,0.8,0]}]},
    frames:[{tick:1,pulse:true}],ticks:2});
  assert.deepEqual(events(rows,'drifter_steal')[0].data,{drifter_id:'D1',amount:3,carried:3});
  assert.deepEqual(events(rows,'drifter_drop')[0].data,{drifter_id:'D1',amount:3});
  assert.equal(rows.at(-2).motes.filter(m=>m.kind==='dropped').length,3);
  assert.equal(rows.at(-2).player.flames,3);
});
test('Night 3 layout and scheduled wind use simulation ticks',t=>{
  const rows=run(t,{night:3,scenario:baseline,ticks:2100});
  const snaps=rows.filter(r=>r.type==='snapshot');
  assert.equal(snaps[0].lanterns.length,7);
  assert.deepEqual(snaps[0].lanterns[0].pos,[0,6,6]);
  assert.equal(snaps[1799].wind.active,false);
  assert.equal(snaps[1800].wind.active,true);
  assert.equal(snaps[2099].wind.active,true);
  assert.equal(snaps[2100].wind.active,false);
});
test('zero flames wins the precedence check over lit lanterns and dawn',t=>{
  const lanterns=Array.from({length:5},(_,i)=>({id:'L'+(i+1),lit:true}));
  const rows=run(t,{scenario:{...baseline,lanterns,player:{flames:0},time_left_s:0}});
  assert.equal(events(rows,'game_over')[0].data.reason,'no_flames');
});
