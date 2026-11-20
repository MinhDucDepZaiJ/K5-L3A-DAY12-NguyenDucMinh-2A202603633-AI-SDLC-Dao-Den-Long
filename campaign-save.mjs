const key='lantern-campaign-v1';
const unlockKey='lantern-survival-unlocked';
export function readCampaign(){
  try{
    const data=JSON.parse(localStorage.getItem(key));
    if(!data||data.version!==1||![1,2,3].includes(data.night)||
      !Number.isSafeInteger(data.total)||data.total<0||!Number.isInteger(data.tick)||data.tick<0||
      data.tick>18000||!Array.isArray(data.inputs)||data.inputs.length>data.tick||
      !data.inputs.every(([tick,input],index)=>Number.isInteger(tick)&&tick>=0&&tick<data.tick&&
        (!index||tick>data.inputs[index-1][0])&&Array.isArray(input?.move)&&input.move.length===2&&
        input.move.every(x=>Number.isFinite(x)&&Math.abs(x)<=1)&&Number.isFinite(input.cam_yaw_deg))) return null;
    return data;
  }catch{return null;}
}
export function writeCampaign(data){
  try{localStorage.setItem(key,JSON.stringify({...data,version:1}));return true;}catch{return false;}
}
export function clearCampaign(){
  try{localStorage.removeItem(key);}catch{}
}
export function survivalUnlocked(){
  try{return localStorage.getItem(unlockKey)==='true';}catch{return false;}
}
export function unlockSurvival(){
  try{localStorage.setItem(unlockKey,'true');}catch{}
}
export function replayCampaign(game,save){
  let index=0,input;
  for(let tick=0;tick<save.tick;tick++){
    if(save.inputs[index]?.[0]===tick) input=save.inputs[index++][1];
    if(!input||game.state!=='playing') return false;
    game.step(input);
  }
  return game.state==='playing';
}
