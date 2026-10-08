import * as T from './vendor/three.module.js';
import {loadTextureWithRetry} from './reliable-assets.js';
import {buildChengtianNightScene} from './chengtian-night-scene.js';
import {addChengtianStudyWindowPaper} from './chengtian-study-paper.js';
import {addChengtianStudyCurtain} from './chengtian-study-curtain.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);

/** Keeps the real study, thick gallery walls, apertures and continuous paving.
 * The new west-gallery screen has a hinge, a latch, collision and a shadow;
 * admitting moonlight is an architectural action rather than a floor stroke. */
export function buildChengtianPurposeScene(){
 const stage=buildChengtianNightScene(),objects=stage.nightObjects,root=stage.root;
 const studyWindowPaper=addChengtianStudyWindowPaper(objects.windowShutters);
 Object.assign(stage,{getStudyWindowPaperGuideAnchor:studyWindowPaper.anchor,studyWindowPaperSheets:studyWindowPaper.sheets});
 Object.defineProperty(stage,'studyWindowPaperStats',{get:()=>studyWindowPaper.stats});
 const studyCurtain=addChengtianStudyCurtain(root);
 stage.studyCurtainObjects={root:studyCurtain.root,leaves:studyCurtain.leaves,rod:studyCurtain.rod};
 Object.defineProperty(stage,'studyCurtainStats',{get:()=>studyCurtain.stats});
 // The first study is viewed from inside the room, not through an x-ray
 // facade. Keep its roof, columns and real walls in the opaque depth pass.
 // The inherited night scene may request a cutaway each frame; this wrapper
 // restores only these architectural surfaces, never the thin window paper.
 const originalNightView=stage.updateNightView.bind(stage),studyOpaqueObjects=[...new Set([...stage.gardenStudy.cutawayObjects,...objects.study.children.filter(o=>o.isMesh&&o.geometry?.parameters?.height>2.5)])];
 for(const object of studyOpaqueObjects)object.userData.preserveOpaque=true;
 function keepStudyOpaque(){for(const object of studyOpaqueObjects)for(const material of Array.isArray(object.material)?object.material:[object.material]){const changed=material.transparent||!material.depthWrite;material.opacity=1;material.transparent=false;material.depthWrite=true;if(changed)material.needsUpdate=true;}}
 function updateStudyView(player){originalNightView(player);keepStudyOpaque();}
 Object.assign(stage,{studyOpaqueObjects,updateNightView:updateStudyView,updateGardenView:updateStudyView});
 Object.defineProperty(stage,'studyOpaqueStats',{get:()=>({objects:studyOpaqueObjects.length,minimumOpacity:Math.min(...studyOpaqueObjects.flatMap(o=>(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.opacity))),transparentSurfaces:studyOpaqueObjects.filter(o=>(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.transparent)).length,allDepthWrite:studyOpaqueObjects.every(o=>(Array.isArray(o.material)?o.material:[o.material]).every(m=>m.depthWrite)),protectedFromOcclusion:studyOpaqueObjects.every(o=>o.userData.preserveOpaque),paperExcluded:studyWindowPaper.sheets.every(o=>!studyOpaqueObjects.includes(o)),surfaces:studyOpaqueObjects.map(o=>({name:o.name||o.parent?.name||'书斋结构',opacity:o.material.opacity,transparent:o.material.transparent,depthWrite:o.material.depthWrite}))})});
 keepStudyOpaque();
 // A sideward viewing position keeps the player's own hat beside the window,
 // instead of placing the traveler directly over the image being assembled.
 objects.moonGallery.stats.cameraOffset[0]=-1.55;
 objects.moonGallery.stats.alignedPosition[0]=10.45;
 const originalUpdate=stage.update.bind(stage),originalReset=stage.reset.bind(stage),wood=objects.windowLatch.material.clone(),metal=new T.MeshStandardMaterial({color:0x7d888a,roughness:.68,metalness:.32});
 // The old latch was a separate block hanging in the opening. Preserve its
 // closed placement, but attach it to the actual leaf so it opens with the door.
 const latchLeaf=objects.gateLeaves.find(({side})=>side<0).g;root.updateWorldMatrix(true,true);latchLeaf.attach(objects.doorLatch);
 const effects=new Map(),levels=new Map();let clock=0,knockAge=-1,knockStrength=0;
 // A single authored silhouette is split with complementary alpha masks.
 // These three images stay at different depths inside the existing room;
 // walking changes their real perspective, never their world transforms.
 const silhouetteRoot=new T.Group();silhouetteRoot.name='窗内怀民 · 三重水墨剪影视差';root.add(silhouetteRoot);
 const referenceEye=V(8.9,2.8,11.6),referenceCentre=V(9.831,1.175,1.10),referenceHeight=2.10;
 const shadowLayers=[],shadowDepths=[-.90,.65,2.15],silhouetteUniforms=[];
 const vertexShader='varying vec2 inkUv;void main(){inkUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
 const fragmentShader=`varying vec2 inkUv;uniform sampler2D artwork;uniform float layer;uniform float amount;
 void main(){vec4 ink=texture2D(artwork,inkUv);float upper=smoothstep(.60,.66,inkUv.y),lower=1.-smoothstep(.26,.32,inkUv.y),middle=max(0.,1.-upper-lower);float mask=layer<.5?upper:layer<1.5?middle:lower;float prior=layer<.5?0.:layer<1.5?upper:upper+middle;float density=ink.a*amount;float alpha=density*mask/max(.001,1.-density*prior);gl_FragColor=vec4(ink.rgb,alpha);}`;
 for(let i=0;i<3;i++){const ratio=(referenceEye.z-shadowDepths[i])/(referenceEye.z-referenceCentre.z),uniforms={artwork:{value:null},layer:{value:i},amount:{value:.86}};
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms,vertexShader,fragmentShader,toneMapped:false,fog:false});
  const mesh=new T.Mesh(new T.PlaneGeometry(1,referenceHeight),material);mesh.position.copy(referenceEye.clone().lerp(referenceCentre,ratio));mesh.scale.set(ratio,ratio,1);mesh.name=['怀民剪影 · 远层头肩','怀民剪影 · 中层袖手','怀民剪影 · 近层衣摆'][i];mesh.raycast=()=>{};mesh.castShadow=false;mesh.renderOrder=3+i*.01;silhouetteRoot.add(mesh);shadowLayers.push(mesh);silhouetteUniforms.push(uniforms);
 }
 const silhouetteStats={asset:'assets/textures/chengtian-huaimin-silhouette-v1.png',loaded:false,referenceEye:referenceEye.toArray(),referenceCentre:referenceCentre.toArray(),worldDepths:[...shadowDepths],layerCount:3,flatInkSilhouette:true,complementaryMasks:true,alignment:0,normalizedError:null,aligned:false,insideWindow:false};
 const silhouetteReady=loadTextureWithRetry(T,new URL('./assets/textures/chengtian-huaimin-silhouette-v1.png',import.meta.url).href).then(map=>{map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.ClampToEdgeWrapping;map.anisotropy=4;const aspect=map.image.width/map.image.height;for(let i=0;i<shadowLayers.length;i++){shadowLayers[i].geometry.dispose();shadowLayers[i].geometry=new T.PlaneGeometry(referenceHeight*aspect,referenceHeight);silhouetteUniforms[i].artwork.value=map;}silhouetteStats.loaded=true;silhouetteStats.width=map.image.width;silhouetteStats.height=map.image.height;});
 const silhouetteCentre=shadowLayers[1].position.clone(),silhouetteRay=new T.Raycaster();
 function measureSilhouette(player,camera){const blank={alignment:0,aligned:false,normalizedError:Infinity,insideWindow:false};if(!player||!camera||!silhouetteStats.loaded)return blank;camera.updateMatrixWorld(true);silhouetteRoot.updateWorldMatrix(true,true);
  const projections=shadowLayers.map(layer=>[[.30,.25],[.70,.25],[.30,.78],[.70,.78],[.50,.50]].map(([u,v])=>V((u-.5)*layer.geometry.parameters.width,(v-.5)*referenceHeight,0).applyMatrix4(layer.matrixWorld).project(camera)));
  let error=0;for(const i of[0,2])for(let j=0;j<projections[i].length;j++){const a=projections[i][j],b=projections[1][j];error+=(a.x-b.x)**2*camera.aspect**2+(a.y-b.y)**2;}
  const low=V(0,-referenceHeight/2,0).applyMatrix4(shadowLayers[1].matrixWorld).project(camera),high=V(0,referenceHeight/2,0).applyMatrix4(shadowLayers[1].matrixWorld).project(camera),height=Math.hypot((low.x-high.x)*camera.aspect,low.y-high.y),normalizedError=Math.sqrt(error/10)/Math.max(.001,height);
  const front=objects.moonGallery.frames[0].getWorldPosition(V()),centre=silhouetteCentre.clone().project(camera),direction=silhouetteCentre.clone().sub(camera.position).normalize(),crossing=new T.Ray(camera.position,direction).intersectPlane(new T.Plane(V(0,0,1),-front.z),V()),insideWindow=!!crossing&&Math.hypot(crossing.x-front.x,crossing.y-front.y)<objects.moonGallery.frames[0].userData.spec.radius*.93;
  silhouetteRay.set(camera.position,direction);silhouetteRay.near=.1;silhouetteRay.far=Math.max(.1,camera.position.distanceTo(silhouetteCentre)-.08);const blocked=silhouetteRay.intersectObjects(objects.moonGallery.walls,false).length>0,zone=player.x>7&&player.x<11.8&&player.z>6.25&&player.z<9.6,visible=centre.z>-1&&centre.z<1&&Math.abs(centre.x)<.93&&Math.abs(centre.y)<.93;
  const alignment=zone&&insideWindow&&visible&&!blocked?Math.exp(-((normalizedError/.19)**2)):0,result={alignment,aligned:alignment>.90,normalizedError,insideWindow,blocked,zone};Object.assign(silhouetteStats,result);return result;
 }
 const companionMaterials=[];
 function setupCompanionInk(){objects.companion?.body.traverse(mesh=>{if(!mesh.isMesh)return;const original=Array.isArray(mesh.material)?mesh.material:[mesh.material];const materials=original.map(m=>{const copy=m.clone();copy.transparent=true;copy.depthWrite=true;companionMaterials.push(copy);return copy;});mesh.material=Array.isArray(mesh.material)?materials:materials[0];});}
 const screen=new T.Group();screen.name='西廊月格 · 真实铰接的借月格扇';screen.position.set(-4.62,.17,4.05);root.add(screen);
 const leaf=new T.Group();leaf.name='贴着原廊柱的竹柏借影格扇';screen.add(leaf);
 function box(w,h,d,x,y,z,material=wood){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;leaf.add(mesh);return mesh;}
 const height=2.47,width=2.50;
 for(const z of[0,width])box(.10,height,.10,0,height/2,z);
 for(const y of[.07,.47,height-.07])box(.10,.10,width+.12,0,y,width/2);
 for(let z=.23;z<width;z+=.24)box(.036,height-.55,.027,0,(height+.55)/2,z);
 for(let y=.68;y<height-.14;y+=.29)box(.027,.027,width-.10,0,y,width/2);
 box(.10,.32,width+.08,0,.24,width/2);
 const hinge=new T.Mesh(new T.CylinderGeometry(.054,.054,2.65,12),metal);hinge.position.set(0,height/2,0);hinge.castShadow=true;screen.add(hinge);
 const latch=box(.14,.16,.32,.09,1.24,width-.30);latch.name='借月格扇木闩 · 实体落笔处';
 const screenCollider={id:screen.name,minX:-4.75,maxX:-4.5,minZ:4.0,maxZ:6.75,object:leaf};stage.nightNavigation.collisionBoxes.push(screenCollider);
 const screenBox=new T.Box3(),gateColliders=objects.gateLeaves.map(({g})=>({id:g.name,minX:0,maxX:0,minZ:0,maxZ:0,object:g,solid:g.children.find(o=>o.isMesh&&o.geometry?.parameters.width===.85&&o.geometry?.parameters.height===2.85)}));stage.nightNavigation.collisionBoxes.push(...gateColliders);
 function collider(){screen.updateWorldMatrix(true,true);screenBox.setFromObject(leaf);Object.assign(screenCollider,{minX:screenBox.min.x-.025,maxX:screenBox.max.x+.025,minZ:screenBox.min.z-.025,maxZ:screenBox.max.z+.025});for(const b of gateColliders){b.object.updateWorldMatrix(true,true);screenBox.setFromObject(b.solid||b.object);Object.assign(b,{minX:screenBox.min.x-.02,maxX:screenBox.max.x+.02,minZ:screenBox.min.z-.02,maxZ:screenBox.max.z+.02});}}
 // This chapter's actual traveler wears a broad hat. Route the whole head
 // envelope around real wall corners, rather than only the .20 m foot disk.
 const oldWalkable=stage.walkable.bind(stage),navigation=stage.nightNavigation,hatRadius=.46;let purposePlayer=null;
 function setPurposePlayer(p){purposePlayer=p?.isVector3?p.clone():null;}
 function walkable(p,clearance=0,companion=false){const extra=Math.max(0,Number(clearance)||0),radius=hatRadius+extra;if(!oldWalkable(p,radius-navigation.bodyRadius))return false;if(navigation.collisionBoxes.some(b=>{const x=T.MathUtils.clamp(p.x,b.minX,b.maxX),z=T.MathUtils.clamp(p.z,b.minZ,b.maxZ);return Math.hypot(p.x-x,p.z-z)<radius-1e-6;}))return false;const other=companion?purposePlayer:objects.companion?.root.position;return !other||Math.hypot(p.x-other.x,p.z-other.z)>=.98+extra;}
 function canMove(from,to,clearance=0,companion=false){if(!from?.isVector3||!to?.isVector3)return false;const count=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.045));let y=stage.heightAt(from.x,from.z);for(let i=1;i<=count;i++){const p=from.clone().lerp(to,i/count);if(!walkable(p,clearance,companion))return false;const nextY=stage.heightAt(p.x,p.z);if(Math.abs(nextY-y)>.215)return false;y=nextY;}return true;}
 function routeTo(goal,from,companion=false){const target=goal.clone();target.y=stage.heightAt(target.x,target.z);if(!walkable(target,0,companion)||!walkable(from,0,companion))return [];if(canMove(from,target,0,companion))return [target];const step=.15,key=(x,z)=>x+','+z,start={x:Math.round(from.x/step),z:Math.round(from.z/step),g:0,parent:null},open=[start],best=new Map(),closed=new Set();start.f=from.distanceTo(target)/step;let found=null,tries=0;
  while(open.length&&tries++<12000){open.sort((a,b)=>a.f-b.f);const n=open.shift(),k=key(n.x,n.z);if(closed.has(k))continue;closed.add(k);const p=n.parent?V(n.x*step,stage.heightAt(n.x*step,n.z*step),n.z*step):from.clone();if(p.distanceTo(target)<step*1.05&&canMove(p,target,0,companion)){found=n;break;}for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,q=V(x*step,stage.heightAt(x*step,z*step),z*step),b=stage.bounds;if(q.x<b.minX||q.x>b.maxX||q.z<b.minZ||q.z>b.maxZ||!canMove(p,q,.015,companion))continue;const k2=key(x,z),g=n.g+Math.hypot(dx,dz);if(closed.has(k2)||g>=(best.get(k2)??Infinity))continue;best.set(k2,g);open.push({x,z,g,f:g+q.distanceTo(target)/step,parent:n});}}
  if(!found)return [];const points=[];for(let n=found;n?.parent;n=n.parent)points.unshift(V(n.x*step,stage.heightAt(n.x*step,n.z*step),n.z*step));points.push(target);const result=[];let p=from,index=0;while(index<points.length){let next=index;for(let i=index+1;i<points.length;i++){if(!canMove(p,points[i],i===points.length-1?0:.015,companion))break;next=i;}result.push(points[next]);p=points[next];index=next+1;}return result;
 }
 let companionRoute=[],companionDestination=null,companionMoving=false,companionRouteAge=0;
 function setCompanionDestination(p){companionDestination=p?.isVector3?p.clone():Array.isArray(p)?V(...p):null;companionRouteAge=0;companionRoute=objects.companion&&companionDestination?routeTo(companionDestination,objects.companion.root.position,true):[];return companionRoute.length>0;}
 function moveCompanion(dt){const companion=objects.companion;companionMoving=false;if(!companion)return;companionRouteAge+=dt;if(companionDestination&&!companionRoute.length&&companion.root.position.distanceTo(companionDestination)>.08&&companionRouteAge>.45){companionRoute=routeTo(companionDestination,companion.root.position,true);companionRouteAge=0;}if(companionRoute.length&&dt>0){const goal=companionRoute[0],delta=goal.clone().sub(companion.root.position);delta.y=0;if(delta.length()<.035)companionRoute.shift();else{const next=companion.root.position.clone().addScaledVector(delta.clone().normalize(),Math.min(delta.length(),dt*.83));if(canMove(companion.root.position,next,0,true)){companion.root.position.copy(next);companion.root.position.y=stage.heightAt(next.x,next.z);companion.root.rotation.y=Math.atan2(-delta.x,-delta.z);companionMoving=true;}else if(companionRouteAge>.45){companionRoute=[];companionRouteAge=0;}}}companion.animate(clock,companionMoving?1:0,0,1,false);}
 Object.assign(stage,{walkable,canMove,routeTo,setCompanionDestination,setPurposePlayer});Object.assign(navigation,{walkable,canMove,routeTo,hatRadius});
 // Read from the open right end of the real desk; the narrow strip between
 // desk and window wall cannot hold the traveler's hat without clipping.
 stage.studyReaderFoot=[-1.10,.20,-1.95];stage.gardenStudy.readerFoot=[...stage.studyReaderFoot];
 const moonLatchLight=new T.PointLight(0xccddf7,0,3.9,2);moonLatchLight.position.set(.3,1.65,-.83);root.add(moonLatchLight);
 const moonWashLight=new T.PointLight(0xcbdcf6,0,6.2,2);moonWashLight.position.set(-.8,1.3,6.5);moonWashLight.name='笔下月色 · 柔光随轻扫澄清';root.add(moonWashLight);
 function setMoonWashPreview(amount,point){effects.set('ground-wash-preview',T.MathUtils.clamp(Number(amount)||0,0,1));if(point?.isVector3)moonWashLight.position.copy(point).add(V(0,1.3,0));}
 const companionLamp=objects.lanterns[1];
 // The invitation is seen from the open western court, rather than through
 // the friend's solid south gallery facade. Keep the head and the doorway in
 // the same view; the later shared court shot comes closer to timber and leaf.
 stage.cameraZones=stage.cameraZones.map(zone=>zone.id==='seek'?{...zone,position:[1.1,3.5,7.8],lookAt:[6.35,1.4,2.1],fov:49}:zone.id==='court'?{...zone,position:[4.3,4.5,13.8],lookAt:[-1.25,1.2,6.7],fov:48}:zone);
 stage.nightCameraZones=stage.cameraZones;
 // The painterly alpha artwork supports genuine plant/model shadows at low
 // strength. It does not animate across paving or resemble water or fog.
 const applyClarity=()=>{const p=levels.get('borrow-shadow')||0,preview=levels.get('ground-wash-preview')||0;objects.moonShadows.mesh.material.opacity=.07+p*.30+preview*.07;objects.moonShadows.mesh.position.set(1.4,.012,6.15);objects.moonShadows.mesh.rotation.y=-.12;objects.courtBounce.intensity=.30+p*.55+preview*.16;moonWashLight.intensity=preview*.42;};
 function apply(){keepStudyOpaque();leaf.rotation.y=-1.0;
  // The leaves fold into the room, away from the player's knocking position.
  // The previous outward sweep enclosed the player's feet in a moving AABB,
  // making both keyboard movement and new click routes reject their origin.
  const door=stage.nightProgress('friend-door');for(const {g,side,closedAngle}of objects.gateLeaves)g.rotation.y=closedAngle-side*door*1.48;
  if(knockAge>=0&&knockAge<.38&&door<.01)for(const {g,closedAngle}of objects.gateLeaves)g.rotation.y=closedAngle+Math.sin(knockAge*36)*Math.exp(-knockAge*9)*.012*knockStrength;
  collider();moonLatchLight.intensity=(levels.get('threshold-light')||0)*.48;
  const reveal=levels.get('friend-seen')||0,clarity=silhouetteStats.alignment;companionLamp.light.intensity=.43+clarity*.18+reveal*.52;
  for(const uniforms of silhouetteUniforms)uniforms.amount.value=(.70+clarity*.22)*(1-T.MathUtils.smoothstep(reveal,.08,.76));
  if(objects.companion){const opacity=T.MathUtils.smoothstep(reveal,.36,1);objects.companion.root.visible=opacity>.005;for(const material of companionMaterials)material.opacity=opacity;}
  for(const mist of objects.mist||[])mist.visible=false;objects.pathMoon.visible=false;applyClarity();stage.scene.updateMatrixWorld(true);
 }
 function setPurposeEffect(id,value){effects.set(id,T.MathUtils.clamp(Number(value)||0,0,1));}
 function purposeProgress(id){return levels.get(id)||0;}
 function knockDoor(weight=1){knockAge=0;knockStrength=T.MathUtils.clamp(weight,.3,1.4);return true;}
 function reset(){originalReset();studyCurtain.reset();clock=0;knockAge=-1;knockStrength=0;purposePlayer=null;companionRoute=[];companionDestination=null;companionMoving=false;companionRouteAge=0;effects.clear();levels.clear();Object.assign(silhouetteStats,{alignment:0,normalizedError:null,aligned:false,insideWindow:false});apply();}
 function update(t,response,frameDt){const dt=Number.isFinite(frameDt)?T.MathUtils.clamp(frameDt,0,.06):0;originalUpdate(t,response,dt);studyCurtain.update(dt,purposePlayer);if(dt>0){clock+=dt;for(const id of['borrow-shadow','threshold-light','friend-seen','ground-wash-preview']){const value=T.MathUtils.damp(levels.get(id)||0,effects.get(id)||0,id==='friend-seen'?1.7:id==='ground-wash-preview'?6.5:2.7,dt);levels.set(id,Math.abs(value-(effects.get(id)||0))<.001?effects.get(id)||0:value);}if(knockAge>=0)knockAge+=dt;apply();moveCompanion(dt);}apply();}
 Object.assign(stage,{purposeNight:true,update,reset,setPurposeEffect,purposeProgress,setMoonWashPreview,knockDoor,measureHuaiminSilhouette:measureSilhouette,huaiminSilhouetteStats:silhouetteStats,purposeObjects:{screen,leaf,latch,screenCollider,moonLatchLight,moonWashLight,companionLamp,silhouetteRoot,shadowLayers},exit:null});
 stage.nightSceneMetadata={...stage.nightSceneMetadata,spatialHaze:false,groundFog:false,groundGlowOverlay:false,purposefulArchitecture:true,screenHinge:true,screenIsCheckpoint:false,moonWashUsesActualLight:true,shadowSource:'real bamboo/cypress geometry plus restrained nonrepeating alpha artwork'};
 Object.defineProperty(stage,'purposeSceneStats',{get:()=>({clock,effects:Object.fromEntries(effects),levels:Object.fromEntries(levels),screenAngle:leaf.rotation.y,screenCollision:{minX:screenCollider.minX,maxX:screenCollider.maxX,minZ:screenCollider.minZ,maxZ:screenCollider.maxZ},gateCollisions:gateColliders.map(({id,minX,maxX,minZ,maxZ})=>({id,minX,maxX,minZ,maxZ})),doorLatchOnLeaf:objects.doorLatch.parent===latchLeaf,doorLatchPosition:objects.doorLatch.getWorldPosition(V()).toArray(),doorOpensIntoRoom:true,knockAge,hatClearance:hatRadius,actorSeparation:.98,companionMoving,companionDestination:companionDestination?.toArray()||null,silhouette:{...silhouetteStats},groundFog:false,floatingWindows:0,continuousPaving:true,windowCentres:objects.moonGallery.stats.windowCentres,windowAngles:objects.moonGallery.stats.angles})});
 const ready=stage.ready;stage.ready=Promise.all([ready,silhouetteReady]).then(()=>{setupCompanionInk();reset();return stage;});reset();return stage;
}
