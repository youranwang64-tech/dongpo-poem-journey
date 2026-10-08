import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export const LYCHEE_PLAYER_RADIUS=.34;
export function createLycheeWavePlan(){
 const xs=[-2.6,0,2.6,.25,-2.4,2.4,0,-1.4,1.4],counts=[33,34,33,34,33,33,33,33,33];let cursor=0;
 return xs.map((x,i)=>{const triggerZ=i===8?-10.15:12.35-i*2.85,ids=Array.from({length:counts[i]},()=>cursor++);return {id:i+1,x,z:triggerZ-3.55,triggerZ,radius:1.42,warningSeconds:1.05,dropInterval:.045,ids};});
}

/** Irregular overlapping puffs close the sides without drawing a box around the path. */
export function createLycheeSideFog(scene,floorY=-5){
 const group=new T.Group();group.name='荔枝路两侧的白灰雾帘';scene.add(group);
 const timeUniform={value:0},strengthUniform={value:1},geometry=new T.PlaneGeometry(1,1),materials=[];
 const vertexShader='varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
 const fragmentShader=`varying vec2 p;uniform float time,opacity,seed,strength;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
 void main(){
  vec2 drift=vec2(time*.007,-time*.004),q=(p-.5)*2.;
  vec2 warp=vec2(noise(p*vec2(3.1,2.7)+seed+drift),noise(p*vec2(2.6,3.4)-seed-drift))-.5;
  q+=warp*.27;
  float cloud=1.-smoothstep(.18,.99,length(q));
  float edge=smoothstep(0.,.15,p.x)*(1.-smoothstep(.85,1.,p.x))*smoothstep(0.,.15,p.y)*(1.-smoothstep(.85,1.,p.y));
  float folds=noise(p*vec2(4.8,3.7)+seed+drift)*.66+noise(p*vec2(9.3,7.1)-seed-drift)*.34;
  vec3 paper=mix(vec3(.77,.795,.765),vec3(.89,.90,.875),folds);
  gl_FragColor=vec4(paper,strength*opacity*cloud*edge*(.46+.54*folds));
 }`;
 function puff(width,height,x,y,z,yaw,opacity,seed,ground=false){
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,uniforms:{time:timeUniform,strength:strengthUniform,opacity:{value:opacity},seed:{value:seed}},vertexShader,fragmentShader});materials.push(material);
  const o=new T.Mesh(geometry,material);o.name=ground?'贴地的椭圆柔雾':'错落的侧边柔雾团';o.position.set(x,y,z);o.scale.set(width,height,1);o.renderOrder=2;
  if(ground)o.rotation.set(-Math.PI/2,0,Math.PI/2);else o.rotation.y=yaw;
  group.add(o);
 }
 for(const side of [-1,1]){
  // These mostly face down the route rather than forming a long vertical wall.
  // Their physical corners all stay outside the clear central paper space.
  const depths=[21,8,-5,-19,-36],widths=[16,18,21,24,29],heights=[11,13,12,15,17];
  for(let i=0;i<depths.length;i++){
   const yaw=side*(.12+(i%3)*.055),width=widths[i],x=side*(4.45+width*Math.cos(yaw)/2+.25*(i%2));
   puff(width,heights[i],x,floorY+4.2+(i%3)*.48,depths[i]+side*.8,yaw,.22+(i%3)*.025,17.3+i*8.1+side*3.4);
  }
  for(let i=0;i<2;i++)puff(42,9.2,side*(9.05+i*.25),floorY+.04+i*.012,8-i*35,0,.25+i*.04,73.6+i*11.7+side*7.1,true);
 }
 return {group,update:(t,strength=1)=>{timeUniform.value=t;strengthUniform.value=T.MathUtils.clamp(strength,0,1);},stats:{curtains:2,cloudCards:10,groundBands:4,drawCalls:14,triangles:28,maxOpacity:.29,clearHalfWidth:4.3,trees:0}};
}

