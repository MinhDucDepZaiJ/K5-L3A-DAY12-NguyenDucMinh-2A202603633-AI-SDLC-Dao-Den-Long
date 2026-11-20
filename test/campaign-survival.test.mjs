import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,initialInput} from '../game.mjs';
import {replayCampaign} from '../campaign-save.mjs';

const {tuning}=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url)));
const idle=initialInput();

test('campaign replay restores the exact simulation state',()=>{
  const game=createGame(tuning,42,{},2);
  const inputs=[[0,{...idle,move:[.6,.8]}],[90,{...idle,jump:true}],[100,idle]];
  let i=0;
  for(let tick=0;tick<480;tick++){
    if(inputs[i+1]?.[0]===tick)i++;
    game.step(inputs[i][1]);
  }
  const restored=createGame(tuning,42,{},2);
  assert.ok(replayCampaign(restored,{tick:480,inputs}));
  assert.deepEqual(restored.snapshot(),game.snapshot());
});

test('the safe zone disappears below the exact fuel threshold',()=>{
  const game=createGame(tuning,42,{lanterns:[{id:'L1',lit:true,fuel:30}]});
  assert.deepEqual(game.safeLanternIds(),['L1']);
  game.step(idle);
  assert.deepEqual(game.safeLanternIds(),[]);
});

test('survival opens with six shades and each mote reloads thirty rounds',()=>{
  const game=createGame(tuning,42,{survival:true,motes:[[0,0,0]]});
  const events=game.step({...idle,pulse:true});
  assert.equal(events.filter(e=>e.name==='shade_spawned').length,6);
  assert.equal(game.snapshot().survival.spare,1);
  assert.equal(game.snapshot().survival.rounds,29);
  game.step({...idle,interact:true});
  assert.equal(game.snapshot().survival.rounds,30);
  assert.equal(game.snapshot().survival.spare,0);
  for(let i=2;i<60;i++)game.step(idle);
  assert.equal(game.score,1);
  assert.equal(game.state,'playing');
});
