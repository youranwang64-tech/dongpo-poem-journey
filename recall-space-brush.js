import * as T from './vendor/three.module.js';
import {createBrushSurface} from './brush-surface.js';
import {createMoonlightStroke} from './red-cliff-moonlight-stroke.js';
import {createPressureInkDot} from './pressure-ink-dot.js';
import {createInteractionHitTester} from './interaction-hit.js';
import {createArchitecturalWashInput} from './architectural-wash-input.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
const read=(d,s)=>d?.get?.call(s)??d?.value??false;

/** Brush contact belongs to visible timber wedges, a rope latch, or the
 * actual high window. A bridge or nearby platform never claims the screen. */
export function decorateRecallSpaceBrush(stage){
 if(stage.recallSpaceBrush)return stage;
 const {northAssembly:north,southAssembly:south}=stage.spaceCourt||{};
 if(!north?.jointPickMesh||!south?.latchPickMesh||!south?.wedgePickMesh||!stage.beginLatchRelease)throw new TypeError('连廊需要真实梁榫、绳闩和落桥接头。');
 const oldUpdate=stage.update?.bind(stage),oldReset=stage.reset?.bind(stage),oldDown=stage.pointerDown?.bind(stage),oldMove=stage.pointerMove?.bind(stage),oldUp=stage.pointerUp?.bind(stage),oldCancel=stage.pointerCancel?.bind(stage),oldPick=stage.pickPointerTarget?.bind(stage),oldRect=stage.getGestureRect?.bind(stage),oldView=stage.updateGestureView?.bind(stage),oldRegions=stage.getBrushInteractionRegions?.bind(stage);
 const oldActive=Object.getOwnPropertyDescriptor(stage,'gestureActive'),oldForming=Object.getOwnPropertyDescriptor(stage,'glyphForming'),oldMovement=Object.getOwnPropertyDescriptor(stage,'movementBlocked');
 const targets=new Map(stage.targets.map(t=>[t.id,t])),parts=new Map([['mend-near',{mesh:north.jointPickMesh,contact:north.inkContact}],['turn-far',{mesh:south.latchPickMesh,contact:south.latchInkContact}],['unfold-far',{mesh:south.wedgePickMesh,contact:south.wedgeInkContact}]]),dots=new Map(),submissions=new Set();
 const partPick=createInteractionHitTester([...parts].map(([id,p])=>({id,objects:[p.mesh],pixelTolerance:12}))),windowTemplate=[[.08,.50],[.50,.50],[.92,.50]];
 const window=createBrushSurface({id:'read-decree',parent:stage.root,position:[-2.6,2.40,-8.00],width:1.90,height:1.65,template:windowTemplate,inputState:createArchitecturalWashInput(windowTemplate,{width:1.9,height:1.65}),hitTolerancePixels:16,mode:'brush-window-light',label:targets.get('read-decree').label,hint:targets.get('read-decree').hint});
 const windowVisual=createMoonlightStroke(window,{template:windowTemplate,width:1.9,height:1.65,parent:stage.root});windowVisual.pool.removeFromParent();
 let activeId=null,lastId='mend-near',playerRef=null,cameraRef=null,lastTime=null,simTime=0,releaseCount=0,lastRelease=null,lastHint='',lastViewport={left:0,top:0,width:1280,height:720},contactValid=false;
 for(const [id,p]of parts){const t=targets.get(id),latch=id==='turn-far',dot=createPressureInkDot({id,...p.contact,enabled:false,allowRepeat:true,label:t.label,hint:t.hint,minimumHoldSeconds:latch?.18:stage.joineryParameters.wedgeHoldSeconds,heavyHoldSeconds:latch?.85:.45,fullHoldSeconds:latch?3.4:.7,hitHalo:12,seed:latch?841:845});dots.set(id,dot);}
 const moving=()=>!!stage.spaceStats?.moving;
 const near=(id,p=playerRef)=>!!p&&Math.hypot(p.x-targets.get(id).position[0],p.z-targets.get(id).position[2])<=targets.get(id).radius;
 const status=id=>stage.canInkAction(id);
 function screenId(){return activeId||stage.targets.find(t=>t.kind==='spatial-gesture'&&!stage.spaceStats.completed.includes(t.id)&&t.requires?.every(id=>stage.spaceStats.completed.includes(id)))?.id||lastId;}
 function physicalPick(ndc,camera){return partPick(ndc,camera,lastViewport);}
 function windowPick(ndc,camera){const uv=window.sample(ndc,camera,near('read-decree')?16:0);return uv?{id:'read-decree',uv}:null;}
 function pickPointerTarget(ndc,camera,viewport=lastViewport){
  if(viewport?.width&&viewport?.height)lastViewport={...viewport};
  const hit=physicalPick(ndc,camera)||windowPick(ndc,camera);if(!hit)return oldPick?.(ndc,camera,viewport)||null;
  const s=status(hit.id);return {...hit,kind:'spatial-gesture',mode:targets.get(hit.id).mode,available:s.available&&!submissions.has(hit.id),completed:!!s.completed,hint:s.hint,pickPriority:80,screenSpace:false,actualArchitecturalPart:true,approachPosition:targets.get(hit.id).position};
 }
 function pointerDown(ndc,camera,player,id){
  playerRef=player;cameraRef=camera;if(activeId||moving())return false;
  const hit=physicalPick(ndc,camera)||windowPick(ndc,camera);if(!hit)return oldDown?.(ndc,camera,player,id)||false;
  if(!stage.canInkAction(hit.id,player).available||submissions.has(hit.id))return false;
  if(hit.id==='read-decree'){window.setEnabled(true);if(!window.down(ndc,camera))return false;windowVisual.begin();}
  else {const dot=dots.get(hit.id);dot.setEnabled(true);dot.setViewport(lastViewport);const r=dot.getRect(camera);if(!dot.down(r.start,camera))return false;if(hit.id==='turn-far'&&!stage.beginLatchRelease(hit.id,player)){dot.cancel();return false;}}
  activeId=lastId=hit.id;contactValid=true;lastHint='';return true;
 }
 function pointerMove(ndc,camera,player){
  if(!activeId)return oldMove?.(ndc,camera,player)||false;cameraRef=camera;playerRef=player;
  if(activeId==='read-decree'){const result=window.move(ndc,camera);windowVisual.move();return result;}
  contactValid=physicalPick(ndc,camera)?.id===activeId;const dot=dots.get(activeId);dot.move(contactValid?dot.getRect(camera).start:new T.Vector2(10,10),camera);return true;
 }
 function pointerUp(){
  if(!activeId)return oldUp?.()||false;const id=activeId;activeId=null;releaseCount++;
  if(id==='read-decree'){window.up();windowVisual.release();const submitted=window.ready&&stage.beginArchitecturalInk(id,playerRef);if(submitted){submissions.add(id);window.setEnabled(false);lastHint='高窗慢慢打开，暖光正在落到诏书上。';}else lastHint='在高窗扇上轻扫一片，再松笔，让光照向案上。';lastRelease={id,submitted,progress:window.progress};return true;}
  const dot=dots.get(id),valid=dot.up(),commit=dot.takeCommit();dot.fadeOut(.45);
  if(id==='turn-far'){const result=stage.stopLatchRelease(id,!valid||!contactValid);lastRelease={id,submitted:!!result?.landed,...result};if(result?.landed){submissions.add(id);dot.setCompleted(true);}lastHint=stage.spaceStats.lastInkFeedback;}
  else {const submitted=!!commit&&valid&&contactValid&&stage.beginArchitecturalInk(id,playerRef);lastRelease={id,submitted,heldSeconds:commit?.heldSeconds||0,amount:commit?.amount||0};if(submitted){submissions.add(id);dot.setCompleted(true);lastHint=id==='mend-near'?'木楔插紧，承梁稳住，缺板正在落到搁栅上。':'接头木楔插紧，短桥已锁稳，等栏门让开。';}else lastHint=stage.canInkAction(id,playerRef).available?'笔尖在真实木楔上稍停，再松笔，把楔子压实。':stage.canInkAction(id,playerRef).hint;}
  contactValid=false;return true;
 }
 function pointerCancel(){if(!activeId)return oldCancel?.()||false;const id=activeId;if(id==='read-decree'){window.cancel();windowVisual.clear();}else{dots.get(id).cancel();dots.get(id).fadeOut(.35);if(id==='turn-far')stage.stopLatchRelease(id,true);}activeId=null;contactValid=false;lastHint='';return true;}
 function getGestureRect(camera,id=screenId()){
  if(id==='turn-near'){const p=V(...targets.get(id).position).project(camera);return {id,word:'',mode:'walk-timber-lever',centre:{x:p.x,y:p.y,z:p.z},x:p.x,y:p.y,visible:p.z>-1&&p.z<1,halfWidth:0,halfHeight:0,enabled:false,locked:true,worldPosition:targets.get(id).position,hint:targets.get(id).hint,contextHint:targets.get(id).hint,guide:[],strokes:[],showProgress:false};}
  if(!dots.has(id)&&id!=='read-decree')return oldRect?.(camera,id)||null;
  const s=status(id),r=id==='read-decree'?window.getRect(camera):dots.get(id).getRect(camera),hint=activeId===id?(id==='turn-far'?stage.spaceStats.releaseProgress>=1?'桥脚落到承石了，松笔，再点接头木楔。':'按住真实木闩，吊绳缓放；看桥脚落到承石后松笔。':id==='read-decree'?'轻扫高窗扇，松笔让光落到案上。':'笔尖压在木楔上，稍停后松笔。'):lastId===id&&lastHint&&!s.completed?lastHint:s.hint;
  return {...r,id,mode:targets.get(id).mode,word:'',hint,contextHint:hint,explicitHint:hint,enabled:activeId===id||s.available&&near(id)&&!submissions.has(id),completed:!!s.completed,locked:activeId!==id&&!s.available,guideVisible:false,guidePhase:'real-joinery',visualFeedbackOnly:true,showProgress:false,pickPriority:80,actualArchitecturalPart:true,fullScreenWhileNear:false,progress:id==='turn-far'?stage.spaceStats.releaseProgress:r.progress};
 }
 function updateGestureView(camera,player,id){oldView?.(camera,player,id);cameraRef=camera;playerRef=player;for(const [key,dot]of dots){const s=status(key);dot.setEnabled(activeId===key||s.available&&!submissions.has(key));if(s.completed)dot.setCompleted(true);}const s=status('read-decree');window.setEnabled(s.available&&!submissions.has('read-decree'));if(s.completed){window.setCompleted(true);window.mesh.material.opacity=0;}return !!activeId;}
 function update(time,...args){const supplied=args[1],dt=supplied===undefined?(lastTime===null||!Number.isFinite(time)?0:clamp(time-lastTime,0,.06)):clamp(Number.isFinite(supplied)?supplied:0,0,.06);lastTime=Number.isFinite(time)?time:lastTime;oldUpdate?.(time,...args);if(dt<=0)return;simTime+=dt;for(const dot of dots.values())dot.update(dt);window.update(dt);windowVisual.update(dt);}
 function reset(...args){pointerCancel();oldReset?.(...args);activeId=null;lastId='mend-near';playerRef=cameraRef=null;lastTime=null;simTime=releaseCount=0;contactValid=false;lastRelease=null;lastHint='';submissions.clear();for(const dot of dots.values())dot.reset();window.reset();windowVisual.reset();}
 const stats=()=>({mode:'real-timber-load-wedges-and-rope-latch',activeId,moving:moving(),simTime,releaseCount,lastRelease,lastHint,contactValid,submitted:[...submissions],releaseProgress:stage.spaceStats.releaseProgress,loadProgress:stage.spaceStats.loadProgress,screenCapture:'actual-parts-only',surfaces:Object.fromEntries([...dots].map(([id,dot])=>[id,dot.stats]).concat([['read-decree',{...window.stats,visual:windowVisual.stats}]]))});
 Object.assign(stage,{update,reset,pointerDown,pointerMove,pointerUp,pointerCancel,pickPointerTarget,getGestureRect,updateGestureView,getBrushHint:id=>stage.canInkAction(id).hint||targets.get(id)?.hint||'',getBrushInteractionRegions:(camera,id)=>dots.has(id)||id==='read-decree'?[getGestureRect(camera,id)]:oldRegions?.(camera,id)||[]});
 Object.defineProperties(stage,{gestureActive:{configurable:true,get:()=>!!activeId||read(oldActive,stage)},glyphForming:{configurable:true,get:()=>moving()&&!activeId||read(oldForming,stage)},movementBlocked:{configurable:true,get:()=>!!activeId||read(oldMovement,stage)},gestureId:{configurable:true,get:()=>activeId||null},gestureProgress:{configurable:true,get:()=>cameraRef?getGestureRect(cameraRef)?.progress||0:0},gestureScreen:{configurable:true,get:()=>cameraRef?getGestureRect(cameraRef):null},pressureInkStats:{configurable:true,get:stats},bridgeHoldStats:{configurable:true,get:stats}});
 stage.recallSpaceBrush={parts,dots,inkSurfaces:new Map([['read-decree',window]]),inkVisuals:new Map([['read-decree',windowVisual]]),get activeId(){return activeId;}};return stage;
}
