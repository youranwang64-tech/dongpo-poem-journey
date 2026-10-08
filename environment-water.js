import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {createBrushSurface} from './brush-surface.js';
import {createInteractionHitTester} from './interaction-hit.js';
import {createDwellingWaterBranches} from './dwelling-water-branches.js';
import {createDwellingFlowStroke} from './dwelling-flow-stroke.js';
import {createWaterInkCue,beginWaterInk,moveWaterInk,waterInkScreenRect,WORLD_BRUSH_INK} from './water-ink-cues.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
export const DWELLING_WATER=Object.freeze({id:'sluice',position:Object.freeze([2.7,0,4.2]),radius:1.4,word:'开',strokeCount:4,openingSeconds:1.9,drainSeconds:2.6,wetBounds:Object.freeze({minX:-1.2,maxX:1.2,minZ:2.4,maxZ:3.7})});

function intersectsWet(a,b){
 const box=DWELLING_WATER.wetBounds;let lo=0,hi=1;
 for(const [axis,min,max] of [['x',box.minX,box.maxX],['z',box.minZ,box.maxZ]]){const delta=b[axis]-a[axis];if(Math.abs(delta)<1e-9){if(a[axis]<=min||a[axis]>=max)return false;}else{let p=(min-a[axis])/delta,q=(max-a[axis])/delta;if(p>q)[p,q]=[q,p];lo=Math.max(lo,p);hi=Math.min(hi,q);if(lo>=hi)return false;}}
 return hi>0&&lo<1;
}

