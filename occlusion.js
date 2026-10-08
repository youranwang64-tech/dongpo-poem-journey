import * as T from './vendor/three.module.js';

// Foreground architecture becomes faint only while it covers the traveler.
export function createOcclusion(camera){
 const ray=new T.Raycaster(),active=new Map(),copies=new WeakMap();let objects=[],checkAge=1,blocked=new Set();
 function clear(){for(const [object,state] of active)object.material=state.original;active.clear();blocked.clear();objects=[];checkAge=1;}
 function enter(scene,traveler){clear();scene.updateMatrixWorld(true);scene.traverse(object=>{if(!object.isMesh||object.isInstancedMesh||object.isSkinnedMesh||object.userData.mountainViewOccluder||object.userData.preserveOpaque||!object.material?.isMeshStandardMaterial||object.material.transparent)return;for(let p=object;p;p=p.parent)if(p===traveler)return;objects.push(object);});}
 function update(position,dt){
  checkAge+=dt;
  if(checkAge>.16){checkAge=0;blocked=new Set();for(const [x,y] of [[0,.75],[-.24,1.35],[.24,1.35],[0,1.85]]){const target=position.clone().add(new T.Vector3(x,y,0)),direction=target.sub(camera.position),distance=direction.length();ray.set(camera.position,direction.normalize());ray.far=Math.max(0,distance-.3);for(const hit of ray.intersectObjects(objects,false))blocked.add(hit.object);}
   for(const object of blocked)if(!active.has(object)){let faded=copies.get(object);if(!faded){faded=object.material.clone();faded.transparent=true;faded.depthWrite=false;copies.set(object,faded);}faded.opacity=1;active.set(object,{original:object.material,faded});object.material=faded;}
  }
  for(const [object,state] of active){state.faded.opacity=T.MathUtils.damp(state.faded.opacity,blocked.has(object)?.14:1,8,dt);if(!blocked.has(object)&&state.faded.opacity>.995){object.material=state.original;active.delete(object);}}
 }
 return {enter,clear,update,get count(){return blocked.size;}};
}
