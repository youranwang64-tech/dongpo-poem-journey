import * as T from './vendor/three.module.js';
import {makeRecallSpaceCourt} from './recall-space-court.js';
import {createRecallSpaceNavigation,RECALL_SPACE} from './recall-space-navigation.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp,smooth=x=>T.MathUtils.smootherstep(clamp(x,0,1),0,1);
export const RECALL_JOINERY=Object.freeze({loadSeconds:1.15,releaseSeconds:3.20,minimumLatchHoldSeconds:.18,wedgeHoldSeconds:.30});

/** Fixed galleries are supported and locked by real timber joints and ropes. */
export function buildRecallCourt(){
 const court=makeRecallSpaceCourt(),{scene,root,platforms,spans}=court,{northAssembly:north,southAssembly:south}=court,completed=new Set(),environmentEvents=[],storyEvents=[],inkMotion=new Map();
 let phase='arrival',simTime=0,lastTime=null,decreeAge=0,coldAge=0,lastPlayer=V(...RECALL_SPACE.spawn),departed=false,cutawayAmount=0,cameraFocus=null,cameraMode='wide',cameraFrozen=false,lastInkFeedback='',feedbackAge=0,lightProgress=0,loadProgress=0,releaseProgress=0,loadDwell=0;
 const northFoot=north.footPosition,southFoot=south.footPosition,loadRadius=north.footRadius;
 const frontOpen=()=>phase==='arrival'&&completed.has('mend-near')&&spans[0].gateProgress>.94;
 const solidWalls=[[-4.20,4.20,-8.425,-8.175],[-4.325,-4.075,-8.30,-3.20],[4.075,4.325,-8.30,-6.50],[4.075,4.325,-3.50,-3.20],[4.075,4.325,-6.50,-5.925],[4.075,4.325,-4.075,-3.50],[-4.24,-1.36,-3.315,-3.085],[1.36,4.24,-3.315,-3.085],[-1.52,1.52,-7.40,-6.43]];
 function touchesWall(p){return solidWalls.some(([x0,x1,z0,z1])=>Math.hypot(p.x-clamp(p.x,x0,x1),p.z-clamp(p.z,z0,z1))<RECALL_SPACE.bodyRadius);}
 const crossing=(a,b,axis,value)=>a[axis]<value&&b[axis]>=value||a[axis]>value&&b[axis]<=value;
 function barrier(from,to){
  if(crossing(from,to,'z',-3.20)&&Math.max(from.x,to.x)<4.1){if(Math.abs(from.x)>.85||Math.abs(to.x)>.85||!frontOpen())return true;}
  if(crossing(from,to,'x',4.14)&&Math.min(from.z,to.z)<-3.2){if(phase!=='southbound'||Math.abs(from.z-RECALL_SPACE.eastOpeningZ)>.55||Math.abs(to.z-RECALL_SPACE.eastOpeningZ)>.55||coldAge<.68)return true;}
  if(crossing(from,to,'x',RECALL_SPACE.southGateX)){if(phase!=='southbound'||coldAge<.68||Math.abs(from.z+5)>.55||Math.abs(to.z+5)>.55)return true;}
  const n=Math.max(1,Math.ceil(from.distanceTo(to)/.095));for(let i=1;i<=n;i++)if(touchesWall(from.clone().lerp(to,i/n)))return true;return false;
 }
 const navigation=createRecallSpaceNavigation(platforms,spans,{barrier});
 const targets=[
  {id:'turn-near',position:[...northFoot],radius:loadRadius,label:'北廊踏木杠',hint:'走上桥头横着的踏木杠，停一停。看杠尾压下，承梁头升到卯口；脚先不要离开。',kind:'walk',autoComplete:false,verse:''},
  {id:'mend-near',position:[...northFoot],radius:.78,label:'承梁旁的木楔',hint:'站稳踏木杠，梁肩已经对上卯口。用毛笔点住右手的木楔，稍停后松笔，把梁锁稳；缺板会落到承梁上。',kind:'spatial-gesture',mode:'brush-joinery-dot',requires:['turn-near'],verse:''},
  {id:'read-decree',position:[...RECALL_SPACE.readFoot],radius:1.05,label:'高窗与案上诏书',hint:'走进正殿，案上的纸还看不清。在左后方高窗上轻扫一笔，再松开，让窗光落到诏书上。',kind:'spatial-gesture',mode:'brush-window-light',requires:['mend-near'],verse:''},
  {id:'turn-far',position:[...southFoot],radius:.93,label:'南廊吊绳的木闩',hint:'走出厅东门，按住吊绳旁的木闩，让绳子缓缓放长。看短桥落到对岸石托上，再松笔；中途松开会停住。',kind:'spatial-gesture',mode:'brush-rope-latch',requires:['read-decree'],verse:''},
  {id:'unfold-far',position:[...southFoot],radius:.93,label:'落桥接头的木楔',hint:'短桥已落到承石，梁头对上卯口。点住接头上的木楔，稍停后松笔，把桥锁稳，再沿廊向南走。',kind:'spatial-gesture',mode:'brush-joinery-dot',requires:['turn-far'],verse:''},
  {id:'gate',position:[...RECALL_SPACE.gateFoot],radius:.55,label:'穿过南行门',hint:'短桥已落榫，两端栏门让开。沿着有栏杆的廊桥，穿过南行门。',kind:'walk',requires:['unfold-far'],verse:''}
 ];
 const task=id=>targets.find(t=>t.id===id),near=(id,p)=>!p||Math.hypot(p.x-task(id).position[0],p.z-task(id).position[2])<=task(id).radius;
 const feedback=message=>{lastInkFeedback=message;feedbackAge=3;};
 const complete=id=>{if(completed.has(id))return;completed.add(id);environmentEvents.push(id);};
 const onLever=()=>Math.abs(lastPlayer.y-northFoot[1])<.14&&Math.hypot(lastPlayer.x-northFoot[0],lastPlayer.z-northFoot[2])<=loadRadius;
 const moving=()=>phase==='southbound'&&coldAge<.85||inkMotion.size>0||spans.some(s=>s.motion||s.connectionAccepted&&s.deckComplete&&s.gateProgress<.999&&!(s.id==='turn-near'&&phase!=='arrival'));
 function updateGuides(){for(const s of spans){const key=s.id==='turn-near'?'mend-near':'unfold-far',state=completed.has(key)?'locked':s.motion?'lowering':s.id==='turn-near'?(loadProgress>.985?'supported':'unloaded'):releaseProgress>=1?'landed':phase==='southbound'?'ready':'locked';court.instructionSigns.get(s.id)?.draw(state);}}
 function canInkAction(id,player=null){
  const t=task(id);if(!t||!['mend-near','read-decree','turn-far','unfold-far'].includes(id))return {available:false,reason:'unknown',hint:'走上踏木杠，观察承梁与卯口。'};
  if(completed.has(id))return {available:false,completed:true,reason:'completed',hint:'这处构件已经稳住，沿廊继续走。'};
  if(inkMotion.size||spans.some(s=>s.motion)||phase==='decree')return {available:false,reason:'moving',hint:'等构件停稳，再落笔。'};
  if(t.requires?.some(key=>!completed.has(key)))return {available:false,reason:'locked',hint:t.hint};
  if(id==='mend-near'&&loadProgress<.985)return {available:false,reason:'unloaded',hint:'先站回桥头踏木杠，等承梁头托进卯口，再点木楔；脚离开，木杠就会回落。'};
  if(['turn-far','unfold-far'].includes(id)&&(phase!=='southbound'||coldAge<.85))return {available:false,reason:'reading',hint:'先看清案上的诏命，等厅东门打开，再沿石台走到吊绳前。'};
  if(id==='unfold-far'&&(releaseProgress<1-1e-6||Math.abs(spans[1].fold.rotation.x)>.001))return {available:false,reason:'unlanded',hint:'先松开吊绳木闩，把短桥缓缓放到石托上。'};
  if(!near(id,player))return {available:false,reason:'far',hint:t.hint};return {available:true,reason:'ready',hint:t.hint};
 }
 const canInkDot=(id,player)=>canInkAction(id,player);
 function applyArchitecturalPose(id,p){
  if(id==='read-decree'){lightProgress=p;for(const {hinge,side,paper}of court.windowLeaves){hinge.rotation.y=-side*p*1.43;paper.material.opacity=.78*(1-p*.85);}court.windowBeam.material.uniforms.amount.value=p;court.decreePaper.material.emissive?.set(0xf7d7a0);court.decreePaper.material.emissiveIntensity=p*.18;return;}
  const s=id==='mend-near'?spans[0]:spans[1];s.repairProgress=p;if(id==='mend-near')north.applyLock(p);else south.applyLock(p);
  if(p>=1){s.deckComplete=true;s.connectionAccepted=true;navigation.sync();}
 }
 function beginArchitecturalInk(id,player){if(!player||!canInkAction(id,player).available||id==='turn-far')return false;if(id==='mend-near'){loadProgress=1;north.applyLoad(1);}inkMotion.set(id,{age:0,duration:id==='read-decree'?2.35:1.20});return true;}
 function beginLatchRelease(id,player){if(id!=='turn-far'||!player||!canInkAction(id,player).available)return false;spans[1].motion={kind:'rope-held',age:0};feedback('木闩退出卡口，吊绳正在放长。看短桥落到石托，再松笔。');return true;}
 function stopLatchRelease(id,cancel=false){const s=spans[1];if(id!=='turn-far'||s.motion?.kind!=='rope-held')return false;const held=s.motion.age;s.motion=null;const landed=!cancel&&held+1e-6>=RECALL_JOINERY.minimumLatchHoldSeconds&&releaseProgress>=1-1e-6&&Math.abs(s.fold.rotation.x)<.001;if(landed){releaseProgress=1;south.applyLanding(1);complete(id);feedback('短桥落到承石，接头的木楔还未插紧。点住木楔，松笔把它锁稳。');}else feedback(cancel?'木闩已重新卡住吊绳，桥停在这里。再次按住木闩，继续缓放。':'木闩卡住了吊绳，桥停在这里。再次按住木闩，直到桥脚落到承石。');navigation.sync();return {landed,progress:releaseProgress,cancelled:cancel,heldSeconds:held};}
 const beginBridgeTurn=beginLatchRelease,stopBridgeTurn=stopLatchRelease;
 function setDoors(pair,amount){for(const {hinge,sign}of pair.leaves)hinge.rotation.y=-sign*amount*1.43;}
 function pose(){const recall=clamp(spans[0].gateProgress,0,1),fall=smooth(coldAge/1.25),p=smooth(coldAge/.85);setDoors(court.frontDoor,phase==='arrival'?(completed.has('mend-near')?1:recall):1-smooth(decreeAge/.55));setDoors(court.eastDoor,p);setDoors(court.southDoor,p);court.decreeLight.intensity=lightProgress*24*(1-fall*.8);court.windowBeam.material.uniforms.amount.value=lightProgress*(1-fall*.85);court.updateDecreePaper(lightProgress,fall);for(const l of court.lanterns)l.intensity=4+recall*.8-fall*2.3;court.lampMaterial.emissiveIntensity=.6+recall*.25-fall*.40;court.sun.color.copy(new T.Color(0xf1dfbd)).lerp(new T.Color(0xb8d1cc),fall);court.sun.intensity=2.1-fall*.23;court.southLight.intensity=p*4.4;court.atmosphere.setLight('decree',lightProgress*(1-fall*.78)*1.8);court.atmosphere.setLight('south',p*1.8);}
 function update(t,response=0,suppliedDt){
  const dt=suppliedDt===undefined?lastTime===null?0:clamp(t-lastTime,0,.05):clamp(Number.isFinite(suppliedDt)?suppliedDt:0,0,.05);lastTime=t;if(dt<=0)return;simTime+=dt;let changed=false;
  const locked=completed.has('mend-near')||inkMotion.has('mend-near'),supported=locked||phase==='arrival'&&onLever();loadProgress=clamp(loadProgress+(supported?dt/RECALL_JOINERY.loadSeconds:-dt/.80),0,1);north.applyLoad(loadProgress);loadDwell=supported?loadDwell+dt:0;
  if(loadProgress>=.999&&phase==='arrival'&&!completed.has('turn-near')){loadProgress=1;north.applyLoad(1);complete('turn-near');feedback('承梁头已托进卯口。脚不要离开踏木杠；点住旁边木楔，再松笔锁梁。');}
  const rope=spans[1].motion;if(rope?.kind==='rope-held'){rope.age+=dt;if(rope.age>=RECALL_JOINERY.minimumLatchHoldSeconds){releaseProgress=clamp(releaseProgress+dt/RECALL_JOINERY.releaseSeconds,0,1);south.applyRelease(releaseProgress);south.applyLanding(smooth((releaseProgress-.93)/.07));changed=true;}}
  for(const [id,q]of inkMotion){q.age=Math.min(q.duration,q.age+dt);applyArchitecturalPose(id,smooth(q.age/q.duration));if(q.age>=q.duration){applyArchitecturalPose(id,1);complete(id);inkMotion.delete(id);if(id==='read-decree'){phase='decree';decreeAge=0;}}}
  if(phase==='decree'){decreeAge+=dt;if(decreeAge>=3.25){phase='southbound';coldAge=0;storyEvents.push('banishment');}}if(phase==='southbound')coldAge+=dt;
  for(const s of spans){const allowed=s.id!=='turn-near'||phase==='arrival',desired=allowed&&s.connectionAccepted&&s.deckComplete&&navigation.spanJoined(s)&&!s.motion?1:0,before=s.gateProgress;s.gateProgress=clamp(s.gateProgress+(desired?dt/.55:-dt/.25),0,1);if(before!==s.gateProgress){changed=true;for(const g of s.gates)g.rotation.y=s.gateProgress*Math.PI/2;}}
  const inside=navigation.contains(lastPlayer,platforms[1])&&lastPlayer.z<-3.15;cutawayAmount=T.MathUtils.damp(cutawayAmount,inside?1:0,4.2,dt);for(const m of court.cutawayMaterials)m.opacity=1-cutawayAmount*.94;
  for(const [i,s]of spans.entries()){const t=task(i===0?'mend-near':'turn-far'),show=(i===0?phase==='arrival':phase==='southbound')&&Math.hypot(lastPlayer.x-t.position[0],lastPlayer.z-t.position[2])<t.radius+1.35;for(const m of s.roofInkMaterials)m.opacity=T.MathUtils.damp(m.opacity,show?.16:1,4.4,dt);}
  feedbackAge=Math.max(0,feedbackAge-dt);if(changed)navigation.sync();pose();updateGuides();court.atmosphere.update(simTime,{clarity:completed.has('mend-near')?.15:0});
 }
 function updateCamera(camera,dt){
  if(!camera||dt<=0)return;cameraFrozen=Boolean(stage.pressureInkStats?.activeId);if(cameraFrozen)return;
  const inward=smooth((-lastPlayer.z-2.7)/1.9),sv=smooth((lastPlayer.x-3.5)/4.4),inside=inward*(1-sv),coldView=phase==='southbound'?.70+releaseProgress*.30:0;
  const wideFocus=V(lastPlayer.x*.40,lastPlayer.y+1.8,1+(lastPlayer.z-1)*.42),hallFocus=V(lastPlayer.x*.54,lastPlayer.y+1.75,-3.05+(lastPlayer.z+3.05)*.55),southFocus=V(3.1+(lastPlayer.x-3.1)*.68,lastPlayer.y+1.8,-3.2+(lastPlayer.z+3.2)*.66),desiredFocus=wideFocus.clone().lerp(hallFocus,inward).lerp(southFocus,sv);cameraFocus??=wideFocus.clone();cameraFocus.lerp(desiredFocus,1-Math.exp(-dt*3.2));
  const offset=V(13.1,9.6,22.6).lerp(V(3.3,1.6,1.3),inside).lerp(V(7.9,5.8,15.2),sv).lerp(V(10,6.9,20.4),inside*coldView),desiredPosition=cameraFocus.clone().add(offset),look=cameraFocus.clone().add(V(.8,.4,-2.4).lerp(V(-.75,-.25,-2.2),inside));if(coldView>0)look.lerp(V(6.2,1.65,-5),inside*coldView*.82);
  const northDetail=phase==='arrival'?1-smooth((Math.hypot(lastPlayer.x-northFoot[0],lastPlayer.z-northFoot[2])-.75)/1.25):0,southDetail=phase==='southbound'?1-smooth((Math.hypot(lastPlayer.x-southFoot[0],lastPlayer.z-southFoot[2])-.65)/1.8):0;
  // Move closer to the person and the load-bearing parts together. These are
  // ordinary scene cameras; actual pointer capture freezes the whole pose.
  desiredPosition.lerp(V(7.2,5.95,15.1),northDetail).lerp(V(8.75,4.35,2.4),southDetail);look.lerp(V(.15,.85,2.75),northDetail).lerp(V(5.6,.93,-4.65),southDetail);
  camera.position.lerp(desiredPosition,1-Math.exp(-dt*3));const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(camera.position,look,V(0,1,0)));camera.quaternion.slerp(q,1-Math.exp(-dt*4));camera.fov=T.MathUtils.damp(camera.fov,T.MathUtils.lerp(39+inside*(1-coldView)*13,42,southDetail),4,dt);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);cameraMode=northDetail>.7?'north-joinery':southDetail>.7?'south-joinery':sv>.1||coldView>.15?'south-gallery':inside>.15?'inside-hall':'wide';
 }
 function interact(id){if(id!=='gate')return completed.has(id);if(!completed.has('unfold-far')||phase!=='southbound'||Math.hypot(lastPlayer.x-RECALL_SPACE.gateFoot[0],lastPlayer.z-RECALL_SPACE.gateFoot[2])>.70)return false;completed.add('gate');departed=true;return true;}
 function reset(){completed.clear();inkMotion.clear();environmentEvents.length=storyEvents.length=0;phase='arrival';simTime=decreeAge=coldAge=cutawayAmount=feedbackAge=lightProgress=loadProgress=releaseProgress=loadDwell=0;lastTime=null;lastPlayer=V(...RECALL_SPACE.spawn);departed=false;cameraFocus=null;cameraMode='wide';cameraFrozen=false;lastInkFeedback='';for(const m of court.cutawayMaterials)m.opacity=1;for(const s of spans){s.group.rotation.y=s.joinedAngle;s.motion=null;s.connectionAccepted=false;s.gateProgress=0;s.deckComplete=false;s.repairProgress=0;for(const m of s.roofInkMaterials)m.opacity=1;for(const g of s.gates)g.rotation.y=0;}north.applyLoad(0);north.applyLock(0);south.applyRelease(0);south.applyLanding(0);south.applyLock(0);applyArchitecturalPose('read-decree',0);navigation.sync();pose();updateGuides();court.atmosphere.update(0);}
 reset();const architecture={targets,interact,canMove:navigation.canMove,reset,get recallOpened(){return completed.has('mend-near');},get southOpened(){return phase==='southbound'&&coldAge>.85;}};
 const stage={scene,root,spawn:[...RECALL_SPACE.spawn],bounds:{minX:-7.2,maxX:14.6,minZ:-8.22,maxZ:7.25},targets,architecture,interact,update,updateCamera,stageOwnCamera:true,get gestureActive(){return phase==='decree'||moving();},get movementBlocked(){return phase==='decree'||moving();},reset,canMove:navigation.canMove,routeTo:navigation.routeTo,heightAt:()=>RECALL_SPACE.floorY,freeMovement:true,ready:court.ready,atmosphere:court.atmosphere,pressureInkSockets:court.sockets,applyInkDot:()=>false,canInkDot,canInkAction,beginArchitecturalInk,beginLatchRelease,stopLatchRelease,beginBridgeTurn,stopBridgeTurn,spaceNavigation:navigation,spaceCourt:court,joineryParameters:RECALL_JOINERY,getTaskApproachPosition:id=>task(id)?.position,updateStory:(time,player)=>{if(player)lastPlayer.copy(player);},followCamera:{offset:[13.1,9.6,22.6],lookHeight:1.8,lookOffset:[.8,.4,-2.4],trackX:.40,trackZ:.42,worldAnchor:[0,0,1],fov:39},exit:{position:[...RECALL_SPACE.exit],crossing:{axis:'x',direction:1,value:13.85},label:'从南行门继续往惠州'},takeStoryEvent:()=>storyEvents.shift()||null,takeEnvironmentCompleted:()=>environmentEvents.shift()||null,get recalled(){return completed.has('turn-near');},get banished(){return phase==='southbound';},get departed(){return departed;},get spaceStats(){return {phase,simTime,decreeAge,coldAge,moving:moving(),revision:navigation.revision,bodyRadius:RECALL_SPACE.bodyRadius,waterIsWalkable:false,lightProgress,loadProgress,loadDwell,onLever:onLever(),releaseProgress,joinery:{northSupported:loadProgress>=.985,northLocked:completed.has('mend-near'),southLanded:releaseProgress>=1-1e-6,southLocked:completed.has('unfold-far'),fixedGalleries:true},inkMotion:[...inkMotion].map(([id,q])=>({id,...q})),lastInkFeedback:feedbackAge>0?lastInkFeedback:'',camera:{mode:cameraMode,frozen:cameraFrozen,focus:cameraFocus?.toArray()||null},connections:navigation.connections(),completed:[...completed],spans:spans.map(s=>({id:s.id,angle:s.group.rotation.y,angleLimits:[s.joinedAngle,s.joinedAngle],angleGap:0,aligned:navigation.spanJoined(s),deckComplete:s.deckComplete,repairProgress:s.repairProgress,connectionAccepted:!!s.connectionAccepted,guide:court.instructionSigns.get(s.id)?.state,position:s.group.position.toArray(),start:navigation.endpoint(s,s.start).toArray(),end:navigation.endpoint(s,s.end).toArray(),moving:!!s.motion,holding:s.motion?.kind==='rope-held',gateProgress:s.gateProgress,walkable:navigation.active(s)}))};}};return stage;
}