/** Ink beside the sluice lifts the real gate before the existing roof repair. */
export function decorateDwellingWater(stage){
 if(stage.environmentWater)return stage;
 const oldUpdate=stage.update?.bind(stage),oldReset=stage.reset?.bind(stage),oldInteract=stage.interact?.bind(stage),oldCanMove=stage.canMove?.bind(stage),oldRoute=stage.routeTo?.bind(stage),oldDown=stage.pointerDown?.bind(stage),oldMove=stage.pointerMove?.bind(stage),oldUp=stage.pointerUp?.bind(stage),oldCancel=stage.pointerCancel?.bind(stage),oldPick=stage.pickPointerTarget?.bind(stage),oldView=stage.updateGestureView?.bind(stage),oldRect=stage.getGestureRect?.bind(stage),oldTake=stage.takeEnvironmentCompleted?.bind(stage),oldStoryTake=stage.takeStoryEvent?.bind(stage),oldHint=stage.getBrushHint?.bind(stage),oldReveal=stage.revealBrushHint?.bind(stage);
 const architecture=stage.architecture||{},oldArchInteract=architecture.interact?.bind(architecture),oldArchCanMove=architecture.canMove?.bind(architecture),oldActive=Object.getOwnPropertyDescriptor(stage,'gestureActive');
 const root=new T.Group();root.name='黄州院落 · 开闸排水';(stage.root||stage.scene).add(root);
 const stone=new T.MeshStandardMaterial({color:0x858f84,roughness:1}),wood=new T.MeshStandardMaterial({color:0x665f4c,roughness:.98}),staticGeometry=[];
 const staticBox=(w,h,d,p)=>staticGeometry.push(new T.BoxGeometry(w,h,d).translate(...p));
 for(const x of [2.44,2.96]){staticBox(.13,.75,.18,[x,.33,4.2]);staticBox(.26,.11,.29,[x,.035,4.2]);}staticBox(.66,.10,.17,[2.7,.72,4.2]);staticBox(.15,.22,.15,[2.7,.84,4.2]);
 const housing=new T.Mesh(mergeGeometries(staticGeometry),wood);housing.name='东侧水渠闸架';housing.castShadow=housing.receiveShadow=true;root.add(housing);staticGeometry.forEach(g=>g.dispose());
 const gate=new T.Group();gate.name='墨成后缓慢升起的水渠闸';gate.position.set(2.7,.25,4.2);root.add(gate);
 const gateLeaf=new T.Mesh(new T.BoxGeometry(.48,.46,.065),wood);gateLeaf.castShadow=true;gate.add(gateLeaf);
 const inkSurface=createBrushSurface({id:'sluice',parent:root,position:[4.75,2.08,4.20],width:3.20,height:3.20,word:'开',ink:WORLD_BRUSH_INK.ink,guide:WORLD_BRUSH_INK.hint,label:'闸旁落墨',hint:'借一字【开】，让积水通过渠闸，顺着水纹流向院外。'});
 const branches=createDwellingWaterBranches(root),routeSurfaces={};
 const routePlacements={return:{position:[1.32,.080,4.01],width:3.10,height:2.72,from:.13,to:.96},field:{position:[4.16,.062,5.90],width:3.82,height:4.64,from:.13,to:.96}};
 for(const [id,placement]of Object.entries(routePlacements)){
  const {position,width,height,from,to}=placement,template=Array.from({length:23},(_,i)=>{const p=branches.branches[id].path.getPointAt(T.MathUtils.lerp(from,to,i/22));return [.5+(p.x-position[0])/width,.5+(p.z-position[2])/height];});
  routeSurfaces[id]=createBrushSurface({id:'sluice-'+id,parent:root,position,width,height,template,inputState:createDwellingFlowStroke(template,{width,height}),rotation:[-Math.PI/2,0,0],mode:'flow-sweep',ink:WORLD_BRUSH_INK.ink,guide:WORLD_BRUSH_INK.hint,label:id==='return'?'左侧水渠':'右侧水渠',hint:'在这道水渠上轻扫一笔，看看水流去哪里；横着、斜着都可以。'});
 }
 const surfaces={gate:inkSurface,...routeSurfaces},inkCues=Object.fromEntries(Object.entries(surfaces).map(([id,surface],i)=>[id,createWaterInkCue(surface,{word:id==='gate'?'开':null,seed:791+i,...WORLD_BRUSH_INK})])),pickGate=createInteractionHitTester([{id:'gate',objects:[inkSurface.mesh],pixelTolerance:18}]),flowRay=new T.Raycaster();
 function pickInk(ndc,camera,viewport=lastViewport){
  if(!camera||!ndc)return null;camera.updateMatrixWorld(true);root.updateWorldMatrix(true,true);flowRay.setFromCamera(ndc,camera);const hits=[];
  for(const [id,surface]of Object.entries(routeSurfaces)){
   const origin=surface.root.getWorldPosition(V()),normal=V(0,0,1).transformDirection(surface.root.matrixWorld),world=flowRay.ray.intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(normal,origin),V());if(!world)continue;
   const local=surface.root.worldToLocal(world.clone()),{width,height}=surface.mesh.geometry.parameters,uv=[local.x/width+.5,.5-local.y/height];
   if(uv.some(value=>value<0||value>1))continue;const bedDistance=surface.state.bedDistance(uv);if(bedDistance<=surface.state.stats.bedTolerance)hits.push({id,exact:true,distance:flowRay.ray.origin.distanceTo(world),bedDistance,worldPoint:world.toArray(),method:'real-canal-bed'});
  }
  hits.sort((a,b)=>a.bedDistance-b.bedDistance);return hits[0]||pickGate(ndc,camera,viewport);
 }
 const roadMaterial=stone.clone();roadMaterial.transparent=true;roadMaterial.opacity=.10;
 const road=new T.InstancedMesh(new T.BoxGeometry(.70,.025,.39),roadMaterial,9);road.name='排水后显露的中央石路';road.receiveShadow=true;root.add(road);const dummy=new T.Object3D();
 for(let i=0;i<9;i++){dummy.position.set((i%3-1)*.76,.003,2.61+Math.floor(i/3)*.43);dummy.rotation.set(0,Math.sin(i*1.7)*.025,0);dummy.updateMatrix();road.setMatrixAt(i,dummy.matrix);}road.instanceMatrix.needsUpdate=true;
 const waterUniforms=T.UniformsUtils.merge([T.UniformsLib.fog,{time:{value:0},drain:{value:0}}]),waterMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,fog:true,side:T.DoubleSide,uniforms:waterUniforms,
  vertexShader:`varying vec2 p;#include <fog_pars_vertex>
   void main(){p=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;#include <fog_vertex>
   }`.replace(/;#include/g,';\n#include'),
  fragmentShader:`varying vec2 p;uniform float time,drain;#include <fog_pars_fragment>
   void main(){vec2 q=(p-.5)*2.;float edge=max(0.,1.-pow(abs(q.x),5.))*max(0.,1.-pow(abs(q.y),5.));float wave=sin(length(q+vec2(.3,-.1))*34.-time*2.8)*.025+sin(p.x*61.+p.y*37.-time*1.9)*.018;vec3 c=mix(vec3(.34,.43,.37),vec3(.65,.74,.66),.45+wave*4.);float a=.47*pow(max(0.,edge),.35)*pow(1.-drain,.72);gl_FragColor=vec4(c,a);#include <fog_fragment>
   }`.replace(/;#include/g,';\n#include')});
 const pool=new T.Mesh(new T.PlaneGeometry(2.4,1.3,8,4).rotateX(-Math.PI/2),waterMaterial);pool.name='院落浅积水';pool.position.set(0,.039,3.05);pool.renderOrder=1;root.add(pool);
 const inletPoints=[V(.9,.034,3.1),V(1.65,.031,3.1),V(2.7,.029,3.35),V(2.7,.033,4.36)],channelPath=new T.CatmullRomCurve3(inletPoints,false,'centripetal'),path=new T.CatmullRomCurve3([...inletPoints.slice(0,-1),...branches.branches.field.path.points.map(p=>p.clone())],false,'centripetal'),steps=48,channelPositions=[],channelUV=[],channelIndices=[],banks=[];
 for(let i=0;i<=steps;i++){const u=i/steps,p=channelPath.getPointAt(u),t=channelPath.getTangentAt(u),side=V(t.z,0,-t.x).normalize().multiplyScalar(.15);for(const sign of [-1,1]){const q=p.clone().addScaledVector(side,sign);channelPositions.push(...q.toArray());channelUV.push(sign===-1?0:1,u);}if(i<steps){const n=i*2;channelIndices.push(n,n+2,n+1,n+1,n+2,n+3);const p2=channelPath.getPointAt((i+1)/steps),t2=channelPath.getTangentAt((i+1)/steps),s2=V(t2.z,0,-t2.x).normalize().multiplyScalar(.18);for(const sign of [-1,1])banks.push(...p.clone().addScaledVector(side,sign*1.2).add(V(0,-.015,0)).toArray(),...p2.clone().addScaledVector(s2,sign).add(V(0,-.015,0)).toArray());}}
 const channelGeometry=new T.BufferGeometry();channelGeometry.setAttribute('position',new T.Float32BufferAttribute(channelPositions,3));channelGeometry.setAttribute('uv',new T.Float32BufferAttribute(channelUV,2));channelGeometry.setIndex(channelIndices);channelGeometry.computeVertexNormals();
 const channelUniforms=T.UniformsUtils.merge([T.UniformsLib.fog,{time:{value:0},flow:{value:0}}]),channelMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,fog:true,uniforms:channelUniforms,
  vertexShader:`varying vec2 p;#include <fog_pars_vertex>
   void main(){p=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;#include <fog_vertex>
   }`.replace(/;#include/g,';\n#include'),
  fragmentShader:`varying vec2 p;uniform float time,flow;#include <fog_pars_fragment>
   void main(){float edge=sin(p.x*3.14159265);float ripple=.5+.5*sin(p.y*76.-time*8.);vec3 c=mix(vec3(.29,.39,.32),vec3(.68,.78,.68),ripple*flow*.8);gl_FragColor=vec4(c,edge*(.20+flow*.47));#include <fog_fragment>
   }`.replace(/;#include/g,';\n#include')});
 const channel=new T.Mesh(channelGeometry,channelMaterial);channel.name='向东侧田埂转弯的排水渠';root.add(channel);
 const bankGeometry=new T.BufferGeometry();bankGeometry.setAttribute('position',new T.Float32BufferAttribute(banks,3));const bankLines=new T.LineSegments(bankGeometry,new T.LineBasicMaterial({color:0x5e6b5c,transparent:true,opacity:.70}));bankLines.name='浅渠两侧岸线';root.add(bankLines);
 const tailGeometry=new T.BufferGeometry(),tailPositions=new Float32Array(36*6),flowGeometry=new T.BufferGeometry(),flowPositions=new Float32Array(36*3);tailGeometry.setAttribute('position',new T.BufferAttribute(tailPositions,3));flowGeometry.setAttribute('position',new T.BufferAttribute(flowPositions,3));
 const tails=new T.LineSegments(tailGeometry,new T.LineBasicMaterial({color:0xb8cbb9,transparent:true,opacity:0,depthWrite:false})),droplets=new T.Points(flowGeometry,new T.PointsMaterial({color:0xd3dfd1,size:.044,transparent:true,opacity:0,depthWrite:false}));tails.name='沿渠转弯的流水细线';droplets.name='排水流动亮点';tails.frustumCulled=droplets.frustumCulled=false;root.add(tails,droplets);
 const target={id:'sluice',kind:'spatial-gesture',word:'开',position:DWELLING_WATER.position.slice(),radius:DWELLING_WATER.radius,label:'渠闸落墨',verb:'疏水',hint:'借一字【开】，让积水通过渠闸；再顺着水纹，找一条流出院子的路。',explicitHint:'轻扫水渠，先看清水向。再借一字【开】，让积水通过渠闸。按住左键落笔，写完一笔再松开；水不退时，换另一道渠。',writingHint:'借一字【开】，让积水通过渠闸。按住左键落笔，写完一笔再松开。',feedback:'水顺着田埂流出院外，中央石路露出来了。',verse:''};
 const mergeTargets=list=>[target,...(list||[]).filter(t=>t.id!=='sluice').map(t=>t.id==='boat'?{...t,requires:[...new Set([...(t.requires||[]),'sluice'])]}:t)];stage.targets=mergeTargets(stage.targets||architecture.targets);architecture.targets=mergeTargets(architecture.targets||stage.targets);stage.architecture=architecture;
 let progress=0,opening=false,opened=false,draining=false,drained=false,completed=null,lastTime=null,simTime=0,drainAge=0,openingAge=0,lastRect=null,routeId=null,activeSubId=null,lastSubId='gate',viewNear=false,lastViewport={left:0,top:0,width:1280,height:720};const storyEvents=[];
 function near(player){return !!player&&Math.hypot(player.x-target.position[0],player.z-target.position[2])<=target.radius;}
 function pose(){
  inkSurface.root.visible=!opened&&!drained;
  gate.position.y=.25+progress*.50;const amount=T.MathUtils.smootherstep(drainAge/DWELLING_WATER.drainSeconds,0,1),flow=draining?Math.sin(Math.PI*clamp(drainAge/DWELLING_WATER.drainSeconds,0,1))*.80+.20:0,returnFlow=opened&&routeId==='return'&&!draining&&!drained?.55+Math.sin(simTime*2.2)*.15:0;
  waterUniforms.time.value=channelUniforms.time.value=simTime;waterUniforms.drain.value=amount;pool.position.y=.039-amount*.024;pool.visible=!drained;roadMaterial.opacity=.10+.90*amount;channelUniforms.flow.value=flow;tails.material.opacity=flow*.72;droplets.material.opacity=flow*.88;tails.visible=droplets.visible=opened&&!drained;
  if(draining){for(let i=0;i<36;i++){const u=(i/36+simTime*.40)%1,p=path.getPointAt(u).add(V(0,.012,0)),tail=path.getPointAt(Math.max(0,u-.018)).add(V(0,.01,0));flowPositions.set(p.toArray(),i*3);tailPositions.set(tail.toArray(),i*6);tailPositions.set(p.toArray(),i*6+3);}flowGeometry.attributes.position.needsUpdate=tailGeometry.attributes.position.needsUpdate=true;}
  branches.update(simTime,{routeId,flow:routeId==='return'?returnFlow:flow,preview:!draining&&!drained});
  for(const [id,cue]of Object.entries(inkCues))cue.update(0,{near:viewNear,selected:routeId===id,finished:drained});
  root.updateMatrixWorld(true);
 }
 function emitStory(id){if(!storyEvents.includes(id))storyEvents.push(id);}
 function tryDrain(){if(opened&&routeId==='field'&&!draining&&!drained){draining=true;drainAge=0;emitStory('sluice-directed');for(const surface of Object.values(routeSurfaces))surface.setEnabled(false);return true;}return false;}
 function tryOpen(){if(!opening&&!opened&&inkSurface.ready){opening=true;openingAge=0;inkSurface.setEnabled(false);pose();return true;}return false;}
 function selectRoute(id){routeId=id;routeSurfaces[id].setCompleted(true);lastSubId=inkSurface.ready?(id==='field'?'field':'return'):'gate';if(id==='return'){emitStory('sluice-return');}if(opened)tryDrain();pose();}
 function pointerDown(ndc,camera,player,activeId){
  const hit=pickInk(ndc,camera,lastViewport);if(!hit)return oldDown?.(ndc,camera,player,activeId)||false;
  if(draining||drained||!near(player))return false;const subId=hit.id,surface=surfaces[subId];
  if(subId==='gate'&&(opening||opened||inkSurface.ready))return false;
  if(subId!=='gate'&&surface.ready){surface.reset();inkCues[subId].reset();}
  surface.setEnabled(true);if(beginWaterInk(surface,ndc,camera)){activeSubId=lastSubId=subId;inkCues[subId].update(0,{near:true});return true;}return false;
 }
 function pointerMove(ndc,camera,player){
  if(!activeSubId)return oldMove?.(ndc,camera,player)||false;const changed=moveWaterInk(surfaces[activeSubId],ndc,camera);inkCues[activeSubId].update(0,{near:true});return changed;
 }
 function pointerUp(){if(!activeSubId)return oldUp?.()||false;const id=activeSubId,surface=surfaces[id];surface.up();activeSubId=null;if(id==='gate')tryOpen();else if(surface.ready)selectRoute(id);return true;}
 function pointerCancel(){if(!activeSubId)return oldCancel?.()||false;const id=activeSubId;surfaces[id].cancel();activeSubId=null;inkCues[id].update(0,{near:viewNear,selected:routeId===id});return true;}
 function getEnvironmentDragRect(camera,subId=null){
  if(camera&&!activeSubId){camera.updateMatrixWorld(true);inkSurface.root.quaternion.copy(camera.quaternion);root.updateWorldMatrix(true,true);}
  const id=subId&&surfaces[subId]?subId:activeSubId||lastSubId,rect=surfaces[id].getRect(camera);if(!rect)return null;
  const cue=inkCues[id],contextHint=id==='gate'?(routeId?'水向已清。借一字【开】，让积水通过渠闸。':target.hint):'这道水纹通向哪里？在水渠上轻扫一笔，看水往哪儿流。',explicitHint=id==='gate'?target.explicitHint:'在水渠上轻扫一笔即可，横扫、斜扫都可以。若水流回院内，换另一道渠。';
  const hint=drained?'石路露出来了，去屋檐下落笔。':draining?'水正流向田埂，等石路露出来。':opening?'闸门正在升起。':opened&&routeId==='return'?'水又回到院里了。另一道渠会通向哪里？':opened?'闸已开，积水还在。再看一看两道渠的去向。':id==='gate'&&cue.guideVisible?target.writingHint:contextHint;
  lastRect={...rect,id:'sluice',subId:id,hint,contextHint,explicitHint,guideVisible:cue.guideVisible,guidePhase:cue.stats.guidePhase,screenRect:waterInkScreenRect(rect,lastViewport),hitHalo:18,backingBoard:false,gateProgress:progress,opened,draining,drained,routeId,routeCorrect:routeId==='field',needsDirection:opened&&routeId!=='field',options:Object.entries(routeSurfaces).map(([option,surface])=>({subId:option,label:option==='return'?'左侧渠口':'右侧渠口',selected:routeId===option,worldPosition:surface.root.getWorldPosition(V()).toArray()}))};return lastRect;
 }
 function waterCanMove(from,to,done,original){if(original?.(from,to,done)===false)return false;if(drained)return true;const w=DWELLING_WATER.wetBounds,inside=p=>p.x>w.minX&&p.x<w.maxX&&p.z>w.minZ&&p.z<w.maxZ;if(inside(from)&&!inside(to))return true;return !intersectsWet(from,to);}
 stage.canMove=(from,to,done)=>waterCanMove(from,to,done,oldCanMove);architecture.canMove=(from,to,done)=>waterCanMove(from,to,done,oldArchCanMove);
 stage.routeTo=(goal,from)=>{const route=oldRoute?.(goal,from)||[goal.clone()];if(drained)return route;let previous=from;for(const next of route){if(intersectsWet(previous,next)){const anchor=V(2.1,0,4.1),detour=[],wet=DWELLING_WATER.wetBounds;if(intersectsWet(from,anchor)){if(from.z<=wet.minZ)detour.push(V(2.1,0,Math.min(from.z,2.1)));else if(from.x<=wet.minX)detour.push(V(from.x,0,4.1));else detour.push(V(2.1,0,from.z));}detour.push(anchor,V(...target.position));return detour.filter((p,i)=>i||p.distanceTo(from)>.12);}previous=next;}return route;};
 stage.interact=(id,...args)=>id==='sluice'?drained:id==='boat'&&!drained?false:oldInteract?.(id,...args);architecture.interact=(id,...args)=>id==='sluice'?drained:id==='boat'&&!drained?false:oldArchInteract?.(id,...args);
 stage.update=(time,...args)=>{const frameDt=args[1],dt=frameDt===undefined?(lastTime===null||!Number.isFinite(time)?0:clamp(time-lastTime,0,.06)):clamp(frameDt,0,.06);lastTime=Number.isFinite(time)?time:lastTime;oldUpdate?.(time,...args);simTime+=dt;for(const surface of Object.values(surfaces))surface.update(dt);if(opening){openingAge=Math.min(DWELLING_WATER.openingSeconds,openingAge+dt);progress=T.MathUtils.smootherstep(openingAge,.12,DWELLING_WATER.openingSeconds);if(openingAge>=DWELLING_WATER.openingSeconds){opening=false;opened=true;drainAge=0;if(!tryDrain()){lastSubId=routeId||'return';emitStory(routeId==='return'?'sluice-return':'sluice-no-route');}}}else if(draining&&!drained){drainAge=Math.min(DWELLING_WATER.drainSeconds,drainAge+dt);if(drainAge>=DWELLING_WATER.drainSeconds){draining=false;drained=true;completed='sluice';inkSurface.setCompleted(true);for(const surface of Object.values(routeSurfaces))surface.setCompleted(true);}}for(const [id,cue]of Object.entries(inkCues))cue.update(dt,{near:viewNear||activeSubId===id,selected:routeId===id,finished:drained});pose();};
 function resetWater(){progress=0;opening=opened=draining=drained=false;completed=lastTime=lastRect=routeId=activeSubId=null;lastSubId='gate';viewNear=false;storyEvents.length=0;simTime=drainAge=openingAge=0;for(const surface of Object.values(surfaces))surface.reset();for(const cue of Object.values(inkCues))cue.reset();branches.reset();pose();}
 stage.reset=(...args)=>{oldReset?.(...args);resetWater();};stage.pointerDown=pointerDown;stage.pointerMove=pointerMove;stage.pointerUp=pointerUp;stage.pointerCancel=pointerCancel;stage.getEnvironmentDragRect=getEnvironmentDragRect;
 stage.pickPointerTarget=(ndc,camera,viewport)=>{if(viewport?.width&&viewport?.height)lastViewport={...viewport};if(!activeSubId)getEnvironmentDragRect(camera);const intent=pickInk(ndc,camera,lastViewport);return intent?{...intent,id:'sluice',subId:intent.id,kind:'spatial-gesture',available:!draining&&!drained&&(intent.id!=='gate'||!opening&&!opened&&!inkSurface.ready),completed:drained,word:intent.id==='gate'?'开':''}:oldPick?.(ndc,camera,viewport)||null;};
 stage.getGestureRect=(camera,id,subId=null)=>id==='sluice'?getEnvironmentDragRect(camera,subId):oldRect?.(camera,id)||null;
 stage.updateGestureView=(camera,player,id)=>{oldView?.(camera,player,id);const close=near(player);viewNear=close||!!activeSubId;inkSurface.setEnabled(!opening&&!opened&&!inkSurface.ready&&(close||activeSubId==='gate'));for(const [route,surface]of Object.entries(routeSurfaces))surface.setEnabled(!draining&&!drained&&(close||activeSubId===route));for(const [route,cue]of Object.entries(inkCues))cue.update(0,{near:viewNear,selected:routeId===route,finished:drained});getEnvironmentDragRect(camera);return Object.values(surfaces).some(surface=>surface.enabled);};
 stage.getBrushHint=(id,subId=null)=>id==='sluice'?(subId&&subId!=='gate'?'在这道水渠上轻扫一笔即可，横着、斜着都可以。若水流回院内，换另一道渠。':target.explicitHint):oldHint?.(id,subId)||'';
 stage.revealBrushHint=(id,subId=null)=>{if(id!=='sluice')return oldReveal?.(id,subId)||false;if(!viewNear||draining||drained)return false;const route=subId&&surfaces[subId]?subId:opening||opened||inkSurface.ready?lastSubId:'gate';if(route==='gate'&&(opening||opened||inkSurface.ready))return false;lastSubId=route;return inkCues[route].revealGuide();};
 stage.getBrushDomains=(camera,viewport=lastViewport)=>{if(viewport?.width&&viewport?.height)lastViewport={...viewport};return Object.keys(surfaces).map(subId=>{const rect=getEnvironmentDragRect(camera,subId),available=!draining&&!drained&&(subId!=='gate'||!opening&&!opened&&!inkSurface.ready);return {...rect,visible:surfaces[subId].root.visible,enabled:surfaces[subId].enabled&&available,available};});};
 stage.getBrushInteractionRegions=(camera,taskId)=>taskId==='sluice'?stage.getBrushDomains(camera):[];
 stage.takeEnvironmentCompleted=()=>{if(completed){const result=completed;completed=null;return result;}return oldTake?.()||null;};
 stage.takeStoryEvent=()=>storyEvents.shift()||oldStoryTake?.()||null;
 let triangleBudget=0,drawCallBudget=0;root.traverse(o=>{if(o.isMesh||o.isLine||o.isPoints)drawCallBudget++;if(o.isMesh)triangleBudget+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});
 Object.defineProperties(stage,{environmentDragActive:{configurable:true,get:()=>!!activeSubId},glyphForming:{configurable:true,get:()=>opening||draining},gestureId:{configurable:true,get:()=>activeSubId||opening||draining?'sluice':null},gestureProgress:{configurable:true,get:()=>activeSubId?surfaces[activeSubId].progress:inkSurface.progress},waterStats:{configurable:true,get:()=>({enabled:true,interaction:'brush-water-puzzle',word:'开',state:drained?'drained':draining?'draining':opening?'opening':activeSubId==='gate'?'writing':activeSubId?'directing':opened?'needs-direction':'closed',active:!!activeSubId,activeSubId,progress:inkSurface.progress,gateProgress:progress,opening,openingAge,openingSeconds:1.9,opened,draining,drained,routeId,routeCorrect:routeId==='field',needsDirection:opened&&routeId!=='field',routeHints:{return:'水渠转回院内，水纹回到石路。',field:'水渠沿低田埂向外，水纹流离院落。'},routeProgress:Object.fromEntries(Object.entries(routeSurfaces).map(([id,surface])=>[id,surface.progress])),routeFlows:Object.fromEntries(Object.entries(branches.branches).map(([id,branch])=>[id,branch.uniforms.flow.value])),drainAge,drainProgress:clamp(drainAge/DWELLING_WATER.drainSeconds,0,1),drainSeconds:DWELLING_WATER.drainSeconds,recognized:[...inkSurface.state.recognized],strokeCount:4,moveSamples:inkSurface.stats.samples,simTime,waterOpacity:pool.visible?.47*Math.pow(1-waterUniforms.drain.value,.72):0,roadOpacity:roadMaterial.opacity,channelFlow:channelUniforms.flow.value,inkWorldPosition:inkSurface.root.getWorldPosition(V()).toArray(),wetBounds:{...DWELLING_WATER.wetBounds},flowPoints:36,drawCalls:drawCallBudget,triangles:triangleBudget,ready:true})}});
 if(!oldActive||oldActive.configurable)Object.defineProperty(stage,'gestureActive',{configurable:true,get:()=>!!activeSubId||opening||draining||(oldActive?.get?.call(stage)??oldActive?.value??false)});
 stage.environmentWater={target,root,inkSurface,routeSurfaces,inkCues,branches,gate,path,get dragRect(){return lastRect;}};resetWater();return stage;
}
