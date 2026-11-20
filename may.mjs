const SIDES=10;
const rings=Array.from({length:SIDES},(_,i)=>{
  const a=i*2*Math.PI/SIDES;
  return [Math.cos(a),Math.sin(a)];
});
const silk=['#e8e2d0','#c7bda9','#fff2d9'];
const hair=['#211927','#342335','#493044'];
const skin=['#eaba97','#cc8d77','#ffd0ac'];
const red=['#c8102e','#93112c','#f14a52'];

export function mayModel(pos,yaw,stride,survival=false){
  const faces=[];
  const c=Math.cos(yaw),s=Math.sin(yaw);
  const point=([x,y,z])=>[pos[0]+x*c+z*s,pos[1]+y,pos[2]-x*s+z*c];
  const face=(vertices,color)=>faces.push({vertices:vertices.map(point),color});
  function loft(sections,colors){
    const slices=sections.map(([x,y,z,rx,rz])=>rings.map(([u,v])=>[x+rx*u,y,z+rz*v]));
    for(let j=1;j<slices.length;j++){
      for(let i=0;i<SIDES;i++){
        const n=(i+1)%SIDES;
        const color=colors[i%5===0?2:i>4?1:0];
        face([slices[j-1][i],slices[j-1][n],slices[j][n],slices[j][i]],color);
      }
    }
    face(slices[0],colors[1]);
    face(slices.at(-1),colors[0]);
  }
  for(const side of [-1,1]){
    const step=stride*side;
    loft([[side*.11,.11,step,.065,.066],[side*.11,.51,step*.45,.075,.073],
      [side*.11,.88,0,.085,.08]],silk);
    loft([[side*.11,.025,step+.035,.077,.118],[side*.11,.105,step+.035,.068,.106]],hair);
  }

  // Two silk panels hang separately at the front and back over the trousers.
  for(const front of [-1,1]){
    const top=.104*front, hem=(.145+front*stride*.27)*front;
    for(const side of [-1,1]){
      face([[0,.93,top],[side*.168,.93,top*.70],[side*.235,.24,hem*.66],[0,.21,hem]],silk[side===1?0:1]);
      face([[0,.242,hem],[side*.232,.272,hem*.66],[side*.235,.24,hem*.66],[0,.21,hem]],red[0]);
    }
  }
  loft([[0,.87,0,.164,.112],[0,1.06,0,.143,.104],[0,1.31,0,.215,.113],
    [0,1.39,0,.107,.087]],silk);
  loft([[0,1.36,0,.090,.083],[0,1.46,0,.077,.074]],red);
  face([[.024,1.356,.098],[.173,1.233,.091],[.16,1.214,.096],[.009,1.347,.100]],red[0]);

  const leftSwing=-stride*.62;
  loft([[-.29,.91,leftSwing,.058,.058],[-.27,1.07,leftSwing*.5,.064,.062],[-.192,1.31,0,.075,.071]],silk);
  loft([[-.29,.85,leftSwing,.045,.045],[-.29,.94,leftSwing,.052,.052]],skin);
  loft([[.32,1.03,.25,.060,.061],[.33,1.09,.09,.067,.068],[.195,1.31,0,.075,.072]],silk);
  loft([[.32,1.02,.275,.046,.056],[.32,1.10,.286,.053,.055]],skin);

  // Long hair falls over the back, with framing strands beside the face.
  loft([[0,1.03,-.155,.109,.047],[0,1.35,-.146,.154,.078],[0,1.66,-.047,.166,.143],
    [0,1.81,-.025,.085,.078]],hair);
  loft([[0,1.435,.048,.07,.065],[0,1.52,.042,.124,.100],[0,1.67,.025,.147,.120],
    [0,1.76,.010,.108,.092]],skin);
  loft([[0,1.685,-.028,.161,.143],[0,1.785,-.025,.134,.120],[0,1.835,-.022,.051,.054]],hair);
  for(const side of [-1,1]){
    loft([[side*.122,1.43,.03,.031,.041],[side*.139,1.67,.018,.044,.060]],hair);
    face([[side*.045,1.612,.144],[side*.085,1.616,.130],[side*.079,1.594,.136],
      [side*.046,1.593,.147]],'#352338');
  }

  // Woven palm-leaf hat and a short red chin strap.
  loft([[0,1.74,0,.34,.34],[0,1.775,0,.35,.35],[0,1.99,0,.036,.036],[0,2.01,0,.004,.004]],
    ['#e7c890','#ba925f','#f6ddad']);
  loft([[0,1.745,0,.345,.345],[0,1.756,0,.349,.349]],['#8d6749','#6b4a34','#c09c6c']);
  for(const side of [-1,1]){
    face([[side*.145,1.76,.086],[side*.151,1.76,.091],[side*.097,1.46,.112],[side*.087,1.46,.117]],red[1]);
  }

  if(survival){
    loft([[.32,1.02,.34,.045,.27],[.32,1.11,.34,.045,.27]],['#454751','#252733','#666978']);
    loft([[.32,1.04,.66,.021,.11],[.32,1.09,.66,.021,.11]],['#555761','#30313b','#797d83']);
    loft([[.32,.92,.37,.031,.09],[.32,1.04,.34,.031,.083]],['#49434c','#28252d','#625c66']);
    return {faces,lantern:null};
  }

  // Handle starts at the right palm; the lantern hangs below it.
  loft([[.32,.875,.286,.014,.014],[.32,1.063,.286,.013,.013]],['#6b4a2f','#4a3325','#bc864c']);
  const lantern=[.32,.72,.286];
  loft([[.32,.57,.286,.061,.061],[.32,.61,.286,.085,.085],[.32,.81,.286,.085,.085],
    [.32,.87,.286,.061,.061]],['#ffb347','#e37b35','#ffe9b0']);
  const gold=['#f2c14e','#b78538','#ffe9b0'];
  loft([[.32,.576,.286,.070,.070],[.32,.601,.286,.071,.071]],gold);
  loft([[.32,.847,.286,.070,.070],[.32,.877,.286,.071,.071]],gold);
  loft([[.32,.50,.286,.012,.012],[.32,.572,.286,.017,.017]],red);
  return {faces,lantern:point(lantern)};
}
