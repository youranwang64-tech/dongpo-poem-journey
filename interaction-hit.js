import * as T from './vendor/three.module.js';

function shown(object){for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;}

// Intent is picked before checking distance or a pen stroke's starting point.
// An unsuccessful stroke on a window must never become a ground destination.
export function createInteractionHitTester(candidates){
 const raycaster=new T.Raycaster();
 return function pickPointerTarget(ndc,camera,viewport={width:1280,height:720}){
  if(!camera||!ndc)return null;
  camera.updateMatrixWorld();
  const hits=[];
  for(const candidate of candidates){
   if(candidate.enabled?.()===false)continue;
   const objects=(typeof candidate.objects==='function'?candidate.objects():candidate.objects)||[];
   const surfaces=objects.filter(object=>object&&shown(object));
   if(!surfaces.length)continue;
   for(const object of surfaces)object.updateWorldMatrix(true,true);
   raycaster.setFromCamera(ndc,camera);
   const exact=raycaster.intersectObjects(surfaces,true).filter(hit=>shown(hit.object));
   if(exact.length){hits.push({id:candidate.id,distance:exact[0].distance,exact:true,worldPoint:exact[0].point.toArray()});continue;}
   const halo=candidate.pixelTolerance||0;
   if(!halo)continue;
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-.7,-.7],[.7,-.7],[-.7,.7],[.7,.7]]){
    raycaster.setFromCamera(new T.Vector2(ndc.x+dx*halo*2/viewport.width,ndc.y+dy*halo*2/viewport.height),camera);
    const nearby=raycaster.intersectObjects(surfaces,true).filter(hit=>shown(hit.object));
    if(nearby.length){hits.push({id:candidate.id,distance:nearby[0].distance,exact:false,worldPoint:nearby[0].point.toArray()});break;}
   }
  }
  hits.sort((a,b)=>Number(b.exact)-Number(a.exact)||a.distance-b.distance);
  return hits[0]||null;
 };
}
