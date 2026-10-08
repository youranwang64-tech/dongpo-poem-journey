import * as T from './vendor/three.module.js';
import {createInteractionHitTester} from './interaction-hit.js';
import {addTree,addBroadleaf} from './plants.js';
import {paintBrushStroke,paintFormalGlyph} from './brush-glyph.js';
import {createWaterInkCue,WORLD_BRUSH_INK} from './water-ink-cues.js';
import {createGlyphWritingState,GLYPH_STROKES} from './glyph-writing.js';
export {createGlyphWritingState,GLYPH_STROKES} from './glyph-writing.js';
import {createBrushSurface} from './brush-surface.js';
import {beginWaterInk,moveWaterInk,sampleWaterInk,waterInkScreenRect} from './water-ink-cues.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
const WRITING_HINTS={wind:{context:'借一字【风】，吹散挡在廊前的落叶。',explicit:'借一字【风】，吹散挡在廊前的落叶。按住左键落笔，写完一笔再松开。',writing:'借一字【风】，让清风穿过雨廊。按住左键落笔，写完一笔再松开。'},water:{context:'以一字【开】，展开格屏后的江面与桥板。',explicit:'以一字【开】，展开格屏后的江面与桥板。按住左键落笔，写完一笔再松开。',writing:'以一字【开】，让临江的路缓缓展开。按住左键落笔，写完一笔再松开。'},forest:{context:'借一字【林】，让树影连成树林，露出灯下归路。',explicit:'借一字【林】，让树影连成树林，露出灯下归路。按住左键落笔，写完一笔再松开。',writing:'借一字【林】，让墙外树影与归路一起显现。按住左键落笔，写完一笔再松开。'}};
function buildWutaiGlyphDoors(stage){
 const architecture=stage.architecture,oldUpdate=stage.update?.bind(stage),oldReset=stage.reset?.bind(stage),oldInteract=stage.interact?.bind(stage),oldArchInteract=architecture.interact?.bind(architecture),oldTake=stage.takeEnvironmentCompleted?.bind(stage),queue=[];
 const records=new Map();let activeId=null,lastId='seal-left',cameraView=null,viewPlayer=null,viewport={left:0,top:0,width:1280,height:720};
 for(const [i,id]of ['seal-left','seal-right'].entries()){
  const side=i?'右':'左',target={...stage.targets.find(t=>t.id===id),...architecture.targets.find(t=>t.id===id),kind:'spatial-gesture',radius:1.65,word:'开',hint:`门后有光。以一字【开】，让光穿过${side}廊的格门。`,explicitHint:`以一字【开】，让${side}廊的格门透进光。按住左键落笔，写完一笔再松开。`,writingHint:'以一字【开】，让光穿过紧闭的格门。按住左键落笔，写完一笔再松开。'},position=target.position;
  stage.targets=stage.targets.map(t=>t.id===id?target:t);architecture.targets=architecture.targets.map(t=>t.id===id?target:t);
  const surface=createBrushSurface({id,parent:stage.root,position:[position[0]+(i?.35:-.35),1.95,position[2]],width:3.2,height:3.2,word:'开',ink:WORLD_BRUSH_INK.ink,guide:WORLD_BRUSH_INK.hint,label:target.label,hint:target.hint});
  surface.mesh.material.depthTest=false;surface.mesh.renderOrder=6;const cue=createWaterInkCue(surface,{word:'开',seed:1841+i,...WORLD_BRUSH_INK});records.set(id,{target,surface,cue,age:-1,finished:false});
 }
 const near=(r,p)=>p&&Math.hypot(p.x-r.target.position[0],p.z-r.target.position[2])<=r.target.radius;
 function orient(camera){if(!camera)return;camera.updateMatrixWorld(true);for(const r of records.values())r.surface.root.quaternion.copy(camera.quaternion);stage.root.updateMatrixWorld(true);}
 function getGestureRect(camera,id=activeId||lastId){const r=records.get(id);if(!r)return null;orient(camera);const rect=r.surface.getRect(camera);return rect?{...rect,id,word:'开',hitHalo:18,screenRect:waterInkScreenRect(rect,viewport),contextHint:r.target.hint,explicitHint:r.target.explicitHint,guideVisible:r.cue.guideVisible,guidePhase:r.cue.stats.guidePhase,hint:r.age>=0&&!r.finished?'字已写成，等廊门打开。':r.cue.guideVisible?r.target.writingHint:r.target.hint,recognized:[...r.surface.state.recognized],guideStats:r.surface.state.guideStats,locked:r.finished||r.age>=0,enabled:r.surface.enabled,completed:r.finished}:null;}
 function pickPointerTarget(ndc,camera,view=viewport){if(view?.width&&view?.height)viewport={...view};orient(camera);const px=(ndc.x+1)*viewport.width/2+(viewport.left||0),py=(1-ndc.y)*viewport.height/2+(viewport.top||0);
  const candidates=[...records].filter(([,r])=>r.surface.root.visible).flatMap(([id,r])=>{const rect=getGestureRect(camera,id),box=rect?.screenRect;if(!box||px<box.left||px>box.right||py<box.top||py>box.bottom)return [];return [{id,kind:'spatial-gesture',word:'开',available:!r.finished&&r.age<0,completed:r.finished,distance:Math.hypot(px-box.centerX,py-box.centerY)}];});return candidates.sort((a,b)=>a.distance-b.distance)[0]||null;
 }
 function pointerDown(ndc,camera,player,requested){const hit=pickPointerTarget(ndc,camera),id=hit?.id||requested,r=records.get(id);if(activeId||!r||r.finished||r.age>=0||!near(r,player)||!hit)return false;r.surface.setEnabled(true);if(!beginWaterInk(r.surface,ndc,camera))return false;activeId=lastId=id;r.cue.update(0,{near:true});return true;}
 function pointerMove(ndc,camera){if(!activeId)return false;const r=records.get(activeId),value=moveWaterInk(r.surface,ndc,camera);r.cue.update(0,{near:true});architecture.previewAction(activeId,r.surface.progress*.10);return value;}
 function pointerUp(){if(!activeId)return false;const id=activeId,r=records.get(id);r.surface.up();activeId=null;r.cue.update(0,{near:true});if(r.surface.ready){r.age=0;r.surface.setEnabled(false);}return true;}
 function pointerCancel(){if(!activeId)return false;const r=records.get(activeId);r.surface.cancel();r.cue.update(0,{near:near(r,viewPlayer)});activeId=null;return true;}
 function updateGestureView(camera,player,id){cameraView=camera;viewPlayer=player;orient(camera);for(const [key,r]of records){const visible=!r.finished&&(r.age>=0||activeId===key||id===key&&near(r,player));r.surface.root.visible=visible;r.surface.setEnabled(visible&&r.age<0&&!r.finished);r.cue.update(0,{near:visible,finished:r.finished});}if(id&&records.has(id)&&near(records.get(id),player))lastId=id;return !!activeId||[...records.values()].some(r=>r.surface.root.visible);}
 stage.update=(time,response,dt=0)=>{oldUpdate?.(time,response,dt);const step=Number.isFinite(dt)?clamp(dt,0,.06):0;for(const [id,r]of records){r.surface.update(step);if(r.age>=0&&!r.finished){r.age+=step;const amount=T.MathUtils.smootherstep(r.age,.48,1.8);architecture.previewAction(id,.10+.90*amount);r.surface.mesh.material.opacity=1-T.MathUtils.smoothstep(r.age,.5,1.5);if(r.age>=1.8){r.finished=true;architecture.previewAction(id,1);r.surface.setCompleted(true);r.surface.root.visible=false;queue.push(id);}}r.cue.update(step,{near:r.surface.root.visible,finished:r.finished});}};
 stage.reset=(...args)=>{oldReset?.(...args);activeId=null;lastId='seal-left';queue.length=0;for(const r of records.values()){r.age=-1;r.finished=false;r.surface.reset();r.surface.root.visible=false;r.cue.reset();}};
 stage.interact=(id,...args)=>records.has(id)&&!records.get(id).finished?false:oldInteract?.(id,...args);
 architecture.interact=(id,...args)=>records.has(id)&&!records.get(id).finished?false:oldArchInteract?.(id,...args);
 Object.assign(stage,{pointerDown,pointerMove,pointerUp,pointerCancel,pickPointerTarget,getGestureRect,updateGestureView,getBrushHint:id=>records.get(id)?.target.explicitHint||'',revealBrushHint:id=>{const r=records.get(id);return !!(r&&!r.finished&&r.age<0&&near(r,viewPlayer)&&r.surface.root.visible&&r.cue.revealGuide());},getBrushInteractionRegions:(camera,id)=>{const r=records.get(id),rect=r&&getGestureRect(camera,id);return rect?[{...rect,visible:r.surface.root.visible,enabled:r.surface.enabled,available:!r.finished&&r.age<0}]:[];},takeEnvironmentCompleted:()=>queue.shift()||oldTake?.()||null,wutaiWriting:{records}});
 Object.defineProperties(stage,{gestureActive:{configurable:true,get:()=>!!activeId||[...records.values()].some(r=>r.age>=0&&!r.finished)},glyphForming:{configurable:true,get:()=>[...records.values()].some(r=>r.age>=0&&!r.finished)},gestureId:{configurable:true,get:()=>activeId},gestureProgress:{configurable:true,get:()=>records.get(activeId||lastId)?.surface.progress||0},gestureScreen:{configurable:true,get:()=>cameraView?getGestureRect(cameraView,activeId||lastId):null}});
 stage.reset();return stage;
}
export function buildArchitectureGestures(stage,index){
 if(index===1)return buildWutaiGlyphDoors(stage);
 if(![4,5,7].includes(index))return stage;
 const id=index===4?'wind':index===5?'water':'lantern',word=index===4?'风':index===5?'开':'林',architecture=stage.architecture;
 if(!architecture?.previewAction||!architecture.gestureComponents?.[id])throw new TypeError('缺少可响应文字的建筑构件：'+id);
 const oldUpdate=stage.update?.bind(stage),oldReset=stage.reset?.bind(stage),oldInteract=stage.interact?.bind(stage),writing=createGlyphWritingState(word),ray=new T.Raycaster(),inkRoot=new T.Group();
 inkRoot.name='空中写字_'+word;inkRoot.visible=false;inkRoot.position.copy(index===4?V(-.5,2.05,1.25):index===5?V(0,2.05,-4.0):V(-1.1,2.15,1.25));stage.root.add(inkRoot);
 const size=3.20,canvas=typeof document!=='undefined'?document.createElement('canvas'):{getContext:()=>null};canvas.width=canvas.height=512;const cx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);
 const paper=new T.Mesh(new T.PlaneGeometry(size,size),new T.MeshBasicMaterial({map:texture,transparent:true,opacity:1,depthWrite:false,depthTest:false,fog:false,toneMapped:false}));paper.name='可书写的淡墨框';paper.renderOrder=6;inkRoot.add(paper);
 const inkCue=createWaterInkCue({mesh:paper,root:inkRoot,state:writing,get ready(){return writing.complete;}},{word,seed:741+index,...WORLD_BRUSH_INK});
 const particleBase=[];for(const stroke of writing.templates)for(let k=0;k<2;k++)for(const [u,v]of stroke)particleBase.push((u-.5)*size+Math.sin(u*87+v*119+k)*.026,(.5-v)*size+Math.cos(u*93-v*71+k)*.026,.022);
 const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(particleBase,3));const motes=new T.Points(pg,new T.PointsMaterial({color:0xe5e5d6,size:.032,transparent:true,opacity:0,depthWrite:false,depthTest:false,fog:false,toneMapped:false}));motes.name='成字散开的墨粒';motes.renderOrder=7;inkRoot.add(motes);
 let active=false,completed=null,finished=false,lastTime=null,magicAge=-1,lastRect=null;
 const hints=WRITING_HINTS[index===4?'wind':index===5?'water':'forest'];let viewNear=false;
 const target={...(stage.targets?.find(t=>t.id===id)||architecture.targets.find(t=>t.id===id)),kind:'spatial-gesture',radius:1.65,position:index===4?[-1.65,0,1]:index===5?[1,0,-3]:[-2,0,1],label:index===4?'风雨廊格屏':index===5?'望江平台格屏':'林中归路',hint:hints.context,explicitHint:hints.explicit,writingHint:hints.writing,feedback:index===4?'风从格屏间穿过，雨廊开了。':index===5?'格屏与平台展开了，走向江边。':'树林显出来了，灯下的归路也开了。',word};
 stage.targets=(stage.targets||architecture.targets).map(t=>t.id===id?target:t);architecture.targets=architecture.targets.map(t=>t.id===id?target:t);
 let forest=null,windLeaves=null,windBases=null;
 if(index===4){const leaf=new T.Shape();leaf.moveTo(0,0);leaf.quadraticCurveTo(.085,.10,0,.24);leaf.quadraticCurveTo(-.075,.11,0,0);windLeaves=new T.InstancedMesh(new T.ShapeGeometry(leaf),new T.MeshBasicMaterial({color:0x849481,transparent:true,opacity:.7,side:T.DoubleSide,fog:true,depthWrite:false}),28);windLeaves.name='写风吹散的廊边落叶';windLeaves.visible=false;windLeaves.frustumCulled=false;stage.root.add(windLeaves);windBases=Array.from({length:28},(_,i)=>V(-.70+Math.sin(i*2.71)*.3,.65+(i%7)*.26,.7+Math.cos(i*1.61)*1.2));}
 if(index===7){forest=new T.Group();forest.name='写林显现的墙外树林';forest.position.set(1,0,-6.7);forest.visible=false;forest.scale.y=.001;stage.root.add(forest);const pines=addTree(forest,{count:5,bounds:{minX:1.8,maxX:9,minZ:-3,maxZ:2},seed:7151,height:[6,9],tint:0x899883}),broadleaf=addBroadleaf(forest,{count:2,bounds:{minX:-4,maxX:-1,minZ:-2,maxZ:0},seed:7152,height:[6,7],width:1.05,tint:0x9caa8e});stage.ready=Promise.all([stage.ready||Promise.resolve(),pines.userData.ready,broadleaf.userData.ready]);}
 function renderInk(){
  inkCue.update(0,{near:inkRoot.visible,finished});
 }
 function pointerDown(ndc,camera,player,activeId){
  if(active||finished||magicAge>=0||activeId&&activeId!==id||!player||Math.hypot(player.x-target.position[0],player.z-target.position[2])>target.radius)return false;
  getGestureRect(camera,id);const uv=sampleWaterInk({root:inkRoot,mesh:paper},ndc,camera);if(!uv)return false;active=writing.begin(uv);renderInk();return active;
 }
 function pointerMove(ndc,camera){if(!active)return false;getGestureRect(camera,id);const uv=sampleWaterInk({root:inkRoot,mesh:paper},ndc,camera);if(uv&&writing.move(uv)){architecture.previewAction(id,Math.min(.12,writing.progress*.12));renderInk();}return true;}
 function pointerUp(){if(!active)return false;active=false;writing.end();if(writing.complete)magicAge=0;architecture.previewAction(id,writing.progress*.12);renderInk();return true;}
 function pointerCancel(){if(!active)return false;active=false;writing.cancel();architecture.previewAction(id,writing.progress*.12);renderInk();return true;}
 const pickPointerTarget=createInteractionHitTester([{id,objects:[paper]}]);
 function getGestureRect(camera,requestedId=id){
  if(requestedId!==id)return null;camera.updateMatrixWorld(true);inkRoot.quaternion.copy(camera.quaternion);stage.root.updateMatrixWorld(true);
  const project=uv=>{const p=V((uv[0]-.5)*size,(.5-uv[1])*size,.018).applyMatrix4(inkRoot.matrixWorld).project(camera);return {x:p.x,y:p.y,z:p.z};},centre=project([.5,.5]),corners=[[0,0],[1,0],[0,1],[1,1]].map(project),strokes=writing.templates.map(s=>s.map(project)),guide=strokes.flatMap((s,i)=>s.map(p=>({...p,strokeIndex:i})));
  lastRect={mode:'write',id,word,contextHint:target.hint,explicitHint:target.explicitHint,guideVisible:inkCue.guideVisible,guidePhase:inkCue.stats.guidePhase,hint:inkCue.guideVisible?target.writingHint:target.hint,x:centre.x,y:centre.y,centre,halfWidth:Math.max(...corners.map(p=>Math.abs(p.x-centre.x))),halfHeight:Math.max(...corners.map(p=>Math.abs(p.y-centre.y))),worldPosition:inkRoot.getWorldPosition(V()).toArray(),strokes,guide,progress:writing.progress,recognized:[...writing.recognized],strokeCount:writing.strokes.length};return lastRect;
 }
 function updateGestureView(camera,player,activeId){const near=player&&Math.hypot(player.x-target.position[0],player.z-target.position[2])<=target.radius;viewNear=!!near;inkRoot.visible=!finished&&(magicAge>=0||near&&activeId===id);inkCue.update(0,{near:inkRoot.visible,finished});if(inkRoot.visible)getGestureRect(camera,id);return inkRoot.visible;}
 stage.update=(t,...args)=>{
  const dt=Number.isFinite(args[1])?clamp(args[1],0,.06):lastTime===null?0:clamp(t-lastTime,0,.06);lastTime=t;oldUpdate?.(t,...args);
  inkCue.update(args[1]===undefined?dt:clamp(args[1],0,.06),{near:inkRoot.visible,finished});
  if(magicAge>=0&&!finished){magicAge+=dt;if(magicAge<.56)renderInk();const unfold=T.MathUtils.smootherstep(magicAge,.78,2.10);architecture.previewAction(id,T.MathUtils.lerp(.12,1,unfold));const disperse=T.MathUtils.smoothstep(magicAge,.55,1.50);paper.material.opacity=1-disperse;motes.material.opacity=Math.sin(clamp(disperse,0,1)*Math.PI)*.90;const position=pg.attributes.position;for(let i=0;i<position.count;i++){const n=i*3,drift=disperse*(.2+(i%7)*.13);position.setXYZ(i,particleBase[n]+Math.sin(i*1.71)*drift,particleBase[n+1]+drift*.65,particleBase[n+2]+Math.cos(i*.61)*drift*.3);}position.needsUpdate=true;if(forest){forest.visible=true;forest.scale.y=Math.max(.001,unfold);}if(windLeaves){windLeaves.visible=magicAge>.6;const object=new T.Object3D(),a=clamp((magicAge-.6)/1.5,0,1);windLeaves.material.opacity=Math.sin(a*Math.PI)*.76;for(let i=0;i<windBases.length;i++){object.position.copy(windBases[i]).add(V(a*(4+(i%4)*.35),Math.sin(a*3+i)*.35+a*.3,-a*.6));object.rotation.set(a*7+i,a*4+i*.7,a*5+i);object.scale.setScalar(.65+(i%4)*.14);object.updateMatrix();windLeaves.setMatrixAt(i,object.matrix);}windLeaves.instanceMatrix.needsUpdate=true;}if(magicAge>=2.10){architecture.previewAction(id,1);finished=true;completed=id;inkRoot.visible=false;motes.material.opacity=0;if(windLeaves)windLeaves.visible=false;}}
 };
 stage.interact=(action,...args)=>action===id&&!finished?false:oldInteract?.(action,...args);
 stage.reset=(...args)=>{active=false;completed=null;finished=false;lastTime=null;magicAge=-1;lastRect=null;viewNear=false;writing.reset();oldReset?.(...args);inkRoot.visible=false;paper.material.opacity=1;motes.material.opacity=0;inkCue.reset();if(forest){forest.visible=false;forest.scale.y=.001;}if(windLeaves)windLeaves.visible=false;renderInk();};
 stage.architectureInkCue=inkCue;
 Object.assign(stage,{pointerDown,pointerMove,pointerUp,pointerCancel,pickPointerTarget,getGestureRect,updateGestureView,getBrushHint:action=>action===id?target.explicitHint:'',revealBrushHint:action=>action===id&&viewNear&&!finished&&magicAge<0&&inkCue.revealGuide(),acknowledge:action=>{if(completed===action)completed=null;},writing});
 Object.defineProperties(stage,{completedId:{get:()=>completed},gestureActive:{get:()=>active||magicAge>=0&&!finished},gestureId:{get:()=>id},gestureProgress:{get:()=>writing.progress},progress:{get:()=>writing.progress},gestureScreen:{get:()=>lastRect},glyphForming:{get:()=>magicAge>=0&&!finished},glyphMagicAge:{get:()=>magicAge},gestureSamples:{get:()=>writing.paths.reduce((n,p)=>n+p.length,0)}});
 renderInk();return stage;
}
