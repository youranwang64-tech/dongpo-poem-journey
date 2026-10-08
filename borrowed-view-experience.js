import * as T from './vendor/three.module.js';
import {createPressureInkDot} from './pressure-ink-dot.js';
import {createBrushSurface} from './brush-surface.js';
import {createArchitecturalWashInput} from './architectural-wash-input.js';
import {createRecallInkWash} from './recall-ink-wash.js';
import {createInteractionHitTester} from './interaction-hit.js';
const V=(...a)=>new T.Vector3(...a);
const LETTER_WASH=[[.16,.53],[.43,.47],[.65,.52],[.85,.48]],WIND_WASH=[[.17,.58],[.40,.49],[.64,.45],[.84,.51]],LUNAR_RADIUS=.34;
const boundsVersions=new WeakMap();
function physicalWorldBounds(mesh){
 // A box may only reject rays outside actual geometry. Animated skin keeps
 // its native ray test; doors and leaf instances use their current matrices.
 if(mesh.isSkinnedMesh||!mesh.geometry)return null;
 const source=mesh.isInstancedMesh?mesh:mesh.geometry,version=mesh.isInstancedMesh?mesh.instanceMatrix.version:mesh.geometry.attributes.position?.version||0;
 if(!source.boundingBox||boundsVersions.get(source)!==version){source.computeBoundingBox();boundsVersions.set(source,version);}
 return source.boundingBox?.clone().applyMatrix4(mesh.matrixWorld)||null;
}
function lunarTexture(){const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.fillStyle='#e2e2d1';x.fillRect(0,0,256,128);for(let i=0;i<38;i++){const px=(i*71+23)%256,py=18+(i*47)%94,r=3+(i*13)%17,g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(83,96,94,.21)');g.addColorStop(.65,'rgba(115,121,111,.12)');g.addColorStop(1,'rgba(115,121,111,0)');x.fillStyle=g;x.fillRect(px-r,py-r,r*2,r*2);}const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;}

/** The same physical rays used to render a view must pass through each real
 * opening. Distance from an authored foot point is never the alignment test. */
export function evaluateBorrowedView({camera,target,radius=.04,apertures=[],blockers=[]}){
 if(!camera||!target||!apertures.length)return{aligned:false,visibility:0,error:99,projection:null,crossings:[],blocked:0};
 camera.updateMatrixWorld(true);target.updateWorldMatrix(true,false);const broadBounds=blockers.map(blocker=>{blocker.updateWorldMatrix(true,false);return physicalWorldBounds(blocker);});const centre=target.getWorldPosition(V()),eye=camera.getWorldPosition(V()),right=V(1,0,0).applyQuaternion(camera.quaternion),up=V(0,1,0).applyQuaternion(camera.quaternion),ray=new T.Raycaster(),crossings=[];let visible=0,error=0,blocked=0;
 const sourceRadius=radius*target.matrixWorld.getMaxScaleOnAxis();
 for(let i=0;i<9;i++){
  const point=centre.clone();if(i){const a=(i-1)*Math.PI/4;point.addScaledVector(right,Math.cos(a)*sourceRadius*.75).addScaledVector(up,Math.sin(a)*sourceRadius*.75);}
  const direction=point.clone().sub(eye),distance=direction.length();direction.normalize();const sight=new T.Ray(eye,direction);let clear=true;
  for(const aperture of apertures){aperture.frame.updateWorldMatrix(true,true);const normal=V(0,0,1).transformDirection(aperture.frame.matrixWorld),plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,aperture.frame.getWorldPosition(V())),cross=sight.intersectPlane(plane,V());if(!cross||cross.distanceTo(eye)>=distance){clear=false;error=Math.max(error,4);continue;}const local=aperture.frame.worldToLocal(cross.clone()),ex=Math.abs(local.x)/(aperture.halfWidth||.1),ey=Math.abs(local.y)/(aperture.halfHeight||.1);error=Math.max(error,ex,ey);if(i===0)crossings.push(local.toArray());if(ex>1||ey>1)clear=false;}
  ray.set(eye,direction);ray.near=.02;ray.far=distance-.05;if(clear){const candidates=blockers.filter((mesh,j)=>!broadBounds[j]||sight.intersectsBox(broadBounds[j]));if(ray.intersectObjects(candidates,false).length){clear=false;blocked++;}}if(clear)visible++;
 }
 const projected=centre.clone().project(camera),inFrame=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.94,visibility=visible/9;
 return {aligned:inFrame&&visibility>=8/9&&error<.95,visibility,error,inFrame,projection:projected.toArray(),crossings,blocked,targetWorld:centre.toArray(),eye:eye.toArray()};
}

/** Adds one view-dependent cause to existing chapter actions. Existing task IDs,
 * story and working shutters/bridge remain the consequences of released ink. */
export function decorateBorrowedView(stage,index){
 if(![2,4].includes(index))return stage;if(stage.borrowedView)return stage;if(index===4&&stage.writing)throw new TypeError('沙湖借景直接装饰 buildScene(4)，不重复叠加写字体验。');
 const prison=index===2,oldUpdate=stage.update?.bind(stage),oldReset=stage.reset?.bind(stage),oldInteract=stage.interact?.bind(stage),oldPick=stage.pickPointerTarget?.bind(stage),oldDown=stage.pointerDown?.bind(stage),oldMove=stage.pointerMove?.bind(stage),oldUp=stage.pointerUp?.bind(stage),oldCancel=stage.pointerCancel?.bind(stage),oldRect=stage.getGestureRect?.bind(stage),oldView=stage.updateGestureView?.bind(stage),oldHint=stage.getBrushHint?.bind(stage),oldReveal=stage.revealBrushHint?.bind(stage),oldTake=stage.takeEnvironmentCompleted?.bind(stage);
 const root=new T.Group();root.name=prison?'狱窗借月 · 纸上寄书':'烟雨廊 · 竹影借风';stage.root.add(root);
 const wood=new T.MeshStandardMaterial({color:prison?0x646d62:0x69796b,roughness:.85}),edge=new T.MeshStandardMaterial({color:prison?0x9caaa0:0x9daa91,roughness:.81}),blockers=[],apertures=[],actions=new Set(),settled=new Set(),queue=[],events=[];
 let cameraRef=null,playerRef=null,activeId=null,time=0,holdSeconds=0,lastPose=null,view=null,entry=null,lastHint='',lockedView=false;
 const make=(g,m,p,parent=root)=>{const o=new T.Mesh(g,m);o.position.copy(p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,p,m=wood,parent=root)=>make(new T.BoxGeometry(w,h,d),m,p,parent);
 function aperture(position,width,height,parent=root,rotation=0){
  const frame=new T.Group();frame.position.fromArray(position);frame.rotation.y=rotation;parent.add(frame);const halfWidth=width/2,halfHeight=height/2;
  for(const side of[-1,1])blockers.push(box(.048,height+.13,.10,V(side*(halfWidth+.025),0,0),wood,frame));for(const side of[-1,1])blockers.push(box(width+.10,.046,.10,V(0,side*(halfHeight+.024),0),wood,frame));
  apertures.push({frame,halfWidth,halfHeight});return frame;
 }
 let target,surface,dot,ink,contactMesh,paper=null,paperTexture=null,paperWrites=[],windowLatch=null,light=null,ribbons=[],windowHinges=[];
 if(prison){
  // The old blue rectangle is replaced by a real distant moon beyond the wall.
  for(const o of [...stage.architecture.group.children])if(o.isMesh&&o.geometry?.type==='PlaneGeometry'&&Math.abs(o.position.z+3.66)<.01)o.removeFromParent();
  // The moon is seen through a cell in the full prison grille. The cell has
  // no separate wooden frame: its bounds come from the actual iron bars.
  const iron=stage.architecture.group.children.filter(o=>o.isMesh&&o.geometry?.type==='CylinderGeometry'&&Math.abs(o.geometry.parameters.radiusTop-.02)<.001&&Math.abs(o.position.z+2.5)<.01).sort((a,b)=>a.position.x-b.position.x);
  iron.forEach((rod,i)=>{if(i<8)rod.position.x=-4.12+i*.32;else rod.removeFromParent();});
  const ironMaterial=iron[0]?.material||new T.MeshStandardMaterial({color:0x242b28,roughness:.88,metalness:.40});
  for(const y of[2.84,3.32]){const bar=box(2.44,.044,.06,V(-3,y,-2.5),ironMaterial,stage.architecture.group);bar.name='狱窗贯通横铁';blockers.push(bar);}
  const lunarCell=new T.Group();lunarCell.name='铁窗右侧一格的真实开口';lunarCell.position.set(-2.68,3.601,-2.5);root.add(lunarCell);apertures.push({frame:lunarCell,halfWidth:.14,halfHeight:.259});
  target=make(new T.SphereGeometry(LUNAR_RADIUS,32,24),new T.MeshBasicMaterial({color:0xe5e2cf,map:lunarTexture(),fog:false}),V(-33.408,8.0,-25.96));target.name='从十字铁窗一格看见的月';target.castShadow=target.receiveShadow=false;
  const highWindow=stage.architecture.group.children.find(o=>o.isGroup&&Math.abs(o.position.x+3)<.01&&Math.abs(o.position.y-2.25)<.01);windowHinges=highWindow?.children.filter(o=>o.isGroup&&Math.abs(Math.abs(o.position.x)-1.2)<.01)||[];
  windowLatch=box(.32,.065,.095,V(-3.68,2.93,-2.205),edge);windowLatch.name='高窗上真实可点的木闩';dot=createPressureInkDot({id:'window',parent:root,position:[-3.68,2.93,-2.135],width:.70,height:.70,minimumHoldSeconds:0,inkColor:0xb7c5b5,label:'落墨开高窗',hint:'在高窗的木闩上落一点墨，松手迎月。',seed:1079});
  contactMesh=make(new T.PlaneGeometry(2.38,1.68),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}),V(-3,3.08,-2.14));contactMesh.castShadow=false;
  // Use the actual paper already resting on the actual prison desk.
  stage.root.traverse(o=>{if(o.isMesh&&o.geometry?.type==='BoxGeometry'&&Math.abs(o.position.x-1)<.01&&Math.abs(o.position.y-.96)<.01&&Math.abs(o.position.z)<.01)paper=o;});
  if(paper){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const cx=canvas.getContext('2d');cx.fillStyle='#b4b3a3';cx.fillRect(0,0,1024,512);cx.fillStyle='#35423b';cx.font='56px Poem,serif';cx.textAlign='center';cx.fillText('狱中寄子由',512,100);cx.font='64px Poem,serif';for(const [i,text]of['梦绕云山心似鹿','魂飞汤火命如鸡'].entries()){cx.fillText(text,512,226+i*98);paperWrites.push(text);}paperTexture=new T.CanvasTexture(canvas);paperTexture.colorSpace=T.SRGBColorSpace;const m=paper.material.clone();m.map=paperTexture;m.emissiveMap=paperTexture;m.emissive=new T.Color(0xaabbd0);m.emissiveIntensity=0;paper.material=m;}
  surface=createBrushSurface({id:'letter',parent:root,position:[1,.978,0],rotation:[-Math.PI/2,0,0],width:1.17,height:.50,template:LETTER_WASH,inputState:createArchitecturalWashInput(LETTER_WASH,{width:1.17,height:.50,minTravel:.30,minSpan:.27}),ink:'#24382f',guide:'#93a8a1',mode:'brush-letter',label:'借月寄书',hint:'挪一挪脚点，让狱窗中的月落在纸上月痕旁；再在信纸上轻扫一笔，松手寄出。',hitTolerancePixels:14});
  ink=createRecallInkWash(surface,{template:surface.state.strokes[0],width:1.17,height:.50,plankSpacing:.14});ink.pool.removeFromParent();
  light=new T.SpotLight(0xc8d5e6,0,12,.22,.72,1.3);light.position.set(-2.68,3.564,-2.43);light.target.position.set(1,.98,0);light.castShadow=true;light.shadow.mapSize.set(512,512);root.add(light,light.target);
  stage.targets=stage.targets.map(t=>t.id==='window'?{...t,kind:'spatial-gesture',radius:2.4,label:'高窗木闩',hint:'窗外还有月。走近高窗，在窗闩上落一点墨，再松手开窗。',verse:''}:t.id==='letter'?{...t,kind:'spatial-gesture',radius:1.8,requires:['window'],position:[.20,0,.8],label:'狱窗借月寄书',hint:surface.getRect(new T.PerspectiveCamera()).hint,verse:''}:t);
 }else{
  const component=stage.architecture.gestureComponents.wind,attachment=component.leaves[1],attachRoot=new T.Group();attachRoot.name='格屏的两重竹形透风镂空';root.add(attachRoot);
  // Two lattice courses above the original bay give a natural over-shoulder
  // line of sight. The full brush face clears the real 1.95m hat silhouette.
  const a=aperture([-1.14,2.3554,.9985],.20,.20,attachRoot,Math.PI/2),b=aperture([-.735,2.3421,.9233],.18,.20,attachRoot,Math.PI/2);
  // Two small bamboo-shaped fretwork bays travel with the existing folding leaf.
  for(const frame of[a,b]){for(const side of[-1,1]){const stalk=box(.013,.30,.03,V(side*.105,0,.013),edge,frame);stalk.rotation.z=side*.16;for(const y of[-.085,.06]){const leaf=make(new T.SphereGeometry(.023,8,6),edge,V(side*.115,y,.018),frame);leaf.scale.set(1,.36,.28);leaf.rotation.z=side*.35;}}}
  stage.root.updateWorldMatrix(true,true);attachment.attach(attachRoot);
  target=make(new T.TorusGeometry(.11,.014,6,32),edge,V(.55,2.30,.686));target.rotation.y=Math.PI/2;target.name='镂空格屏后可以借景看见的真实风口';
  light=new T.PointLight(0xd8dcb7,0,1.35,1.5);light.position.set(-.68,2.32,.923);root.add(light);
  for(let i=0;i<3;i++){const curve=new T.CatmullRomCurve3([V(0,0,0),V(.07,-.05,.02),V(.11,-.11,-.01)]),strand=make(new T.TubeGeometry(curve,14,.008,5,false),edge,V(.59,2.38-i*.035,.72+i*.028));ribbons.push(strand);}
  stage.targets=stage.targets.map(t=>t.id==='wind'?{...t,hint:'格屏里两层竹形开口还没有看齐。沿廊挪步，让外侧风口从两层镂空同时透出来，再在竹叶上扫笔借风。',kind:'spatial-gesture',radius:1.65,position:[-1.65,0,1],explicitHint:'沿格屏前挪步看齐两重竹形镂空。风口透出来后，在竹叶淡墨上短扫一笔，再松手借风。'}:t);
  surface=createBrushSurface({id:'wind',parent:root,position:[-1.185,2.3554,.9985],rotation:[0,Math.PI/2,0],width:.56,height:.38,template:WIND_WASH,inputState:createArchitecturalWashInput(WIND_WASH,{width:.56,height:.38,minTravel:.17,minSpan:.145}),ink:'#25352c',guide:'#9aaa8e',mode:'brush-wind-vent',label:'竹影借风',hint:'先看齐两重镂空，再在竹叶上的淡墨短扫一笔，松手借风。',hitTolerancePixels:14});ink=createRecallInkWash(surface,{template:surface.state.strokes[0],width:.56,height:.38,plankSpacing:.12});ink.pool.removeFromParent();
 }
 for(const task of stage.targets){const t=stage.architecture.targets.find(t=>t.id===task.id);if(t)Object.assign(t,task);}
 const sceneBlockers=[];
 function collectSceneBlockers(){
  // Later decorators add wall thickness, joinery, trees and external walls.
  // Test their actual visible meshes too: a clear added frame cannot excuse
  // a solid original wall behind it. Zero-alpha input faces and non-depth
  // atmospheric layers do not obscure the rendered moon or the wind opening.
  sceneBlockers.length=0;const scene=stage.scene||stage.root;scene.updateMatrixWorld(true);
  scene.traverseVisible(o=>{if(!o.isMesh||o===target)return;const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.every(m=>!m||m.opacity===0||m.transparent&&!m.depthWrite))return;sceneBlockers.push(o);});return sceneBlockers;
 }
 const guardedId=prison?'letter':'wind',windowPick=prison?createInteractionHitTester([{id:'window',objects:[dot.mesh,contactMesh,windowLatch],pixelTolerance:24},{id:'letter',objects:[surface.mesh],pixelTolerance:14}]):createInteractionHitTester([{id:'wind',objects:[surface.mesh],pixelTolerance:14}]);
 const taskOf=id=>stage.targets.find(t=>t.id===id),near=id=>{const task=taskOf(id);return !!playerRef&&!!task&&Math.hypot(playerRef.x-task.position[0],playerRef.z-task.position[2])<(task.radius||1.65);},observing=()=>prison?actions.has('window')&&!actions.has('letter')&&near('letter'):!actions.has('wind')&&near('wind');
 const canDraw=()=>observing()&&!!view?.aligned&&holdSeconds>=.18;
 function hint(id=guardedId){if(id==='window')return taskOf('window').hint;if(actions.has(guardedId))return prison?'信已寄出，铁栅门正在让开。':'两重镂空已看齐，风从格屏中穿过。';if(!observing())return prison?'先点高窗迎月，再走到窗光下的书案旁。':'走近折廊格屏，从竹形镂空里看外侧风口。';if(canDraw())return prison?'月已穿过铁窗的一格照到信纸。在纸上顺着淡墨轻扫一笔，再松手寄书。':'两层竹形开口已看齐，风口透出来了。在竹叶的淡墨上短扫一笔，松手借风，让格屏和跨渠桥展开。';if(view?.blocked)return prison?'月被铁栅截住了。沿书案旁挪一挪脚点，看清铁窗一格里的月。':'格屏的木骨挡住了风口。沿廊挪一挪，让两重开口同时透过风口。';return prison?'铁窗中的月还没落到纸上。沿书案旁左右挪步，把整轮月收进铁窗的一格。':'两重镂空还没重合。沿格屏前挪一挪，看外侧风口从两重竹形开口中显出来。';}
 function refresh(){if(!cameraRef||!observing()){view=null;holdSeconds=0;return;}view=evaluateBorrowedView({camera:cameraRef,target,radius:prison?LUNAR_RADIUS:.025,apertures,blockers:collectSceneBlockers()});}
 function getGestureRect(camera,id=activeId||guardedId){let r;if(prison)r=id==='window'?dot.getRect(camera):id==='letter'?surface.getRect(camera):null;else r=id==='wind'?surface.getRect(camera):oldRect?.(camera,id);if(!r)return null;return {...r,id,kind:'spatial-gesture',hint:hint(id),contextHint:hint(id),explicitHint:hint(id),locked:id===guardedId&&!canDraw(),enabled:id!==guardedId?!actions.has(id):canDraw()&&!actions.has(id),available:id!==guardedId?!actions.has(id):canDraw()&&!actions.has(id),completed:actions.has(id),viewGate:id===guardedId,aligned:!!view?.aligned,guideVisible:id===guardedId&&canDraw()&&r.guideVisible,guidePhase:id===guardedId?(canDraw()?'borrowed-view-ready':'align-view'):r.guidePhase};}
 function pickPointerTarget(ndc,camera,viewport){const hit=windowPick(ndc,camera,viewport);if(!hit)return null;const guarded=hit.id===guardedId;if(guarded&&!surface.sample(ndc,camera,14))return{...hit,available:false,hint:hint(hit.id)};return {...hit,available:guarded?canDraw()&&!actions.has(hit.id):!actions.has(hit.id),completed:actions.has(hit.id),hint:hint(hit.id),approachPosition:taskOf(hit.id)?.position};}
 function pointerDown(ndc,camera,player,id){cameraRef=camera;playerRef=player;if(activeId||actions.has(id))return false;if(id===guardedId&&!canDraw()){lastHint=hint(id);return false;}const hit=windowPick(ndc,camera);if(!hit||hit.id!==id||!near(id)||prison&&id==='letter'&&!actions.has('window'))return false;const s=id==='window'?dot:surface;s.setEnabled(true);if(!s.down(id==='window'?dot.getRect(camera).centre:ndc,camera))return false;activeId=id;if(id===guardedId)ink.begin();return true;}
 function pointerMove(ndc,camera){if(!activeId)return false;const value=(activeId==='window'?dot:surface).move(ndc,camera);if(activeId===guardedId)ink.move();return value;}
 function pointerUp(){if(!activeId)return false;const id=activeId;activeId=null;const s=id==='window'?dot:surface;s.up();if(id===guardedId)ink.release();else dot.fadeOut(.50);if(s.ready){settled.add(id);s.setCompleted(true);queue.push(id);lockedView=id===guardedId;}return true;}
 function pointerCancel(){if(!activeId)return false;const id=activeId;activeId=null;(id==='window'?dot:surface).cancel();if(id===guardedId)ink.clear();lastHint='';return true;}
 function updateGestureView(camera,player,id){cameraRef=camera;playerRef=player;oldView?.(camera,player,id);refresh();if(prison){dot.setEnabled(!actions.has('window')&&near('window'));surface.setEnabled(canDraw()&&!actions.has('letter'));surface.root.visible=actions.has('window')&&!actions.has('letter');}else{surface.setEnabled(canDraw()&&!actions.has('wind'));surface.root.visible=near('wind')&&!actions.has('wind');}return observing();}
 function update(now,response=0,dt=0){if(!(dt>0))return;time+=dt;oldUpdate?.(now,response,dt);if(prison)for(const hinge of windowHinges)hinge.rotation.y=Math.sign(hinge.position.x)*(stage.architecture.progress('window')||0)*2.95;dot?.update(dt);surface?.update(dt);ink?.update(dt);refresh();if(observing()){const steady=lastPose&&lastPose.position.distanceTo(cameraRef.position)<.012&&lastPose.rotation.angleTo(cameraRef.quaternion)<.006;holdSeconds=view?.aligned&&steady?Math.min(.30,holdSeconds+dt):0;lastPose={position:cameraRef.position.clone(),rotation:cameraRef.quaternion.clone()};}else{holdSeconds=0;lastPose=null;}
  if(prison){const lit=actions.has('window')?(canDraw()||lockedView?1:.18):0;light.intensity=T.MathUtils.damp(light.intensity,lit*3.8,5,dt);if(paper)paper.material.emissiveIntensity=T.MathUtils.damp(paper.material.emissiveIntensity,lit*.10,5,dt);if(actions.has('letter'))stage.root.traverse(o=>{if(o.isPoints&&o.geometry.attributes.position?.count===220)o.material.opacity=0;});}
  else{light.intensity=T.MathUtils.damp(light.intensity,canDraw()?1.4:actions.has('wind')?.5:.08,6,dt);edge.emissive.set(0xc9d4aa);edge.emissiveIntensity=T.MathUtils.damp(edge.emissiveIntensity||0,canDraw()?.16:.015,6,dt);for(let i=0;i<ribbons.length;i++)ribbons[i].rotation.y=Math.sin(time*2.3+i*.8)*(canDraw()?.22:actions.has('wind')?.3:.02);}
 }
 function interact(id,...args){if(id===guardedId&&!settled.has(id))return false;if(id==='window'&&prison&&!settled.has(id))return false;const success=oldInteract?.(id,...args);if(success!==false)actions.add(id);return success;}
 function enterCamera(camera,player){cameraRef=camera;playerRef=player;entry={position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov,player:player.clone()};updateCamera(camera,.2,player,true);return true;}
 function updateCamera(camera,dt,player=playerRef,snap=false){cameraRef=camera;playerRef=player;if(!(dt>0)||!player||activeId)return false;let position,look,fov;if(observing()){position=prison?player.clone().add(V(3.8,2.6,1.8)):player.clone().add(V(-.85,2.40,.25));look=prison?V(-.90,1.95,-1.12):V(-.735,2.32,.923);fov=prison?43:48;}else if(prison&&!actions.has('window')){position=V(-.55,3.9,6.8);look=V(-2.10,2,-1.0);fov=44;}else if(entry){position=entry.position.clone().add(V((player.x-entry.player.x)*(prison?.5:.82),player.y-entry.player.y,(player.z-entry.player.z)*.25));const q=entry.rotation.clone();const a=snap?1:1-Math.exp(-dt*5);camera.position.lerp(position,a);camera.quaternion.slerp(q,a);camera.fov=T.MathUtils.lerp(camera.fov,entry.fov,a);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return true;}else return false;const goal=new T.PerspectiveCamera(fov,camera.aspect,.1,900);goal.position.copy(position);goal.lookAt(look);const a=snap?1:1-Math.exp(-dt*6);camera.position.lerp(position,a);camera.quaternion.slerp(goal.quaternion,a);camera.fov=T.MathUtils.lerp(camera.fov,fov,a);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return true;}
 function reset(...args){pointerCancel();oldReset?.(...args);actions.clear();settled.clear();queue.length=events.length=0;activeId=null;cameraRef=playerRef=null;entry=null;time=holdSeconds=0;lastPose=view=null;lastHint='';lockedView=false;dot?.reset();surface?.reset();ink?.reset();if(light)light.intensity=0;if(paper)paper.material.emissiveIntensity=0;edge.emissiveIntensity=0;}
 Object.assign(stage,{borrowedView:true,navigationWaypointRadius:.035,targets:stage.targets,update,reset,interact,enterCamera,updateCamera,updateGestureView,getGestureRect,pointerDown,pointerMove,pointerUp,pointerCancel,pickPointerTarget,getBrushHint:id=>[guardedId,'window'].includes(id)?hint(id):oldHint?.(id),revealBrushHint:id=>id===guardedId&&canDraw(),getBrushInteractionRegions:(cam,id)=>{const r=getGestureRect(cam,id);return r?[r]:[];},takeEnvironmentCompleted:()=>queue.shift()||oldTake?.()||null,borrowedViewObjects:{root,apertures,target,blockers,paper,paperTexture,light,surface,dot,ink,windowLatch,ribbons,collectSceneBlockers},borrowedViewFeet:prison?{wrong:[-.42,0,.8],aligned:[.20,0,.8]}:{wrong:[-1.65,0,1.7],aligned:[-1.65,0,1]}});
 Object.defineProperties(stage,{stageOwnCamera:{configurable:true,get:()=>true},borrowedViewStats:{configurable:true,get:()=>({chapter:index+1,guardedId,observing:observing(),aligned:!!view?.aligned,canDraw:canDraw(),holdSeconds,view,activeId,actions:[...actions],settled:[...settled],queued:[...queue],hint:hint(),gate:'actual-aperture-rays-and-whole-scene-physical-mesh-occlusion',blockerScope:'complete visible production scene, including original masonry, iron, leaf cards and later decorators',blockerCount:sceneBlockers.length,authoredFootDistanceNeverUnlocks:true,inkRequired:true,paperWrites:[...paperWrites],washInput:surface.stats,completionRule:'released intentional span/travel, not guide coverage',paperLight:light?.intensity||0,particles:0,simTime:time})}});
 Object.defineProperties(stage,{gestureActive:{configurable:true,get:()=>!!activeId},gestureId:{configurable:true,get:()=>activeId||(prison?!actions.has('window')?'window':'letter':'wind')},gestureProgress:{configurable:true,get:()=>activeId==='window'?dot.amount:surface.progress},glyphForming:{configurable:true,get:()=>false}});
 reset();return stage;
}
