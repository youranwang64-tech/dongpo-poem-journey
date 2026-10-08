import * as T from './vendor/three.module.js';
const clamp=T.MathUtils.clamp,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export const LYCHEE_FLIGHT={speed:3.6,steerSpeed:3.2,floorY:-5,minX:-3,maxX:3,minY:-3.7,maxY:.2,launchSeconds:1.1,landingSeconds:1.25,landingZ:-13.45,bodyRadius:.38,gateRadius:1.10};

export function createLycheeFlightPlan(){
 const xs=[-1.3,-.45,.8,1.45,.2,-1.0,-.1,1.25,.35],heights=[2.8,3.7,2.2,3.0,4.0,3.0,1.9,2.8,3.6],counts=[33,34,33,34,33,33,33,33,33];let cursor=0;
 return xs.map((x,i)=>({id:i+1,z:9.2-i*2.65,gate:{x,y:-5+heights[i],radius:LYCHEE_FLIGHT.gateRadius},ids:Array.from({length:counts[i]},()=>cursor++)}));
}

export function flightCapsuleDistance(fruit,player){
 const closestZ=clamp(fruit.z,player.z-2.2,player.z-.12);
 return Math.hypot(fruit.x-player.x,fruit.y-player.y-.12,fruit.z-closestZ);
}

/** Exact union swept by the prone capsule axis along every connecting gate segment. */
export function createLycheeFlightCorridor(plan=createLycheeFlightPlan()){
 const route=[V(plan[0].gate.x,plan[0].gate.y,14),...plan.map(g=>V(g.gate.x,g.gate.y,g.z+1.16)),V(plan.at(-1).gate.x,plan.at(-1).gate.y,LYCHEE_FLIGHT.landingZ)],triangles=[],lines=[];
 for(let i=0;i<route.length-1;i++){
  const a=route[i],b=route[i+1];
  if(Math.hypot(a.x-b.x,a.y-b.y)<1e-8){lines.push(new T.Line3(V(a.x,a.y+.12,Math.max(a.z,b.z)-.12),V(a.x,a.y+.12,Math.min(a.z,b.z)-2.2)));continue;}
  const af=V(a.x,a.y+.12,a.z-.12),ah=V(a.x,a.y+.12,a.z-2.2),bf=V(b.x,b.y+.12,b.z-.12),bh=V(b.x,b.y+.12,b.z-2.2);
  triangles.push(new T.Triangle(af,ah,bh),new T.Triangle(af,bh,bf));
 }
 return {route,triangles,lines,steerTolerance:.24,skin:.07};
}

export function flightCorridorDistance(point,corridor){
 const p=V(point.x,point.y,point.z),closest=V();let squared=Infinity;
 for(const triangle of corridor.triangles){triangle.closestPointToPoint(p,closest);squared=Math.min(squared,p.distanceToSquared(closest));}
 for(const line of corridor.lines){line.closestPointToPoint(p,true,closest);squared=Math.min(squared,p.distanceToSquared(closest));}
 return Math.sqrt(squared);
}

