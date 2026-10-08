import * as T from './vendor/three.module.js';
import {createBrushSurface} from './brush-surface.js';
import {createInteractionHitTester} from './interaction-hit.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
export const DWELLING_REPAIR=Object.freeze({position:Object.freeze([-1.5,0,1.62]),radius:1.35,beamSeconds:1.15,roofSeconds:2.65});

/** Drainage exposes materials; a rafter supports the roof, then the roof seals. */
export function decorateDwellingRepair(stage){
 if(stage.dwellingRepair)return stage;
 const parts=stage.repairParts;if(!parts)throw Error('Dwelling repair needs independent broken rafter and roof parts');
 const architecture=stage.architecture||{},oldUpdate=stage.update?.bind(stage),oldReset=stage.reset?.bind(stage),oldDown=stage.pointerDown?.bind(stage),oldMove=stage.pointerMove?.bind(stage),oldUp=stage.pointerUp?.bind(stage),oldCancel=stage.pointerCancel?.bind(stage),oldPick=stage.pickPointerTarget?.bind(stage),oldView=stage.updateGestureView?.bind(stage),oldRect=stage.getGestureRect?.bind(stage),oldRegions=stage.getBrushInteractionRegions?.bind(stage),oldTake=stage.takeEnvironmentCompleted?.bind(stage),oldStory=stage.takeStoryEvent?.bind(stage),oldInteract=stage.interact?.bind(stage),oldArchInteract=architecture.interact?.bind(architecture);
 const oldActive=Object.getOwnPropertyDescriptor(stage,'gestureActive'),oldForming=Object.getOwnPropertyDescriptor(stage,'glyphForming'),oldProgress=Object.getOwnPropertyDescriptor(stage,'gestureProgress'),oldId=Object.getOwnPropertyDescriptor(stage,'gestureId');
 const root=new T.Group();root.name='黄州居所 · 接梁补檐的真实缺口';stage.root.add(root);
 const slope=-Math.atan2(3.07,1.02),normal=V(0,-Math.sin(slope),Math.cos(slope)),gapCentre=V(...parts.beamCentre).addScaledVector(normal,.035),span=V(...parts.gapTop).distanceTo(V(...parts.gapBottom));
 const beam=createBrushSurface({id:'repair-beam',parent:root,position:gapCentre.toArray(),width:.76,height:span/.76,rotation:[slope,0,0],template:[[.50,.12],[.50,.31],[.50,.53],[.50,.72],[.50,.88]],mode:'brush-outline',ink:'#efe8cd',guide:'#dedfc6',label:'接住断梁',hint:'按住左键，沿中央断梁的缺口接一笔，松手让木梁归位。'});
 const cover=createBrushSurface({id:'repair-cover',parent:root,position:[0,3.46+Math.sin(1.21)*.04,-.84+Math.cos(1.21)*.04],width:2.72,height:3.18,rotation:[-1.21,0,0],template:[[.055,.055],[.945,.055],[.945,.945],[.055,.945],[.055,.055]],mode:'brush-outline',ink:'#efe8cd',guide:'#dedfc6',label:'封住缺檐',hint:'梁已接牢。按住左键，沿屋面缺口描一圈，松手补齐屋檐。'});
 const surfaces={beam,cover};
 // Real seam geometry survives minification better than a fine canvas guide.
 for(const [id,surface]of Object.entries(surfaces)){
  const rectWidth=id==='beam'?.76:2.72,rectHeight=id==='beam'?span/.76:3.18,path=surface.state.strokes[0].map(([u,v])=>V((u-.5)*rectWidth,(.5-v)*rectHeight,.012));
  const seamPath=new T.CurvePath();for(let i=1;i<path.length;i++)seamPath.add(new T.LineCurve3(path[i-1],path[i]));
  const guide=new T.Mesh(new T.TubeGeometry(seamPath,id==='beam'?16:64,id==='beam'?.026:.025,6,false),new T.MeshBasicMaterial({color:0xf7f3df,transparent:true,opacity:.92,depthWrite:false,depthTest:false,fog:false,toneMapped:false}));
  guide.name=id==='beam'?'断梁缺口的淡墨接线':'缺檐边缘的淡墨轮廓';surface.root.add(guide);surface.seamGuide=guide;
  const feather=new T.Mesh(new T.TubeGeometry(seamPath,id==='beam'?16:64,.048,6,false),new T.MeshBasicMaterial({color:0xf5f1df,transparent:true,opacity:.18,depthWrite:false,depthTest:false,fog:false,toneMapped:false}));
  feather.name='缺口上的散墨柔边';surface.root.add(feather);surface.seamFeather=feather;
  const [u,v]=surface.state.strokes[0][0],start=new T.Mesh(new T.CircleGeometry(.070,20),new T.MeshBasicMaterial({color:0xf7f3df,transparent:true,opacity:.85,depthWrite:false,depthTest:false,fog:false,toneMapped:false}));
  start.name='修屋落笔处';start.position.set((u-.5)*rectWidth,(.5-v)*rectHeight,.024);surface.root.add(start);surface.seamStart=start;
  surface.cursor.material.opacity=.98;surface.cursor.scale.setScalar(1.6);
 }
 const target={...(stage.targets||[]).find(t=>t.id==='boat'),id:'boat',kind:'spatial-gesture',position:DWELLING_REPAIR.position.slice(),radius:DWELLING_REPAIR.radius,requires:['sluice'],label:'接梁、补檐',verb:'修屋',verse:''};
 stage.targets=(stage.targets||[]).map(t=>t.id==='boat'?target:t);architecture.targets=(architecture.targets||stage.targets).map(t=>t.id==='boat'?target:t);stage.architecture=architecture;
 let activePart=null,beamDrawn=false,coverDrawn=false,completion=null,announced=false,beamEvent=false,lastTime=null,simTime=0,lastViewport={left:0,top:0,width:1280,height:720};const events=[];
 const read=descriptor=>descriptor?.get?.call(stage)??descriptor?.value??false;
 const wet=()=>!stage.waterStats?.drained;
 const near=player=>!!player&&Math.hypot(player.x-target.position[0],player.z-target.position[2])<=target.radius;
 const phase=()=>wet()?'waiting-materials':parts.repaired?'repaired':parts.roofBegun?'cover-setting':parts.beamReady?'cover':beamDrawn?'beam-setting':'beam';
 const available=id=>!wet()&&!parts.repaired&&!parts.roofBegun&&(id==='beam'?!beamDrawn:parts.beamReady&&!coverDrawn);
 const moving=()=>beamDrawn&&!parts.beamReady||parts.roofBegun&&!parts.repaired;
 const physicalCandidates=Object.entries(surfaces).map(([id,surface])=>({id,objects:[surface.mesh],pixelTolerance:18}));
 const pickAll=createInteractionHitTester(physicalCandidates),pickAvailable=createInteractionHitTester(physicalCandidates.map(c=>({...c,enabled:()=>available(c.id)})));
 function updateHints(){
  const p=phase();target.label=p==='beam'?'接住断梁':p==='cover'?'封住缺檐':p==='repaired'?'走进修好的屋子':'接梁、补檐';
  target.hint=p==='waiting-materials'?'先把院里的积水排向田埂。石路与木料露出来后，再到断梁下落笔。':p==='beam'?'石路露出了散落的木料。先沿中央断梁缺口接一笔，松手让木梁归位。':p==='beam-setting'?'木梁正在接回缺口。等它接牢，再封住屋面。':p==='cover'?'梁已经接牢。沿屋面缺口的淡墨轮廓描一圈，松手补齐屋檐。':p==='cover-setting'?'屋面正在拼合。等雨漏停下、屋里亮灯，再走进木门。':'屋面已经补齐，漏雨停了。沿石路走进亮灯的新居。';
 }
 function pose(){
  for(const [id,surface]of Object.entries(surfaces)){const physicalProgress=id==='beam'?parts.beamProgress:parts.roofProgress,usable=available(id),shown=!wet()&&!surface.completed&&!parts.roofBegun&&usable;surface.mesh.material.opacity=wet()||parts.repaired?0:surface.completed?1-T.MathUtils.smootherstep(physicalProgress,0,.30):usable?1:0;surface.seamGuide.visible=surface.seamFeather.visible=surface.seamStart.visible=shown;surface.seamGuide.material.opacity=.92;surface.seamFeather.material.opacity=activePart===id?.10:.18;surface.seamStart.material.opacity=activePart===id?.36:.85;}
  updateHints();root.updateMatrixWorld(true);
 }
 function pickPointerTarget(ndc,camera,viewport){
  if(viewport?.width&&viewport?.height)lastViewport={...viewport};const hit=pickAvailable(ndc,camera,lastViewport)||pickAll(ndc,camera,lastViewport);
  return hit?{...hit,id:'boat',subId:hit.id,kind:'spatial-gesture',available:available(hit.id),completed:parts.repaired,hint:target.hint}:oldPick?.(ndc,camera,viewport)||null;
 }
 // The rafter is only a handful of pixels wide from the work circle. Nearby
 // pen contacts follow that real visible seam rather than missing a tiny UV
 // strip; the recognizer still requires a released stroke with full coverage.
 function sampleRepairInk(surface,ndc,camera){
  if(!camera||!surface.root.visible)return null;camera.updateMatrixWorld(true);surface.root.updateWorldMatrix(true,true);const ray=new T.Raycaster();ray.setFromCamera(ndc,camera);const origin=surface.root.getWorldPosition(V()),normal=V(0,0,1).transformDirection(surface.root.matrixWorld),world=ray.ray.intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(normal,origin),V());if(!world)return null;
  const local=surface.root.worldToLocal(world),{width,height}=surface.mesh.geometry.parameters,uv=[clamp(local.x/width+.5,0,1),clamp(.5-local.y/height,0,1)],path=surface.state.strokes[0],px=ndc.x*lastViewport.width/2,py=ndc.y*lastViewport.height/2;
  const project=point=>V((point[0]-.5)*width,(.5-point[1])*height,.02).applyMatrix4(surface.root.matrixWorld).project(camera);let nearest=null;
  for(let i=1;i<path.length;i++){const a=project(path[i-1]),b=project(path[i]),ax=a.x*lastViewport.width/2,ay=a.y*lastViewport.height/2,dx=(b.x-a.x)*lastViewport.width/2,dy=(b.y-a.y)*lastViewport.height/2,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1),distance=Math.hypot(px-ax-dx*t,py-ay-dy*t);if(!nearest||distance<nearest.distance)nearest={distance,uv:[T.MathUtils.lerp(path[i-1][0],path[i][0],t),T.MathUtils.lerp(path[i-1][1],path[i][1],t)]};}
  return nearest&&nearest.distance<=18?nearest.uv:uv;
 }
 function placeCursor(surface,uv){const {width,height}=surface.mesh.geometry.parameters;surface.cursor.visible=true;surface.cursor.position.set((uv[0]-.5)*width,(.5-uv[1])*height,.030);}
 function beginRepairInk(surface,ndc,camera){const uv=sampleRepairInk(surface,ndc,camera);if(!uv||!surface.enabled||surface.completed||surface.ready||!surface.state.begin(uv))return false;placeCursor(surface,uv);surface.draw();return true;}
 function moveRepairInk(surface,ndc,camera){if(!surface.active)return false;const uv=sampleRepairInk(surface,ndc,camera);if(uv){placeCursor(surface,uv);if(surface.state.move(uv))surface.draw();}return true;}
 function pointerDown(ndc,camera,player,id){
  const intent=pickPointerTarget(ndc,camera);if(intent?.id!=='boat')return oldDown?.(ndc,camera,player,id)||false;
  if(activePart||!intent.available||!near(player))return false;const surface=surfaces[intent.subId];surface.setEnabled(true);if(!beginRepairInk(surface,ndc,camera))return false;activePart=intent.subId;pose();return true;
 }
 function pointerMove(ndc,camera,player){if(!activePart)return oldMove?.(ndc,camera,player)||false;if(player&&!near(player)){pointerCancel();return true;}return moveRepairInk(surfaces[activePart],ndc,camera);}
 function pointerUp(){
  if(!activePart)return oldUp?.()||false;const id=activePart,surface=surfaces[id];surface.up();activePart=null;
  if(surface.ready){surface.setCompleted(true);surface.setEnabled(false);if(id==='beam'&&!beamDrawn){beamDrawn=parts.beginBeam();}else if(id==='cover'&&!coverDrawn){coverDrawn=parts.beginRoof();if(coverDrawn)events.push('repair-cover');}}
  pose();return true;
 }
 function pointerCancel(){if(!activePart)return oldCancel?.()||false;surfaces[activePart].cancel();activePart=null;return true;}
 function getGestureRect(camera,id='boat',subId=null){
  if(id!=='boat')return oldRect?.(camera,id,subId)||null;
  const part=subId&&surfaces[subId]?subId:activePart||((parts.beamReady||parts.roofBegun)?'cover':'beam'),r=surfaces[part].getRect(camera);if(!r)return null;updateHints();
  return {...r,id:'boat',subId:part,mode:'brush-outline',label:target.label,hint:target.hint,phase:phase(),locked:!available(part),visible:!wet()&&!parts.repaired&&(available(part)||activePart===part),hitHalo:18,backingBoard:false,worldPosition:surfaces[part].root.getWorldPosition(V()).toArray(),beamReady:parts.beamReady,repaired:parts.repaired,physicalProgress:part==='beam'?parts.beamProgress:parts.roofProgress};
 }
 stage.update=(time,...args)=>{
  const supplied=args[1],dt=supplied===undefined?(lastTime===null||!Number.isFinite(time)?0:clamp(time-lastTime,0,.06)):clamp(Number.isFinite(supplied)?supplied:0,0,.06);lastTime=Number.isFinite(time)?time:lastTime;oldUpdate?.(time,...args);simTime+=dt;for(const surface of Object.values(surfaces))surface.update(dt);
  parts.setMaterialsVisible(!wet());if(parts.beamReady&&!beamEvent){beamEvent=true;events.push('repair-beam');}if(parts.repaired&&!announced){announced=true;completion='boat';}pose();
 };
 stage.updateGestureView=(camera,player,id)=>{const old=oldView?.(camera,player,id);for(const [part,surface]of Object.entries(surfaces))surface.setEnabled(available(part)&&near(player));return Object.values(surfaces).some(s=>s.enabled)||old;};
 stage.interact=(id,...args)=>id==='boat'?!parts.repaired?false:oldInteract?.(id,...args):id==='dock'&&!parts.repaired?false:oldInteract?.(id,...args);
 architecture.interact=(id,...args)=>id==='boat'?!parts.repaired?false:oldArchInteract?.(id,...args):id==='dock'&&!parts.repaired?false:oldArchInteract?.(id,...args);
 stage.reset=(...args)=>{oldReset?.(...args);activePart=null;beamDrawn=coverDrawn=announced=beamEvent=false;completion=lastTime=null;simTime=0;events.length=0;for(const surface of Object.values(surfaces))surface.reset();pose();};
 stage.takeEnvironmentCompleted=()=>{const old=oldTake?.();if(old)return old;if(completion){const result=completion;completion=null;return result;}return null;};
 stage.takeStoryEvent=()=>events.shift()||oldStory?.()||null;
 stage.pickPointerTarget=pickPointerTarget;stage.pointerDown=pointerDown;stage.pointerMove=pointerMove;stage.pointerUp=pointerUp;stage.pointerCancel=pointerCancel;stage.getGestureRect=getGestureRect;
 stage.getBrushInteractionRegions=(camera,id)=>id==='boat'?[getGestureRect(camera,id)]:oldRegions?.(camera,id)||[];
 Object.defineProperties(stage,{gestureActive:{configurable:true,get:()=>!!activePart||moving()||read(oldActive)},glyphForming:{configurable:true,get:()=>moving()||read(oldForming)},gestureProgress:{configurable:true,get:()=>activePart?surfaces[activePart].progress:read(oldActive)?read(oldProgress):parts.repaired?1:parts.roofBegun?parts.roofProgress:parts.beamReady?cover.progress:beam.progress},gestureId:{configurable:true,get:()=>activePart||moving()?'boat':read(oldId)||null},repairStats:{configurable:true,get:()=>({phase:phase(),activePart,beamDrawn,coverDrawn,beamInk:beam.progress,coverInk:cover.progress,completionPending:!!completion,nearPosition:target.position.slice(),...parts.stats})}});
 stage.dwellingRepair={root,target,surfaces,parts};pose();return stage;
}
