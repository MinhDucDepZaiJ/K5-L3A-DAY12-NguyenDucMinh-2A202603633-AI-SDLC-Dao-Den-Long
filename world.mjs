const ring=(x,y,z,r,n,offset=0)=>Array.from({length:n},(_,i)=>{
  const angle=(offset+i*360/n)*Math.PI/180;
  return [x+r*Math.cos(angle),y,z+r*Math.sin(angle)];
});
export const worlds={
  1:{name:'Đảo Bến',islands:[[0,40]],lamps:[[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]],
    motes:[...ring(0,0,0,12,8),...ring(0,0,0,33,16)],fog:ring(0,0,0,37,12,15),interval:480,limit:6},
  2:{name:'Đảo Cau',islands:[[0,28],[70,28]],lamps:[[0,0,20],[17,0,-10],[-17,0,-10],[70,0,20],[87,0,-10],[53,0,-10]],
    motes:[0,70].flatMap(x=>[...ring(x,0,0,10,4),...ring(x,0,0,22,8)]),
    fog:[0,70].flatMap(x=>ring(x,0,0,26,8,22.5)),interval:420,limit:8,
    pads:[{pos:[20,0,18],speed:24,up:14,target:[70,0,0]},{pos:[50,0,-18],speed:24,up:14,target:[0,0,0]}],
    charms:[[35,0,0]]},
  3:{name:'Đảo Chuông',islands:[[0,45]],lamps:[[0,6,6],[18,3,10],[-18,3,10],[35,0,-10],[-35,0,-10],[20,0,-35],[-20,0,-35]],
    motes:[...ring(0,0,0,34,18),...ring(0,3,0,18,18,20).slice(0,8),...ring(0,6,0,5,4,45)],
    fog:ring(0,0,0,43,16),interval:360,limit:10,
    pads:[{pos:[0,3,13],speed:8,up:12,target:[0,3,0]}],charms:[[30,0,25],[-30,0,25]]}
};
export const ramps=[30,150].map(deg=>[Math.cos(deg*Math.PI/180),Math.sin(deg*Math.PI/180)]);
export function surfaces(night,x,z){
  const heights=[];
  if(worlds[night].islands.some(([cx,r])=>Math.hypot(x-cx,z)<=r) ||
    (night===2 && x>=26 && x<=44 && Math.abs(z)<=2)) heights.push(0);
  if(night===3){
    const r=Math.hypot(x,z);
    if(r<=8) heights.push(6);
    if(z>0&&r>=12&&r<=24) heights.push(3);
    for(const [dx,dz] of ramps){
      const along=x*dx+z*dz;
      if(along>=23.9&&along<=30&&Math.abs(x*dz-z*dx)<=1.5)
        heights.push(Math.min(3,(30-along)*.5));
    }
  }
  return heights;
}
