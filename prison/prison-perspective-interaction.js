import * as T from '../vendor/three.module.js';

const ORDER=['window','gate'],THRESHOLD=.009,SETTLE=.65;
const clamp=T.MathUtils.clamp;
const vector=p=>p?.isVector3?p.clone():Array.isArray(p)?new T.Vector3(...p):null;
const array=p=>p?.isVector3?p.toArray():Array.from(p||[]);

/** The player's view may move; the architecture and its two marks stay put.
 * Only correspondence in the actual camera projection can open the building. */
export function createPrisonPerspectiveInteraction({building,optics,camera,onChange=()=>{}}={}){
 if(!camera?.isCamera||!building||typeof building.completeAction!=='function'||!optics?.puzzles||typeof optics.complete!=='function')throw new TypeError('借景需要真实相机、建筑动作与两重景形。');
 const puzzles=new Map(ORDER.map(id=>[id,optics.puzzles[id]]));
 for(const [id,p]of puzzles){if(!p||!Number.isFinite(p.range?.min+p.range?.max)||p.range.max<=p.range.min||!Number.isFinite(p.start)||typeof p.shot!=='function'||!Array.isArray(p.targets)||p.targets.length!==2||!p.targets[0]?.length||p.targets[0].length!==p.targets[1]?.length||p.targets.some(group=>group.some(point=>!vector(point))))throw new TypeError('借景构形不完整 '+id);}
 const offsets=new Map(ORDER.map(id=>[id,clamp(puzzles.get(id).start,puzzles.get(id).range.min,puzzles.get(id).range.max)])),completed=new Set(),events=[],attempted=new Map(ORDER.map(id=>[id,false])),ray=new T.Raycaster();
 let stageId='window',enabled=false,paused=false,active=null,cancelled=false,stableSeconds=0,clock=0,lastTime=null,lastPose=null,viewport={width:1280,height:720},dragCount=0,keyCount=0,releaseCount=0,cancelCount=0,lastReason='ready';
 let alignment={alignmentError:null,errorPixels:null,matchedPoints:0,totalPoints:0,visible:false,inScreen:false,occludedPoints:[],points:[]};
 const puzzle=()=>puzzles.get(stageId);
 const depends=id=>ORDER.slice(0,ORDER.indexOf(id)).every(prior=>completed.has(prior)&&(typeof building.readiness!=='function'||building.readiness(prior)===true));
 const available=()=>!!stageId&&enabled&&!paused&&!completed.has(stageId)&&depends(stageId);
 const shown=o=>{for(let p=o;p;p=p.parent)if(p.visible===false)return false;return true;};
 const targetDecoration=o=>{for(let p=o;p;p=p.parent)if(p.userData?.prisonPerspective||p.userData?.prisonPerspectiveHint||p.userData?.prisonPerspectiveTarget)return true;return false;};
 const ignored=o=>{const p=puzzle(),ignore=[...(p?.ignoreMeshes||[]),...(p?.occlusionIgnore||[]),...(optics.ignoreMeshes||[])];for(let n=o;n;n=n.parent)if(ignore.includes(n))return true;return targetDecoration(o);};
 const opaque=o=>o.isMesh&&o.geometry&&shown(o)&&!ignored(o)&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>m?.visible!==false&&(m?.opacity??1)>=.85&&m?.depthTest!==false&&!(m?.transparent&&m?.depthWrite===false));
 function inspect(){const p=puzzle();if(!p)return {alignmentError:null,errorPixels:null,matchedPoints:0,totalPoints:0,visible:false,inScreen:false,occludedPoints:[],points:[]};camera.updateMatrixWorld(true);const scene=building.scene||building.stage?.scene,meshes=[];scene?.updateMatrixWorld(true);scene?.traverse(o=>{if(opaque(o))meshes.push(o);});const points=[],occludedPoints=[],minimum=Math.max(1,Math.min(viewport.width,viewport.height));let maxError=0,matchedPoints=0,inScreen=true;
  for(let i=0;i<p.targets[0].length;i++){const a=vector(p.targets[0][i]),b=vector(p.targets[1][i]),pa=a.clone().project(camera),pb=b.clone().project(camera),inside=v=>Number.isFinite(v.x+v.y+v.z)&&Math.abs(v.x)<.995&&Math.abs(v.y)<.995&&v.z>-1&&v.z<1,onScreen=inside(pa)&&inside(pb),pixels=Math.hypot((pa.x-pb.x)*viewport.width/2,(pa.y-pb.y)*viewport.height/2),error=pixels/minimum,blocks=[];
   if(onScreen&&meshes.length)for(const [side,target]of [['near',a],['far',b]]){const delta=target.clone().sub(camera.position),distance=delta.length();if(distance<=.09)continue;ray.set(camera.position,delta.normalize());ray.near=0;ray.far=distance-.09;const hit=ray.intersectObjects(meshes,false)[0];if(hit){const info={index:i,side,name:hit.object.name||null,kind:hit.object.geometry.type,point:hit.point.toArray()};blocks.push(info);occludedPoints.push(info);}}
   inScreen&&=onScreen;maxError=Math.max(maxError,Number.isFinite(error)?error:Infinity);if(onScreen&&!blocks.length&&error<=THRESHOLD)matchedPoints++;points.push({index:i,near:pa.toArray(),far:pb.toArray(),error:Number.isFinite(error)?error:null,errorPixels:Number.isFinite(pixels)?pixels:null,inScreen:onScreen,unobstructed:!blocks.length});
  }
  return {alignmentError:Number.isFinite(maxError)?maxError:null,errorPixels:Number.isFinite(maxError)?maxError*minimum:null,matchedPoints,totalPoints:points.length,visible:inScreen&&!occludedPoints.length,inScreen,occludedPoints,points};
 }
 function stats(){return {stageId,nextId:stageId,completed:[...completed],interactionKind:'perspective-alignment',offset:stageId?offsets.get(stageId):null,offsets:Object.fromEntries(offsets),threshold:THRESHOLD,...alignment,stableSeconds,requiredStableSeconds:SETTLE,gestureActive:!!active,paused,enabled,available:available(),hasMovedView:!!attempted.get(stageId),cancelled,dragCount,keyCount,releaseCount,cancelCount,lastReason,clock,completionQueued:events.length};}
 function changed(reason){lastReason=reason;onChange({reason,id:stageId,stats:stats()});}
 function resetSettle(){stableSeconds=0;lastPose=null;}
 function moveOffset(delta,kind){if(!available()||!Number.isFinite(delta))return false;const p=puzzle(),before=offsets.get(stageId),after=clamp(before+delta,p.range.min,p.range.max);if(Math.abs(after-before)<1e-8)return false;offsets.set(stageId,after);attempted.set(stageId,true);cancelled=false;resetSettle();if(kind==='key')keyCount++;changed(kind==='key'?'view-key':'view-drag');return true;}
 function pointerDown(ndc){if(!available()||active||!Number.isFinite(ndc?.x+ndc?.y)||Math.abs(ndc.x)>1||Math.abs(ndc.y)>1)return false;active={x:ndc.x,moved:false};resetSettle();dragCount++;changed('view-captured');return true;}
 function pointerMove(ndc){if(!active||!available()||!Number.isFinite(ndc?.x+ndc?.y))return false;const x=clamp(ndc.x,-1,1),delta=x-active.x;if(Math.abs(delta)*viewport.width/2<1)return true;active.x=x;const p=puzzle(),moved=moveOffset(delta*(p.range.max-p.range.min)*.45,'drag');active.moved||=moved;return true;}
 function pointerUp(ndc){if(!active)return false;if(ndc&&Number.isFinite(ndc.x+ndc.y))pointerMove(ndc);active=null;releaseCount++;resetSettle();changed('view-released');return true;}
 function pointerCancel(){if(!active)return false;active=null;cancelled=true;cancelCount++;resetSettle();changed('view-cancelled');return true;}
 function key(direction){const value=typeof direction==='number'?direction:['right','ArrowRight','e','E'].includes(direction)?1:['left','ArrowLeft','q','Q'].includes(direction)?-1:0;if(!value||!available())return false;const p=puzzle();return moveOffset(clamp(value,-1,1)*(p.range.max-p.range.min)*.035,'key');}
 function setStage(id){if(id!==null&&!puzzles.has(id))throw new RangeError('未知借景阶段 '+id);pointerCancel();stageId=id;cancelled=false;resetSettle();alignment=inspect();changed('stage-changed');}
 function setEnabled(value){if(!value)pointerCancel();enabled=!!value;resetSettle();changed(enabled?'view-enabled':'view-disabled');}
 function setPaused(value){if(value)pointerCancel();paused=!!value;resetSettle();changed(paused?'paused':'resumed');}
 function resize({width,height}={}){if(!(width>0&&height>0))return false;pointerCancel();viewport={width,height};resetSettle();alignment=inspect();changed('viewport-changed');return true;}
 function update(time,dt){if(dt===undefined)dt=lastTime===null?0:time-lastTime;lastTime=time;alignment=inspect();optics.setAlignment?.(stageId,alignment.alignmentError,alignment.visible);if(paused||!Number.isFinite(dt)||dt<=0)return;dt=clamp(dt,0,.10);clock+=dt;const pose={position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov,projection:camera.projectionMatrix.elements.slice()},still=lastPose&&pose.position.distanceTo(lastPose.position)<.00015&&pose.rotation.angleTo(lastPose.rotation)<.00005&&Math.abs((pose.fov||0)-(lastPose.fov||0))<.00005&&pose.projection.every((n,i)=>Math.abs(n-lastPose.projection[i])<.00005);lastPose=pose;
  const aligned=alignment.visible&&alignment.totalPoints>0&&alignment.matchedPoints===alignment.totalPoints;
  if(available()&&aligned&&attempted.get(stageId)&&!active&&!cancelled&&still){stableSeconds+=dt;if(stableSeconds+1e-8>=SETTLE){const id=stageId;if(building.completeAction(id)===true){completed.add(id);events.push(id);optics.complete(id);stableSeconds=SETTLE;changed('alignment-complete');}else {stableSeconds=0;changed('architecture-not-ready');}}}else stableSeconds=0;
 }
 function reset(){active=null;completed.clear();events.length=0;for(const [id,p]of puzzles){offsets.set(id,clamp(p.start,p.range.min,p.range.max));attempted.set(id,false);}stageId='window';enabled=paused=cancelled=false;clock=dragCount=keyCount=releaseCount=cancelCount=0;lastTime=null;resetSettle();alignment=inspect();changed('reset');}
 return {setStage,setEnabled,setPaused,resize,pointerDown,pointerMove,pointerUp,pointerCancel,key,update,reset,takeCompleted:()=>paused?null:events.shift()||null,get shot(){const p=puzzle();if(!p)return null;const s=p.shot(offsets.get(stageId));return {eye:array(s.eye),look:array(s.look),fov:s.fov||42};},get stats(){return stats();}};
}
