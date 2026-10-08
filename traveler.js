import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {loadGLBWithRetry} from './reliable-assets.js';

// The user's mesh, texture, skeleton and baked actions live in one offline GLB.
export async function createTraveler(){
 const gltf=await loadGLBWithRetry(new GLTFLoader(),new URL('./assets/traveler-rigged.glb',import.meta.url).href);
 const root=new T.Group(),body=gltf.scene;body.rotation.y=Math.PI;root.add(body);
 let skinCount=0;
 body.traverse(n=>{
  if(!n.isMesh)return;
  n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;
  if(n.isSkinnedMesh){n.normalizeSkinWeights();skinCount++;}
  for(const material of Array.isArray(n.material)?n.material:[n.material]){
   material.roughness=.95;material.metalness=0;
   if(n.name==='TravelerMesh')material.color.multiplyScalar(.66);
  }
 });
 const tip=body.getObjectByName('BrushTip');
 if(!tip||!skinCount)throw Error('人物骨骼或毛笔挂点缺失');
 const mixer=new T.AnimationMixer(body),actions={};
 for(const clip of gltf.animations){
  const a=mixer.clipAction(clip);a.play();a.paused=true;a.setEffectiveWeight(0);
  actions[clip.name]=a;
 }
 for(const name of ['Idle','Walk','Jog','Gather','Cast','SitDown','Sit','StandUp'])if(!actions[name])throw Error(`人物动作缺失：${name}`);
 // Keep the authored pose separate from the flight overlay. AnimationMixer can
 // skip unchanged tracks, so restoring the sampled pose also makes landing exact.
 body.updateMatrixWorld(true);
 const bodyInverse=body.getWorldQuaternion(new T.Quaternion()).invert(),flightBones=[],flightByName=new Map(),flightWorld=new Map(),up=new T.Vector3(0,1,0);
 body.traverse(bone=>{
  if(!bone.isBone)return;
  const entry={bone,restPosition:bone.position.clone(),restQuaternion:bone.quaternion.clone(),target:bone.quaternion.clone(),world:bodyInverse.clone().multiply(bone.getWorldQuaternion(new T.Quaternion())),samplePosition:new T.Vector3(),sampleQuaternion:new T.Quaternion()};
  flightBones.push(entry);flightByName.set(bone.name,entry);
 });
 const flightParent=entry=>flightWorld.get(entry.bone.parent)||new T.Quaternion();
 for(const entry of flightBones){
  if(entry.bone.name==='Neck')entry.target.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),T.MathUtils.degToRad(-20)));
  if(entry.bone.name==='Head')entry.target.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),T.MathUtils.degToRad(-48)));
  flightWorld.set(entry.bone,flightParent(entry).clone().multiply(entry.target));
 }
 const aimFlightBone=(name,direction)=>{
  const entry=flightByName.get(name);if(!entry)return;
  const desired=new T.Quaternion().setFromUnitVectors(up.clone().applyQuaternion(entry.world),direction.normalize()).multiply(entry.world);
  entry.target.copy(flightParent(entry).clone().invert().multiply(desired));flightWorld.set(entry.bone,desired);
 };
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  // The arms pass beside the brim and retain a small bend rather than locking.
  aimFlightBone('UpperArm'+side,new T.Vector3(sign*.40,.88,.25));
  aimFlightBone('Forearm'+side,new T.Vector3(sign*.13,.985,.11));
  aimFlightBone('Thigh'+side,new T.Vector3(sign*.025,-.998,.052));
  aimFlightBone('Shin'+side,new T.Vector3(sign*.018,-.999,.032));
  aimFlightBone('Foot'+side,new T.Vector3(sign*.01,-.982,.185));
 }
 let flightApplied=false,flightWeight=0,flightSteer=0;
 const flightQuat=new T.Quaternion(),flightAxis=new T.Vector3();
 function restoreFlight(){
  if(!flightApplied)return;
  for(const entry of flightBones){entry.bone.position.copy(entry.samplePosition);entry.bone.quaternion.copy(entry.sampleQuaternion);}
  flightApplied=false;
 }
 function applyFlight(amount,t,steer){
  flightWeight=Number.isFinite(amount)?T.MathUtils.clamp(amount,0,1):0;flightSteer=Number.isFinite(steer)?T.MathUtils.clamp(steer,-1,1):0;
  if(flightWeight===0)return;
  for(const entry of flightBones){
   const bone=entry.bone;entry.samplePosition.copy(bone.position);entry.sampleQuaternion.copy(bone.quaternion);flightQuat.copy(entry.target);
   if(bone.name==='Spine'||bone.name==='Chest')flightQuat.premultiply(new T.Quaternion().setFromAxisAngle(flightAxis.set(0,0,1),flightSteer*(bone.name==='Spine'?.035:.018)));
   if(bone.name.startsWith('RobeLower'))flightQuat.multiply(new T.Quaternion().setFromAxisAngle(flightAxis.set(1,0,0),.018*Math.sin(t*2.1+(bone.name.endsWith('L')?0:.7))));
   bone.position.lerp(entry.restPosition,flightWeight);bone.quaternion.slerp(flightQuat,flightWeight);
  }
  flightApplied=true;
 }
 const lookBackBones=['Head','Neck','Chest','Spine'].map(name=>flightByName.get(name)).filter(Boolean),lookBackSamples=new Map(),lookBackAxis=new T.Vector3(),lookBackQuaternion=new T.Quaternion(),lookBackParent=new T.Quaternion();let lookBackApplied=false;
 function restoreLookBack(){if(!lookBackApplied)return;for(const entry of lookBackBones)entry.bone.quaternion.copy(lookBackSamples.get(entry.bone));lookBackApplied=false;}
 function applyLookBack(turn){if(!turn?.active)return;body.updateMatrixWorld(true);for(const entry of lookBackBones){const bone=entry.bone,yaw=(bone.name==='Head'?turn.headYaw*.65:bone.name==='Neck'?turn.headYaw*.35:bone.name==='Chest'?turn.shoulderYaw*.7:turn.shoulderYaw*.3)||0;lookBackSamples.set(bone,bone.quaternion.clone());bone.parent.getWorldQuaternion(lookBackParent).invert();lookBackAxis.set(0,1,0).applyQuaternion(lookBackParent).normalize();lookBackQuaternion.setFromAxisAngle(lookBackAxis,yaw);bone.quaternion.premultiply(lookBackQuaternion);bone.updateWorldMatrix(false,true);}lookBackApplied=true;}
 let gaitTime=0,lastTime=0,sitTime=0,lastStroke=1,lastCharge=0,castFromReady=false;
 const sample=(name,time,weight)=>{const a=actions[name];a.enabled=true;a.time=Math.min(time,a.getClip().duration);a.setEffectiveWeight(weight);};
 function animate(t,walk,charge,stroke,sit,run=0,gaitRate=1,flightAmount=0,steerX=0,lookBack=null){
  restoreLookBack();restoreFlight();
  const dt=Math.max(0,Math.min(.05,t-lastTime));lastTime=t;
  const sitDuration=actions.SitDown.getClip().duration;
  sitTime=T.MathUtils.clamp(sitTime+(sit?dt:-dt),0,sitDuration);
  if(stroke<lastStroke-.2)castFromReady=lastCharge>.35;
  for(const a of Object.values(actions))a.setEffectiveWeight(0);
  if(sitTime>0){
   if(sitTime>=sitDuration)sample('Sit',t%actions.Sit.getClip().duration,1);
   else sample('SitDown',sitTime,1);
  }else if(stroke<1){
   const amount=(castFromReady?1:T.MathUtils.smoothstep(stroke,0,.12))*(1-T.MathUtils.smoothstep(stroke,.82,1));
   sample('Cast',stroke*actions.Cast.getClip().duration,amount);
   sample('Idle',t%actions.Idle.getClip().duration,1-amount);
  }else if(charge>0){
   sample('Gather',T.MathUtils.smoothstep(charge,0,.65)*actions.Gather.getClip().duration,1);
  }else{
   const turnStep=lookBack?.active?.30*Math.sin(Math.PI*T.MathUtils.clamp(lookBack.rootAmount||0,0,1)):0,stanceWalk=Math.max(walk,turnStep);
   sample('Idle',t%actions.Idle.getClip().duration,1-stanceWalk);
   sample('Walk',gaitTime%actions.Walk.getClip().duration,stanceWalk*(1-run));
   sample('Jog',gaitTime%actions.Jog.getClip().duration,stanceWalk*run);
  }
  gaitTime+=dt*(.6+.4*walk)*T.MathUtils.clamp(gaitRate,.5,1.6);
  mixer.update(0);applyFlight(flightAmount,t,steerX);applyLookBack(lookBack);root.updateMatrixWorld(true);lastStroke=stroke;lastCharge=charge;
 }
 animate(0,0,0,1,false);
 return {root,body,tip,animate,animations:gltf.animations,mixer,skinCount,get flightStats(){return {amount:flightWeight,steer:flightSteer};}};
}
