import {mayModel} from './may.mjs';
import {worlds,ramps} from './world.mjs';
import {orbitCamera} from './camera.mjs';
import {createGame} from './game.mjs';
const {tuning}=await fetch('./game.contract.json').then(response=>response.json());
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
const controls=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyZ','KeyE','KeyF','ShiftLeft','ShiftRight'];
addEventListener('keydown',event=>{
  if (['Escape','KeyP'].includes(event.code) && (screen==='play'||screen==='pause')){
    event.preventDefault();
    if (!event.repeat) setPaused(!paused);
    return;
  }
  if (screen!=='play' || paused || game.state!=='playing' || event.target?.closest?.('button,summary')) return;
  if (controls.includes(event.code)){
    event.preventDefault();
    keys.add(event.code);
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
  pitch = Math.max(8, Math.min(65, pitch + (event.clientY - drag.y) * 0.28 * Number(sensitivity.value)));
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
  showDialog('Đảo Đèn Lồng','Thu đom đóm và thắp sáng từng hòn đảo.','Bắt đầu',()=>{
    night=1;total=0;intro();
  },[['Cài đặt',()=>showSettings('menu')]]);
}
function intro(){
  screen='intro';
  const lore=['Gom ánh sáng trước khi bình minh đến.','Qua cầu tre hoặc dùng bục nhảy để sang đảo bên.','Theo dốc lên tầng cao và chú ý gió mạnh.'];
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
    [['Chơi lại Đêm',reset],['Cài đặt',()=>showSettings('pause')],['Về menu',menu]]);
}
function setPaused(value){
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
  game=createGame(tuning,42,{},night);
  locationLabel.textContent=`Đêm ${night} · ${worlds[night].name}`;
  view=game.snapshot();
  yaw=0;
  facing=0;
  pitch=26;
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
reset();
menu();
const circle=Array.from({length:72},(_,i)=>[Math.cos(i*Math.PI/36),Math.sin(i*Math.PI/36)]);
const stars=Array.from({length:95},(_,i)=>[(i*0.6180339)%1,(i*0.4142135)%1,0.6+i%3/3]);
const pressed=(...codes)=>codes.some(code=>keys.has(code));
const axis=(positive,negative)=>Number(positive)-Number(negative);
function draw(now){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  const ratio=Math.min(2,devicePixelRatio);
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
  const camera=orbitCamera([px,py+1.1,pz],yaw,pitch,w,h);
  function polygon(vertices, color){
    const points=camera.polygon(vertices);
    if (points.length<3) return;
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for (const [x,y] of points.slice(1)) ctx.lineTo(x,y);
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
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
    ...view.motes.map((m,i)=>({kind:'mote',...m,i})),
    ...view.lanterns.map(l=>({kind:'lantern',...l})),
    ...view.shades.map(s=>({kind:'shade',...s})),
    ...view.drifters.map(d=>({...d,kind:'drifter'})),
    ...view.charms.flatMap((c,i)=>c.available&&world.charms?.[i]?[{kind:'charm',pos:world.charms[i]}]:[]),
    {kind:'player',pos:[px,py,pz]}
  ];
  const visible=entities.map(e=>({e,point:camera.project(e.pos)}))
    .filter(({point})=>point)
    .sort((a,b)=>b.point[3]-a.point[3]);
  for (const {e,point:[x,y,s]} of visible){
    if (e.kind==='mote'){
      const b=y-s*(.55+Math.sin(now/220+e.i)*.18);
      glow(x,b,s*.95,'#ffe58a');
      disk(x,b,s*.125,'#fff6c2');
    } else if (e.kind==='lantern'){
      if (e.lit) glow(x,y-1.7*s,4*s,'#ffb24e8a');
      ctx.fillStyle='#78614d';ctx.fillRect(x-.10*s,y-2.1*s,.20*s,2.1*s);
      disk(x,y-2.1*s,.61*s,e.lit?'#ffb347':'#5b5f6e');
      if(e.lit) disk(x,y-2.1*s,.26*s,'#ffe9b0');
      ctx.fillStyle='#fff0cb';ctx.font='12px system-ui';ctx.fillText(e.id,x+8,y-2.5*s);
    } else if(e.kind==='drifter'){
      ctx.fillStyle='#8fa3b8';ctx.fillRect(x-.7*s,y-.15*s,1.4*s,.3*s);
    } else if(e.kind==='charm'){
      ctx.fillStyle='#f2c14e';ctx.fillRect(x-.21*s,y-.65*s,.42*s,.58*s);
      ctx.fillStyle='#c8102e';ctx.fillRect(x-.16*s,y-.60*s,.32*s,.48*s);
    } else if (e.kind==='shade'){
      disk(x,y-.35*s,s*.70,e.state==='stunned'?'#3a3450':'#120a1a');
      disk(x-.19*s,y-.49*s,s*.09,'#7a3cff');disk(x+.19*s,y-.49*s,s*.09,'#7a3cff');
    } else {
      const moving=Math.hypot(view.player.vel[0],view.player.vel[2])>.05;
      const stride=moving&&view.player.grounded?Math.sin(now/75)*.13:0;
      const model=mayModel(e.pos,facing,stride);
      const light=camera.project(model.lantern);
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
      if (game.tick<pulseUntil) glow(x,y,s*(7-(pulseUntil-game.tick)/6),'#ffe18299');
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
    const events=game.step({move:[
      axis(pressed('KeyD','ArrowRight'),pressed('KeyA','ArrowLeft')),
      axis(pressed('KeyW','ArrowUp'),pressed('KeyS','ArrowDown'))
    ],cam_yaw_deg:yaw,jump:pressed('Space'),interact:pressed('KeyE'),pulse:pressed('KeyF'),dash:pressed('ShiftLeft','ShiftRight')});
    if (events.some(e=>e.name==='pulse')) pulseUntil=game.tick+24;
    for(const event of events) if(tones[event.name]) sound(tones[event.name]);
    view=game.snapshot();
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
    if(game.state==='won'){
      total+=view.score;sound(1046,.55);
      if(night===3) showDialog('Bình Minh',`Tổng điểm ba Đêm: ${total}`,'Về menu',menu);
      else showDialog('Đảo đã sáng!',`${view.score} điểm · Tổng: ${total}`,'Đêm tiếp theo',()=>{night++;intro();});
    }else{
      sound(130,.6);
      showDialog('Đêm đã khép lại',`${view.score} điểm`,'Chơi lại Đêm',reset,[['Về menu',menu]]);
    }
  }
  requestAnimationFrame(loop);
}
function updateHud(){
  const lit=view.lanterns.filter(l=>l.lit).length;
  const seconds=Math.ceil(view.time_left_s);
  const values={lanterns:`${lit}/${view.lanterns.length}`,flames:String(view.player.flames),
    motes:`${view.player.carried}/${tuning.carry_capacity}`,
    time:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`,score:String(view.score)};
  for (const [id,value] of Object.entries(values)){
    if (hud[id].textContent!==value) hud[id].textContent=value;
  }
  hud.time.classList.toggle('urgent',seconds<=30);
  for(const [i,slot] of [...slots.children].entries()) slot.classList.toggle('filled',i<view.player.carried);
  cooldowns.textContent=`Shift · Lướt ${view.player.dash_cd_s?view.player.dash_cd_s.toFixed(1)+'s':'sẵn sàng'} | F · Tỏa sáng ${view.player.pulse_cd_s?view.player.pulse_cd_s.toFixed(1)+'s':'sẵn sàng'}`;
  document.body.classList.toggle('game-paused',paused);
  hud.progress.max=view.lanterns.length;
  hud.progress.value=lit;
  const near=view.lanterns.find(l=>!l.lit && Math.hypot(l.pos[0]-view.player.pos[0],l.pos[2]-view.player.pos[2])<=tuning.interact_radius);
  const hint=near && !paused && game.state==='playing'
    ? (view.player.carried ? `E · Nạp ánh sáng (${near.deposited}/${tuning.lantern_cost})` : 'Nhặt đom đóm để nạp đèn')
    : (night===3&&view.sim_tick%1800>=1680?'Gió mạnh sắp đến':view.wind.active?'Gió mạnh':'');
  if (status.textContent!==hint) status.textContent=hint;
}
requestAnimationFrame(loop);
