export const islandRadius = 34;
export const initialInput = () => ({move:[0,0], cam_yaw_deg:0, jump:false, interact:false, pulse:false});
const dist = (a,b) => Math.hypot(a[0]-b[0],a[2]-b[2]);
const round = pos => pos.map(n => Math.round(n*1000)/1000);

export function createGame(t, seed, scenario = {}) {
  let rng = seed >>> 0;
  function random() {
    rng = (Math.imul(rng,1664525)+1013904223) >>> 0;
    return rng / 4294967296;
  }
  const polar = (r,a,y=0) => [r*Math.cos(a),y,r*Math.sin(a)];
  const lanterns = Array.from({length:t.lantern_count_night1}, (_,i) => {
    const id = 'L'+(i+1);
    const patch = scenario.lanterns?.find(l => l.id === id);
    return {id,pos:polar(18,i*2*Math.PI/5),lit:false,deposited:0,...patch};
  });
  const motes = (scenario.motes ?? (scenario.random_motes === false ? [] :
    Array.from({length:70}, () => polar(30*Math.sqrt(random()),random()*2*Math.PI))))
    .map((pos,i) => ({id:'M'+(i+1),pos}));
  const shades = (scenario.shades ?? []).map((s,i) =>
    ({id:s.id ?? 'S'+(i+1),pos:s.pos,stunUntil:0}));
  const p = {pos:[0,0,0],carried:0,flames:t.flames,...scenario.player};
  const duration = scenario.time_left_s ?? t.night1_duration_s;
  let tick=0, score=0, state='playing', vy=0, invulnerable=0, pulseReady=0, shadeId=0;
  let previous = initialInput();
  const time = () => Math.max(0,duration-tick/60);
  const safe = pos => lanterns.some(l => l.lit && dist(pos,l.pos)<=t.safe_radius);

  function snapshot() {
    return {type:'snapshot',tick,sim_tick:tick,state,time_left_s:time(),score,
      player:{...p,pos:round(p.pos)},
      lanterns:lanterns.map(l => ({...l,pos:round(l.pos)})),
      shades:shades.map(s => ({id:s.id,pos:round(s.pos),state:tick<s.stunUntil?'stunned':'chase'})),
      motes_active:motes.length,motes:motes.map(m => ({id:m.id,pos:round(m.pos)}))};
  }

  function step(input) {
    if (state !== 'playing') return [];
    tick++;
    const events = [];
    const emit = (name,data) => events.push({type:'event',tick,name,data});
    const pressed = key => input[key] && !previous[key];
    const [dx,dz] = input.move;
    const a = input.cam_yaw_deg*Math.PI/180;
    const scale = t.player_speed/60/Math.max(1,Math.hypot(dx,dz));
    let [x,y,z] = p.pos;
    x += scale*(dx*Math.cos(a)+dz*Math.sin(a));
    z += scale*(-dx*Math.sin(a)+dz*Math.cos(a));
    const margin = Math.max(1,Math.hypot(x,z)/islandRadius);
    if (pressed('jump') && y===0) vy=5.5;
    if (y>0 || vy>0) {
      y=Math.max(0,y+vy/60);
      vy=y===0?0:vy-15/60;
    }
    p.pos=[x/margin,y,z/margin];

    for (let i=0;i<motes.length && p.carried<t.carry_capacity;) {
      if (dist(p.pos,motes[i].pos)>t.pickup_radius) { i++; continue; }
      motes.splice(i,1);
      p.carried++;
      score+=t.score.per_mote;
      emit('mote_picked',{carried:p.carried});
    }
    if (pressed('interact') && p.carried>0) {
      const l=lanterns.filter(l => !l.lit && dist(p.pos,l.pos)<=t.interact_radius)
        .sort((a,b)=>dist(a.pos,p.pos)-dist(b.pos,p.pos))[0];
      if (l) {
        const amount=Math.min(p.carried,Math.max(0,t.lantern_cost-l.deposited));
        p.carried-=amount;
        l.deposited+=amount;
        if (amount) emit('deposit',{lantern_id:l.id,amount,deposited:l.deposited});
        if (l.deposited>=t.lantern_cost) {
          l.lit=true;
          score+=t.score.per_lantern;
          emit('lantern_lit',{lantern_id:l.id});
        }
      }
    }
    if (pressed('pulse') && p.carried>=t.pulse_cost && tick>=pulseReady) {
      p.carried-=t.pulse_cost;
      pulseReady=tick+Math.round(t.pulse_cooldown_s*60);
      const stunned_ids=[];
      for (const s of shades) {
        const d=dist(p.pos,s.pos);
        if (d>t.pulse_radius) continue;
        const [sx,sy,sz]=s.pos;
        s.pos=d ? [sx+(sx-p.pos[0])*t.pulse_push_m/d,sy,sz+(sz-p.pos[2])*t.pulse_push_m/d] :
          [sx+t.pulse_push_m,sy,sz];
        s.stunUntil=tick+Math.round(t.pulse_stun_s*60);
        stunned_ids.push(s.id);
      }
      score+=stunned_ids.length*t.score.per_stun;
      emit('pulse',{stunned_ids});
    }
    if (scenario.random_shades!==false && (scenario.shades===undefined || scenario.random_shades===true) &&
        tick>=600 && (tick-600)%1080===0 && shades.length<5) {
      const pos=polar(32,random()*2*Math.PI,0.7);
      let id;
      do { id='S'+(++shadeId); } while (shades.some(s=>s.id===id));
      shades.push({id,pos,stunUntil:0});
      emit('shade_spawned',{id});
    }
    for (const s of shades) {
      if (tick<s.stunUntil) continue;
      const d=dist(p.pos,s.pos);
      if (d>0) {
        const k=Math.min(t.shade_speed/60/d,1);
        const [sx,sy,sz]=s.pos;
        const next=[sx+(p.pos[0]-sx)*k,sy,sz+(p.pos[2]-sz)*k];
        const blocking=lanterns.find(l=>l.lit && dist(next,l.pos)<=t.safe_radius);
        if (!blocking) s.pos=next;
        else {
          const [lx,,lz]=blocking.pos;
          const radius=t.safe_radius+0.001;
          const angle=Math.atan2(sz-lz,sx-lx)+t.shade_speed/60/radius;
          const around=[lx+radius*Math.cos(angle),sy,lz+radius*Math.sin(angle)];
          if (!safe(around)) s.pos=around;
        }
      }
      if (!safe(p.pos) && dist(p.pos,s.pos)<=t.shade_hit_radius && tick>=invulnerable && p.flames>0) {
        p.flames--;
        invulnerable=tick+Math.round(t.invuln_s*60);
        emit('player_hit',{by:'shade',flames:p.flames,dropped:0});
      }
    }
    const allLit=lanterns.every(l=>l.lit);
    if (allLit || p.flames===0 || time()===0) {
      state=allLit?'won':'lost';
      if (allLit) score+=Math.floor(time())*t.score.per_second_left+p.flames*t.score.per_flame_left;
      emit('game_over',{result:state,reason:allLit?'all_lit':p.flames===0?'no_flames':'dawn'});
    }
    previous={...input};
    return events;
  }
  return {step,snapshot,get tick(){return tick;},get state(){return state;},get score(){return score;}};
}
