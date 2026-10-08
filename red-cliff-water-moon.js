import * as T from './vendor/three.module.js';
import {createMoonlightConnection} from './red-cliff-moonlight-stroke.js';
const V=(...p)=>new T.Vector3(...p),clamp=T.MathUtils.clamp;
export const WATER_MOON_FOOT={wrong:[-2.78,0,-.65],aligned:[-2.458,0,-1.45]};

// The reflection is the virtual image of the real moon in the river plane.
// Both sight lines must pass the same physical aperture; a floor circle alone
// never grants the brush gesture or advances the story.
export function evaluateWaterMoonView({camera,moon,window,blockers,waterPoint=V(0,-.072,0),waterNormal=V(0,1,0),halfWidth=.30,bottom=1.15,top=2.35}){
 if(!camera||!moon)return {aligned:false,alignmentError:99,moonVisibility:0,reflectionVisibility:0,projection:null};
 camera.updateMatrixWorld(true);window.updateWorldMatrix(true,true);moon.updateWorldMatrix(true,false);
 const centre=moon.getWorldPosition(V()),radius=moon.geometry.parameters.radius*moon.matrixWorld.getMaxScaleOnAxis(),mirror=centre.clone().addScaledVector(waterNormal,-2*centre.clone().sub(waterPoint).dot(waterNormal)),eye=camera.getWorldPosition(V()),normal=V(0,0,1).applyQuaternion(window.getWorldQuaternion(new T.Quaternion())),plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,window.getWorldPosition(V())),river=new T.Plane().setFromNormalAndCoplanarPoint(waterNormal,waterPoint),ray=new T.Raycaster(),right=V(1,0,0).applyQuaternion(camera.quaternion),up=V(0,1,0).applyQuaternion(camera.quaternion);
 const through=point=>{const direction=point.clone().sub(eye),distance=direction.length();if(distance<=.01)return null;const r=new T.Ray(eye,direction.divideScalar(distance)),world=r.intersectPlane(plane,V());if(!world||world.distanceTo(eye)>=distance)return null;return {world,local:window.worldToLocal(world.clone()),direction:r.direction,distance};};
 const reflectionPoint=new T.Ray(eye,mirror.clone().sub(eye).normalize()).intersectPlane(river,V()),moonCross=through(centre),reflectionCross=reflectionPoint?through(reflectionPoint):null;
 const visible=point=>{const cross=through(point);if(!cross||Math.abs(cross.local.x)>halfWidth||cross.local.y<bottom||cross.local.y>top)return false;ray.set(eye,cross.direction);ray.near=.01;ray.far=cross.distance-.02;return ray.intersectObjects(blockers,true).length===0;};
 let moonVisible=0,reflectionVisible=0;
 for(let i=0;i<9;i++){
  const sample=centre.clone();if(i){const angle=(i-1)*Math.PI/4;sample.addScaledVector(right,Math.cos(angle)*radius*.80).addScaledVector(up,Math.sin(angle)*radius*.80);}
  if(visible(sample))moonVisible++;
  const reflected=sample.clone().addScaledVector(waterNormal,-2*sample.clone().sub(waterPoint).dot(waterNormal)),point=new T.Ray(eye,reflected.sub(eye).normalize()).intersectPlane(river,V());if(point&&visible(point))reflectionVisible++;
 }
 const moonNDC=centre.clone().project(camera),waterNDC=reflectionPoint?.clone().project(camera),moonProjection=moonCross?.world.clone().project(camera),reflectionProjection=reflectionCross?.world.clone().project(camera),axisError=waterNDC?Math.abs(moonNDC.x-waterNDC.x):99;
 const alignmentError=moonCross&&reflectionCross?Math.max(Math.abs(moonCross.local.x),Math.abs(reflectionCross.local.x))/.21:99,inFrame=[moonNDC,waterNDC].every(p=>p&&p.z>-1&&p.z<1&&Math.abs(p.x)<.94&&Math.abs(p.y)<.94),moonVisibility=moonVisible/9,reflectionVisibility=reflectionVisible/9;
 const aligned=inFrame&&alignmentError<.78&&axisError<.035&&moonVisibility>=8/9&&reflectionVisibility>=8/9;
 return {aligned,alignmentError,axisError,moonVisibility,reflectionVisibility,inFrame,moonCross:moonCross?.local.toArray()||null,reflectionCross:reflectionCross?.local.toArray()||null,moonWorld:centre.toArray(),reflectionWorld:reflectionPoint?.toArray()||null,projection:{moon:moonNDC.toArray(),water:waterNDC?.toArray()||null,moonCross:moonProjection?.toArray()||null,reflectionCross:reflectionProjection?.toArray()||null},moonRadius:radius};
}

