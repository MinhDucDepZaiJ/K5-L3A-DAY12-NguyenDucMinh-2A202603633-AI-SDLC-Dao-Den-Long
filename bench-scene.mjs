export function rngFor(seed){
  let state=seed>>>0;
  return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
}
export function benchmarkScene(seed){
  const random=rngFor(seed);
  function position(radius,y){
    const r=radius*Math.sqrt(random()),a=random()*2*Math.PI;
    return [r*Math.cos(a),y,r*Math.sin(a)];
  }
  return {benchmark:true,random_motes:false,random_shades:false,
    shades:Array.from({length:200},()=>({pos:position(39,.8),state:'wander'})),
    motes:Array.from({length:100},()=>position(39,0)),
    lanterns:[1,2,3].map(i=>({id:'L'+i,lit:true}))};
}
export function frameStats(samples){
  if(!samples.length) throw new Error('Không có khung hình benchmark.');
  const sorted=[...samples].sort((a,b)=>a-b),n=sorted.length,k=Math.max(1,Math.ceil(n*.01));
  return {avg_fps:1000*n/sorted.reduce((a,b)=>a+b,0),
    p1_low_fps:1000*k/sorted.slice(-k).reduce((a,b)=>a+b,0),
    frame_ms_p95:sorted[Math.ceil(n*.95)-1],frames:n};
}
