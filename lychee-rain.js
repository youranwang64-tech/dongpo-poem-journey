import * as T from './vendor/three.module.js';

const clamp=T.MathUtils.clamp;

/** A finite rain of render-only fruit. Neither movement nor contact modifies the player. */
export function createLycheeRain({count=299,floorY=-5,envelope=1.15}={}){
 let seed=67193;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const bodies=Array.from({length:count},(_,index)=>{
  const near=(index*137+53)%299<133,size=near?(index%47===7?.95:.62+random()*.28):.36+Math.pow(random(),.72)*.24,central=random()<.43;
  return {index,scale:size,radius:size*envelope,descriptor:{
   layer:near?'near':'ordinary',offsetX:near?(random()-.5)*12:central?(random()-.5)*3.6:(random()-.5)*13.8,
   // The player advances while this fruit is above the frame. Its modest birth
   // offset leaves it 3.5–6m from the close camera when it crosses the upper view.
   depth:near?-.35-random()*1.45:random()<.35?.15+random()*2.4:2+random()*7.8,height:near?9+random()*3:12+random()*5,
   interval:.026+random()*.022,vx:(random()-.5)*.30,vz:(random()-.5)*.25,
   spin:[(random()-.5)*2.2,(random()-.5)*1.8,(random()-.5)*2.2],yaw:random()*Math.PI*2,
   rebound:.13+random()*.05,bounceLimit:random()<.75?1:2}};
 });
 const stepSize=1/120,gravity=12.4,axis=new T.Vector3(),turn=new T.Quaternion(),rotation=new T.Quaternion();
 let time=0,accumulator=0,progress=0,released=0,landed=0,floorHits=0,nextReleaseAt=.15;
 const unlocked=()=>Math.min(count,18+Math.floor(Math.min(1,progress/.78)*Math.max(0,count-18)));
 function reset(){
  time=accumulator=progress=released=landed=floorHits=0;nextReleaseAt=.15;
  for(const b of bodies)Object.assign(b,{x:0,y:floorY+18,z:0,vx:0,vy:0,vz:0,state:'queued',active:false,counted:false,
   bounces:0,visibility:0,viewVisibility:1,activatedAt:null,landedAt:null,landX:null,landY:null,landZ:null,
   birthX:null,birthY:null,birthZ:null,quaternion:[0,0,0,1]});
 }
 function release(b,player){
  const d=b.descriptor;
  b.x=clamp(player.x+d.offsetX,-9.4,9.4);b.z=player.z-d.depth;b.y=floorY+d.height;
  b.birthX=b.x;b.birthY=b.y;b.birthZ=b.z;b.vx=d.vx;b.vy=-.4;b.vz=d.vz;
  b.active=true;b.state='falling';b.visibility=b.viewVisibility=1;b.activatedAt=time;
  b.quaternion=rotation.setFromEuler(new T.Euler(.06,d.yaw,-.08)).toArray();released++;
 }
 function step(h,player){
  time+=h;
  if(released<unlocked()&&time+1e-10>=nextReleaseAt){const b=bodies[released];release(b,player);nextReleaseAt=time+b.descriptor.interval;}
  if(released>=unlocked())nextReleaseAt=Math.max(time,nextReleaseAt);
  for(const b of bodies){
   if(!b.active)continue;
   const ground=floorY+b.radius;
   if(b.state!=='resting'){
    b.vy-=gravity*h;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;
    if(b.y<=ground){
     b.y=ground;floorHits++;
     if(!b.counted){b.counted=true;b.landedAt=time;b.landX=b.x;b.landY=ground;b.landZ=b.z;landed++;}
     if(b.bounces<b.descriptor.bounceLimit&&-b.vy>.65){
      b.vy=-b.vy*(b.bounces===0?b.descriptor.rebound:.06);b.bounces++;b.state='bouncing';b.vx*=.65;b.vz*=.65;
     }else{b.vy=0;b.state='resting';}
    }
   }else{b.x+=b.vx*h;b.z+=b.vz*h;}
   const damping=Math.exp(-(b.state==='resting'?2.6:.055)*h);b.vx*=damping;b.vz*=damping;
   const angular=b.state==='resting'?[b.vz/b.radius,0,-b.vx/b.radius]:b.descriptor.spin,speed=Math.hypot(...angular);
   if(speed>.0001){axis.fromArray(angular).normalize();turn.setFromAxisAngle(axis,speed*h);b.quaternion=rotation.fromArray(b.quaternion).premultiply(turn).normalize().toArray();}
   // Landing coordinates survive the fade as sources for the final paper-ink burst.
   const landingFade=b.counted?1-T.MathUtils.smoothstep(time-b.landedAt,.10,.68):1;
   b.visibility=landingFade*(1-T.MathUtils.smoothstep(b.z-player.z,4.8,9.2));
  }
 }
 function advance(dt,player,walkProgress=0){
  const elapsed=clamp(Number.isFinite(dt)?dt:0,0,.1);if(!elapsed)return;
  progress=Math.max(progress,clamp(walkProgress,0,1));accumulator+=elapsed;
  while(accumulator+1e-10>=stepSize){step(stepSize,player);accumulator-=stepSize;}
 }
 function stats(){
  const active=bodies.slice(0,released),airborne=active.filter(b=>b.state!=='resting').length;
  return {released,landed,queued:count-released,unlocked:unlocked(),airborne,resting:released-airborne,
   floorHits,maxBounces:Math.max(0,...active.map(b=>b.bounces)),gravity,time:Number(time.toFixed(3)),
   renderOnly:true,playerCollisions:0,pairCollisions:0,warningCircles:0,
   minScale:Math.min(...bodies.map(b=>b.scale)),maxScale:Math.max(...bodies.map(b=>b.scale)),nearFruit:bodies.filter(b=>b.descriptor.layer==='near').length};
 }
 reset();return {bodies,advance,reset,get stats(){return stats();}};
}