/** Fixed world fruit, finite passage counting, and explicit movement ownership. */
export function createLycheeFlight({envelope=1.15}={}){
 let seed=95117;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const plan=createLycheeFlightPlan(),corridor=createLycheeFlightCorridor(plan),bodies=[],anchors={0:[.65,2.8],3:[-.65,2.8],4:[0,2.12],7:[-.65,2.8]};
 for(const group of plan){
  const placed=[];
  for(let j=0;j<group.ids.length;j++){
   const index=group.ids[j],scale=index%67===41?.45:.30+Math.pow(random(),.72)*.12,radius=scale*envelope,gap=group.gate.radius+radius+LYCHEE_FLIGHT.bodyRadius;
   let point=null;
   for(let attempt=0;attempt<1600&&!point;attempt++){
    const anchor=j===0&&anchors[group.id-1]&&attempt===0?anchors[group.id-1]:null;
    const candidate={x:anchor?anchor[0]:(random()-.5)*9.8,y:-5+(anchor?anchor[1]:.8+random()*5.3),z:group.z+(random()-.5)*1.04};
    if(Math.hypot(candidate.x-group.gate.x,candidate.y-group.gate.y-.12)<gap)continue;
    // Protect the complete connection, including the head leading a gate and
    // the feet still leaving its predecessor, with 24 cm control error + skin.
    if(flightCorridorDistance(candidate,corridor)<radius+LYCHEE_FLIGHT.bodyRadius+corridor.steerTolerance+corridor.skin)continue;
    if(placed.some(b=>Math.hypot(candidate.x-b.x,candidate.y-b.y,candidate.z-b.z)<radius+b.radius+.055))continue;
    point=candidate;
   }
   if(!point)throw new Error('荔枝飞行果群没有留下足够净空。');
   const body={index,groupId:group.id,scale,radius,...point,origin:{...point},yaw:random()*Math.PI*2,spin:(random()-.5)*.35,active:true,hazard:true};bodies.push(body);placed.push(body);
  }
 }
 const minCorridorClearance=Math.min(...bodies.map(b=>flightCorridorDistance(b,corridor)-b.radius-LYCHEE_FLIGHT.bodyRadius));
 let time=0,phase='launch',phaseAge=0,passed=0,hits=0,holdUntil=0,pendingHit=null,flashAge=10,flashOrigin=V(),steerX=0,steerY=0,landingStart=V(),position=V(0,-5,14);
 const groups=plan.map(g=>({...g,hit:false,cleared:false}));
 function copyOut(target){if(target?.set)target.set(position.x,position.y,position.z);else if(Array.isArray(target)){target[0]=position.x;target[1]=position.y;target[2]=position.z;}}
 function advance(dt,input={},target){
  const h=clamp(Number.isFinite(dt)?dt:0,0,.1);if(h<=0){copyOut(target);return position.toArray();}
  phaseAge+=h;let x=clamp(input.x||0,-1,1),y=clamp(input.y||0,-1,1),length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}steerX=T.MathUtils.damp(steerX,x,8,h);steerY=T.MathUtils.damp(steerY,y,8,h);
  if(phase==='launch'){
   const q=T.MathUtils.smootherstep(phaseAge/LYCHEE_FLIGHT.launchSeconds,0,1);position.x=clamp(position.x+x*LYCHEE_FLIGHT.steerSpeed*h,-3,3);position.y=-5+2.8*q;position.z=14-1.6*q;
   if(phaseAge>=LYCHEE_FLIGHT.launchSeconds){phase='flying';phaseAge=0;}
  }else if(phase==='flying'){
   position.x=clamp(position.x+x*LYCHEE_FLIGHT.steerSpeed*h,-3,3);position.y=clamp(position.y+y*LYCHEE_FLIGHT.steerSpeed*h,LYCHEE_FLIGHT.minY,LYCHEE_FLIGHT.maxY);
   position.z-=LYCHEE_FLIGHT.speed*h*(time<holdUntil?.42:1);
   if(position.z<=LYCHEE_FLIGHT.landingZ){position.z=LYCHEE_FLIGHT.landingZ;landingStart.copy(position);phase='landing';phaseAge=0;pendingHit=null;holdUntil=time;}
  }else if(phase==='landing'){
   const q=T.MathUtils.smootherstep(phaseAge/LYCHEE_FLIGHT.landingSeconds,0,1);position.copy(landingStart).lerp(V(0,-5,-14),q);
   if(phaseAge>=LYCHEE_FLIGHT.landingSeconds){position.set(0,-5,-14);phase='painting';phaseAge=0;}
  }
  copyOut(target);return position.toArray();
 }
 function update(dt,player=position){
  const h=clamp(Number.isFinite(dt)?dt:0,0,.1);time+=h;flashAge+=h;
  for(const b of bodies){
   if(!b.counted&&player.z<=b.origin.z-.8){b.counted=true;passed++;}
   b.quaternion=new T.Quaternion().setFromEuler(new T.Euler(.06,b.yaw+time*b.spin,-.08)).toArray();
   b.visibility=b.counted?0:1;b.viewVisibility=1;
  }
  for(const group of groups){
   if(!group.hit&&(phase==='launch'||phase==='flying')&&time>=holdUntil){
    const contact=group.ids.map(id=>bodies[id]).find(b=>!b.counted&&flightCapsuleDistance(b,player)<LYCHEE_FLIGHT.bodyRadius+b.radius);
    if(contact){group.hit=true;hits++;holdUntil=time+.2;pendingHit={kind:'flight',waveId:group.id,groupId:group.id,holdSeconds:.2,push:[Math.sign(player.x-contact.x||1)*.14,Math.sign(player.y-contact.y||1)*.08,0]};flashAge=0;flashOrigin.set(contact.x,contact.y,contact.z);}
   }
   group.cleared=group.ids.every(id=>bodies[id].counted);
  }
 }
 function applyHit(event,target){if(!event||phase!=='flying'&&phase!=='launch')return false;position.x=clamp(position.x+(event.push?.[0]||0),-3,3);if(phase==='flying')position.y=clamp(position.y+(event.push?.[1]||0),LYCHEE_FLIGHT.minY,LYCHEE_FLIGHT.maxY);copyOut(target);return true;}
 function cancel(){pendingHit=null;holdUntil=time;steerX=steerY=0;}
 function reset(){time=phaseAge=passed=hits=holdUntil=steerX=steerY=0;phase='launch';position.set(0,-5,14);pendingHit=null;flashAge=10;for(const b of bodies){Object.assign(b,b.origin,{counted:false,visibility:1,viewVisibility:1,quaternion:[0,0,0,1]});}groups.forEach(g=>{g.hit=g.cleared=false;});}
 function stats(){return {phase,phaseAge:Number(phaseAge.toFixed(3)),speed:LYCHEE_FLIGHT.speed,steerSpeed:LYCHEE_FLIGHT.steerSpeed,position:position.toArray(),steerX,steerY,passed,hits,groups:groups.length,cleared:groups.filter(g=>g.cleared).length,remaining:299-passed,holdRemaining:Number(Math.max(0,holdUntil-time).toFixed(3)),gravity:0,groundCollisions:0,corridorTolerance:corridor.steerTolerance,minCorridorClearance,plan:groups.map(g=>({id:g.id,z:g.z,gate:{...g.gate},count:g.ids.length,hit:g.hit,cleared:g.cleared})),flashAge,flashOrigin:flashOrigin.toArray()};}
 reset();return {bodies,plan,advance,update,applyHit,cancel,reset,takeHit:()=>{const hit=pendingHit;pendingHit=null;return hit;},get phase(){return phase;},get poseAmount(){return phase==='launch'?T.MathUtils.smootherstep(phaseAge/LYCHEE_FLIGHT.launchSeconds,0,1):phase==='flying'?1:phase==='landing'?1-T.MathUtils.smootherstep(phaseAge/LYCHEE_FLIGHT.landingSeconds,0,1):0;},get steerX(){return steerX;},get stats(){return stats();}};
}
