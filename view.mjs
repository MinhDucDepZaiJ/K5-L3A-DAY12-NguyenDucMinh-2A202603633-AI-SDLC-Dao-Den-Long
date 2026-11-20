import {readCampaign,writeCampaign,clearCampaign,survivalUnlocked,unlockSurvival,replayCampaign} from './campaign-save.mjs';
import {decorations,lanternMesh,treeMesh} from './scenery.mjs';
import {benchmarkScene,frameStats} from './bench-scene.mjs';
import {mayModel} from './may.mjs';
import {worlds,ramps} from './world.mjs';
import {orbitCamera} from './camera.mjs';
import {createGame} from './game.mjs';
const {tuning}=await fetch('./game.contract.json').then(response=>response.json());
const query=new URLSearchParams(location.search);
const bench=query.has('bench');
const canvas=document.querySelector('canvas');
const ctx=canvas.getContext('2d');
const hud=Object.fromEntries(['lanterns','progress','flames','motes','time','score']
  .map(id=>[id,document.getElementById(id)]));
const status=document.getElementById('status');
const pauseButton=document.getElementById('pause');
const modal=document.querySelector('dialog');
const modalTitle=document.getElementById('dialog-title');
const modalDetail=document.getElementById('dialog-detail');
const modalAction=document.getElementById('dialog-action');
let paused=false,screen='menu',night=1,total=0,settingsReturn='menu';
const locationLabel=document.querySelector('.location');
const actions=document.getElementById('dialog-actions');
const settings=document.getElementById('settings');
const cooldowns=document.getElementById('cooldowns');
const arrow=document.getElementById('arrow');
const slots=document.getElementById('slots');
const volume=document.getElementById('volume'),sensitivity=document.getElementById('sensitivity');
for(const control of [volume,sensitivity]){
  try {control.value=localStorage.getItem(control.id)??control.value;} catch {}
  control.addEventListener('input',()=>{try{localStorage.setItem(control.id,control.value);}catch{}});
}
const palette=document.getElementById('accessible-palette');
try {palette.checked=localStorage.getItem(palette.id)==='true';} catch {}
function updatePalette(){
  document.body.classList.toggle('accessible-palette',palette.checked);
}
palette.addEventListener('change',()=>{
  updatePalette();
  try {localStorage.setItem(palette.id,String(palette.checked));} catch {}
});
updatePalette();
let audio;
function sound(frequency,duration=.16,gain=.13){
  if(!audio||!Number(volume.value)) return;
  const wave=audio.createOscillator(),level=audio.createGain(),now=audio.currentTime;
  wave.frequency.value=frequency;
  level.gain.setValueAtTime(Number(volume.value)*gain,now);
  level.gain.exponentialRampToValueAtTime(.001,now+duration);
  wave.connect(level).connect(audio.destination);wave.start();wave.stop(now+duration);
}
function enableAudio(){
  if(!audio&&globalThis.AudioContext) audio=new AudioContext();
  if(audio?.state==='suspended') void audio.resume().catch(()=>{});
}
addEventListener('pointerdown',enableAudio);
addEventListener('keydown',enableAudio);
const tones={mote_picked:720,lantern_lit:1050,pulse:190,player_hit:110,shade_spawned:150,dash:320,
  charm_picked:890,drifter_steal:240,drifter_drop:610};

const keys=new Set();
const defaults={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',dash:'ShiftLeft',
  interact:'KeyE',pulse:'KeyF',pause:'Escape'};
