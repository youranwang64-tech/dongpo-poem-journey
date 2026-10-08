// A fixed-step sphere solver for this chapter. It deliberately has no rendering
// dependencies, so gravity, contacts and settling can be checked independently.
export function createLycheePhysics(initial,{
 floorY=-5,corridorHalfWidth=3.4,outerX=16,gravity=18,fixedStep=1/120
}={}){
 const bodies=initial.map((a,i)=>({index:i,radius:a.radius,mass:a.radius**3,
  start:{x:a.x,y:a.y,z:a.z,vx:a.vx||0,vy:a.vy||0,vz:a.vz||0,
   wx:a.wx||0,wy:a.wy||0,wz:a.wz||0,q:(a.quaternion||[0,0,0,1]).slice()},
  side:a.x>=0?1:-1,active:false,sleeping:false,restTime:0,
  impactAge:100,impactSpeed:0,bounces:0,onSupport:false}));
 const cellSize=Math.max(...bodies.map(b=>b.radius*2),1)*1.02;
 let activeCount=0,accumulator=0,floorHits=0,pairHits=0,playerHits=0,obstacleHits=0,simulationTime=0,maxPenetration=0,player=null,obstacles=[];

 function restore(b){
  Object.assign(b,b.start);b.quaternion=b.start.q.slice();b.active=false;b.sleeping=false;
  b.side=b.start.x>=0?1:-1;
  b.restTime=0;b.impactAge=100;b.impactSpeed=0;b.bounces=0;b.onSupport=false;
 }
 function reset(){
  bodies.forEach(restore);activeCount=0;accumulator=0;floorHits=pairHits=playerHits=obstacleHits=simulationTime=maxPenetration=0;player=null;obstacles=[];
 }
 function activate(count,onActivate){
  const wanted=Math.max(0,Math.min(bodies.length,Math.floor(count)));
  while(activeCount<wanted){
   const index=activeCount,b=bodies[index];
   // The emitter supplies the current world position only on release. Keeping
   // start immutable lets a chapter replay restore the original asset layout.
   if(onActivate)onActivate(b,index);
   b.side=b.x>=0?1:-1;b.active=true;b.sleeping=false;activeCount++;
  }
 }
 function setPlayer(value){
  if(!value||!Number.isFinite(value.x)||!Number.isFinite(value.z)){player=null;return;}
  player={x:value.x,z:value.z,radius:Math.max(.05,value.radius??.38),
   y:Number.isFinite(value.y)?value.y:floorY,height:Math.max(.1,value.height??2)};
 }
 function setObstacles(values){
  obstacles=(values||[]).filter(a=>[a.x,a.y,a.z,a.radius].every(Number.isFinite)&&a.radius>0)
   .map(a=>({x:a.x,y:a.y,z:a.z,radius:a.radius}));
 }
 function wake(b){if(b.sleeping){b.sleeping=false;b.restTime=0;}}
 function constrain(b){
  const maxAbs=Math.max(0,outerX-b.radius);
  if(corridorHalfWidth>0){
   const minAbs=Math.min(maxAbs,corridorHalfWidth+b.radius);
   if(b.side*b.x<minAbs){b.x=b.side*minAbs;if(b.side*b.vx<0)b.vx=-b.vx*.16;}
   if(b.side*b.x>maxAbs){b.x=b.side*maxAbs;if(b.side*b.vx>0)b.vx=-b.vx*.20;}
  }else{
   // A rain field spans the whole floor. Only its outer edge is constrained;
   // there is no invisible central lane redirecting falling fruit sideways.
   if(b.x<-maxAbs){b.x=-maxAbs;if(b.vx<0)b.vx=-b.vx*.20;}
   if(b.x>maxAbs){b.x=maxAbs;if(b.vx>0)b.vx=-b.vx*.20;}
  }
  const ground=floorY+b.radius;
  if(b.y<ground){
   const incoming=-b.vy;b.y=ground;b.onSupport=true;
   if(incoming>.80){
    b.vy=incoming*(b.bounces===0?.37:b.bounces===1?.26:.16);
    b.bounces++;floorHits++;b.impactAge=0;b.impactSpeed=incoming;
    b.vx*=.72;b.vz*=.72;
   }else b.vy=0;
  }else if(b.y-ground<.005&&b.vy<.15)b.onSupport=true;
 }
 function playerOverlap(b){
  if(!player)return false;
  // Contact is confined to fruit near the feet. Fruit overhead follows its
  // original fall, instead of moving aside as soon as the player approaches.
  const footBand=Math.min(.30,player.height*.15);
  if(b.y-b.radius>player.y+footBand||b.y+b.radius<player.y)return false;
  return Math.hypot(b.x-player.x,b.z-player.z)<player.radius+b.radius;
 }
 function resolvePlayer(b,h){
  if(!playerOverlap(b))return;
  wake(b);
  let dx=b.x-player.x,dz=b.z-player.z,d=Math.hypot(dx,dz);
  if(d<1e-7){
   const angle=(b.index+1)*2.399963229728653;dx=Math.cos(angle);dz=Math.sin(angle);d=1;
  }else{dx/=d;dz/=d;}
  const penetration=player.radius+b.radius-Math.hypot(b.x-player.x,b.z-player.z);
  // At most 2.8 units per second of local separation makes nearby fruit roll
  // away from a foot without teleporting it, opening a permanent lane, or
  // changing the character controller's movement.
  const correction=Math.min(penetration*.42,2.8*h);
  b.x+=dx*correction;b.z+=dz*correction;
  const outward=b.vx*dx+b.vz*dz,target=Math.min(1.6,.35+penetration*3);
  const impulse=Math.max(0,Math.min((target-outward)*.20,7*h));
  b.vx+=dx*impulse;b.vz+=dz*impulse;
  b.restTime=0;playerHits++;
 }
 function resolveObstacles(b,iteration){
  for(const obstacle of obstacles){
   let dx=b.x-obstacle.x,dy=b.y-obstacle.y,dz=b.z-obstacle.z,d=Math.hypot(dx,dy,dz);
   const radius=b.radius+obstacle.radius;
   if(d>radius+.006)continue;
   if(d<1e-7){dx=1;dy=dz=0;d=1;}
   let nx=dx/d,ny=dy/d,nz=dz/d,penetration=radius-Math.hypot(b.x-obstacle.x,b.y-obstacle.y,b.z-obstacle.z);
   // When the floor prevents downward separation, roll a contact around the
   // sphere's base instead of repeatedly pressing it through the floor.
   if(b.y<=floorY+b.radius+.002&&ny<-.01&&penetration>0){
    const vertical=floorY+b.radius-obstacle.y,horizontal=Math.hypot(dx,dz);
    const rim=Math.sqrt(Math.max(0,radius*radius-vertical*vertical));
    if(horizontal<1e-7){const angle=(b.index+1)*2.399963229728653;nx=Math.cos(angle);nz=Math.sin(angle);}
    else{nx=dx/horizontal;nz=dz/horizontal;}
    ny=0;penetration=rim-horizontal;
   }
   const normalSpeed=b.vx*nx+b.vy*ny+b.vz*nz;
   if(ny>.36)b.onSupport=true;
   if(penetration<=0)continue;
   if(penetration>.015||normalSpeed<-.4)wake(b);
   if(b.sleeping)continue;
   const correction=Math.max(0,penetration-.0005)*.96;
   b.x+=nx*correction;b.y+=ny*correction;b.z+=nz*correction;
   if(normalSpeed<0){
    const restitution=normalSpeed<-.8?.12:0,impulse=-(1+restitution)*normalSpeed;
    b.vx+=nx*impulse;b.vy+=ny*impulse;b.vz+=nz*impulse;
    const tx=b.vx-nx*(normalSpeed+impulse),ty=b.vy-ny*(normalSpeed+impulse),tz=b.vz-nz*(normalSpeed+impulse),tangent=Math.hypot(tx,ty,tz);
    if(tangent>.001){const friction=Math.min(tangent,impulse*.44)/tangent;b.vx-=tx*friction;b.vy-=ty*friction;b.vz-=tz*friction;}
    if(iteration===0&&normalSpeed<-.8){obstacleHits++;b.impactAge=0;b.impactSpeed=-normalSpeed;}
   }
  }
 }
 function integrateOrientation(b,h){
  const q=b.quaternion,wx=b.wx,wy=b.wy,wz=b.wz;
  const x=q[0],y=q[1],z=q[2],w=q[3],half=h*.5;
  q[0]+=half*(wx*w+wy*z-wz*y);q[1]+=half*(-wx*z+wy*w+wz*x);
  q[2]+=half*(wx*y-wy*x+wz*w);q[3]+=half*(-wx*x-wy*y-wz*z);
  const d=Math.hypot(...q)||1;for(let i=0;i<4;i++)q[i]/=d;
 }
 function pairs(){
  const grid=new Map(),contacts=[];
  for(let i=0;i<activeCount;i++){
   const a=bodies[i],cx=Math.floor(a.x/cellSize),cy=Math.floor(a.y/cellSize),cz=Math.floor(a.z/cellSize);
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
    const neighbors=grid.get(`${cx+dx},${cy+dy},${cz+dz}`);if(!neighbors)continue;
    for(const j of neighbors){const b=bodies[j],r=a.radius+b.radius;
     if(a.sleeping&&b.sleeping)continue;
     if(Math.abs(a.x-b.x)<r&&Math.abs(a.y-b.y)<r&&Math.abs(a.z-b.z)<r)contacts.push([i,j]);
    }
   }
   const key=`${cx},${cy},${cz}`;let cell=grid.get(key);if(!cell)grid.set(key,cell=[]);cell.push(i);
  }
  return contacts;
 }
 function resolvePair(a,b,iteration){
  let dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz),radius=a.radius+b.radius;
  if(d>=radius)return;
  if(d<1e-7){d=1e-8;dx=((a.index+b.index)%2?1:-1)*d;dy=0;dz=0;}
  const nx=dx/d,ny=dy/d,nz=dz/d,penetration=radius-d;
  const rvx=b.vx-a.vx,rvy=b.vy-a.vy,rvz=b.vz-a.vz,normalSpeed=rvx*nx+rvy*ny+rvz*nz;
  if(normalSpeed<-.32||penetration>.035){wake(a);wake(b);}
  const ia=a.sleeping?0:1/a.mass,ib=b.sleeping?0:1/b.mass,total=ia+ib;if(!total)return;
  // Position correction never adds bounce energy. Most separation is resolved
  // on this step; several iterations keep newly arriving piles from interpenetrating.
  const correction=Math.max(0,penetration-.0007)*.86/total;
  a.x-=nx*correction*ia;a.y-=ny*correction*ia;a.z-=nz*correction*ia;
  b.x+=nx*correction*ib;b.y+=ny*correction*ib;b.z+=nz*correction*ib;
  if(ny>.36)b.onSupport=true;if(ny<-.36)a.onSupport=true;
  if(normalSpeed<0){
   const restitution=normalSpeed<-.8?.16:0,impulse=-(1+restitution)*normalSpeed/total;
   a.vx-=nx*impulse*ia;a.vy-=ny*impulse*ia;a.vz-=nz*impulse*ia;
   b.vx+=nx*impulse*ib;b.vy+=ny*impulse*ib;b.vz+=nz*impulse*ib;
   const tx=rvx-nx*normalSpeed,ty=rvy-ny*normalSpeed,tz=rvz-nz*normalSpeed,tangent=Math.hypot(tx,ty,tz);
   if(tangent>.001){
    const friction=Math.min(tangent/total,impulse*.44)/tangent;
    a.vx+=tx*friction*ia;a.vy+=ty*friction*ia;a.vz+=tz*friction*ia;
    b.vx-=tx*friction*ib;b.vy-=ty*friction*ib;b.vz-=tz*friction*ib;
   }
   if(iteration===0&&normalSpeed<-.8){pairHits++;a.impactAge=b.impactAge=0;a.impactSpeed=b.impactSpeed=-normalSpeed;}
  }
 }
 function step(h){
  simulationTime+=h;
  let awake=0;
  for(let i=0;i<activeCount;i++){
   const b=bodies[i];b.impactAge+=h;
   if(b.sleeping&&playerOverlap(b))wake(b);
   if(b.sleeping)continue;
   awake++;
   b.onSupport=false;b.vy-=gravity*h;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;constrain(b);
  }
  if(!awake)return;
  const contacts=pairs();
  for(let iteration=0;iteration<7;iteration++){
   for(const [i,j] of contacts)resolvePair(bodies[i],bodies[j],iteration);
   for(let i=0;i<activeCount;i++)if(!bodies[i].sleeping){resolveObstacles(bodies[i],iteration);constrain(bodies[i]);}
  }
  for(let i=0;i<activeCount;i++){
   const b=bodies[i];if(b.sleeping)continue;
   resolvePlayer(b,h);resolveObstacles(b,7);constrain(b);
   const damping=Math.exp(-(b.onSupport?1.8:.035)*h);b.vx*=damping;b.vz*=damping;
   if(b.onSupport){
    // Ground motion rotates the peel and attached stalk together instead of
    // continuing the old, unrelated floating spin after landing.
    const blend=Math.min(1,h*12),rollingX=b.vz/b.radius,rollingZ=-b.vx/b.radius;
    b.wx+=(rollingX-b.wx)*blend;b.wz+=(rollingZ-b.wz)*blend;b.wy*=Math.exp(-3*h);
   }else{const angularDamping=Math.exp(-.08*h);b.wx*=angularDamping;b.wy*=angularDamping;b.wz*=angularDamping;}
   integrateOrientation(b,h);
   const speed=Math.hypot(b.vx,b.vy,b.vz),spin=Math.hypot(b.wx,b.wy,b.wz);
   b.restTime=b.onSupport&&speed<.09&&spin<.20?b.restTime+h:0;
   if(b.restTime>.65){b.sleeping=true;b.vx=b.vy=b.vz=b.wx=b.wy=b.wz=0;}
  }
  maxPenetration=0;
  for(const [i,j] of contacts){const a=bodies[i],b=bodies[j];maxPenetration=Math.max(maxPenetration,a.radius+b.radius-Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));}
 }
 function advance(dt,wanted=activeCount,onActivate){
  activate(wanted,onActivate);accumulator+=Math.min(.10,Math.max(0,Number.isFinite(dt)?dt:0));
  let steps=0;while(accumulator+1e-10>=fixedStep&&steps++<12){step(fixedStep);accumulator-=fixedStep;}
 }
 function stats(){
  let sleeping=0,airborne=0,groundPenetration=0;
  for(let i=0;i<activeCount;i++){const b=bodies[i];if(b.sleeping)sleeping++;if(b.y-floorY-b.radius>.10&&!b.onSupport)airborne++;
   groundPenetration=Math.max(groundPenetration,floorY+b.radius-b.y);}
  return {active:activeCount,sleeping,airborne,floorHits,pairHits,playerHits,obstacleHits,time:Number(simulationTime.toFixed(2)),
   maxPenetration:Number(Math.max(0,maxPenetration).toFixed(4)),groundPenetration:Number(Math.max(0,groundPenetration).toFixed(5))};
 }
 reset();return {bodies,advance,reset,setPlayer,setObstacles,get stats(){return stats();},floorY,gravity,fixedStep};
}
