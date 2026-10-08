import * as T from './vendor/three.module.js';
import {buildWeightedBridgeScene,WEIGHTED_BRIDGE as S} from './recall-weighted-bridge-scene.js';
import {createRecallSpaceNavigation} from './recall-space-navigation.js';
import {createPressureInkDot} from './pressure-ink-dot.js';
import {createBrushSurface} from './brush-surface.js';
import {createArchitecturalWashInput} from './architectural-wash-input.js';
import {createInteractionHitTester} from './interaction-hit.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp,smooth=x=>T.MathUtils.smootherstep(clamp(x,0,1),0,1);
const ORDER=['turn-near','mend-near','read-decree','turn-far','unfold-far','gate'];

export function buildRecallWeightedBridge(){
 const court=buildWeightedBridgeScene(),{scene,root,north,south}=court,completed=new Set(),events=[],storyEvents=[],submissions=new Set(),queued=new Set(),ignore=new Set();
 const targets=[
  {id:'turn-near',kind:'walk',autoComplete:false,position:S.northFoot,radius:.68,label:'桥头压梁踏木',hint:'走上桥头横着的宽踏木，站稳。你的重量会把悬起的北廊压到石托上；脚先不要离开。',mode:'walk-balance-beam'},
  {id:'mend-near',kind:'spatial-gesture',position:S.northFoot,radius:.90,label:'压梁旁的木楔',hint:'北廊已落到石托。站在踏木上，点住右手梁肩上的木楔，稍停后松笔，把梁定住；再穿廊入殿。',mode:'brush-joinery-dot',requires:['turn-near']},
  {id:'read-decree',kind:'spatial-gesture',position:[0,.32,-6.04],radius:1.10,label:'引窗光读诏',hint:'走进正殿，轻扫左后方的真实高窗，再松笔。窗光会落到案上的诏卷，镜头随光靠近纸面。',mode:'brush-window-light',requires:['mend-near']},
  {id:'turn-far',kind:'spatial-gesture',position:S.southFoot,radius:1.16,label:'推梁伸桥',hint:'走到厅东桥头。按住横贯桥面的推梁，朝对岸拖；桥面会沿承梁伸出。梁头落到对岸石托后松手。',mode:'drag-structural-crossbeam',requires:['read-decree']},
  {id:'unfold-far',kind:'spatial-gesture',position:S.southFoot,radius:1.16,label:'锁梁木楔',hint:'桥面已伸到对岸，现在把它锁稳。木楔就在身旁的桥头梁轨上：点住片刻，等墨色变深再松笔，栏门会让开。',mode:'brush-joinery-dot',requires:['turn-far']},
  {id:'gate',kind:'walk',position:S.gateFoot,radius:.57,label:'穿过南行门',hint:'廊桥两端已承稳，栏门让开。沿带顶的木桥穿过南行门，前往惠州。',requires:['unfold-far']}
 ].map(t=>({...t,verse:''}));
 const byId=new Map(targets.map(t=>[t.id,t]));
 let phase='arrival',player=V(...S.spawn),cameraRef=null,travelerRef=null,time=0,lastTime=null,load=0,extension=0,nearLockAge=-1,farLockAge=-1,readAge=-1,coldAge=0,activeId=null,drag=null,viewHold=null,viewport={left:0,top:0,width:1280,height:720},lastFeedback='',releaseCount=0,cancelCount=0;
 const next=()=>ORDER.find(id=>!completed.has(id))||null,near=id=>byId.has(id)&&player.distanceTo(V(...byId.get(id).position))<byId.get(id).radius;
 const onBalance=()=>Math.abs(player.x)<.66&&Math.abs(player.z-S.northFoot[2])<.57&&Math.abs(player.y-.32)<.1;
 const prerequisite=id=>byId.get(id).requires?.every(id=>completed.has(id))??true;
 const moving=()=>nearLockAge>=0&&nearLockAge<1.25||farLockAge>=0&&farLockAge<1.25||readAge>=0&&readAge<8.5;
 function canAction(id){return !completed.has(id)&&!submissions.has(id)&&prerequisite(id)&&near(id)&&!moving()&&(id!=='mend-near'||load>=.999&&onBalance())&&(id!=='unfold-far'||extension>=.999);}
 const walls=[[-4.20,4.20,-8.425,-8.175],[-4.325,-4.075,-8.30,-3.20],[4.075,4.325,-8.30,-5.925],[4.075,4.325,-4.075,-3.20],[-4.24,-1.36,-3.315,-3.085],[1.36,4.24,-3.315,-3.085],[-1.52,1.52,-7.40,-6.43]];
 function barrier(a,b){
  if(moving()||activeId)return true;
  const crossing=(axis,value)=>a[axis]<value&&b[axis]>=value||a[axis]>value&&b[axis]<=value;
  if(crossing('z',-3.20)&&Math.max(a.x,b.x)<4.1&&(phase!=='arrival'||nearLockAge<1.25||Math.max(Math.abs(a.x),Math.abs(b.x))>.80))return true;
  if(crossing('x',4.14)&&Math.min(a.z,b.z)<-3.2&&(phase!=='southbound'||coldAge<.85||Math.max(Math.abs(a.z+5),Math.abs(b.z+5))>.57))return true;
  if(crossing('x',S.southGateX)&&(farLockAge<1.25||Math.max(Math.abs(a.z+5),Math.abs(b.z+5))>.57))return true;
  for(let i=1,n=Math.max(1,Math.ceil(a.distanceTo(b)/.08));i<=n;i++){const p=a.clone().lerp(b,i/n);if(walls.some(([x0,x1,z0,z1])=>Math.hypot(p.x-clamp(p.x,x0,x1),p.z-clamp(p.z,z0,z1))<S.bodyRadius))return true;}return false;
 }
 const navigation=createRecallSpaceNavigation(court.platforms,[north,south],{barrier});
 const dots=new Map();
 for(const [id,mesh]of[['mend-near',court.northWedge],['unfold-far',court.southWedge]])dots.set(id,createPressureInkDot({id,parent:mesh,position:[0,0,id==='mend-near'?.103:-.103],rotation:id==='mend-near'?null:[0,Math.PI,0],width:.34,height:.35,enabled:false,minimumHoldSeconds:.28,heavyHoldSeconds:.44,fullHoldSeconds:.70,hitHalo:14,seed:id==='mend-near'?971:977,label:byId.get(id).label,hint:byId.get(id).hint}));
 const template=[[.10,.50],[.50,.50],[.90,.50]],window=createBrushSurface({id:'read-decree',parent:root,position:[-2.6,2.40,-8.00],width:1.9,height:1.65,template,inputState:createArchitecturalWashInput(template,{width:1.9,height:1.65,minTravel:.30,minSpan:.25}),hitTolerancePixels:18,label:byId.get('read-decree').label,hint:byId.get('read-decree').hint});window.mesh.material.opacity=0;window.cursor.visible=false;
 const parts=new Map([['mend-near',court.northWedge],['turn-far',court.crossbar],['unfold-far',court.southWedge]]),pickPart=createInteractionHitTester([...parts].map(([id,mesh])=>({id,objects:[mesh],pixelTolerance:id==='turn-far'?18:14}))),ray=new T.Raycaster();
 const shown=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;},ignored=o=>{for(let p=o;p;p=p.parent)if(ignore.has(p))return true;return false;};
 function clearRay(point){const target=point?.isVector3?point:V(...point),delta=target.clone().sub(cameraRef.position),meshes=[];scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isMesh&&shown(o)&&!ignored(o)&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>(m.opacity??1)>=.85&&m.depthTest!==false&&!(m.transparent&&m.depthWrite===false)))meshes.push(o);});ray.set(cameraRef.position,delta.normalize());ray.near=0;ray.far=Math.max(0,cameraRef.position.distanceTo(target)-.20);return !ray.intersectObjects(meshes,false).length;}
 function physicalPick(ndc,camera){cameraRef=camera;const hit=pickPart(ndc,camera,viewport);if(hit&&clearRay(hit.worldPoint))return hit;const uv=window.sample(ndc,camera,near('read-decree')?18:0);if(uv){const p=V((uv[0]-.5)*1.9,(.5-uv[1])*1.65,.0).applyMatrix4(window.root.matrixWorld);if(clearRay(p))return {id:'read-decree',uv,worldPoint:p.toArray()};}return null;}
 function pickPointerTarget(ndc,camera,v=viewport){if(v?.width&&v?.height)viewport={...v};const hit=physicalPick(ndc,camera);if(!hit)return null;const id=hit.id,available=!completed.has(id)&&!submissions.has(id)&&prerequisite(id)&&!moving()&&(!near(id)||canAction(id));return {...hit,kind:'spatial-gesture',mode:byId.get(id).mode,available,completed:completed.has(id),hint:getHint(id),approachPosition:byId.get(id).position,pickPriority:90,actualArchitecturalPart:true};}
 function dragPoint(ndc,camera){ray.setFromCamera(ndc,camera);const p=ray.ray.intersectPlane(new T.Plane(V(0,1,0),-1.13),V());return p?south.group.worldToLocal(p).z:null;}
 function pointerDown(ndc,camera,p){player=p;cameraRef=camera;if(activeId)return false;const hit=pickPointerTarget(ndc,camera);if(!hit?.available)return false;const id=hit.id;
  if(id==='turn-far'){const z=dragPoint(ndc,camera);if(z===null)return false;drag={start:z,extension};}
  else if(id==='read-decree'){window.setEnabled(true);if(!window.down(ndc,camera))return false;}
  else {const dot=dots.get(id);dot.reset();dot.setEnabled(true);dot.setViewport(viewport);if(!dot.down(dot.getRect(camera).start,camera))return false;}
  activeId=id;viewHold={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};lastFeedback='';return true;
 }
 function pointerMove(ndc,camera,p){if(!activeId)return false;player=p;cameraRef=camera;if(drag){const z=dragPoint(ndc,camera);if(z!==null){extension=clamp(drag.extension+(drag.start-z)/S.extension,0,1);court.southPose(extension,false);navigation.sync();}}
  else if(activeId==='read-decree'){window.move(ndc,camera);window.mesh.material.opacity=0;window.cursor.visible=false;}
  else {const dot=dots.get(activeId),hit=physicalPick(ndc,camera);dot.move(hit?.id===activeId?dot.getRect(camera).start:new T.Vector2(10,10),camera);}return true;
 }
 function pointerUp(){if(!activeId)return false;const id=activeId;activeId=null;viewHold=null;releaseCount++;
  if(drag){drag=null;if(extension>=.96){extension=1;court.southPose(1,false);submissions.add(id);queue(id);lastFeedback='桥面已接到对岸。接下来点住身旁桥头梁轨上的木楔，等墨色变深，再松笔锁桥。';}else lastFeedback='桥停在这里。继续按住横向推梁，拖向对岸，直到梁头落到石托。';navigation.sync();}
  else if(id==='read-decree'){window.up();if(window.ready){submissions.add(id);readAge=0;phase='decree';lastFeedback='高窗慢慢让开，窗光正在照到案上诏卷。';}else lastFeedback='轻扫真实高窗一片，再松笔，让光照到案上。';}
  else {const dot=dots.get(id),valid=dot.up(),commit=dot.takeCommit();dot.fadeOut(.55);if(valid&&commit&&canAction(id)){submissions.add(id);if(id==='mend-near'){nearLockAge=0;load=1;court.northPose(1,true);}else{farLockAge=0;extension=1;court.southPose(1,true);}lastFeedback='木楔正压入卯口，承梁定住后，栏门会让开。';}else lastFeedback='这一点墨还没压稳。重新点住木楔，等墨晕变深后再松笔。';}return true;
 }
 function pointerCancel(){if(!activeId)return false;if(activeId==='read-decree')window.cancel();else if(dots.has(activeId)){dots.get(activeId).cancel();dots.get(activeId).fadeOut(.35);}activeId=null;drag=null;viewHold=null;cancelCount++;lastFeedback='这一笔已停。桥停在实际承梁上，重新落笔后继续。';return true;}
 function queue(id){if(!queued.has(id)){queued.add(id);events.push(id);}}
 function poseDoors(){for(const {hinge,sign}of court.frontDoor.leaves)hinge.rotation.y=-sign*(nearLockAge>=1.25&&phase==='arrival'?1:0)*1.43;for(const pair of[court.eastDoor,court.southDoor])for(const {hinge,sign}of pair.leaves)hinge.rotation.y=-sign*smooth(coldAge/.85)*1.43;}
 function update(t,response=0,suppliedDt){const dt=suppliedDt===undefined?lastTime===null?0:clamp(t-lastTime,0,.05):clamp(suppliedDt||0,0,.05);lastTime=t;if(!(dt>0))return;time+=dt;
  if(nearLockAge<0){load=clamp(load+(onBalance()?dt/S.loadSeconds:-dt/S.returnSeconds),0,1);court.northPose(load,false);if(load>=.999&&onBalance())queue('turn-near');}else{load=1;nearLockAge=Math.min(1.25,nearLockAge+dt);court.northPose(1,true);court.gatePose(north,smooth(nearLockAge/1.25));if(nearLockAge>=1.25)queue('mend-near');}
  if(farLockAge>=0){farLockAge=Math.min(1.25,farLockAge+dt);court.southPose(1,true);court.gatePose(south,smooth(farLockAge/1.25));if(farLockAge>=1.25)queue('unfold-far');}
  if(readAge>=0){readAge=Math.min(8.5,readAge+dt);const light=smooth(readAge/2.1),cold=smooth((readAge-5.6)/2.1);court.updateDecreePaper(light,cold);for(const {hinge,side,paper}of court.windowLeaves){hinge.rotation.y=-side*light*1.43;paper.material.opacity=.78*(1-light*.85);}court.windowBeam.material.uniforms.amount.value=light*(1-cold*.85);court.decreeLight.intensity=light*20*(1-cold*.85);if(readAge>=5.6&&phase==='decree'){phase='southbound';storyEvents.push('banishment');}if(phase==='southbound')coldAge=Math.min(2,coldAge+dt);if(readAge>=8.5)queue('read-decree');}
  dots.forEach((dot,id)=>{dot.update(dt);dot.setEnabled(canAction(id));});window.update(dt);window.mesh.material.opacity=0;window.cursor.visible=false;poseDoors();navigation.sync();court.atmosphere.update(time,{clarity:nearLockAge>=0?.15:0});scene.traverse(o=>{if(o.isPoints)o.visible=false;});
 }
 function interact(id){if(completed.has(id))return true;if(id==='gate'){if(!prerequisite(id)||!near(id))return false;}else if(!queued.has(id))return false;completed.add(id);lastFeedback='';return true;}
 function goal(p){if(readAge>=2.0&&readAge<5.6)return {eye:V(.0,3.55,-5.85),look:V(0,1.48,-6.9),fov:35};if(p.x>4.15)return {eye:V(p.x*.45+8.3,12.2,7.0),look:V(p.x*.56+2.0,1.3,-5.0),fov:43};if(p.z<-2.62)return {eye:V(8.4,11.4,3.8),look:V(0,1.30,-5.45),fov:43};return {eye:V(6.2,12.2,14.6),look:V(.30,1.2,-.60),fov:43};}
 function updateCamera(camera,dt,p){player=p;cameraRef=camera;court.setView(p);if(travelerRef)travelerRef.visible=!(readAge>=2&&readAge<5.6);if(viewHold){camera.position.copy(viewHold.position);camera.quaternion.copy(viewHold.quaternion);camera.fov=viewHold.fov;}else{const g=goal(p),k=dt>0?1-Math.exp(-dt*3.4):0;camera.position.lerp(g.eye,k);const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(camera.position,g.look,V(0,1,0)));camera.quaternion.slerp(q,k);camera.fov=T.MathUtils.lerp(camera.fov,g.fov,k);}camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 function enterCamera(camera,p){player=p;cameraRef=camera;court.setView(p);const g=goal(p);camera.position.copy(g.eye);camera.lookAt(g.look);camera.fov=g.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 function pressureState(id){const state=dots.get(id)?.stats;return state?{heldSeconds:state.heldSeconds,releaseReady:state.active&&state.contactValid&&state.heldSeconds+1e-6>=.28,contactValid:state.contactValid}:null;}
 function pressureAction(id){const state=pressureState(id);if(activeId!==id)return '点住片刻，等墨色变深，再松笔锁桥';if(!state.contactValid)return '把笔尖移回木楔，等墨晕变深后松笔';return state.releaseReady?'墨色已稳，松笔锁桥':'稳稳按住木楔，让墨晕慢慢变深';}
 function getHint(id=next()){
  if(activeId===id&&dots.has(id))return pressureAction(id)+'。';
  if(lastFeedback)return lastFeedback;
  if(id==='mend-near'&&(load<.999||!onBalance()))return '站回桥头宽踏木，把北廊压到石托。脚留在踏木上，再点住旁边的锁梁木楔，等墨色变深后松笔。';
  if(moving())return readAge>=0&&readAge<8.5?readAge<5.6?'窗光正照亮诏卷。读完，镜头会回到身边。':'九年之后，来门已合。读完诏卷，向厅东的廊桥走。':'木楔正在入卯，承梁锁稳后，栏门会让开。';
  if(id==='turn-far'){if(!near(id))return '穿过厅东门，走到东廊桥头。找到横贯桥面的推梁，按住它，朝对岸拖出桥面。';if(extension>=.96)return '梁头已经落到对岸石托。松手停桥，再锁住身旁桥头梁轨上的木楔。';return '桥面还收在梁轨里。按住横贯桥面的推梁，朝对岸拖；梁头落到对岸石托后松手。';}
  if(id==='unfold-far')return '桥面已伸到对岸，现在把它锁稳。木楔就在身旁的桥头梁轨上：点住片刻，等墨色变深再松笔，栏门会让开。';
  return byId.get(id)?.hint||'廊桥已经锁稳。沿真正接好的木桥，穿过南行门，前往惠州。';
 }
 function getKeyHint(id=next()){
  if(moving())return readAge>=0&&readAge<8.5?'读诏卷，等镜头回到身边':'等木楔锁稳、栏门让开';
  if(dots.has(id)&&activeId===id)return pressureAction(id);
  if(!near(id))return id==='turn-near'?'WASD / 左键走近桥头踏木':id==='mend-near'?'走回桥头踏木，压稳北廊':id==='read-decree'?'穿过北廊入殿，走近书案和高窗':id==='gate'?'沿廊桥走到南行门下':id==='unfold-far'?'穿过厅东门，走近桥头木楔':'穿过厅东门，走近廊桥的推梁';
  return id==='turn-near'?'站上宽踏木，踩稳压梁':id==='turn-far'?'按住横梁，向对岸拖；松手停桥':id==='read-decree'?'在真实高窗按住轻扫，松笔引光':id==='unfold-far'?'点住桥头木楔，等墨色变深，再松笔':id==='gate'?'沿廊桥穿过南行门，前往惠州':'脚留在踏木，点住旁边木楔，松笔锁梁';
 }
 function getTaskGuide(camera){
  const id=next();if(!camera||!id||moving()||submissions.has(id))return null;
  const task=byId.get(id);let object,world,title,action;
  if(id==='turn-near'){object=court.balancePlate;world=object.localToWorld(V(0,.034,0));title='桥头踏木';action=onBalance()?'站稳，让北廊落到石托上':'走上踏木压梁';}
  else if(dots.has(id)){object=parts.get(id);world=dots.get(id).root.getWorldPosition(V());title='锁梁木楔';action=id==='mend-near'&&(load<.999||!onBalance())?'先站回踏木，把北廊压稳':pressureAction(id);}
  else if(id==='turn-far'){object=court.crossbar;world=object.getWorldPosition(V());title='推梁伸桥';action=extension>=.96?'梁头已到石托，松手停桥':'按住横梁，向对岸拖';}
  else if(id==='read-decree'){object=court.decreeWindow;world=object.localToWorld(V(0,.975,.15));title='高窗借光';action='按住高窗轻扫，松笔引光读诏';}
  else {object=root.getObjectByName('南行门门楼');world=object.localToWorld(V(0,1.20,0));title='南行门';action='沿廊桥前行，穿过南行门';}
  camera.updateMatrixWorld(true);cameraRef=camera;const q=world.clone().project(camera),state=pressureState(id);
  return {id,title,action,anchor:{x:q.x,y:q.y,z:q.z},worldPosition:world.toArray(),visible:shown(object)&&Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z>-1&&q.z<1&&clearRay(world),near:near(id),...(state?{releaseReady:state.releaseReady,heldSeconds:state.heldSeconds}:{})};
 }
 function getGestureRect(camera,id=activeId||next()){if(!byId.has(id)||id==='gate')return null;let r;if(dots.has(id))r=dots.get(id).getRect(camera);else if(id==='read-decree')r=window.getRect(camera);else{const world=id==='turn-far'?court.crossbar.getWorldPosition(V()).toArray():S.northFoot,q=V(...world).project(camera);r={centre:{x:q.x,y:q.y,z:q.z},x:q.x,y:q.y,halfWidth:id==='turn-far'?.10:0,halfHeight:.03,worldPosition:world,visible:q.z>-1&&q.z<1,start:{x:q.x,y:q.y,z:q.z}};}return {...r,id,mode:byId.get(id).mode,word:'',hint:getHint(id),contextHint:getHint(id),guide:[],strokes:[],guideVisible:false,showProgress:false,enabled:canAction(id),actualArchitecturalPart:true,pickPriority:90,progress:id==='turn-far'?extension:id==='turn-near'?load:r.progress||0};}
 function reset(){pointerCancel();completed.clear();events.length=storyEvents.length=0;submissions.clear();queued.clear();phase='arrival';player=V(...S.spawn);time=load=extension=coldAge=releaseCount=cancelCount=0;nearLockAge=farLockAge=readAge=-1;lastTime=null;lastFeedback='';court.reset();dots.forEach(d=>d.reset());window.reset();if(travelerRef)travelerRef.visible=true;navigation.sync();}
 const stage={scene,root,spawn:S.spawn,bounds:{minX:-7.2,maxX:14.6,minZ:-8.22,maxZ:7.25},targets,spaceCourt:court,spaceNavigation:navigation,ready:court.ready,stageOwnCamera:true,navigationWaypointRadius:.04,atmosphere:court.atmosphere,architectureEnvelope:court.architectureEnvelope,architectureDetail:{chapter:8,ownedBy:'weighted-covered-galleries',mergedConstruction:true},architectureGroundingAnchors:[],architectureBoundaryAnchors:[],architectureFogGuards:[],canMove:navigation.canMove,routeTo:navigation.routeTo,heightAt:()=>.32,interact,update,reset,enterCamera,updateCamera,pointerDown,pointerMove,pointerUp,pointerCancel,pickPointerTarget,getGestureRect,getTaskGuide,borrowedPathSurfaces:new Map([['read-decree',window]]),updateStory:(t,p)=>{if(p)player=p;},updateGestureView:(camera,p)=>{cameraRef=camera;if(p)player=p;},setTraveler:t=>{travelerRef=t;ignore.add(t);},getBrushInteractionRegions:(camera,id)=>{const r=getGestureRect(camera,id);return r?[r]:[];},getBrushHint:getHint,getBorrowedPathHint:getHint,getBorrowedPathKeyHint:getKeyHint,getTaskApproachPosition:id=>byId.get(id)?.position,takeEnvironmentCompleted:()=>events.shift()||null,takeStoryEvent:()=>storyEvents.shift()||null,exit:{position:S.exit,crossing:{axis:'x',direction:1,value:13.85},label:'沿南行廊桥前往惠州'}};
 Object.defineProperties(stage,{gestureActive:{get:()=>!!activeId},glyphForming:{get:moving},movementBlocked:{get:()=>!!activeId||moving()},banished:{get:()=>phase==='southbound'},gestureId:{get:()=>activeId},spaceStats:{get:()=>({...court.stats,phase,time,load,extension,onBalance:onBalance(),nearLockAge,farLockAge,readAge,coldAge,moving:moving(),completed:[...completed],submitted:[...submissions],nextId:next(),releaseCount,cancelCount,activeId,currentHint:getHint(),connections:navigation.connections(),spans:[north,south].map(s=>({id:s.id,position:s.group.position.toArray(),angle:s.group.rotation.y,deckComplete:s.deckComplete,gateProgress:s.gateProgress,walkable:navigation.active(s)}))})},borrowedPathStats:{get:()=>stage.spaceStats}});
 reset();return stage;
}
