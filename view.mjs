import {orbitCamera} from './camera.mjs';
import {createGame,islandRadius} from './game.mjs';
const {tuning}=await fetch('./game.contract.json').then(response=>response.json());
const canvas=document.querySelector('canvas');
const ctx=canvas.getContext('2d');
const hud=document.querySelector('#hud');
const status=document.querySelector('#status');
const modal=document.querySelector('aside');
const keys=new Set();
const controls=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyZ','KeyE','KeyF'];
addEventListener('keydown',event=>{
  if (controls.includes(event.code)) event.preventDefault();
  keys.add(event.code);
});
addEventListener('keyup',event=>keys.delete(event.code));
addEventListener('blur',()=>keys.clear());
let game, view, yaw, pitch, accumulator, pulseUntil;
let drag = null;
const wrapYaw = angle => ((angle % 360) + 360) % 360;
canvas.addEventListener('pointerdown', event => {
  if (drag || event.button !== 0 || game.state !== 'playing') return;
  drag = {id:event.pointerId,x:event.clientX,y:event.clientY};
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('orbiting');
});
canvas.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  yaw = wrapYaw(yaw + (event.clientX - drag.x) * 0.36);
  pitch = Math.max(8, Math.min(65, pitch + (event.clientY - drag.y) * 0.28));
  drag.x = event.clientX;
  drag.y = event.clientY;
});
canvas.addEventListener('lostpointercapture', () => {
  drag = null;
  canvas.classList.remove('orbiting');
});
function reset(){
  game=createGame(tuning,42);
  view=game.snapshot();
  yaw=0;
  pitch=26;
  accumulator=0;
  pulseUntil=0;
  keys.clear();
  modal.hidden=true;
}
modal.querySelector('button').onclick=reset;
reset();
let last=performance.now();
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
  sky.addColorStop(0,'#0c1022'); sky.addColorStop(1,'#513a65');
  ctx.fillStyle=sky; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#f1ddaf';
  for (const [x,y,r] of stars) ctx.fillRect(x*w,y*h*.72,r,r);
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
  const ground=(r,y)=>circle.map(([x,z])=>[x*r,y,z*r]);
  const rim=ground(islandRadius,0), base=ground(islandRadius*.93,-3);
  for (let i=0;i<rim.length;i++){
    const next=(i+1)%rim.length;
    polygon([rim[i],rim[next],base[next],base[i]],i%2?'#2e243d':'#272037');
  }
  polygon(rim,`hsl(${164-lit*9} 25% ${20+lit*4}%)`);
  for (const [cx,cz] of circle.filter((_,i)=>i%4===0)){
    const point=camera.project([cx*32,0,cz*32]);
    if (!point) continue;
    const [x,y,s]=point;
    disk(x,y,s*.22,'#788975');
  }
  const entities=[
    ...view.motes.map((m,i)=>({kind:'mote',...m,i})),
    ...view.lanterns.map(l=>({kind:'lantern',...l})),
    ...view.shades.map(s=>({kind:'shade',...s})),
    {kind:'player',pos:[px,py,pz]}
  ];
  const visible=entities.map(e=>({e,point:camera.project(e.pos)}))
    .filter(({point})=>point)
    .sort((a,b)=>b.point[3]-a.point[3]);
  for (const {e,point:[x,y,s]} of visible){
    if (e.kind==='mote'){
      const b=y-s*(.55+Math.sin(now/220+e.i)*.18);
      glow(x,b,s*.95,'#ffc351aa');
      disk(x,b,s*.125,'#fff2b3');
    } else if (e.kind==='lantern'){
      if (e.lit) glow(x,y-1.7*s,4*s,'#ffb24e8a');
      ctx.fillStyle='#78614d';ctx.fillRect(x-.10*s,y-2.1*s,.20*s,2.1*s);
      disk(x,y-2.1*s,.61*s,e.lit?'#ffc35e':'#9b6858');
      ctx.fillStyle='#fff0cb';ctx.font='12px system-ui';ctx.fillText(e.id,x+8,y-2.5*s);
    } else if (e.kind==='shade'){
      disk(x,y-.35*s,s*.70,e.state==='stunned'?'#7f55ae':'#201432');
      disk(x-.19*s,y-.49*s,s*.09,'#d6adff');disk(x+.19*s,y-.49*s,s*.09,'#d6adff');
    } else {
      disk(x,y-.63*s,s*.43,'#48aeb0');
      disk(x,y-1.15*s,s*.33,'#ebae83');
      const hat=circle.filter((_,i)=>i%6===0)
        .map(([dx,dz])=>[px+dx*.62,py+1.28,pz+dz*.62]);
      const top=[px,py+1.78,pz];
      const faces=hat.map((corner,i)=>{
        const next=hat[(i+1)%hat.length];
        return {vertices:[corner,next,top],color:i%2?'#efc379':'#dba865',
          depth:camera.project(corner)[3]+camera.project(next)[3]};
      });
      faces.sort((a,b)=>b.depth-a.depth);
      for (const face of faces) polygon(face.vertices,face.color);
      glow(x+.45*s,y-1.04*s,.8*s,'#ffa545a0');
      disk(x+.45*s,y-1.04*s,.15*s,'#ffd07e');
      if (game.tick<pulseUntil) glow(x,y,s*(7-(pulseUntil-game.tick)/6),'#ffe18299');
    }
  }
}
function loop(now){
  accumulator+=Math.min(.15,(now-last)/1000);
  last=now;
  while (accumulator>=1/60 && game.state==='playing'){
    accumulator-=1/60;
    yaw=wrapYaw(yaw+axis(pressed('KeyQ'),pressed('KeyZ'))*2);
    const events=game.step({move:[
      axis(pressed('KeyD','ArrowRight'),pressed('KeyA','ArrowLeft')),
      axis(pressed('KeyW','ArrowUp'),pressed('KeyS','ArrowDown'))
    ],cam_yaw_deg:yaw,jump:pressed('Space'),interact:pressed('KeyE'),pulse:pressed('KeyF')});
    if (events.some(e=>e.name==='pulse')) pulseUntil=game.tick+24;
    view=game.snapshot();
  }
  draw(now);
  hud.textContent=`Lửa ${view.player.flames} · Đom đóm ${view.player.carried}/${tuning.carry_capacity} · Đèn ${view.lanterns.filter(l=>l.lit).length}/5 · ${Math.ceil(view.time_left_s)} s · ${view.score} điểm`;
  const near=view.lanterns.find(l=>!l.lit && Math.hypot(l.pos[0]-view.player.pos[0],l.pos[2]-view.player.pos[2])<=tuning.interact_radius);
  status.textContent=near?`E · Nạp đèn ${near.id} (${near.deposited}/${tuning.lantern_cost})`:'';
  if (game.state!=='playing' && modal.hidden){
    modal.querySelector('h2').textContent=game.state==='won'?'Đảo đã sáng!':'Đêm đã khép lại';
    modal.hidden=false;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
