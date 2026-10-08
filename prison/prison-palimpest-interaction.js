import * as T from '../vendor/three.module.js';

const DEFAULT_ORDER=['window','gate','corridor'];
const HINTS={
 window:'把笔落在高窗上，轻轻拂去积墨，让月色入狱。可以分几笔扫，松笔后窗扇才打开。',
 gate:'月色已照到牢门。把笔落在门面，拂薄墨封，松笔让门闩与门扇缓缓退让。',
 corridor:'墙上留下一个戴斗笠的墨影。沿它的轮廓轻扫一笔；松笔，等墨影退淡、廊墙让出一人宽的路。'
};
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;

/** A stand-alone wash of the existing prison architecture. A visible broad
 * surface, deliberate travel, and release replace tiny joints and glyph tests. */
export function createPrisonPalimpsestInteraction({sceneStage,camera,onChange=()=>{},order=DEFAULT_ORDER,resetScene=true}={}){
 const ORDER=[...order];
 if(!sceneStage?.scene?.isScene||!camera?.isCamera)throw new TypeError('拂墨需要真实狱景与相机。');
 const list=Array.isArray(sceneStage.actions)?sceneStage.actions:Object.entries(sceneStage.actions||{}).map(([id,a])=>({id,...a}));
 const actions=new Map(list.map(a=>[a.id,a]));
 for(const id of ORDER)if(!actions.get(id)?.pickMeshes?.length)throw new TypeError('缺少真实建筑拾取面 '+id);
 for(const key of ['previewAction','completeAction','readiness'])if(typeof sceneStage[key]!=='function')throw new TypeError('狱景缺少动作接口 '+key);
 const ray=new T.Raycaster(),completed=new Set(),events=[],travel=new Map(ORDER.map(id=>[id,0])),requirements=new Map(),coverage=new Map();
 let enabled=false,paused=false,active=null,viewport={width:1280,height:720},simTime=0,lastTime=null,releaseCount=0,strokeCount=0,cancelCount=0,lastReason='intro',hint=HINTS.window,guideCache=null;
 const shown=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
 const solid=o=>o.isMesh&&o.geometry&&shown(o)&&(o.userData.prisonWashPick||!o.userData.prisonPalimpsestInk&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>m&&m.visible!==false&&(m.opacity??1)>.015&&m.depthTest!==false&&!(m.transparent&&m.depthWrite===false)));
 function owner(o){for(const a of actions.values())for(const mesh of a.pickMeshes)for(let p=o;p;p=p.parent)if(p===mesh)return a;return null;}
 const nextId=()=>ORDER.find(id=>!completed.has(id))||null;
 const settled=id=>sceneStage.readiness(id)===true;
 const dependencies=id=>ORDER.slice(0,ORDER.indexOf(id)).every(prior=>completed.has(prior)&&settled(prior));
 const available=id=>enabled&&!paused&&!completed.has(id)&&id===nextId()&&dependencies(id);
 const scale=view=>Math.max(.50,Math.min(view.width,view.height)/720);
 const required=id=>requirements.get(id)||120*scale(viewport);
 const boxFor=(id,points=[])=>{const saved=coverage.get(id),b=saved?{...saved}:{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};for(const p of points){b.minX=Math.min(b.minX,p.x);b.maxX=Math.max(b.maxX,p.x);b.minY=Math.min(b.minY,p.y);b.maxY=Math.max(b.maxY,p.y);}return b;};
 const spanFor=b=>Number.isFinite(b.minX)?Math.hypot(b.maxX-b.minX,b.maxY-b.minY):0;
 const footprint=id=>spanFor(boxFor(id,active?.id===id?active.points:[]));
 const fraction=id=>completed.has(id)?1:clamp(Math.min(((travel.get(id)||0)+(active?.id===id?active.travel:0))/required(id),footprint(id)/(36*scale(viewport))),0,.985);
 function stats(){return {nextId:nextId(),completed:[...completed],progress:Object.fromEntries(ORDER.map(id=>[id,fraction(id)])),gestureActive:!!active,movementBlocked:!!active,enabled,paused,readyToWalk:completed.size===ORDER.length&&ORDER.every(settled),availableIds:ORDER.filter(available),hint,lastReason,releaseCount,strokeCount,cancelCount,simTime,activeId:active?.id||null,strokeTravel:active?.travel||0,strokeSpan:active?.span||0,validSamples:active?.validSamples||0,travelPixels:Object.fromEntries(travel),coveragePixels:Object.fromEntries(ORDER.map(id=>[id,footprint(id)])),requiredPixels:Object.fromEntries(ORDER.map(id=>[id,required(id)])),completionQueued:events.length,particles:0,inputContract:'visible architectural face + deliberate broad sweep + release'};}
 function changed(reason,id=null){lastReason=reason;if(!['wash-progress','contact-left','contact-returned'].includes(reason))guideCache=null;onChange({reason,id,stats:stats()});}
 const inside=p=>Number.isFinite(p?.x+p?.y)&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1;
 function firstHit(ndc){camera.updateMatrixWorld(true);sceneStage.scene.updateMatrixWorld(true);const meshes=[];sceneStage.scene.traverse(o=>{if(solid(o))meshes.push(o);});ray.setFromCamera(ndc,camera);return ray.intersectObjects(meshes,false)[0]||null;}
 function contact(ndc,view=viewport){if(!inside(ndc))return null;const direct=firstHit(ndc);if(direct){const action=owner(direct.object);return {hit:direct,action:action&&(!action.hitTest||action.hitTest(direct))?action:null,exact:true};}
  // Tolerance at a bare architectural silhouette never looks through a wall.
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]]){const point={x:ndc.x+dx*18*2/view.width,y:ndc.y+dy*18*2/view.height};if(!inside(point))continue;const hit=firstHit(point),action=hit&&owner(hit.object);if(action)return {hit,action,exact:false};}return null;
 }
 function pickPointerTarget(ndc,view=viewport){if(view?.width>0&&view?.height>0)viewport={width:view.width,height:view.height};const c=contact(ndc);if(!c)return null;if(!c.action)return {available:false,blocked:true,reason:'foreground',hint:'笔尖落在了前面的实墙上。换到能看见窗、门或廊墙的那一面。'};
  const id=c.action.id,ready=available(id),message=!enabled?'先等镜头停稳，再把笔落在能看见的建筑面上。':paused?'先继续这一夜，再落笔拂墨。':completed.has(id)?'这处积墨已经拂开，沿月色去看下一处建筑。':id!==nextId()||!dependencies(id)?'先等前一扇窗或门真正打开，再沿月色往前。':c.action.hint||HINTS[id];
  return {id,available:ready,blocked:!ready,exact:c.exact,kind:'architectural-wash',point:c.hit.point.clone(),object:c.hit.object,hint:message};
 }
 function freeze(){if(!active)return;camera.position.copy(active.cameraPosition);camera.quaternion.copy(active.cameraRotation);camera.fov=active.fov;camera.aspect=active.aspect;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 const pixel=(p,view)=>new T.Vector2(p.x*view.width/2,p.y*view.height/2);
 function preview(id){sceneStage.previewAction(id,fraction(id));}
 function pointerDown(ndc,view=viewport){if(active||!enabled||paused||completed.size===ORDER.length)return false;const picked=pickPointerTarget(ndc,view);if(!picked?.available){hint=picked?.hint||'把笔落在能看清的真实建筑面上，再轻扫。';changed('contact-rejected',picked?.id);return false;}
  const viewCopy={...viewport},s=scale(viewCopy),p=pixel(ndc,viewCopy);if(!requirements.has(picked.id))requirements.set(picked.id,120*s);
  active={id:picked.id,view:viewCopy,scale:s,start:p.clone(),anchor:p.clone(),points:[p.clone()],segmentPoints:[p.clone()],travel:0,baseTravel:travel.get(picked.id)||0,span:0,validSamples:0,lastValid:true,cameraPosition:camera.position.clone(),cameraRotation:camera.quaternion.clone(),fov:camera.fov,aspect:camera.aspect};strokeCount++;hint=HINTS[picked.id];changed('wash-start',picked.id);return true;
 }
 function pointerMove(ndc){if(!active||paused||!enabled)return false;freeze();const a=active,c=contact(ndc,a.view);if(!inside(ndc)||!c?.action||c.action.id!==a.id){a.lastValid=false;hint='笔尖离开了这处建筑面。松笔保留已经拂开的部分，再从能看清的地方继续。';changed('contact-left',a.id);return true;}
  const p=pixel(ndc,a.view);if(!a.lastValid){a.lastValid=true;a.anchor.copy(p);a.segmentPoints=[p.clone()];a.points.push(p.clone());hint='笔尖回到建筑面上了，可以从这里继续轻扫。';changed('contact-returned',a.id);return true;}const distance=p.distanceTo(a.anchor);if(distance<3*a.scale)return true;
  // Slowly drawn sweeps can accrue samples; repeated one-pixel jitters cannot.
  // One teleport-like event also cannot replace several deliberate samples.
  a.lastValid=true;a.validSamples++;a.travel+=Math.min(distance,24*a.scale);a.anchor.copy(p);a.points.push(p.clone());
  for(const prior of a.segmentPoints)a.span=Math.max(a.span,p.distanceTo(prior));a.segmentPoints.push(p.clone());preview(a.id);
  hint=fraction(a.id)>=.985?'积墨已经拂薄，松笔让建筑回应。':'墨影正在退去。可以再扫一小笔，也可以松笔后接着拂。';changed('wash-progress',a.id);return true;
 }
 function finish(cancel=false){if(!active)return false;const a=active,deliberate=a.validSamples>=3&&a.travel>=22*a.scale&&a.span>=18*a.scale,lastValid=a.lastValid,rawTotal=a.baseTravel+(deliberate?a.travel:0);active=null;
  if(deliberate){travel.set(a.id,Math.min(required(a.id)*.985,rawTotal));coverage.set(a.id,boxFor(a.id,a.points));}
  if(cancel){cancelCount++;preview(a.id);hint='这一笔已停，拂薄的墨影留在原处；继续时还能接着扫。';changed('wash-cancelled',a.id);return true;}
  releaseCount++;
  // Test actual accumulated motion before its .985 preview cap. The cap keeps
  // a cancelled full sweep from opening a door without a new valid release.
  const eligible=deliberate&&lastValid&&rawTotal>=required(a.id)&&spanFor(boxFor(a.id))>=36*a.scale;
  if(eligible&&enabled&&!paused&&dependencies(a.id)&&sceneStage.completeAction(a.id)===true){completed.add(a.id);travel.set(a.id,required(a.id));events.push(a.id);sceneStage.previewAction(a.id,1);hint=nextId()?'墨影已退，等窗扇或门扇真正让开，再沿月色前行。':'三重墨影已薄，等长廊显清，再向月色里走去。';changed('action-complete',a.id);}
  else {preview(a.id);hint=deliberate?'这一处已拂薄一些，换一小笔继续。':'轻轻扫过一段建筑面；点一下或停住不动，还不能拂开积墨。';changed('wash-released',a.id);}return true;
 }
 function pointerUp(ndc){if(active&&ndc){freeze();const c=contact(ndc,active.view);if(!inside(ndc)||c?.action?.id!==active.id)active.lastValid=false;}return finish(false);}
 function pointerCancel(){return finish(true);}
 function setEnabled(value){if(!value)pointerCancel();enabled=!!value;if(enabled&&nextId())hint=HINTS[nextId()];changed(enabled?'puzzle-enabled':'puzzle-disabled');}
 function setPaused(value){if(value)pointerCancel();paused=!!value;changed(paused?'paused':'resumed');}
 function update(time,dt,{paused:framePaused=false}={}){if(dt===undefined)dt=lastTime===null?0:time-lastTime;lastTime=time;if(paused||framePaused||!Number.isFinite(dt)||dt<=0)return;simTime+=clamp(dt,0,.10);freeze();}
 function getGuide(){const id=nextId(),a=actions.get(id);if(!a)return null;camera.updateMatrixWorld(true);sceneStage.scene.updateMatrixWorld(true);const key=[id,available(id),viewport.width,viewport.height,...camera.matrixWorld.elements,...camera.projectionMatrix.elements].join('|');if(guideCache?.key===key&&simTime-guideCache.time<.2)return guideCache.guide;const center=a.center?.isVector3?a.center.clone():Array.isArray(a.center)?V(...a.center):new T.Box3().setFromObject(a.pickMeshes[0]).getCenter(V()),projected=center.project(camera),s=scale(viewport);let start={x:projected.x,y:projected.y,z:projected.z},end={...start},visible=false;
  // A hint also has to fit the visible architecture. Its endpoints and middle
  // are checked against the same first surface as the user's brush.
  if(available(id)&&projected.z>-1&&projected.z<1)search:for(const shift of [[0,0],[-18,0],[18,0],[0,18],[0,-18]])for(const length of [90,66,42])for(const direction of [[1,0],[0,1],[.8,.6],[.8,-.6]]){const x=projected.x+shift[0]*s*2/viewport.width,y=projected.y+shift[1]*s*2/viewport.height,dx=direction[0]*length*s/viewport.width,dy=direction[1]*length*s/viewport.height,p0={x:x-dx,y:y-dy,z:projected.z},p1={x:x+dx,y:y+dy,z:projected.z},sample=[p0,{x,y},p1];if(sample.every(inside)&&sample.every(p=>{const c=contact(p);return c?.action?.id===id;})){start=p0;end=p1;visible=true;break search;}}
  const guide={id,hint:a.hint||HINTS[id],start,end,visible,available:available(id),wideArchitecturalFace:true,temporaryOnly:true};guideCache={key,time:simTime,guide};return guide;
 }
 function reset(){pointerCancel();completed.clear();events.length=0;requirements.clear();coverage.clear();if(resetScene)sceneStage.resetActions?.();for(const id of ORDER){travel.set(id,0);sceneStage.previewAction(id,0);}active=null;enabled=paused=false;simTime=releaseCount=strokeCount=cancelCount=0;lastTime=null;hint=HINTS[ORDER[0]];changed('reset');}
 return {pointerDown,pointerMove,pointerUp,pointerCancel,pickPointerTarget,setEnabled,setPaused,update,reset,getGuide,takeCompleted:()=>events.shift()||null,get gestureActive(){return !!active;},get enabled(){return enabled&&!paused;},get stats(){return stats();}};
}