const aliases={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',pause:'KeyP',dash:'ShiftRight'};
const labels={up:'Tiến',down:'Lùi',left:'Trái',right:'Phải',jump:'Nhảy',dash:'Lướt',interact:'Nạp đèn',pulse:'Tỏa sáng',pause:'Tạm dừng'};
const keyList=document.getElementById('key-list'),keyNotice=document.getElementById('key-notice');
const reduceMotion=document.getElementById('reduce-motion'),largeText=document.getElementById('large-text');
const subtitles=document.getElementById('subtitles'),shadeArrow=document.getElementById('shade-arrow');
const scoreForm=document.getElementById('score-form'),scoreName=document.getElementById('score-name');
const scoreMessage=document.getElementById('score-message'),rankList=document.getElementById('rank-list');
let bindings={...defaults},capture=null,nightsWon=0,spawnWarning=null,scorePending=false;
const campaignSeed=42;
let extra=false,unlocked=survivalUnlocked(),inputLog=[],previousSavedInput='';
function saveGame(){
  if(bench||extra||screen!=='play'||game.state!=='playing') return;
  writeCampaign({night,total,tick:game.tick,inputs:inputLog,yaw,pitch,facing});
}
function saveNextNight(next){
  writeCampaign({night:next,total,tick:0,inputs:[]});
}
addEventListener('pagehide',saveGame);
document.addEventListener('visibilitychange',()=>{if(document.hidden) saveGame();});
function resumeCampaign(){
  const save=readCampaign();
  if(!save) return menu();
  extra=false;night=save.night;total=save.total;nightsWon=night-1;
  reset();
  if(!replayCampaign(game,save)){
    clearCampaign();
    menu();
    modalDetail.textContent='Bản lưu không thể khôi phục. Hãy bắt đầu lượt mới.';
    return;
  }
  inputLog=save.inputs;
  previousSavedInput=inputLog.length?JSON.stringify(inputLog.at(-1)[1]):'';
  if(Number.isFinite(save.yaw)) yaw=wrapYaw(save.yaw);
  if(Number.isFinite(save.pitch)) pitch=Math.max(8,Math.min(76,save.pitch));
  if(Number.isFinite(save.facing)) facing=save.facing;
  view=game.snapshot();
  last=performance.now();
}
function startSurvival(){
  if(!unlocked) return;
  extra=true;night=1;reset();
}
try{
  Object.assign(bindings,JSON.parse(localStorage.getItem('bindings')??'{}'));
  reduceMotion.checked=JSON.parse(localStorage.getItem(reduceMotion.id)??'false');
  largeText.checked=JSON.parse(localStorage.getItem(largeText.id)??'false');
}catch{}
for(const control of [reduceMotion,largeText]){
  function apply(){
    document.body.classList.toggle(control.id,control.checked);
    try{localStorage.setItem(control.id,JSON.stringify(control.checked));}catch{}
  }
  control.addEventListener('change',apply);apply();
}
const keyName=code=>code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^ShiftLeft$/,'Shift');
const matches=(action,code)=>bindings[action]===code||
  (bindings[action]===defaults[action]&&aliases[action]===code&&!Object.values(bindings).includes(code));
