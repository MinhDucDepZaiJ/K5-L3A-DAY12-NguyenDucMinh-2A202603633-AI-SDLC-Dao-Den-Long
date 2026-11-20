import {worlds,surfaces} from './world.mjs';
export const islandRadius=40;
export const initialInput=()=>({move:[0,0],cam_yaw_deg:0,jump:false,interact:false,pulse:false,dash:false,pause:false});
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const distance3=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const unit=(x,z)=>{const m=Math.hypot(x,z);return m?[x/m,z/m]:[1,0];};
const away=(a,b)=>unit(a[0]-b[0],a[2]-b[2]);
const round=pos=>pos.map(n=>Math.round(n*1000)/1000);
const idOrder=(a,b)=>a.id.localeCompare(b.id,'en',{numeric:true});
const expired=(until,tick)=>Math.max(0,until-tick);
const raised=(a,b)=>Math.abs(a[1]-b[1])<=1.5;
const terminal=state=>state==='won'||state==='lost';

export function createGame(t,seed,s={},night=1){
  const world=worlds[night];
  let rng=seed>>>0,tick=0,sim=0,score=0,state='playing',previous=initialInput();
  const random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
  const choose=items=>items[Math.floor(random()*items.length)];
  const p={pos:[0,0,0],carried:0,flames:3,...s.player};
  let vel=[0,0,0],grounded=surfaces(night,p.pos[0],p.pos[2]).includes(p.pos[1]);
  let facing=[0,1],dashDir=[0,1],launch=null,dashUntil=0,respawn=0;
  let invuln=s.player?.invuln_ticks??0,dashReady=s.player?.dash_cd_ticks??0;
  let pulseReady=s.player?.pulse_cd_ticks??0,charmUntil=s.player?.charm_ticks??0;
  const duration=s.time_left_s??t[`night${night}_duration_s`];
  const time=()=>Math.max(0,duration-sim/60);
  const maxFuel=t.fuel_max*60, lowFuel=t.low_fuel_threshold*60;
  let lights=p.successful_lights??0;
  const capacity=()=>Math.min(t.capacity_max,t.carry_capacity+2*lights);
  const fuelValue=l=>Math.round(l.fuelUnits/6)/10;
  const nearest=(list,pos)=>list.sort((a,b)=>dist(a.pos,pos)-dist(b.pos,pos)||idOrder(a,b))[0];
  const lanterns=world.lamps.map((pos,i)=>{
    const id='L'+(i+1),patch=s.lanterns?.find(l=>l.id===id);
    const lamp={id,pos,lit:false,deposited:0,...patch};
    const fuelUnits=lamp.lit?Math.round((patch?.fuel??t.fuel_max)*60):0;
    return {...lamp,fuelUnits,ever_lit:lamp.lit||Boolean(patch?.ever_lit),relit_count:0};
  });
  let moteId=0,shadeId=0,drifterId=0;
  const motes=[];
  const addMote=(pos,kind='random')=>motes.push({id:'M'+(++moteId),pos,kind,until:kind==='dropped'?sim+480:null});
  const spawnMote=()=>{
    const points=world.motes.filter(pos=>!motes.some(m=>distance3(m.pos,pos)<0.001));
    if(points.length) addMote(choose(points));
  };
  if(s.motes) for(const pos of s.motes) addMote(pos);
  else if(s.random_motes!==false) for(let i=0;i<20;i++) spawnMote();
  const shades=(s.shades??[]).map((q,i)=>({id:q.id??'S'+(i+1),pos:q.pos,state:q.state??'chase',
    until:q.state_ticks_left??0,pushUntil:0,target:q.target_lantern_id,drainTicks:0,dir:[1,0],recoilUntil:q.state_ticks_left??0,recoilDir:[1,0]})).sort(idOrder);
  const drifters=(s.drifters??[]).map((q,i)=>({id:q.id??'D'+(i+1),pos:q.pos,state:q.state??'idle',
    stolen:q.stolen??0,until:q.state_ticks_left??(q.state==='flee'?240:0),dir:away(q.pos,p.pos)})).sort(idOrder);
  const charms=(s.charms??(world.charms??[]).map(pos=>({pos}))).map((q,i)=>({id:q.id??'C'+(i+1),
    pos:q.pos??world.charms?.[i]??[0,0,0],until:q.available===false?(q.respawn_ticks??2700):0}));
  const wind={active:false,dir_deg:0};
  const safeAt=pos=>lanterns.find(l=>l.lit&&l.fuelUnits>=lowFuel&&dist(l.pos,pos)<=t.safe_radius);
  const nextId=(prefix,list,next)=>{let id;do{id=prefix+next();}while(list.some(q=>q.id===id));return id;};
  const onGround=(pos)=>surfaces(night,pos[0],pos[2]).some(h=>Math.abs(h-pos[1])<.01);

  function snapshot(){
    return {type:'snapshot',tick,sim_tick:sim,night,state,time_left_s:time(),score,wind:{...wind},
      player:{pos:round(p.pos),flames:p.flames,carried:p.carried,capacity:capacity(),vel:round(vel),grounded,
        invuln:sim<invuln,dash_cd_s:sim<charmUntil?0:expired(dashReady,sim)/60,
        pulse_cd_s:expired(pulseReady,sim)/60,charm_s:expired(charmUntil,sim)/60},
      lanterns:lanterns.map(({fuelUnits,...l})=>({...l,pos:round(l.pos),fuel:fuelValue({fuelUnits})})),
      shades:shades.map(q=>({id:q.id,pos:round(q.pos),state:q.state})),
      motes_active:motes.length,motes:motes.map(m=>({id:m.id,pos:round(m.pos),kind:m.kind,
        ttl_s:m.until===null?null:expired(m.until,sim)/60})),
      drifters:drifters.filter(d=>d.state!=='removed').map(d=>({id:d.id,pos:round(d.pos),state:d.state,stolen:d.stolen})),
      charms:charms.map(c=>({id:c.id,available:sim>=c.until,respawn_s:expired(c.until,sim)/60}))};
  }

  function movePlayer(input,pressed,emit){
    const [dx,dz]=input.move, a=input.cam_yaw_deg*Math.PI/180;
    const mag=Math.max(1,Math.hypot(dx,dz)), x=(dx*Math.cos(a)+dz*Math.sin(a))/mag;
    const z=(-dx*Math.sin(a)+dz*Math.cos(a))/mag;
    if(Math.hypot(x,z)>0) facing=unit(x,z);
    if(pressed('dash')&&sim>=dashUntil&&(sim>=dashReady||sim<charmUntil)){
      dashUntil=sim+12;
      dashReady=sim+90;
      dashDir=[...facing];
      emit('dash',{});
    }
    if(pressed('jump')&&grounded){
      vel[1]=7;
      grounded=false;
    }
    const pad=grounded&&world.pads?.find(q=>dist(p.pos,q.pos)<=1&&onGround(q.pos)&&Math.abs(p.pos[1]-q.pos[1])<.1);
    if(pad){
      launch=away(pad.target,pad.pos).map(v=>v*pad.speed);
      vel[1]=pad.up;
      grounded=false;
    }
    const dashing=sim<dashUntil, speed=sim<charmUntil?7.2:t.player_speed;
    [vel[0],vel[2]]=dashing?dashDir.map(v=>v*t.dash_speed):launch??[x*speed,z*speed];
    const [ox,oy,oz]=p.pos;
    const angle=wind.dir_deg*Math.PI/180;
    let nx=ox+(vel[0]+(wind.active?2*Math.cos(angle):0))/60;
    let nz=oz+(vel[2]+(wind.active?2*Math.sin(angle):0))/60;
    let ny=oy;
    if(!grounded&&!dashing){
      ny+=vel[1]/60-10/3600;
      vel[1]-=20/60;
    }
    let levels=surfaces(night,nx,nz);
    const tower=night===3&&Math.hypot(nx,nz)<2&&ny>=5.95&&ny<14;
    if(tower || levels.some(h=>h>Math.max(oy,ny)+.13 && ((h===6&&oy<6&&ny>=3)||(h===3&&oy<3&&ny>=0)))){
      nx=ox;nz=oz;
      levels=surfaces(night,nx,nz);
    }
    const ground=levels.filter(h=>h<=oy+(grounded?.13:1e-6)).sort((a,b)=>b-a)[0];
    if((grounded&&ground!==undefined&&Math.abs(ground-oy)<=.13)||
        (!grounded&&!dashing&&vel[1]<=0&&ground!==undefined&&ny<=ground)){
      ny=ground;grounded=true;vel[1]=0;launch=null;
    }else if(grounded){
      grounded=false;vel[1]=0;
    }
    p.pos=[nx,ny,nz];
    if(ny< -10){
      const lost=p.carried;
      p.carried=0;
      p.flames=Math.max(0,p.flames-1);
      respawn=sim+60;
      emit('player_hit',{by:'fall',flames:p.flames,dropped:0,lost});
    }
  }

  function collect(emit){
    for(let i=0;i<motes.length&&p.carried<capacity();){
      const m=motes[i];
      if(dist(p.pos,m.pos)>1||!raised(p.pos,m.pos)){i++;continue;}
      motes.splice(i,1);
      emit('mote_picked',{carried:++p.carried});
    }
    for(const c of charms){
      if(sim<c.until||dist(p.pos,c.pos)>1||!raised(p.pos,c.pos)) continue;
      c.until=sim+2700;
      charmUntil=sim+600;
      emit('charm_picked',{charm_id:c.id,charm_ticks:600});
    }
  }

  function updateFuel(emit){
    for(const lamp of lanterns){
      if(!lamp.lit) continue;
      lamp.fuelUnits-=t.fuel_decay_per_s;
      const draining=shades.filter(q=>q.state==='drain'&&q.target===lamp.id);
      for(const q of draining){
        lamp.fuelUnits-=t.drain_per_s;
        q.drainTicks=(q.drainTicks??0)+1;
      }
      lamp.fuelUnits=Math.max(0,lamp.fuelUnits);
      for(const q of draining){
        if(q.drainTicks%60===0) emit('fuel_drain',{lantern_id:lamp.id,shade_id:q.id,fuel:fuelValue(lamp)});
      }
      if(lamp.fuelUnits===0){
        lamp.lit=false;lamp.deposited=0;
        emit('lantern_out',{lantern_id:lamp.id});
      }
    }
  }

  function interact(emit){
    const target=nearest(lanterns.filter(l=>(!l.lit||l.fuelUnits<maxFuel)&&dist(p.pos,l.pos)<=t.interact_radius),p.pos);
    if(!target||!p.carried) return;
    if(target.lit){
      const amount=Math.min(p.carried,Math.ceil((maxFuel-target.fuelUnits)/(60*t.fuel_per_mote)));
      target.fuelUnits=Math.min(maxFuel,target.fuelUnits+amount*t.fuel_per_mote*60);
      p.carried-=amount;score+=t.score.per_mote*amount;
      emit('refuel',{lantern_id:target.id,amount,fuel:fuelValue(target)});
      return;
    }
    const relight=target.ever_lit,cost=relight?t.relight_cost:t.lantern_cost;
    const amount=Math.min(p.carried,Math.max(0,cost-target.deposited));
    target.deposited+=amount;p.carried-=amount;score+=t.score.per_mote*amount;
    if(amount) emit('deposit',{lantern_id:target.id,amount,deposited:target.deposited});
    if(target.deposited>=cost){
      target.lit=true;target.ever_lit=true;target.fuelUnits=maxFuel;lights++;
      if(relight) target.relit_count++;
      score+=relight?t.score.per_relight:t.score.per_lantern;
      emit('lantern_lit',{lantern_id:target.id,relight});
    }
  }

  function pulse(emit){
    p.carried-=3;pulseReady=sim+180;
    const center=[p.pos[0],p.pos[1]+.8,p.pos[2]],stunned_ids=[];
    for(const q of shades){
      if(q.state==='spawning'||distance3(center,q.pos)>5) continue;
      score+=q.state==='drain'?t.score.per_stun_drain:t.score.per_stun;
      q.state='stunned';q.until=sim+120;q.pushUntil=sim+15;q.dir=away(q.pos,p.pos);
      stunned_ids.push(q.id);
    }
    emit('pulse',{stunned_ids});
    for(const d of drifters){
      if(distance3(center,d.pos)>5) continue;
      if(d.state==='chase'){
        d.state='flee';d.until=sim+240;
      }else if(d.state==='flee'&&d.stolen>0){
        const amount=d.stolen;
        for(let i=0;i<amount;i++) addMote(d.pos,'dropped');
        d.stolen=0;d.until=sim+120;
        emit('drifter_drop',{drifter_id:d.id,amount});
      }
    }
  }

  function moveShade(q){
    if(q.state==='spawning'&&sim<q.until) return;
    if(q.state==='drain'){
      const target=lanterns.find(l=>l.id===q.target);
      if(dist(p.pos,q.pos)<=6) q.state='chase';
      else if(!target?.lit||target.fuelUnits>=lowFuel||dist(q.pos,target.pos)>2){
        q.state='wander';q.drainTicks=0;
        if(!safeAt(q.pos)) return;
      }
      else return;
      q.drainTicks=0;
    }
    const safe=safeAt(q.pos);
    if(safe){
      const [dx,dz]=away(q.pos,safe.pos);
      const r=Math.min(6.0001,dist(q.pos,safe.pos)+6/30);
      q.pos=[safe.pos[0]+dx*r,q.pos[1],safe.pos[2]+dz*r];
      return;
    }
    if(q.state==='stunned'&&sim<q.until){
      if(sim<q.pushUntil){
        const next=[q.pos[0]+q.dir[0]*4/15,q.pos[1],q.pos[2]+q.dir[1]*4/15];
        if(!safeAt(next)&&surfaces(night,next[0],next[2]).includes(0)) q.pos=next;
        else q.pushUntil=sim;
      }
      return;
    }
    if(q.state==='stunned'){q.state='wander';return;}
    let direction,speed;
    if(q.state==='recoil'&&sim<q.recoilUntil){
      direction=q.recoilDir;speed=2;
    }else{
      const d=dist(q.pos,p.pos);
      const weak=!s.benchmark&&q.state!=='chase'&&nearest(lanterns.filter(l=>l.lit&&l.fuelUnits<lowFuel),q.pos);
      q.state=!s.benchmark&&!weak&&d<=(q.state==='chase'?18:12)?'chase':'wander';
      speed=night===3?4.5:t.shade_speed;
      const target=q.state==='chase'?{pos:p.pos}:weak||nearest(lanterns.filter(l=>!l.lit),q.pos);
      direction=target?away(target.pos,q.pos):[Math.cos(sim/180),Math.sin(sim/180)];
      if(target) speed=Math.min(speed,dist(target.pos,q.pos)*60);
      if(weak&&dist(q.pos,weak.pos)<=2){
        q.state='drain';q.target=weak.id;q.drainTicks=0;
        return;
      }
    }
    const next=[q.pos[0]+direction[0]*speed/60,q.pos[1],q.pos[2]+direction[1]*speed/60];
    const lantern=safeAt(next);
    if(lantern){
      const [dx,dz]=away(next,lantern.pos);
      const border=[lantern.pos[0]+dx*6.0001,q.pos[1],lantern.pos[2]+dz*6.0001];
      if(!safeAt(border)&&surfaces(night,border[0],border[2]).includes(0)) q.pos=border;
    }else if(surfaces(night,next[0],next[2]).includes(0)) q.pos=next;
  }

  function moveDrifter(d){
    if(d.state==='removed') return;
    if(d.state==='flee'){
      if(sim>=d.until){d.state='removed';return;}
      d.dir=away(d.pos,p.pos);
    }else{
      d.state=p.carried>=5&&dist(d.pos,p.pos)<=15?'chase':'idle';
      d.dir=d.state==='chase'?away(p.pos,d.pos):[Math.cos(sim/180),Math.sin(sim/180)];
    }
    const speed=d.state==='idle'?2:7;
    d.pos=[d.pos[0]+d.dir[0]*speed/60,d.pos[1],d.pos[2]+d.dir[1]*speed/60];
  }

  function contacts(emit){
    for(const d of drifters){
      if(d.state!=='chase'||dist(d.pos,p.pos)>1.2) continue;
      const amount=Math.min(3,p.carried);
      p.carried-=amount;d.stolen=amount;d.state='flee';d.until=sim+240;
      emit('drifter_steal',{drifter_id:d.id,amount,carried:p.carried});
    }
    if(sim<invuln||safeAt(p.pos)||!p.flames) return;
    const hit=shades.find(q=>['chase','wander'].includes(q.state)&&!safeAt(q.pos)&&dist(q.pos,p.pos)<=1&&raised(q.pos,p.pos));
    if(!hit) return;
    const dropped=Math.floor(p.carried/2);
    p.carried-=dropped;p.flames--;invuln=sim+90;
    for(let i=0;i<dropped;i++){
      const a=random()*2*Math.PI,r=1.5+random();
      addMote([p.pos[0]+r*Math.cos(a),p.pos[1],p.pos[2]+r*Math.sin(a)],'dropped');
    }
    hit.state='recoil';hit.recoilUntil=sim+60;hit.recoilDir=away(hit.pos,p.pos);
    emit('player_hit',{by:'shade',flames:p.flames,dropped});
  }

  function spawn(emit){
    if(s.random_motes!==false&&sim%240===0&&motes.length<30) spawnMote();
    if(s.random_shades!==false&&(s.shades===undefined||s.random_shades===true)&&
      sim>=300&&(sim-300)%world.interval===0){
      const amount=sim===300?2:1;
      for(let i=0;i<amount&&shades.length<world.limit;i++){
        const points=world.fog.filter(pos=>dist(pos,p.pos)>=15&&!safeAt(pos)&&!shades.some(q=>dist(q.pos,pos)<1));
        if(!points.length) break;
        const id=nextId('S',shades,()=>++shadeId),pos=choose(points);
        shades.push({id,pos:[pos[0],.8,pos[2]],state:'spawning',until:sim+1,pushUntil:0});
        shades.sort(idOrder);
        emit('shade_spawned',{id});
      }
    }
    if(night>1&&s.random_drifters!==false&&(s.drifters===undefined||s.random_drifters===true)&&sim%1200===0&&
      drifters.filter(d=>d.state!=='removed').length<2){
      const id=nextId('D',drifters,()=>++drifterId),[x,,z]=choose(world.fog);
      drifters.push({id,pos:[x,.8,z],state:'idle',stolen:0,until:0,dir:[1,0]});
      drifters.sort(idOrder);
    }
  }

  function step(input){
    if(terminal(state)) return [];
    tick++;
    const events=[];
    const emit=(name,data)=>events.push({type:'event',tick,name,data});
    const pressed=key=>input[key]&&!previous[key];
    if(s.benchmark){
      sim++;
      for(const shade of shades) moveShade(shade);
      return events;
    }
    if(tick===1) emit('night_start',{night});
    if(pressed('pause')){
      state=state==='paused'?'playing':'paused';
      emit(state==='paused'?'paused':'resumed',{});
    }
    if(state==='paused'){previous={...input};return events;}
    sim++;
    updateFuel(emit);
    if(night===3&&s.wind_enabled!==false){
      if(sim%1800===1680) wind.dir_deg=Math.floor(random()*360);
      wind.active=sim>=1800&&sim%1800<300;
    }
    for(let i=motes.length-1;i>=0;i--) if(motes[i].until!==null&&sim>=motes[i].until) motes.splice(i,1);
    if(respawn&&sim>=respawn){
      p.pos=[0,0,0];vel=[0,0,0];grounded=true;
      launch=null;dashUntil=0;respawn=0;invuln=sim+90;
    }
    if(!respawn&&p.flames>0) movePlayer(input,pressed,emit);
    if(!respawn){
      collect(emit);
      if(pressed('interact')) interact(emit);
      if(pressed('pulse')&&sim>=pulseReady&&p.carried>=3) pulse(emit);
    }
    for(const d of drifters) moveDrifter(d);
    for(const q of shades) moveShade(q);
    if(!respawn) contacts(emit);
    spawn(emit);
    const lit=lanterns.filter(l=>l.lit);
    const enough=lit.length>=Math.ceil(t.win_ratio*lanterns.length);
    const reason=p.flames===0?'no_flames':time()===0?(enough?'dawn_survived':'dawn'):null;
    if(reason){
      state=reason==='dawn_survived'?'won':'lost';
      if(state==='won') score+=lit.reduce((sum,l)=>sum+t.score.per_dawn_lantern+Math.floor(l.fuelUnits/60),0)
        +p.flames*t.score.per_flame_left;
      emit('game_over',{result:state,reason});
    }
    previous={...input};
    return events;
  }
  return {step,snapshot,get tick(){return tick;},get state(){return state;},get score(){return score;}};
}