/** All 299 fruit belong to marked circles. Each wave can issue one short event. */
export function buildLycheeChallenge(scene,plan,floorY=-5){
 const group=new T.Group();group.name='可预判的荔枝落点';scene.add(group);
 const ringG=new T.RingGeometry(.90,1,56),diskG=new T.CircleGeometry(.985,48),waves=plan.map(p=>({...p,phase:'waiting',warningAt:null,releasedAt:null,clearedAt:null,releaseCursor:0,hit:false,markers:[]}));
 for(const wave of waves){
  const disk=new T.Mesh(diskG,new T.MeshBasicMaterial({color:0xb34535,transparent:true,opacity:0,depthWrite:false,toneMapped:false})),ring=new T.Mesh(ringG,new T.MeshBasicMaterial({color:0x9d382a,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
  for(const o of [disk,ring]){o.position.set(wave.x,floorY+.025,wave.z);o.scale.setScalar(wave.radius);o.rotation.x=-Math.PI/2;o.visible=false;o.renderOrder=3;group.add(o);wave.markers.push(o);}
 }
 const flashPositions=new Float32Array(24*3),flashG=new T.BufferGeometry();flashG.setAttribute('position',new T.BufferAttribute(flashPositions,3));
 const flash=new T.Points(flashG,new T.PointsMaterial({color:0xa74432,size:.065,transparent:true,opacity:0,depthWrite:false}));flash.name='擦过衣边的红墨细屑';flash.frustumCulled=false;flash.visible=false;group.add(flash);
 let time=0,holdUntil=0,pendingHit=null,hits=0,flashAt=-10,flashOrigin=V(),cancelled=false;
 function update(dt,player,rain){
  time+=T.MathUtils.clamp(dt,0,.1);
  if(cancelled)return;
  for(const wave of waves){
   if(wave.phase==='waiting'&&player.z<=wave.triggerZ){wave.phase='warning';wave.warningAt=time;}
   if(wave.phase==='warning'&&time-wave.warningAt>=wave.warningSeconds){
    wave.phase='falling';wave.releasedAt=time;
   }
   if(wave.phase==='falling'){
    // A staggered vertical shower makes individual fruit readable. Every fruit
    // carries the same world circle used by the warning and hit test.
    while(wave.releaseCursor<wave.ids.length&&time-wave.releasedAt+1e-8>=wave.releaseCursor*wave.dropInterval){
     const j=wave.releaseCursor++,id=wave.ids[j],angle=j*2.399+wave.id*.43,reach=j===0?.06:.50*Math.sqrt(((j*17)%31+.5)/31);
     rain.releaseAt(id,{x:wave.x+Math.cos(angle)*reach,y:floorY+5.7+(j%5)*.19,z:wave.z+Math.sin(angle)*reach,vx:Math.sin(angle)*.025,vy:-.20,vz:Math.cos(angle)*.025,zone:{waveId:wave.id,x:wave.x,z:wave.z,radius:wave.radius}});
    }
   }
   const warningAge=wave.warningAt===null?0:time-wave.warningAt;
   const fade=wave.phase==='cleared'?1-T.MathUtils.smoothstep(time-wave.clearedAt,0,.45):1;
   const live=wave.phase!=='waiting'&&fade>0;
   wave.markers.forEach((o,i)=>{o.visible=live;o.material.opacity=live?fade*(i?.43+.12*Math.sin(warningAge*7):.11+.055*Math.sin(warningAge*5)):0;});
  }
  const age=time-flashAt;flash.visible=age<.55;
  if(flash.visible){
   for(let i=0;i<24;i++){const a=i*2.399,spread=age*(.35+i%5*.07),j=i*3;flashPositions[j]=flashOrigin.x+Math.cos(a)*spread;flashPositions[j+1]=flashOrigin.y+(i%7/7-.25)*age*.6;flashPositions[j+2]=flashOrigin.z+Math.sin(a)*spread;}
   flashG.attributes.position.needsUpdate=true;flash.material.opacity=(1-age/.55)*.48;
  }
 }
 function afterPhysics(player,rain){
  if(cancelled)return;
  for(const wave of waves){
   if(wave.phase!=='falling')continue;
   if(!wave.hit&&time>=holdUntil&&Math.hypot(player.x-wave.x,player.z-wave.z)<=wave.radius){
    const contact=wave.ids.map(id=>rain.bodies[id]).find(b=>b.active&&!b.counted&&b.vy<0&&b.y-b.radius<=floorY+2.18&&b.y+b.radius>=floorY+.30&&Math.hypot(b.x-player.x,b.z-player.z)<=LYCHEE_PLAYER_RADIUS+b.radius);
    if(contact){
     wave.hit=true;hits++;holdUntil=time+.45;const away=Math.abs(player.x-wave.x)>.02?Math.sign(player.x-wave.x):wave.id%2?-1:1;
     pendingHit={push:[away*.18,0,.43],holdSeconds:.45,waveId:wave.id};flashAt=time;flashOrigin.set(contact.x,contact.y,contact.z);
    }
   }
   if(wave.releaseCursor===wave.ids.length&&wave.ids.every(id=>rain.bodies[id].counted)){wave.phase='cleared';wave.clearedAt=time;}
  }
 }
 function cancel(){cancelled=true;pendingHit=null;holdUntil=time;flash.visible=false;waves.forEach(w=>w.markers.forEach(o=>o.visible=false));}
 function reset(){time=holdUntil=hits=0;pendingHit=null;flashAt=-10;cancelled=false;flash.visible=false;for(const w of waves){Object.assign(w,{phase:'waiting',warningAt:null,releasedAt:null,clearedAt:null,releaseCursor:0,hit:false});w.markers.forEach(o=>{o.visible=false;o.material.opacity=0;});}}
 function stats(){return {waves:waves.length,plannedFruit:plan.reduce((n,w)=>n+w.ids.length,0),unmarkedFruit:0,playerRadius:LYCHEE_PLAYER_RADIUS,activated:waves.filter(w=>w.phase!=='waiting').length,cleared:waves.filter(w=>w.phase==='cleared').length,hits,warning:waves.filter(w=>w.phase==='warning').length,remaining:waves.filter(w=>w.phase!=='cleared').length,movementBlocked:!cancelled&&time<holdUntil,holdRemaining:Number(Math.max(0,holdUntil-time).toFixed(3)),warnings:waves.filter(w=>w.phase==='warning'||w.phase==='falling').map(w=>({id:w.id,x:w.x,z:w.z,radius:w.radius,phase:w.phase,warningAge:Number((time-w.warningAt).toFixed(3)),warningSeconds:w.warningSeconds,count:w.ids.length,released:w.releaseCursor})),plan:waves.map(w=>({id:w.id,x:w.x,z:w.z,radius:w.radius,triggerZ:w.triggerZ,count:w.ids.length,released:w.releaseCursor,dropInterval:w.dropInterval,phase:w.phase,warningAt:w.warningAt,releasedAt:w.releasedAt,hit:w.hit})),sideFog:{curtains:2,cloudCards:10,groundBands:4,drawCalls:14,triangles:28,clearHalfWidth:4.3}};}
 reset();return {update,afterPhysics,reset,cancel,takeHit:()=>{const event=pendingHit;pendingHit=null;return event;},get movementBlocked(){return !cancelled&&time<holdUntil;},get stats(){return stats();}};
}
