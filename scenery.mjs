import {worlds,surfaces} from './world.mjs';

const stone=['#b2a78e','#c9b48a','#9e9d87'];
const grass=['#476b50','#587759','#385e46'];
const disc=(x,y,z,r,n,angle=0)=>Array.from({length:n},(_,i)=>{
  const a=angle+i*2*Math.PI/n;
  return [x+r*Math.cos(a),y,z+r*Math.sin(a)];
});

export const lanternMesh=(lit,dim)=>{
  const faces=[];
  function tier(bottom,top,colors){
    const lo=disc(0,bottom[0],0,bottom[1],6,Math.PI/6);
    const hi=disc(0,top[0],0,top[1],6,Math.PI/6);
    for(let i=0;i<6;i++){
      const n=(i+1)%6;
      faces.push({vertices:[lo[i],lo[n],hi[n],hi[i]],color:colors[i%colors.length]});
    }
    faces.push({vertices:hi,color:colors[0]});
  }
  tier([.02,.51],[.16,.39],['#8c8277','#655e59']);
  tier([.16,.12],[1.25,.085],['#6b4a2f','#4b3327']);
  tier([1.25,.36],[1.36,.43],['#594034','#795638']);
  const top=lit?2.03:1.896;
  tier([1.36,.38],[top,.40],lit&&!dim?['#ffb347','#ffe9b0','#d98b3e']:['#5b5f6e','#45495b']);
  tier([top,.53],[top+.34,.12],['#5c3236','#88494a','#704044']);
  tier([top+.34,.09],[top+.45,.035],['#f2c14e','#9c7336']);
  if(!lit) faces.push({vertices:[[.28,1.44,.20],[.28,1.85,.20],[.15,1.66,.32],[.24,1.68,.24]],color:'#272536'});
  return faces;
};

export function treeMesh(){
  const faces=[];
  for(const [y,r,h,color] of [[0,.16,1.35,'#6b4a2f'],[1.02,.86,1.18,'#305845'],[1.58,.66,1.07,'#4b7354']]){
    const base=disc(0,y,0,r,5),tip=[0,y+h,0];
    for(let i=0;i<base.length;i++){
      const n=(i+1)%base.length;
      faces.push({vertices:y===0?[base[i],base[n],[base[n][0],h,base[n][2]],[base[i][0],h,base[i][2]]]:
        [base[i],base[n],tip],color:i%2?color:y===0?'#503b30':'#385e49'});
    }
  }
  return faces;
}

export function decorations(night){
  const world=worlds[night],ground=[],trees=[],paving=[];
  for(const [cx,r] of world.islands){
    const paths=world.lamps.filter(([x,y,z])=>Math.hypot(x-cx,z)<r&&y===0);
    if(night===2) paths.push([cx===0?28:42,0,0]);
    for(const [x,,z] of paths){
      const dx=x-cx,dz=z,d=Math.hypot(dx,dz),ux=dx/d,uz=dz/d;
      for(let step=1;step<d;step+=1.24){
        for(const side of [-1,1]){
          const offset=side*.54;
          const sx=cx+ux*step-uz*offset,sz=uz*step+ux*offset;
          paving.push({vertices:disc(sx,.025,sz,.63,6,step*.14),color:stone[paving.length%3]});
        }
      }
    }
    const farFromPath=(x,z)=>paths.every(([tx,,tz])=>{
      const dx=tx-cx,dz=tz,at=Math.max(0,Math.min(1,((x-cx)*dx+z*dz)/(dx*dx+dz*dz)));
      return Math.hypot(x-cx-at*dx,z-at*dz)>2.1;
    });
    for(let i=0;i<70;i++){
      const a=i*2.399963,dist=r*(.13+.77*Math.sqrt((i+.5)/70)),x=cx+dist*Math.cos(a),z=dist*Math.sin(a);
      if(!farFromPath(x,z)) continue;
      const y=Math.max(0,...surfaces(night,x,z));
      if(night===3&&y!==0&&y!==3&&y!==6) continue;
      if(i%9===2&&y<6&&world.lamps.every(([lx,,lz])=>Math.hypot(lx-x,lz-z)>3)){
        trees.push([x,y,z]);
      }else{
        ground.push({vertices:[[x-.3,y+.04,z-.12],[x,y+.22,z],[x+.28,y+.04,z+.05],[x,y+.04,z+.25]],color:grass[i%3]});
      }
    }
  }
  return {paving,ground,trees};
}