function updateKeys(){
  keyList.replaceChildren();
  for(const [action,label] of Object.entries(labels)){
    const button=document.createElement('button');
    button.type='button';button.className='secondary';
    button.textContent=label+' · '+keyName(bindings[action]);
    button.onclick=()=>{capture=action;keyNotice.textContent='Nhấn phím mới cho '+label+'.';};
    keyList.append(button);
  }
  for(const hint of document.querySelectorAll('[data-key]')) hint.textContent=keyName(bindings[hint.dataset.key]);
  pauseButton.setAttribute('aria-keyshortcuts',keyName(bindings.pause));
  try{localStorage.setItem('bindings',JSON.stringify(bindings));}catch{}
}
document.getElementById('reset-keys').onclick=()=>{
  bindings={...defaults};capture=null;updateKeys();keyNotice.textContent='Đã khôi phục phím mặc định.';
};
updateKeys();
addEventListener('keydown',event=>{
  if(capture){
    event.preventDefault();
    if(event.repeat) return;
    if(['Tab','KeyQ','KeyZ'].includes(event.code)||Object.keys(bindings).some(a=>a!==capture&&matches(a,event.code))){
      keyNotice.textContent='Phím trùng hoặc được dành cho điều hướng. Chọn phím khác.';
      return;
    }
    bindings[capture]=event.code;capture=null;updateKeys();keyNotice.textContent='Đã lưu phím.';
    return;
  }
  if(matches('pause',event.code)&&(screen==='play'||screen==='pause')){
    event.preventDefault();
    if(!event.repeat) setPaused(!paused);
    return;
  }
  if(screen!=='play'||paused||event.target?.closest?.('button,summary')) return;
  if(['KeyQ','KeyZ'].includes(event.code)||Object.keys(bindings).some(a=>matches(a,event.code))){
    event.preventDefault();keys.add(event.code);
  }
});
addEventListener('keyup',event=>keys.delete(event.code));
addEventListener('blur',()=>keys.clear());
let game, view, yaw, pitch, accumulator, pulseUntil, facing;
let drag = null;
const wrapYaw = angle => ((angle % 360) + 360) % 360;
canvas.addEventListener('pointerdown', event => {
  if (screen!=='play' || paused || drag || event.button !== 0 || game.state !== 'playing') return;
  drag = {id:event.pointerId,x:event.clientX,y:event.clientY};
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('orbiting');
});
canvas.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  yaw = wrapYaw(yaw + (event.clientX - drag.x) * 0.36 * Number(sensitivity.value));
  pitch = Math.max(8, Math.min(76, pitch + (event.clientY - drag.y) * 0.28 * Number(sensitivity.value)));
  drag.x = event.clientX;
  drag.y = event.clientY;
});
function stopOrbit(){
  const id=drag?.id;
  drag=null;
  canvas.classList.remove('orbiting');
  if (id!==undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
}
canvas.addEventListener('lostpointercapture',stopOrbit);
let primaryAction;
function showDialog(title,detail,action,onAction,extras=[]){
  modalTitle.textContent=title;
  modalDetail.textContent=detail;
  modalAction.textContent=action;
  primaryAction=onAction;
  capture=null;
  scoreForm.hidden=true;rankList.hidden=true;
  settings.hidden=screen!=='settings';
  actions.replaceChildren();
  for(const [label,handler] of extras){
    const button=document.createElement('button');
    button.type='button';button.className='secondary';button.textContent=label;
    button.onclick=handler;actions.append(button);
  }
  if(!modal.open) modal.showModal();
  modalAction.focus();
}
function menu(){
  screen='menu';
  const options=[['Tiếp tục trò chơi',resumeCampaign],['Bảng xếp hạng',showLeaderboard],
    ['Cài đặt',()=>showSettings('menu')]];
  if(unlocked) options.splice(1,0,['Sinh tồn · AK',startSurvival]);
  showDialog('Đảo Đèn Lồng','Thu đom đóm, châm dầu và giữ đảo sáng đến bình minh.','Bắt đầu',()=>{
    extra=false;night=1;total=0;nightsWon=0;saveNextNight(1);intro();
  },options);
  actions.firstElementChild.disabled=!readCampaign();
}
async function showLeaderboard(){
  screen='leaderboard';
  showDialog('Bảng xếp hạng','Điểm cao trên máy này.','Về menu',menu);
  rankList.replaceChildren();rankList.hidden=false;
  try{
    const response=await fetch('/leaderboard',{cache:'no-store'});
    if(!response.ok) throw new Error();
    const {entries}=await response.json();
    if(screen!=='leaderboard') return;
    for(const {name,score,nights_won} of entries){
      const row=document.createElement('li');
      row.textContent=`${name} · ${score} điểm · ${nights_won}/3 Đêm`;
      rankList.append(row);
    }
    if(!entries.length) modalDetail.textContent='Chưa có điểm được lưu.';
  }catch{if(screen==='leaderboard') modalDetail.textContent='Không đọc được điểm trên máy.';}
}
function offerScore(){
  scoreForm.hidden=false;scoreName.value='';scoreMessage.textContent='';
  scoreForm.querySelector('button').disabled=scorePending;
}
scoreForm.addEventListener('submit',async event=>{
  event.preventDefault();
  if(scorePending||scoreForm.hidden) return;
  const name=scoreName.value.trim().normalize('NFC');
  if(!/^[\p{L}0-9_]{3,12}$/u.test(name)){
    scoreMessage.textContent='Dùng 3–12 chữ cái, chữ số hoặc dấu gạch dưới.';
    return;
  }
  const button=scoreForm.querySelector('button');
  scorePending=true;button.disabled=true;
  try{
    const response=await fetch('/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,score:total,nights_won:nightsWon,seed:campaignSeed})});
    if(!response.ok) throw new Error();
    scoreMessage.textContent='Đã lưu điểm.';
  }catch{scoreMessage.textContent='Chưa lưu được điểm. Thử lại.';button.disabled=false;}
  finally{scorePending=false;}
});
function intro(){
  screen='intro';
  const lore=['Giữ ít nhất ba đèn sáng đến bình minh.','Qua cầu tre hoặc dùng bục nhảy để sang đảo bên.','Theo dốc lên tầng cao và chú ý gió mạnh.'];
  showDialog(`Đêm ${night} · ${worlds[night].name}`,`Ông Đăng: ${lore[night-1]}`,'Vào đảo',reset);
}
function showSettings(from){
  settingsReturn=from;screen='settings';
  showDialog('Cài đặt','Điều chỉnh âm lượng và tốc độ xoay camera.','Quay lại',()=>{
    if(settingsReturn==='pause') openPause();
    else menu();
  });
}
function openPause(){
  screen='pause';
  showDialog('Đang tạm dừng','Tiếp tục từ vị trí hiện tại.','Tiếp tục',()=>setPaused(false),
    [[extra?'Chơi lại Sinh tồn':'Chơi lại Đêm',reset],['Cài đặt',()=>showSettings('pause')],['Về menu',menu]]);
}
function setPaused(value){
  if(value) saveGame();
  if(game.state!=='playing'||paused===value) return;
  paused=value;keys.clear();stopOrbit();accumulator=0;last=performance.now();
  if(paused) openPause();
  else {screen='play';modal.close();pauseButton.blur();}
}
pauseButton.addEventListener('click',()=>setPaused(true));
modalAction.addEventListener('click',()=>primaryAction());
modal.addEventListener('cancel',event=>{
  event.preventDefault();
  if(screen==='pause') setPaused(false);
});
function reset(){
  screen='play';
  game=createGame(tuning,campaignSeed,extra?{survival:true}:{},night);
  inputLog=[];previousSavedInput='';
  spawnWarning=null;
  locationLabel.textContent=extra?'Sinh tồn · Đảo Bến':`Đêm ${night} · ${worlds[night].name}`;
  view=game.snapshot();
  yaw=0;
  facing=0;
  pitch=54;
  accumulator=0;
  pulseUntil=0;
  keys.clear();
  paused=false;
  last=performance.now();
  stopOrbit();
  if (modal.open) modal.close();
  pauseButton.disabled=false;
  pauseButton.blur();
}
let last=performance.now();
if(!bench){reset();menu();}
const circle=Array.from({length:72},(_,i)=>[Math.cos(i*Math.PI/36),Math.sin(i*Math.PI/36)]);
const stars=Array.from({length:95},(_,i)=>[(i*0.6180339)%1,(i*0.4142135)%1,0.6+i%3/3]);
const pressed=(...codes)=>codes.some(code=>keys.has(code));
const actionDown=action=>[...keys].some(code=>matches(action,code));
const axis=(positive,negative)=>Number(positive)-Number(negative);
const islandDecor=bench?null:Object.fromEntries([1,2,3].map(n=>[n,decorations(n)]));
const tree=bench?null:treeMesh();
const lampModels=bench?null:[lanternMesh(false,false),lanternMesh(true,false),lanternMesh(true,true)];
function draw(now){
  const w=bench?1280:canvas.clientWidth,h=bench?720:canvas.clientHeight;
  const ratio=bench?1:Math.min(2,devicePixelRatio);
  if (canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)) {
    canvas.width=Math.round(w*ratio);
    canvas.height=Math.round(h*ratio);
  }
  ctx.setTransform(ratio,0,0,ratio,0,0);
  const lit=view.lanterns.filter(l=>l.lit).length;
  const sky=ctx.createLinearGradient(0,0,0,h);
  sky.addColorStop(0,'#0e1430'); sky.addColorStop(1,'#1b2350');
  ctx.fillStyle=sky; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#f1ddaf';
  for (const [x,y,r] of stars) ctx.fillRect(x*w,y*h*.72,r,r);
  if(night===3&&(view.wind.active||view.sim_tick%1800>=1680)){
    ctx.fillStyle='#c9b48a';
    for(let i=0;i<20;i++){
      const x=((now/9+i*113)%w+w)%w,y=(i*83+now/38)%h;
      ctx.fillRect(x,y,8,2);
    }
  }
  const [px,py,pz]=view.player.pos;
  const camera=bench
    ?orbitCamera([0,0,0],270-now*360/15000,Math.atan(.5)*180/Math.PI,w,h,Math.hypot(30,15),.5)
    :orbitCamera([px,py+.65,pz],yaw,pitch,w,h,10.8);
  function polygon(vertices, color){
    const points=camera.polygon(vertices);
    if (points.length<3) return;
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for (const [x,y] of points.slice(1)) ctx.lineTo(x,y);
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function mesh(faces,pos){
    const sorted=faces.map(({vertices,color})=>{
      const points=camera.polygon(vertices.map(v=>v.map((value,i)=>value+pos[i])));
      const depth=points.reduce((sum,p)=>sum+p[3],0)/points.length;
      return {points,color,depth};
    }).filter(({points})=>points.length>=3).sort((a,b)=>b.depth-a.depth);
    for(const {points,color} of sorted){
      ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
      for(const [x,y] of points.slice(1)) ctx.lineTo(x,y);
      ctx.closePath();ctx.fillStyle=color;ctx.fill();
    }
  }
  function disk(x,y,r,color){
    ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);
    ctx.fillStyle=color;ctx.fill();
  }
  function glow(x,y,r,color){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,color);g.addColorStop(1,'transparent');
    disk(x,y,r,g);
  }
  const world=worlds[night];
  const ambient=.15+.55*lit/view.lanterns.length;
  const grass=Math.round(80*(.90+ambient*.18)).toString(16);
  const groundColor='#2f'+grass+'50';
  const ground=(cx,r,y)=>circle.map(([x,z])=>[cx+x*r,y,z*r]);
  if(night===2) polygon([[26,0,-2],[44,0,-2],[44,0,2],[26,0,2]],'#6b4a2f');
  for(const [cx,r] of world.islands){
    const rim=ground(cx,r,0),base=ground(cx,r*.93,-3);
    for(let i=0;i<rim.length;i++){
      const next=(i+1)%rim.length;
      polygon([rim[i],rim[next],base[next],base[i]],'#12384a');
    }
    polygon(rim,groundColor);
  }
  const decor=islandDecor?.[night];
  for(const tile of decor?.paving??[]) polygon(tile.vertices,tile.color);
  for(const patch of decor?.ground??[]) if(patch.vertices[0][1]<.1) polygon(patch.vertices,patch.color);
  if(night===3){
    const segment=Array.from({length:25},(_,i)=>i*Math.PI/24);
    for(let i=1;i<segment.length;i++){
      const a=segment[i-1],b=segment[i];
      polygon([[12*Math.cos(a),3,12*Math.sin(a)],[24*Math.cos(a),3,24*Math.sin(a)],
        [24*Math.cos(b),3,24*Math.sin(b)],[12*Math.cos(b),3,12*Math.sin(b)]],'#3c6656');
    }
    polygon(ground(0,8,6),'#517867');
    for(const [x,z] of ramps) polygon([[30*x-1.5*z,0,30*z+1.5*x],[30*x+1.5*z,0,30*z-1.5*x],
      [24*x+1.5*z,3,24*z-1.5*x],[24*x-1.5*z,3,24*z+1.5*x]],'#c9b48a');
    const tower=camera.project([0,6,0]);
    if(tower){
      const [x,y,s]=tower;ctx.fillStyle='#6b4a2f';ctx.fillRect(x-2*s,y-8*s,4*s,8*s);
    }
  }
  for(const patch of decor?.ground??[]) if(patch.vertices[0][1]>.1) polygon(patch.vertices,patch.color);
  if(!bench&&!extra){
    const ids=new Set(game.safeLanternIds());
    for(const lamp of view.lanterns){
      if(!ids.has(lamp.id)) continue;
      const [lx,ly,lz]=lamp.pos;
      const points=camera.polygon(circle.map(([x,z])=>[lx+x*tuning.safe_radius,ly+.04,lz+z*tuning.safe_radius]));
      if(points.length<3) continue;
      ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
      for(const [x,y] of points.slice(1)) ctx.lineTo(x,y);
      ctx.closePath();ctx.fillStyle='#f3c96930';ctx.fill();
      ctx.strokeStyle=palette.checked?'#fff6d4':'#ffda74';ctx.lineWidth=1.4;ctx.stroke();
    }
  }
  for(const pad of world.pads??[]){
    const [x,y,z]=pad.pos;
    polygon(circle.map(([a,b])=>[x+a,y+.02,z+b]),'#c9b48a');
  }
  const nearest=view.lanterns.filter(l=>!l.lit).sort((a,b)=>
    Math.hypot(a.pos[0]-px,a.pos[2]-pz)-Math.hypot(b.pos[0]-px,b.pos[2]-pz))[0];
  const marker=nearest&&camera.project(nearest.pos);
  arrow.hidden=!nearest||Boolean(marker&&marker[0]>40&&marker[0]<w-40&&marker[1]>65&&marker[1]<h-40);
  if(!arrow.hidden){
    const relative=Math.atan2(nearest.pos[0]-px,nearest.pos[2]-pz)-yaw*Math.PI/180;
    arrow.style.rotate=`${relative}rad`;
  }
  const entities=[
    ...view.motes.map((m,i)=>({...m,kind:'mote',i})),
    ...(decor?.trees??[]).map(pos=>({kind:'tree',pos})),
    ...view.lanterns.map(l=>({kind:'lantern',...l})),
    ...view.shades.map(s=>({kind:'shade',...s})),
    ...view.drifters.map(d=>({...d,kind:'drifter'})),
    ...view.charms.flatMap((c,i)=>c.available&&world.charms?.[i]?[{kind:'charm',pos:world.charms[i]}]:[]),
    {kind:bench?'benchmark-player':'player',pos:[px,py,pz]}
  ];
  const visible=entities.map(e=>({e,point:camera.project(e.pos)}))
    .filter(({point})=>point)
    .sort((a,b)=>b.point[3]-a.point[3]);
  const playerScreen=bench?null:camera.project([px,py+1,pz]);
  for (const {e,point:[x,y,s]} of visible){
    if(e.kind==='tree'){
      mesh(tree,e.pos);
    } else if(e.kind==='mote'&&!bench){
      const [mx,my,mz]=e.pos;
      const hover=reduceMotion.checked?0:Math.sin(now/220+e.i)*.12;
      const point=camera.project([mx,my+.55+hover,mz]);
      if(!point) continue;
      const [bx,by,scale]=point;
      const core=Math.max(2,scale*.075);
      const nearPlayer=playerScreen&&Math.hypot(bx-playerScreen[0],by-playerScreen[1])<playerScreen[2]*.54;
      if(!nearPlayer) glow(bx,by,core*3.5,'#ffe58a88');
      disk(bx,by,core,'#ffe58a');
      disk(bx-core*.18,by-core*.18,core*.65,'#fff6c2');
    } else if (e.kind==='mote'){
      const b=y-s*(.55+Math.sin(now/220+e.i)*.18);
      glow(x,b,s*.95,'#ffe58a');
      disk(x,b,s*.125,'#fff6c2');
    } else if(e.kind==='lantern'&&!bench){
      const low=e.lit&&e.fuel<tuning.low_fuel_threshold;
      const dim=low&&!reduceMotion.checked&&now%1000>=500;
      const head=camera.project([e.pos[0],e.pos[1]+1.68,e.pos[2]]);
      if(e.lit&&!dim&&head) glow(head[0],head[1],head[2]*2.25,'#ffb34770');
      mesh(lampModels[e.lit?(dim?2:1):0],e.pos);
      const label=camera.project([e.pos[0],e.pos[1]+2.65,e.pos[2]]);
      if(label){
        const [lx,ly,scale]=label,width=Math.max(18,scale*.85);
        ctx.font='12px system-ui';ctx.fillStyle='#fff4de';
        ctx.fillText(e.id,lx+width*.56,ly+4);
        if(e.lit){
          ctx.fillStyle='#15172b';ctx.fillRect(lx-width/2,ly,width,5);
          ctx.fillStyle=low?(palette.checked?'#fff':dim?'#b36c57':'#ff5a5f'):'#f2c14e';
          ctx.fillRect(lx-width/2,ly,width*e.fuel/tuning.fuel_max,5);
          if(low&&palette.checked) ctx.fillText('⚠',lx-width/2-13,ly+5);
        }
      }
    } else if (e.kind==='lantern'){
      const low=e.lit&&e.fuel<tuning.low_fuel_threshold;
      const dim=low&&!reduceMotion.checked&&now%1000>=500;
      if(e.lit&&!dim) glow(x,y-1.7*s,4*s,'#ffb24e8a');
      ctx.fillStyle='#78614d';ctx.fillRect(x-.10*s,y-2.1*s,.20*s,2.1*s);
      ctx.beginPath();ctx.ellipse(x,y-2.1*s,.61*s,(e.lit?.61:.488)*s,0,0,Math.PI*2);
      ctx.fillStyle=e.lit?(dim?'#bd7944':'#ffb347'):'#5b5f6e';ctx.fill();
      if(e.lit&&!dim) disk(x,y-2.1*s,.26*s,'#ffe9b0');
      if(!e.lit){
        ctx.beginPath();ctx.moveTo(x-.19*s,y-2.48*s);ctx.lineTo(x+.06*s,y-2.18*s);
        ctx.lineTo(x-.07*s,y-2.11*s);ctx.lineTo(x+.16*s,y-1.83*s);
        ctx.strokeStyle='#202337';ctx.lineWidth=Math.max(1,.05*s);ctx.stroke();
      }else{
        const bar=Math.max(16,1.3*s),top=y-2.88*s;
        ctx.fillStyle='#131728';ctx.fillRect(x-bar/2,top,bar,4);
        ctx.fillStyle=low?(palette.checked?'#ffffff':dim?'#a64350':'#ff5a5f'):'#f2c14e';
        ctx.fillRect(x-bar/2,top,bar*e.fuel/tuning.fuel_max,4);
        if(low&&palette.checked){ctx.font='12px system-ui';ctx.fillText('⚠',x+bar/2+3,top+3);}
      }
      ctx.fillStyle='#fff0cb';ctx.font='12px system-ui';ctx.fillText(e.id,x+8,y-2.5*s);
    } else if(e.kind==='drifter'){
      ctx.fillStyle='#8fa3b8';ctx.fillRect(x-.7*s,y-.15*s,1.4*s,.3*s);
    } else if(e.kind==='charm'){
      ctx.fillStyle='#f2c14e';ctx.fillRect(x-.21*s,y-.65*s,.42*s,.58*s);
      ctx.fillStyle='#c8102e';ctx.fillRect(x-.16*s,y-.60*s,.32*s,.48*s);
    } else if (e.kind==='shade'){
      const outline=palette.checked?'#00b3ff':'#7a3cff';
      disk(x,y-.35*s,s*.74,outline);
      disk(x,y-.35*s,s*.70,e.state==='stunned'?'#3a3450':'#120a1a');
      disk(x-.19*s,y-.49*s,s*.09,outline);disk(x+.19*s,y-.49*s,s*.09,outline);
    } else if(e.kind==='benchmark-player'){
      disk(x,y-.65*s,.31*s,'#e8e2d0');disk(x,y-1.24*s,.18*s,'#eaba97');
    } else if(e.kind==='player'){
      const moving=Math.hypot(view.player.vel[0],view.player.vel[2])>.05;
      const stride=moving&&view.player.grounded?Math.sin(now/75)*.13:0;
      const model=mayModel(e.pos,extra?yaw*Math.PI/180:facing,stride,extra);
      const light=model.lantern&&camera.project(model.lantern);
      if(light) glow(light[0],light[1],light[2]*.48,'#ffb34799');
      const faces=model.faces.map(({vertices,color})=>({points:camera.polygon(vertices),color}))
        .filter(({points})=>points.length>=3)
        .map(face=>({...face,depth:face.points.reduce((sum,p)=>sum+p[3],0)/face.points.length}))
        .sort((a,b)=>b.depth-a.depth);
      for(const {points,color} of faces){
        ctx.beginPath();
        ctx.moveTo(points[0][0],points[0][1]);
        for(const [sx,sy] of points.slice(1)) ctx.lineTo(sx,sy);
        ctx.closePath();ctx.fillStyle=color;ctx.fill();
      }
      if (!reduceMotion.checked&&game.tick<pulseUntil) glow(x,y,s*(7-(pulseUntil-game.tick)/6),'#ffe18299');
    }
  }
}
function loop(now){
  if (screen==='play' && !paused && game.state==='playing') accumulator+=Math.min(.15,(now-last)/1000);
  last=now;
  while (screen==='play' && !paused && accumulator>=1/60 && game.state==='playing'){
    accumulator-=1/60;
    yaw=wrapYaw(yaw+axis(pressed('KeyQ'),pressed('KeyZ'))*2);
    const wasGrounded=view.player.grounded;
    const input={move:[
      axis(actionDown('right'),actionDown('left')),
      axis(actionDown('up'),actionDown('down'))
    ],cam_yaw_deg:yaw,jump:actionDown('jump'),interact:actionDown('interact'),pulse:actionDown('pulse'),dash:actionDown('dash')};
    if(!extra){
      const serialized=JSON.stringify(input);
      if(serialized!==previousSavedInput){
        inputLog.push([game.tick,input]);previousSavedInput=serialized;
      }
    }
    const events=game.step(input);
    if(game.tick%300===0) saveGame();
    if(events.some(event=>event.name==='survival_shot')) sound(125,.055,.09);
    if (events.some(e=>e.name==='pulse')) pulseUntil=game.tick+24;
    for(const event of events) if(tones[event.name]) sound(tones[event.name]);
    view=game.snapshot();
    const spawned=events.find(event=>event.name==='shade_spawned');
    if(spawned) spawnWarning={id:spawned.data.id,until:game.tick+180};
    const [vx,,vz]=view.player.vel;
    if(Math.hypot(vx,vz)>.05){
      const target=Math.atan2(vx,vz);
      const turn=Math.atan2(Math.sin(target-facing),Math.cos(target-facing));
      facing+=turn*.28;
    }
    if(wasGrounded&&view.player.vel[1]>0) sound(480);
    if(game.tick%60===0&&view.time_left_s<=10&&view.time_left_s>0) sound(840);
    if(night===3&&game.tick%1800===1680) sound(200,.6);
    if(game.tick%75===0) sound([146.8,174.6,220,196][Math.floor(game.tick/75)%4],.9,.033);
  }
  draw(game.tick*1000/60);
  updateHud();
  if(screen==='play'&&game.state!=='playing'){
    screen='result';pauseButton.disabled=true;stopOrbit();
    if(extra){
      showDialog('Kết thúc sinh tồn',`Sống sót ${view.survival.seconds} giây · ${view.score} điểm · Đợt ${view.survival.wave}`,
        'Chơi lại',startSurvival,[['Về menu',menu]]);
    }else if(game.state==='won'){
      total+=view.score;nightsWon++;sound(1046,.55);
      if(night===3){unlocked=true;unlockSurvival();clearCampaign();showDialog('Bình Minh',`Tổng điểm ba Đêm: ${total}`,'Về menu',menu,[['Chơi Sinh tồn',startSurvival]]);offerScore();}
      else {saveNextNight(night+1);showDialog('Đảo đã sáng!',`${view.score} điểm · Tổng: ${total}`,'Đêm tiếp theo',()=>{night++;intro();});}
    }else{
      saveNextNight(night);sound(130,.6);
      showDialog('Đêm đã khép lại',`Điểm các Đêm đã thắng: ${total}`,'Chơi lại Đêm',reset,[['Về menu',menu]]);
      offerScore();
    }
  }
  requestAnimationFrame(loop);
}
function updateHud(){
  const lit=view.lanterns.filter(l=>l.lit).length;
  const seconds=extra?view.survival.seconds:Math.ceil(view.time_left_s);
  const values={lanterns:`${lit}/${view.lanterns.length}`,flames:String(view.player.flames),
    motes:extra?`${view.survival.spare} băng`:`${view.player.carried}/${view.player.capacity}`,
    time:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`,score:String(view.score)};
  for (const [id,value] of Object.entries(values)){
    if (hud[id].textContent!==value) hud[id].textContent=value;
  }
  hud.time.classList.toggle('urgent',!extra&&seconds<=30);
  for(const [i,slot] of [...slots.children].entries()){
    slot.hidden=extra||i>=view.player.capacity;
    slot.classList.toggle('filled',i<view.player.carried);
  }
  cooldowns.textContent=`${keyName(bindings.dash)} · Lướt ${view.player.dash_cd_s?view.player.dash_cd_s.toFixed(1)+'s':'sẵn sàng'} | ${keyName(bindings.pulse)} · Tỏa sáng ${view.player.pulse_cd_s?view.player.pulse_cd_s.toFixed(1)+'s':'sẵn sàng'}`;
  document.body.classList.toggle('game-paused',paused);
  document.body.classList.toggle('survival',extra);
  if(extra) cooldowns.textContent=`AK ${view.survival.rounds}/30 · Đợt ${view.survival.wave} | ${keyName(bindings.pulse)} · Bắn | ${keyName(bindings.interact)} · Nạp đạn`;
  hud.progress.max=view.lanterns.length;
  document.getElementById('goal').textContent=Math.ceil(tuning.win_ratio*view.lanterns.length);
  hud.progress.value=lit;
  const near=view.lanterns.map(l=>({l,d:Math.hypot(l.pos[0]-view.player.pos[0],l.pos[2]-view.player.pos[2])}))
    .filter(({l,d})=>(!l.lit||l.fuel<tuning.fuel_max)&&d<=tuning.interact_radius)
    .sort((a,b)=>a.d-b.d||a.l.id.localeCompare(b.l.id))[0]?.l;
  const hint=extra?'':near && !paused && game.state==='playing'
    ? (view.player.carried ? (near.lit?`${keyName(bindings.interact)} · Châm dầu (${near.fuel.toFixed(1)}/100)`:`${keyName(bindings.interact)} · Nạp ánh sáng (${near.deposited}/${near.ever_lit?tuning.relight_cost:tuning.lantern_cost})`) : 'Nhặt đom đóm để nạp đèn')
    : (night===3&&view.sim_tick%1800>=1680?'Gió mạnh sắp đến':view.wind.active?'Gió mạnh':'');
  const spawn=screen==='play'&&spawnWarning&&game.tick<spawnWarning.until
    ? view.shades.find(shade=>shade.id===spawnWarning.id):null;
  shadeArrow.hidden=!spawn;
  if(spawn){
    const [x,,z]=view.player.pos;
    const angle=Math.atan2(spawn.pos[0]-x,spawn.pos[2]-z)-yaw*Math.PI/180;
    const dx=Math.sin(angle),dy=-Math.cos(angle),limit=.43/Math.max(Math.abs(dx),Math.abs(dy));
    shadeArrow.style.left=`${50+100*dx*limit}%`;shadeArrow.style.top=`${50+100*dy*limit}%`;
    shadeArrow.style.rotate=`${angle}rad`;
  }
  const alerts=[];
  if(spawn) alerts.push('Bóng Mực xuất hiện');
  if(night===3&&view.sim_tick%1800>=1680) alerts.push('Gió mạnh sắp thổi');
  if(!extra&&seconds<=10&&seconds>0) alerts.push(`${seconds} giây cuối`);
  if(view.lanterns.some(l=>l.lit&&l.fuel<tuning.low_fuel_threshold)) alerts.push('Có đèn sắp cạn dầu');
  const caption=screen==='play'?alerts.join(' · '):'';
  if(subtitles.textContent!==caption) subtitles.textContent=caption;
  if (status.textContent!==hint) status.textContent=hint;
}
if(bench){
  document.body.classList.add('benchmark');
  game=createGame(tuning,Number(query.get('bench')),benchmarkScene(Number(query.get('bench'))));
  const input={move:[0,0],cam_yaw_deg:0};
  const samples=[];
  const duration=Number(query.get('duration'))*1000;
  let start,previous,firstFrame,steps=0;
  function measure(now){
    start??=now;
    const elapsed=now-start;
    const nextStep=Math.floor(elapsed*60/1000);
    while(steps<nextStep){game.step(input);steps++;}
    view=game.snapshot();
    draw(elapsed);
    firstFrame??=performance.timeOrigin+performance.now();
    if(previous!==undefined&&previous-start>=3000&&elapsed<=3000+duration) samples.push(now-previous);
    previous=now;
    if(elapsed>=3000+duration){
      const result={...frameStats(samples),first_frame_epoch_ms:firstFrame,browser:navigator.userAgent};
      void fetch('/benchmark-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});
    }else requestAnimationFrame(measure);
  }
  requestAnimationFrame(measure);
}else requestAnimationFrame(loop);
