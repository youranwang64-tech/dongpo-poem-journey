import * as T from './vendor/three.module.js';

/** Keep the roof, two full canals and the poet in one composed shot. The camera
 * settles closer at the canal before a stroke, then stays still during ink. */
export function attachDwellingCamera(stage){
 const look=new T.Vector3(),goalLook=new T.Vector3(),goalPosition=new T.Vector3(),offset=new T.Vector3();let entered=false,mode='overview',waterBlend=0;
 function goal(camera,player){
  const waterDistance=player?Math.hypot(player.x-2.7,player.z-4.2):99;
  waterBlend=1-T.MathUtils.smoothstep(waterDistance,1.55,3.25);
  const repairNear=!!stage.waterStats?.drained&&player&&Math.hypot(player.x+1.5,player.z-1.62)<2.0;
  if(repairNear)waterBlend=Math.max(waterBlend,.66);
  mode=waterBlend>.75?'canal':waterBlend>.08?'approach':'overview';
  goalLook.set(.25,1.6,1.9).lerp(new T.Vector3(1.0,1.4,3.05),waterBlend);
  offset.set(10/1.15,7.1/1.15,20/1.15).lerp(new T.Vector3(6.8,5.5,14.2),waterBlend);
  offset.multiplyScalar(Math.max(1,1.33/(camera.aspect||16/9)));
  goalPosition.copy(goalLook).add(offset);
 }
 function enterCamera(camera,player){goal(camera,player);camera.position.copy(goalPosition);look.copy(goalLook);camera.fov=40;camera.updateProjectionMatrix();camera.lookAt(look);camera.updateMatrixWorld(true);entered=true;}
 function updateCamera(camera,dt,player){
  if(!entered){enterCamera(camera,player);return;}
  if(!(dt>0)||stage.environmentDragActive||stage.dwellingRepair?.active||stage.gestureActive)return;
  goal(camera,player);const factor=1-Math.exp(-Math.min(dt,.06)*3.5);camera.position.lerp(goalPosition,factor);look.lerp(goalLook,factor);camera.lookAt(look);camera.updateMatrixWorld(true);
 }
 const oldReset=stage.reset?.bind(stage);stage.reset=(...args)=>{oldReset?.(...args);entered=false;waterBlend=0;mode='overview';};
 stage.stageOwnCamera=true;stage.enterCamera=enterCamera;stage.updateCamera=updateCamera;
 Object.defineProperty(stage,'dwellingCameraStats',{configurable:true,get:()=>({mode,waterBlend,overviewMagnification:1.15,ownsCamera:true,goalPosition:goalPosition.toArray(),goalLook:goalLook.toArray(),freezeWhileDrawing:true})});
 return stage;
}
