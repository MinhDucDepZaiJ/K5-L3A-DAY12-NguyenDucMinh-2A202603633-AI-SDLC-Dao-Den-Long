import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createGame,initialInput} from '../game.mjs';
import {benchmarkScene,frameStats} from '../bench-scene.mjs';

const {tuning}=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url)));

test('benchmark scene is deterministic and holds its standard population',()=>{
  const seed=42, input=initialInput();
  const game=createGame(tuning,seed,benchmarkScene(seed));
  const before=game.snapshot();
  assert.equal(before.shades.length,200);
  assert.equal(before.motes.length,100);
  assert.deepEqual(before.lanterns.map(lamp=>lamp.fuel),[100,100,100,0,0]);
  assert.deepEqual(before,createGame(tuning,seed,benchmarkScene(seed)).snapshot());
  for(let i=0;i<301;i++) assert.deepEqual(game.step(input),[]);
  const after=game.snapshot();
  assert.equal(after.shades.length,200);
  assert.equal(after.motes.length,100);
  assert.ok(after.shades.every(shade=>shade.state==='wander'));
  assert.notDeepEqual(before.shades,after.shades);
  assert.deepEqual(before.player,after.player);
  assert.deepEqual(before.lanterns,after.lanterns);
});

test('benchmark computes average, p95 and slowest one percent',()=>{
  const samples=Array(99).fill(10).concat(30);
  assert.deepEqual(frameStats(samples),{avg_fps:100000/1020,p1_low_fps:1000/30,frame_ms_p95:10,frames:100});
});

test('leaderboard persists top ten, tie order and CLI output',t=>{
  const folder=mkdtempSync(join(tmpdir(),'lantern-rank-test-'));
  t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const env={...process.env,LANTERN_DATA_DIR:folder};
  const moduleUrl=new URL('../leaderboard.mjs',import.meta.url).href;
  const output=join(folder,'export.json');
  const child=spawnSync(process.execPath,['--input-type=module','--eval',`
    import assert from 'node:assert/strict';
    import {addEntry} from ${JSON.stringify(moduleUrl)};
    assert.throws(()=>addEntry({name:'xx',score:1,nights_won:0,seed:42}),RangeError);
    for(let i=0;i<12;i++) addEntry({name:'Mây_'+i,score:i<2?99:i,nights_won:1,seed:42});
  `],{env,encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);
  const exported=spawnSync(process.execPath,[fileURLToPath(new URL('../serve.mjs',import.meta.url)),'--export-leaderboard',output],{env,encoding:'utf8'});
  assert.equal(exported.status,0,exported.stderr);
  const {entries}=JSON.parse(readFileSync(output));
  assert.deepEqual(entries.map(entry=>entry.score),[99,99,11,10,9,8,7,6,5,4]);
  assert.deepEqual(entries.slice(0,2).map(entry=>entry.name),['Mây_0','Mây_1']);
  assert.ok(entries.every(entry=>entry.achieved_at.endsWith('Z')));
});
