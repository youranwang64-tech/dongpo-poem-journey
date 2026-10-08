import * as T from './vendor/three.module.js';
import {composeDefaultShot} from './chapter-framing.js';
const V=(...p)=>new T.Vector3(...p);
export function createCameraRig(camera){
 let config,focus=V(0,0,0),desired=focus.clone(),last=focus.clone(),ready=false,blend=null;
 const defaults={side:{offset:[7,5.6,23],fov:39,lookHeight:1.55,trackX:.76,trackZ:.25},cell:{offset:[4,3.9,17],fov:39,lookHeight:1.35,trackX:.5,trackZ:.15},rain:{offset:[7,5.6,24],fov:40,lookHeight:1.7,trackX:.82,trackZ:.25},last:{offset:[8,6,24],fov:40,lookHeight:1.7,trackX:.8,trackZ:.3},rear:{offset:[5.8,5.4,22],fov:40,lookHeight:1.7,trackX:.55,trackZ:.6},river:{offset:[5.5,5.2,24],fov:40,lookHeight:1.6,trackX:.4,trackZ:.5},cliff:{offset:[7.5,5.8,24],fov:40,lookHeight:1.6,trackX:.55,trackZ:.5},mountain:{offset:[23,6,9],fov:40,lookHeight:2.5,trackX:.3,trackZ:.5},garden:{offset:[13,7,21],fov:42,lookHeight:1.65,trackX:.88,trackZ:.88}};
 function place(){
  const targetPosition=focus.clone().add(V(...config.offset)),look=focus.clone().add(V(...(config.lookOffset||[0,0,0])));
  camera.position.copy(targetPosition);camera.lookAt(look);
  if(blend){const q=T.MathUtils.smootherstep(blend.age/2.15,0,1),center=config.orbitCenter?V(...config.orbitCenter):config.anchor,a=new T.Spherical().setFromVector3(blend.position.clone().sub(center)),b=new T.Spherical().setFromVector3(targetPosition.clone().sub(center)),angle=Math.atan2(Math.sin(b.theta-a.theta),Math.cos(b.theta-a.theta)),pose=new T.Spherical(T.MathUtils.lerp(a.radius,b.radius,q),T.MathUtils.lerp(a.phi,b.phi,q),a.theta+angle*q),rotation=camera.quaternion.clone();camera.position.copy(center).add(V().setFromSpherical(pose));camera.quaternion.copy(blend.rotation).slerp(rotation,q);camera.fov=T.MathUtils.lerp(blend.fov,config.fov,q);camera.updateProjectionMatrix();if(q>=1)blend=null;}
  camera.updateMatrixWorld();
 }
 function enter(shot,spawn,options={},alternate=false){blend=alternate?{age:0,position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov}:null;config={...composeDefaultShot(shot,defaults[shot]),...options};if(shot==='mountain')config={...config,...(alternate?{offset:[4,6,26],lookHeight:3.2,trackX:.25,trackZ:.45}:{offset:[24,6,5],lookHeight:3.2,trackX:.25,trackZ:.5})};config={...config,...options};config.anchor=V(...(config.worldAnchor||spawn));focus.copy(config.anchor);focus.y+=config.lookHeight;desired.copy(focus);last.copy(focus);ready=true;if(!blend)camera.fov=config.fov;camera.updateProjectionMatrix();place();}
 function update(position,dt,snap=false){if(!ready)return;if(blend)blend.age+=dt;desired.set(config.anchor.x+(position.x-config.anchor.x)*config.trackX,position.y+config.lookHeight,config.anchor.z+(position.z-config.anchor.z)*config.trackZ);const d=desired.clone().sub(focus);if(snap)focus.copy(desired);else if(d.length()>.18){const speed=1-Math.exp(-dt*2.8);focus.addScaledVector(d,speed);}else if(focus.distanceTo(last)>.002)focus.lerp(desired,1-Math.exp(-dt*2));last.copy(focus);place();}
 return {enter,update,resize:aspect=>{camera.aspect=aspect;camera.updateProjectionMatrix();},get description(){return '三维缓跟镜头';}};
}