export function createWaterMoonPuzzle({parent,window,moon,blockers,waterY=-.072}){
 const guides=new T.Group();guides.name='水月同框_观察脚点与接续月痕';parent.add(guides);
 const rings=[];for(const [id,position]of Object.entries(WATER_MOON_FOOT)){
  const o=new T.Mesh(new T.RingGeometry(id==='aligned'?.29:.23,id==='aligned'?.33:.265,48).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:id==='aligned'?0xd9d4b2:0x9bacab,transparent:true,opacity:0,depthWrite:false,fog:false}));o.position.fromArray(position);o.position.y=.016;o.name=id==='aligned'?'借景脚点_须观察并描通水月':'被梁遮住的观察脚点';guides.add(o);rings.push({o,id});
 }
 const connection=createMoonlightConnection(guides);
 let active=false,observing=false,solved=false,holdSeconds=0,simTime=0,view=null,player=null,camera=null,entryPose=null,lastPosition=null,lastRotation=null,readyWas=false,alignedEvents=0;
 function refreshView(){if(active&&observing&&camera&&player){view=evaluateWaterMoonView({camera,moon,window,blockers,waterPoint:parent.localToWorld(V(0,waterY,0)),waterNormal:V(0,1,0).applyQuaternion(parent.getWorldQuaternion(new T.Quaternion()))});if(!view.aligned)holdSeconds=0;}else{view=null;holdSeconds=0;}}
 function observe(nextCamera,nextPlayer,isActive){camera=nextCamera;player=nextPlayer;active=!!isActive&&!solved;observing=Boolean(active&&player&&Math.hypot(player.x-WATER_MOON_FOOT.aligned[0],player.z-WATER_MOON_FOOT.aligned[2])<1.8);refreshView();}
 function updateCamera(nextCamera,dt,penDown=false){
  if(!observing||dt<=0||!player)return false;
  if(!entryPose)entryPose={position:nextCamera.position.clone(),rotation:nextCamera.quaternion.clone(),fov:nextCamera.fov};
  if(penDown)return true;
  const position=player.clone().add(V(0,1.72,-.60)),look=window.localToWorld(V(0,1.74,0)),goal=new T.PerspectiveCamera(52,nextCamera.aspect,.1,900);goal.position.copy(position);goal.lookAt(look);
  const amount=1-Math.exp(-dt*7.5);nextCamera.position.lerp(position,amount);nextCamera.quaternion.slerp(goal.quaternion,amount);nextCamera.fov=T.MathUtils.lerp(nextCamera.fov,52,amount);nextCamera.updateProjectionMatrix();nextCamera.updateMatrixWorld(true);return true;
 }
 function traceLine(){
  if(!view?.moonWorld||!view.reflectionWorld||!camera)return null;
  const eye=camera.getWorldPosition(V()),windowPoint=window.localToWorld(V(0,0,-.09)),normal=V(0,0,1).applyQuaternion(window.getWorldQuaternion(new T.Quaternion())),plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,windowPoint),project=point=>new T.Ray(eye,V(...point).sub(eye).normalize()).intersectPlane(plane,V()),a=project(view.moonWorld),b=project(view.reflectionWorld);
  return a&&b?[parent.worldToLocal(a).toArray(),parent.worldToLocal(b).toArray()]:null;
 }
 function update(dt){
  if(dt<=0)return false;simTime+=dt;
  if(active&&observing&&camera&&player){
   refreshView();
   const steady=lastPosition&&lastRotation&&lastPosition.distanceTo(camera.position)<.012&&lastRotation.angleTo(camera.quaternion)<.006;
   holdSeconds=view.aligned&&steady?Math.min(.35,holdSeconds+dt):0;lastPosition=camera.position.clone();lastRotation=camera.quaternion.clone();
  }else{holdSeconds=0;view=null;lastPosition=lastRotation=null;}
  const ready=Boolean(view?.aligned&&holdSeconds>=.22),justAligned=ready&&!readyWas;if(justAligned)alignedEvents++;readyWas=ready;
  for(const {o,id}of rings){o.material.opacity=T.MathUtils.damp(o.material.opacity,active?(id==='aligned'?.36+(ready?.16:0):.16):0,5,dt);o.scale.setScalar(1+Math.sin(simTime*1.8)*.025);}
  const inkLine=traceLine();if(inkLine){const a=V(...inkLine[0]),b=V(...inkLine[1]),gap=ready?0:clamp(view.alignmentError*.32,.08,.46);connection.line(a,b,gap);}
  connection.setOpacity(T.MathUtils.damp(connection.opacity,active&&observing?(ready?.26:.08):0,6,dt));connection.update(simTime);return justAligned;
 }
 function commit(){if(!canDraw())return false;solved=true;active=observing=false;connection.clear();return true;}
 function canDraw(){return Boolean(active&&observing&&view?.aligned&&holdSeconds>=.22&&!solved);}
 function reset(){active=observing=solved=readyWas=false;holdSeconds=simTime=alignedEvents=0;view=player=camera=entryPose=lastPosition=lastRotation=null;for(const {o}of rings)o.material.opacity=0;connection.clear();connection.update(0);}
 function restoreCamera(nextCamera){if(!entryPose||!nextCamera)return;nextCamera.position.copy(entryPose.position);nextCamera.quaternion.copy(entryPose.rotation);nextCamera.fov=entryPose.fov;nextCamera.updateProjectionMatrix();nextCamera.updateMatrixWorld(true);}
 const hint=()=>solved?'月痕已经接到水光上，遮景屏正在展开。':!observing?'走到廊左边的望月窄窗，换个脚点看月亮和水中月。':canDraw()?'水月同框了。沿亮起的月痕向下落笔，把月亮与水光描成一线，再松笔。':view&&view.moonVisibility<8/9?'月亮被窗边遮住了，沿廊挪一挪，让整轮月亮进窗。':view&&view.reflectionVisibility<8/9?'窗下横枨截断了水中月，向窄窗近一点，再看水光。':'月与水影还没接上，慢慢挪动，等两段月痕连成一线。';
 return {observe,update,updateCamera,commit,reset,restoreCamera,get canDraw(){return canDraw();},get observing(){return observing;},get traceLine(){return traceLine();},get returnPose(){return entryPose?{position:entryPose.position.clone(),rotation:entryPose.rotation.clone(),fov:entryPose.fov}:null;},get reflectionWorld(){return view?.reflectionWorld?.slice()||null;},moonlightConnection:connection,get stats(){return {active,observing,solved,aligned:!!view?.aligned,canDraw:canDraw(),holdSeconds,alignedEvents,phase:solved?'space-opening':canDraw()?'trace-water-moon':observing?'align-view':'find-window',hint:hint(),wrongFoot:WATER_MOON_FOOT.wrong.slice(),alignedFoot:WATER_MOON_FOOT.aligned.slice(),alignmentError:view?.alignmentError??99,axisError:view?.axisError??99,moonVisibility:view?.moonVisibility??0,reflectionVisibility:view?.reflectionVisibility??0,moonCross:view?.moonCross||null,reflectionCross:view?.reflectionCross||null,projection:view?.projection||null,traceLine:traceLine(),cameraOwned:observing,stationaryCircleDoesNotSolve:true,moonlight:connection.stats,viewGate:'actual-aperture-rays-and-projection',inkRequired:true};}};
}
