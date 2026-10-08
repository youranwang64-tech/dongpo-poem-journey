import * as T from './vendor/three.module.js';
import {buildLycheeVignette} from './poetry-scenes.js';
import {createLycheeSideFog} from './lychee-challenge.js';
import {createLycheeFinaleField} from './lychee-finale-field.js';
import {LYCHEE_FINALE,lycheePaintPose,lycheeOverviewPose,measureLycheeOcean} from './lychee-finale-camera.js';
import {createLycheeFinaleBurst} from './lychee-finale-burst.js';
import {lycheeActorTurn} from './lychee-finale-turn.js';
import {createLycheeRain} from './lychee-rain.js';
export {createLycheeRain} from './lychee-rain.js';

const clamp=T.MathUtils.clamp;
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const START_Z=14,END_Z=-14,FLOOR_Y=-5,PAINT_Z=-13.6,MOVE_SPEED=2.05,HERO_SCALE=.55,HERO_Z=-17.4,HERO_X=-1.35,HERO_HEIGHT=2.6;
const {redSeconds:RED_CONFIRM,pullbackSeconds:PULLBACK_SECONDS,boomAt:BOOM_AT}=LYCHEE_FINALE;

function normalFromUV(u,v){
 const theta=(1-clamp(v,0,1))*Math.PI,phi=u*Math.PI*2,s=Math.sin(theta);
 return [-Math.cos(phi)*s,Math.cos(theta),Math.sin(phi)*s];
}
function uvFromNormal(n){
 let phi=Math.atan2(n[2],-n[0]);if(phi<0)phi+=Math.PI*2;
 return {x:phi/(Math.PI*2),y:1-Math.acos(clamp(n[1],-1,1))/Math.PI};
}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function unit(n){const d=Math.hypot(...n)||1;return n.map(x=>x/d);}

// The same coverage grid drives both the texture and completion. It measures the
// visible hemisphere, so the player never needs to paint the hidden back.
export function createLycheePaintCoverage(width=128,height=64){
 const values=new Float32Array(width*height),normals=new Float32Array(width*height*3),weights=new Float32Array(width*height);
 let weightSum=0,last=null,lastAt=0,movingTime=0,pathLength=0,moveSamples=0,strokeLength=0,longestStroke=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)normals.set(normalFromUV((x+.5)/width,1-(y+.5)/height),(y*width+x)*3);
 function setView(direction){
  const n=unit(Array.isArray(direction)?direction:[direction.x,direction.y,direction.z]);weightSum=0;
  for(let i=0;i<values.length;i++){
   const j=i*3,facing=normals[j]*n[0]+normals[j+1]*n[1]+normals[j+2]*n[2];
   weights[i]=facing>.14?Math.pow(facing,.72)*Math.sqrt(Math.max(0,1-normals[j+1]*normals[j+1])):0;weightSum+=weights[i];
  }
 }
 function stamp(n,radius,opacity=.92){
  const edge=Math.cos(radius),range=1-edge;
  for(let i=0;i<values.length;i++){
   const j=i*3,d=normals[j]*n[0]+normals[j+1]*n[1]+normals[j+2]*n[2];
   if(d<=edge)continue;const q=clamp((d-edge)/range,0,1),soft=q*q*(3-2*q);
   values[i]=1-(1-values[i])*(1-soft*opacity);
  }
 }
 function beginStroke(uv,at=0){last=normalFromUV(uv.x,uv.y);lastAt=at;strokeLength=0;stamp(last,.10,.46);}
 function moveStroke(uv,at=0){
  const n=normalFromUV(uv.x,uv.y);if(!last){beginStroke(uv,at);return true;}
  const angle=Math.acos(clamp(dot(n,last),-1,1));if(angle<.003)return false;
  const elapsed=clamp(at-lastAt,0,.10),radius=clamp(.255-angle*.07,.205,.255),steps=Math.min(32,Math.max(1,Math.ceil(angle/(radius*.30))));
  // Long jumps are new contact points, not an invisible stroke through the fruit.
  if(angle>.80){stamp(n,radius);longestStroke=Math.max(longestStroke,strokeLength);strokeLength=0;}
  else{
   for(let s=1;s<=steps;s++){const q=s/steps;stamp(unit(last.map((x,i)=>x+(n[i]-x)*q)),radius);}
   movingTime+=elapsed;pathLength+=angle;strokeLength+=angle;moveSamples++;longestStroke=Math.max(longestStroke,strokeLength);
  }
  last=n;lastAt=at;return true;
 }
 function endStroke(){longestStroke=Math.max(longestStroke,strokeLength);last=null;strokeLength=0;}
 function reset(){values.fill(0);last=null;lastAt=0;movingTime=pathLength=moveSamples=strokeLength=longestStroke=0;}
 function coverage(){let covered=0;for(let i=0;i<values.length;i++)if(values[i]>.42)covered+=weights[i];return weightSum?covered/weightSum:0;}
 setView([0,.08,1]);
 return {width,height,values,setView,beginStroke,moveStroke,endStroke,reset,
  get coverage(){return coverage();},
  get canFinish(){return coverage()>=.65&&movingTime>=1.5&&pathLength>=2.6&&moveSamples>=20&&longestStroke>=.9;},
  get motionSeconds(){return movingTime;},get pathLength(){return pathLength;},get moveSamples(){return moveSamples;},get longestStroke(){return longestStroke;},
  get lastNormal(){return last?.slice()||[0,0,1];}};
}

export function buildLycheeJourney(){
 const base=buildLycheeVignette(),scene=base.scene;
 const instances=scene.children.filter(o=>o.isInstancedMesh);
 const shells=instances.find(o=>o.geometry.attributes.position.count>1000);
 const stems=instances.find(o=>o!==shells);
 if(!shells||!stems)throw new Error('荔枝果壳没有展开。');
 shells.count=stems.count=299;shells.frustumCulled=stems.frustumCulled=false;
 shells.castShadow=false;shells.receiveShadow=true;stems.castShadow=false;
 scene.userData.saturation=.94;scene.background.set(0xeeeae2);scene.fog=new T.FogExp2(scene.background,.034);

 const paper=scene.children.find(o=>o.isMesh&&!o.isInstancedMesh&&o.geometry.type==='PlaneGeometry');
 if(paper)paper.visible=false;
 const floorMap=paper?.material.map?.clone();if(floorMap){floorMap.repeat.set(6,12);floorMap.needsUpdate=true;}
 const floor=new T.Mesh(new T.PlaneGeometry(400,400).rotateX(-Math.PI/2),new T.MeshStandardMaterial({map:floorMap,color:0xf3eee3,roughness:1}));
 floor.position.set(0,FLOOR_Y,-26);floor.receiveShadow=true;scene.add(floor);
 const key=scene.children.find(o=>o.isDirectionalLight);if(key){
  key.castShadow=true;key.target.position.set(0,FLOOR_Y,-5);scene.add(key.target);key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-19,right:19,top:18,bottom:-18,near:1,far:75});key.shadow.bias=-.0002;key.shadow.normalBias=.025;key.shadow.radius=3;
 }

 const tracker=createLycheePaintCoverage(),maskCanvas=document.createElement('canvas'),sampleCanvas=document.createElement('canvas');
 maskCanvas.width=512;maskCanvas.height=256;sampleCanvas.width=tracker.width;sampleCanvas.height=tracker.height;
 const maskContext=maskCanvas.getContext('2d'),sampleContext=sampleCanvas.getContext('2d'),maskPixels=sampleContext.createImageData(tracker.width,tracker.height);
 const maskTexture=new T.CanvasTexture(maskCanvas);maskTexture.colorSpace=T.NoColorSpace;maskTexture.minFilter=T.LinearFilter;maskTexture.magFilter=T.LinearFilter;maskTexture.generateMipmaps=false;
 maskTexture.wrapS=T.RepeatWrapping;maskTexture.wrapT=T.ClampToEdgeWrapping;
 const uniforms={lycheePaintMask:{value:maskTexture},lycheeRedBloom:{value:-.5},lycheeBloomOrigin:{value:V(0,0,1)}};
 const material=shells.material.clone();material.color.set(0xfffaf5);material.roughness=.87;material.bumpScale=.074;material.envMapIntensity=.12;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   uniform sampler2D lycheePaintMask;
   uniform float lycheeRedBloom;
   uniform vec3 lycheeBloomOrigin;
   float paintGrain(vec2 uv){return fract(sin(dot(floor(uv*vec2(320.,170.)),vec2(127.1,311.7)))*43758.5453);}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec3 redSkin=diffuseColor.rgb;
   float skinTone=dot(redSkin,vec3(.2126,.7152,.0722));
   vec3 unpaintedSkin=vec3(.80,.78,.72)*(.72+.35*pow(max(skinTone,.001),.35));
   float grain=paintGrain(vMapUv);
   float paint=texture2D(lycheePaintMask,vMapUv).r;
   float theta=(1.-vMapUv.y)*3.14159265,phi=vMapUv.x*6.28318530;
   vec3 surfaceDirection=vec3(-cos(phi)*sin(theta),cos(theta),sin(phi)*sin(theta));
   float distanceFromStroke=acos(clamp(dot(surfaceDirection,lycheeBloomOrigin),-1.,1.))/3.14159265;
   float bloom=smoothstep(distanceFromStroke-.16+(grain-.5)*.07,distanceFromStroke+.11+(grain-.5)*.07,lycheeRedBloom);
   float ink=smoothstep(.10,.76,paint+(grain-.5)*.07);
   ink=max(ink,bloom);
   diffuseColor.rgb=mix(unpaintedSkin,redSkin,ink);`);
 };
 material.customProgramCacheKey=()=> 'lychee-journey-hand-painted-v1';
 shells.geometry.computeBoundingSphere();
 const envelope=shells.geometry.boundingSphere.radius;
 const hero=new T.Mesh(shells.geometry.clone(),material);hero.scale.setScalar(HERO_SCALE);hero.position.set(HERO_X,FLOOR_Y+HERO_HEIGHT,HERO_Z);hero.castShadow=false;hero.receiveShadow=true;hero.name='最后一颗荔枝';scene.add(hero);
 const stem=new T.Mesh(stems.geometry.clone(),stems.material.clone());stem.scale.setScalar(HERO_SCALE);stem.position.copy(hero.position).add(V(.025,1.14*HERO_SCALE,0));stem.rotation.z=-.11;stem.castShadow=false;scene.add(stem);

 const cursor=new T.Group(),wood=new T.MeshStandardMaterial({color:0xc1a878,roughness:.9}),hair=new T.MeshStandardMaterial({color:0x251c19,roughness:1});
 const shaft=new T.Mesh(new T.CylinderGeometry(.022,.028,.61,10),wood);shaft.position.y=.515;cursor.add(shaft);
 const tip=new T.Mesh(new T.ConeGeometry(.062,.21,12),hair);tip.rotation.z=Math.PI;tip.position.y=.105;cursor.add(tip);
 const ferrule=new T.Mesh(new T.CylinderGeometry(.037,.037,.075,10),new T.MeshStandardMaterial({color:0x68584c,roughness:.8}));ferrule.position.y=.235;cursor.add(ferrule);
 cursor.visible=false;cursor.renderOrder=3;scene.add(cursor);
 const raycaster=new T.Raycaster(),matrix=new T.Matrix4(),position=V(),rotation=new T.Quaternion(),scale=V(),capPosition=V();
 const sideFog=createLycheeSideFog(scene,FLOOR_Y),rain=createLycheeRain({envelope,floorY:FLOOR_Y}),fruitData=rain.bodies,colourData=new T.InstancedBufferAttribute(new Float32Array(299*3),3),burst=createLycheeFinaleBurst(scene),finaleField=createLycheeFinaleField(fruitData);
 // Keep the hero's detailed shell while reusing 720 triangles per falling fruit.
 const smallShell=new T.SphereGeometry(1,24,16),shellPositions=smallShell.attributes.position;
 for(let i=0;i<shellPositions.count;i++){
  const p=V().fromBufferAttribute(shellPositions,i),n=p.clone().normalize();
  const ridges=(Math.sin(n.x*37+n.z*11)*Math.sin(n.y*34+n.x*9)+Math.cos(n.z*31-n.y*13)*.35)*.010;
  const natural=Math.sin(n.y*4.1+n.z*3)*.018+Math.sin(n.x*5.2-n.z*2)*.012;p.multiplyScalar(1+ridges+natural);p.y*=1.12;p.x*=1.025;shellPositions.setXYZ(i,p.x,p.y,p.z);
 }
 smallShell.computeVertexNormals();smallShell.computeBoundingSphere();shells.geometry.dispose();shells.geometry=smallShell;
 for(let i=0;i<299;i++)shells.setColorAt(i,new T.Color(0xffffff));
 shells.instanceColor.needsUpdate=true;
 shells.geometry.setAttribute('journeyColour',colourData);
 const fieldMaterial=shells.material.clone();
 fieldMaterial.bumpScale=.075;fieldMaterial.roughness=.90;
 fieldMaterial.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec3 journeyColour; varying vec3 vJourneyColour;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvJourneyColour=journeyColour;');
  shader.fragmentShader='varying vec3 vJourneyColour;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float grain=fract(sin(dot(floor(vMapUv*vec2(310.,160.)),vec2(127.1,311.7)))*43758.5453);
   if(vJourneyColour.y<=.001||vJourneyColour.y<grain*.985)discard;
   diffuseColor.rgb*=vec3(.96,.94,.90);`);
 };
 fieldMaterial.customProgramCacheKey=()=> 'lychee-paper-rain-field-v2';shells.material=fieldMaterial;
 shells.name='从上方掉落的小红荔枝';stems.name='小红荔枝的果梗';
 const dustMaterials=scene.children.filter(o=>o.isPoints&&o.material.uniforms?.time).map(o=>o.material);
 let currentZ=START_Z,furthest=0,painted=false,paintedAt=0,clockTime=0,drawing=false,dirty=true;
 let coloured=0,visibleCount=0,burstStarted=false,viewFaded=0,outroPose=null,cameraReady=false,focusAt=null,focusFrom=null,focusPose=null,focusSettled=false,overviewPose=null,overviewReady=false,overviewAt=null,overviewFramed=0,burstAt=null,lookBackGoal=null,turnYaw=0,growthSettled=false,poemExposed=false,oceanAt=null,oceanProjection=null,oceanProjectionKey='';
 const player=V(0,FLOOR_Y,START_Z),arrivalPlayer=player.clone(),paintCamera=new T.PerspectiveCamera(),cameraPose={position:V(),quaternion:new T.Quaternion(),fov:44};

 function refreshMask(){
  for(let i=0;i<tracker.values.length;i++){const value=Math.round(tracker.values[i]*255),j=i*4;maskPixels.data[j]=maskPixels.data[j+1]=maskPixels.data[j+2]=value;maskPixels.data[j+3]=255;}
  sampleContext.putImageData(maskPixels,0,0);maskContext.imageSmoothingEnabled=true;maskContext.clearRect(0,0,512,256);maskContext.drawImage(sampleCanvas,0,0,512,256);maskTexture.needsUpdate=true;dirty=false;
 }
 function rayHit(ndc,camera){
  if(!result.paintReady||painted)return null;
  camera.updateMatrixWorld();hero.updateWorldMatrix(true,false);raycaster.setFromCamera(ndc,camera);
  const hit=raycaster.intersectObject(hero,false)[0];if(!hit?.uv)return null;
  tracker.setView(camera.getWorldPosition(V()).sub(hero.position));
  const normal=hit.face.normal.clone().transformDirection(hero.matrixWorld),towardsCamera=camera.getWorldPosition(V()).sub(hit.point).normalize();
  cursor.position.copy(hit.point).addScaledVector(normal,.025);cursor.quaternion.setFromUnitVectors(V(0,1,0),V(.45,.88,.15).addScaledVector(towardsCamera,.30).normalize());cursor.visible=true;
  return hit;
 }
 function pointerDown(ndc,camera){
  const hit=rayHit(ndc,camera);if(!hit)return false;
  drawing=true;tracker.beginStroke(hit.uv,performance.now()/1000);uniforms.lycheeBloomOrigin.value.fromArray(normalFromUV(hit.uv.x,hit.uv.y));dirty=true;return true;
 }
 function pointerMove(ndc,camera){
  const hit=rayHit(ndc,camera);if(!hit){cursor.visible=false;if(drawing)tracker.endStroke();return drawing;}
  if(drawing){
   dirty=tracker.moveStroke(hit.uv,performance.now()/1000)||dirty;
   if(tracker.canFinish){
    painted=true;paintedAt=clockTime;outroPose={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};finaleField.prepare({player:arrivalPlayer.toArray(),hero:hero.position.toArray()});finaleField.reveal(0);
    const goal=V();for(const point of finaleField.positions)goal.add(V(...point));goal.divideScalar(299);lookBackGoal=goal.toArray();turnYaw=Math.atan2(-(goal.x-arrivalPlayer.x),-(goal.z-arrivalPlayer.z));
    overviewPose=lycheeOverviewPose({aspect:camera.aspect,fov:LYCHEE_FINALE.paintFov,fruits:fruitData,hero:V(...finaleField.heroTarget),heroRadius:envelope*HERO_SCALE,player:arrivalPlayer});overviewFramed=fruitData.filter(f=>{const p=V(f.x,f.y,f.z).project(camera);return Math.abs(p.x)<.98&&Math.abs(p.y)<.98&&p.z>-1&&p.z<1;}).length;
    renderRain();drawing=false;tracker.endStroke();uniforms.lycheeBloomOrigin.value.fromArray(normalFromUV(hit.uv.x,hit.uv.y));cursor.visible=false;
   }
  }
  return true;
 }
 function pointerUp(){const handled=drawing;drawing=false;tracker.endStroke();return handled;}
 function renderRain(){
  visibleCount=0;
  for(let i=0;i<299;i++){
   const fruit=fruitData[i],visibility=fruit.active?fruit.visibility*fruit.viewVisibility:0,size=fruit.active?fruit.scale:.0001;
   position.set(fruit.x,fruit.y,fruit.z);rotation.fromArray(fruit.quaternion);scale.setScalar(size);
   matrix.compose(position,rotation,scale);shells.setMatrixAt(i,matrix);
   capPosition.set(0,1.14*size,0).applyQuaternion(rotation).add(position);scale.setScalar(size*Math.sqrt(visibility));matrix.compose(capPosition,rotation,scale);stems.setMatrixAt(i,matrix);
   colourData.setXYZ(i,1,visibility,0);if(visibility>.03)visibleCount++;
  }
  shells.instanceMatrix.needsUpdate=true;stems.instanceMatrix.needsUpdate=true;colourData.needsUpdate=true;
 }
 function protectPlayerView(camera,overview=false){
  const corners=[];for(const x of [-.60,.60])for(const y of [-.20,2.22])for(const z of [-.28,.18])corners.push(player.clone().add(V(x,y,z)));
  const points=corners.map(p=>p.clone().project(camera)),right=V(1,0,0).applyQuaternion(camera.quaternion),up=V(0,1,0).applyQuaternion(camera.quaternion),forward=camera.getWorldDirection(V());
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  const actorFarDepth=overview?Math.max(...corners.map(p=>p.clone().sub(camera.position).dot(forward))):0;viewFaded=0;
  for(const fruit of fruitData){
   if(!fruit.active)continue;const centre=V(fruit.x,fruit.y,fruit.z),screen=centre.clone().project(camera),side=centre.clone().addScaledVector(right,fruit.radius).project(camera),rx=Math.abs(side.x-screen.x);
   const ry=overview?Math.abs(centre.clone().addScaledVector(up,fruit.radius).project(camera).y-screen.y):rx;
   const overlap=Math.min(screen.x+rx-minX,maxX-screen.x+rx,screen.y+ry-minY,maxY-screen.y+ry);
   // The tilted overview uses true camera depth, never the walking world-Z test.
   // A sparse ink silhouette keeps every historical fruit present while reading the actor.
   const inFront=overview?centre.clone().sub(camera.position).dot(forward)-fruit.radius<actorFarDepth+.1:fruit.z>player.z-.25;
   // A wide viewport shortens projected X radius. Use that shorter axis for
   // the overview fade so a large fruit cannot retain an opaque cap on the head.
   const fadeWidth=overview?Math.min(rx,ry)*.45+.002:Math.max(rx,ry)*.65+.025;
   const fade=inFront&&screen.z>-1&&screen.z<1?T.MathUtils.smoothstep(overlap,0,fadeWidth)*(overview?.8:1):0;
   fruit.viewVisibility=overview?Math.max(.20,1-fade):1-fade;if(fade>.01)viewFaded++;
  }
  renderRain();
 }
 function updateCamera(camera,dt=1/60){
  // This stage owns the follow pose. It never damps a pose changed by another rig.
  const elapsed=clamp(Number.isFinite(dt)?dt:0,0,.1);
  const settledPose=painted?overviewPose:focusPose;
  if(elapsed===0&&settledPose&&settledPose.aspect!==camera.aspect){camera.updateProjectionMatrix();camera.updateMatrixWorld();return;}
  if(!painted&&focusAt===null&&currentZ<=PAINT_Z&&coloured===299&&elapsed>0){
   focusAt=clockTime;arrivalPlayer.copy(player);focusFrom={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};focusPose=lycheePaintPose({aspect:camera.aspect,hero:hero.position,heroRadius:envelope*HERO_SCALE,player:arrivalPlayer});
  }
  if(painted&&outroPose){
   if(overviewPose.aspect!==camera.aspect)overviewPose=lycheeOverviewPose({aspect:camera.aspect,fov:LYCHEE_FINALE.paintFov,fruits:fruitData,hero:V(...finaleField.heroTarget),heroRadius:envelope*HERO_SCALE,player:arrivalPlayer});
   const age=Math.max(0,clockTime-paintedAt),q=T.MathUtils.smootherstep((age-RED_CONFIRM)/PULLBACK_SECONDS,0,1);
   camera.position.copy(outroPose.position).lerp(overviewPose.position,q);camera.quaternion.copy(outroPose.quaternion).slerp(overviewPose.quaternion,q);camera.fov=T.MathUtils.lerp(outroPose.fov,overviewPose.fov,q);
  }else if(focusAt!==null){
   if(focusPose.aspect!==camera.aspect&&!drawing)focusPose=lycheePaintPose({aspect:camera.aspect,hero:hero.position,heroRadius:envelope*HERO_SCALE,player:arrivalPlayer});
   const q=T.MathUtils.smootherstep((clockTime-focusAt)/LYCHEE_FINALE.pushSeconds,0,1);
   camera.position.copy(focusFrom.position).lerp(focusPose.position,q);camera.quaternion.copy(focusFrom.quaternion).slerp(focusPose.quaternion,q);camera.fov=T.MathUtils.lerp(focusFrom.fov,focusPose.fov,q);
   if(q>=1&&elapsed>0)focusSettled=true;
  }else{
   const approach=T.MathUtils.smootherstep(-currentZ,10.8,13.6);
   paintCamera.position.set(player.x*.40,FLOOR_Y+T.MathUtils.lerp(3.5,3.1,approach),player.z+T.MathUtils.lerp(8,8.8,approach));
   paintCamera.lookAt(V(player.x*.16,FLOOR_Y+T.MathUtils.lerp(2.35,1.5,approach),player.z-T.MathUtils.lerp(5.6,4,approach)));
   const fov=T.MathUtils.lerp(44,46,approach),blend=1-Math.exp(-elapsed*5.5);
   if(!cameraReady){cameraPose.position.copy(paintCamera.position);cameraPose.quaternion.copy(paintCamera.quaternion);cameraPose.fov=fov;cameraReady=true;}
   else{cameraPose.position.lerp(paintCamera.position,blend);cameraPose.quaternion.slerp(paintCamera.quaternion,blend);cameraPose.fov=T.MathUtils.lerp(cameraPose.fov,fov,blend);}
   camera.position.copy(cameraPose.position);camera.quaternion.copy(cameraPose.quaternion);camera.fov=cameraPose.fov;
  }
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
  if(!painted)protectPlayerView(camera);
  else{
   overviewFramed=fruitData.filter(f=>{const p=V(f.x,f.y,f.z).project(camera);return Math.abs(p.x)<.98&&Math.abs(p.y)<.98&&p.z>-1&&p.z<1;}).length;
   const h=hero.position.clone().project(camera),heroFramed=Math.abs(h.x)<.98&&Math.abs(h.y)<.98&&h.z>-1&&h.z<1;
   overviewReady=clockTime-paintedAt>=RED_CONFIRM+PULLBACK_SECONDS&&finaleField.stats.revealAmount>=1&&heroFramed;
   if(overviewReady&&overviewAt===null&&elapsed>0)overviewAt=clockTime;
   if(overviewReady&&overviewAt!==null&&!burstStarted&&elapsed>0){
    finaleField.grow(clamp((clockTime-overviewAt)/LYCHEE_FINALE.growthSeconds,0,1),LYCHEE_FINALE.growthScale);
    const grown=finaleField.stats.growthScale;hero.position.fromArray(finaleField.heroPosition);hero.scale.setScalar(HERO_SCALE*grown);stem.scale.setScalar(HERO_SCALE*grown);stem.position.copy(hero.position).add(V(.025*grown,1.14*HERO_SCALE*grown,0));hero.updateWorldMatrix(true,false);stem.updateWorldMatrix(true,false);
    if(finaleField.stats.growthAmount>=1){growthSettled=true;if(oceanAt===null)oceanAt=clockTime;}
   }
   if(overviewReady&&!burstStarted){
    protectPlayerView(camera,true);
    const key=camera.aspect+':'+Math.floor(finaleField.stats.growthAmount*8);
    if(key!==oceanProjectionKey){oceanProjection=measureLycheeOcean(camera,[...fruitData.map(f=>({position:[f.x,f.y,f.z],radius:f.radius,visibility:f.viewVisibility})),{position:hero.position.toArray(),radius:envelope*HERO_SCALE*finaleField.stats.growthScale}]);oceanProjectionKey=key;}
   }
   // The enlarged sea holds before the synchronous boom. Main never needs a
   // poem acknowledgement; only a positive-dt camera commit may start it.
   if(!burstStarted&&growthSettled&&overviewReady&&oceanAt!==null&&elapsed>0&&clockTime-oceanAt>=LYCHEE_FINALE.oceanHoldSeconds-1e-8){
    burst.start(fruitData,hero.position,camera,envelope*HERO_SCALE*finaleField.stats.growthScale);burstAt=clockTime;burstStarted=true;hero.visible=stem.visible=shells.visible=stems.visible=false;visibleCount=0;
   }
   if(burstStarted){burst.update(Math.max(0,clockTime-burstAt),camera);if(elapsed>0&&!burst.visible&&clockTime-burstAt>=LYCHEE_FINALE.burstSeconds+LYCHEE_FINALE.poemDelay-1e-8)poemExposed=true;}
  }
 }
 function confirmFinalePoemReady(){
  // Kept as a harmless compatibility method for older hosts. The sea and boom
  // now run autonomously, and the poem can appear only after the ink has cleared.
  return false;
 }
 function update(time,playerPosition,dt=1/60){
  // Pause and chapter cuts advance neither the finite queue nor the ending.
  const elapsed=clamp(Number.isFinite(dt)?dt:0,0,.1);clockTime+=elapsed;
  if(playerPosition){player.set(playerPosition.x??playerPosition[0]??0,playerPosition.y??playerPosition[1]??FLOOR_Y,playerPosition.z??playerPosition[2]??currentZ);currentZ=player.z;furthest=Math.max(furthest,clamp((START_Z-currentZ)/(START_Z-END_Z),0,1));}
  if(!painted)rain.advance(dt,player,furthest);coloured=rain.stats.landed;
  const finaleAge=painted?Math.max(0,clockTime-paintedAt):0,reveal=painted?clamp((finaleAge-RED_CONFIRM)/PULLBACK_SECONDS,0,1):0;
  if(painted&&!burstStarted&&elapsed>0)finaleField.reveal(reveal);
  if(!burstStarted)renderRain();
  for(const dustMaterial of dustMaterials)dustMaterial.uniforms.time.value=clockTime;
  const overviewAmount=T.MathUtils.smootherstep(reveal,0,1);scene.fog.density=T.MathUtils.lerp(.034,.0065,overviewAmount);sideFog.update(clockTime,T.MathUtils.lerp(1,.20,overviewAmount));
  if(painted){
   const age=Math.max(0,clockTime-paintedAt);uniforms.lycheeRedBloom.value=-.23+clamp(age/.28,0,1)*1.55;
  }
  if(!result.paintReady)cursor.visible=false;
  if(dirty)refreshMask();
 }
 function reset(){
  currentZ=START_Z;furthest=0;coloured=visibleCount=viewFaded=overviewFramed=0;player.set(0,FLOOR_Y,START_Z);arrivalPlayer.copy(player);painted=false;paintedAt=clockTime=0;drawing=false;burstStarted=false;outroPose=focusAt=focusFrom=focusPose=overviewPose=overviewAt=burstAt=lookBackGoal=oceanAt=oceanProjection=null;oceanProjectionKey='';turnYaw=0;cameraReady=focusSettled=overviewReady=growthSettled=poemExposed=false;rain.reset();finaleField.reset();burst.reset();tracker.reset();tracker.setView([0,.08,1]);
  hero.visible=stem.visible=shells.visible=stems.visible=true;hero.position.set(HERO_X,FLOOR_Y+HERO_HEIGHT,HERO_Z);hero.scale.setScalar(HERO_SCALE);stem.scale.setScalar(HERO_SCALE);stem.position.copy(hero.position).add(V(.025,1.14*HERO_SCALE,0));
  uniforms.lycheeRedBloom.value=-.5;uniforms.lycheeBloomOrigin.value.set(0,0,1);cursor.visible=false;dirty=true;update(0,V(0,FLOOR_Y,START_Z),0);
 }
 const result={scene,journey:true,flight:false,stageOwnCamera:true,paper:true,cinematic:false,moveSpeed:MOVE_SPEED,spawn:[0,FLOOR_Y,START_Z],bounds:{minX:-3,maxX:3,minZ:END_Z,maxZ:START_Z},
  followCamera:{offset:[0,2,8],lookHeight:1.5,lookOffset:[0,.85,-5.6],trackX:.4,trackZ:1,fov:44},
  targets:[{id:'last-lychee',kind:'paint',position:[0,FLOOR_Y,END_Z],label:'第300颗荔枝',hint:'按住鼠标左键，把最后一颗白荔枝涂红。'}],
  ready:base.ready,update,updateCamera,reset,pointerDown,pointerMove,pointerUp,confirmFinalePoemReady,heightAt:()=>FLOOR_Y,takeRainHit:()=>null,
  get movementBlocked(){return focusAt!==null;},get dodgeStats(){return {enabled:false,waves:0,hits:0,warning:0,warnings:[],remaining:0};},get sideFogStats(){return {...sideFog.stats,distanceFogDensity:scene.fog.density};},
  get paintReady(){return currentZ<=PAINT_Z&&coloured===299&&focusSettled;},get arriving(){return currentZ<=PAINT_Z&&!result.paintReady;},get focused(){return focusSettled;},get overviewReady(){return overviewReady;},
  get heroPosition(){return hero.position.toArray();},get heroRadius(){return envelope*HERO_SCALE*finaleField.stats.growthScale;},get painted(){return painted;},get coverage(){return tracker.coverage;},
  get actorTurn(){return lycheeActorTurn({active:painted,age:painted?Math.max(0,clockTime-paintedAt):0,yawGoal:turnYaw,lookBackGoal});},
  get paintStats(){return {coverage:tracker.coverage,motionSeconds:tracker.motionSeconds,pathLength:tracker.pathLength,moveSamples:tracker.moveSamples,longestStroke:tracker.longestStroke,canFinish:tracker.canFinish};},
  get counter(){return painted?300:coloured;},get walkProgress(){return furthest;},
  get colourStats(){return {white:painted?0:1,ripening:0,red:rain.stats.released,visible:visibleCount,total:300,passed:coloured,grounded:coloured};},
  get groveStats(){return {enabled:false,realTrees:0,lightTrees:0,rootMistCards:0,leafInstances:0};},
  get treeStats(){return {enabled:false,trees:0,drawCalls:0,triangles:0};},
  get cameraStats(){return {phase:painted?result.outroStats.phase:focusSettled?'painting':focusAt!==null?'push-in':'walking',focused:focusSettled,pushAge:focusAt===null?0:Number(Math.min(LYCHEE_FINALE.pushSeconds,clockTime-focusAt).toFixed(3)),pushSeconds:LYCHEE_FINALE.pushSeconds,roll:LYCHEE_FINALE.roll,arrivalPlayer:arrivalPlayer.toArray(),paintPose:focusPose?{position:focusPose.position.toArray(),lookAt:focusPose.lookAt,fov:focusPose.fov}:null,overviewPose:overviewPose?{position:overviewPose.position.toArray(),lookAt:overviewPose.lookAt,fov:overviewPose.fov,aspect:overviewPose.aspect,fit:overviewPose.fit,maxGrowthScale:overviewPose.maxGrowthScale,direction:overviewPose.direction,distanceRatio:overviewPose.distanceRatio}:null,overviewReady};},
  get oceanStats(){return {ready:!!oceanProjection,growthScale:finaleField.stats.growthScale,holdSeconds:LYCHEE_FINALE.oceanHoldSeconds,holdAge:oceanAt===null?0:Math.max(0,clockTime-oceanAt),...(oceanProjection||{})};},
  get finaleStats(){return {...finaleField.stats,growthSettled,heroScale:hero.scale.x,heroRadius:result.heroRadius,stemScale:stem.scale.x,overviewReady,framedFruit:overviewFramed,displayed:visibleCount,originalLandingSources:fruitData.filter(f=>Number.isFinite(f.landX)&&Number.isFinite(f.landY)&&Number.isFinite(f.landZ)).length};},get burstOrigins(){return burst.sources;},
  get outroStats(){
   const age=painted?Math.max(0,clockTime-paintedAt):0,burstAge=burstAt===null?0:Math.max(0,clockTime-burstAt),growth=finaleField.stats;
   const phase=!painted?'painting':burstStarted?(burst.visible?'burst':'clear'):age<RED_CONFIRM?'red-confirm':age<RED_CONFIRM+PULLBACK_SECONDS?'pullback':growthSettled?'ocean':'swelling';
   return {phase,age:Number(age.toFixed(3)),pullbackAge:Number(Math.max(0,age-RED_CONFIRM).toFixed(3)),pullbackSeconds:PULLBACK_SECONDS,fullRedSeconds:LYCHEE_FINALE.fullRedSeconds,oceanHoldSeconds:LYCHEE_FINALE.oceanHoldSeconds,oceanAge:oceanAt===null?0:Number(Math.max(0,clockTime-oceanAt).toFixed(3)),overviewHeldSeconds:overviewAt===null?0:Number(Math.max(0,clockTime-overviewAt).toFixed(3)),overviewReady,framedFruit:overviewFramed,growthAmount:growth.growthAmount,growthScale:growth.growthScale,growthSeconds:LYCHEE_FINALE.growthSeconds,growthSettled,poemReady:poemExposed,poemDelay:LYCHEE_FINALE.poemDelay,poemConfirmed:false,awaitingPoem:false,poemConfirmedAt:null,minimumBoomAt:BOOM_AT,boomAt:burstAt===null?null:Number((burstAt-paintedAt).toFixed(3)),burstAge:Number(burstAge.toFixed(3)),clearAge:Number(Math.max(0,burstAge-LYCHEE_FINALE.burstSeconds).toFixed(3)),particleCount:burst.count,activeParticles:burst.visible?burst.count:0,ordinaryOrigins:299,heroOrigins:1,...burst.stats,duration:burstAt===null?null:Number((burstAt-paintedAt+LYCHEE_FINALE.burstSeconds).toFixed(3)),minDuration:LYCHEE_FINALE.minDuration};
  },
  get rainStats(){return {...rain.stats,viewFaded,fruitInstances:299,fruitDrawCalls:2,shellTrianglesPerFruit:shells.geometry.index.count/3,stemTrianglesPerFruit:stems.geometry.index.count/3};},get physics(){return result.rainStats;},
  get floatingFruit(){return fruitData.map(f=>({index:f.index,x:f.x,y:f.y,z:f.z,radius:f.radius,scale:f.scale,baseRadius:f.finaleBaseRadius??f.radius,baseScale:f.finaleBaseScale??f.scale,layer:f.descriptor.layer,state:f.state,active:f.active,counted:f.counted,bounces:f.bounces,activatedAt:f.activatedAt,landedAt:f.landedAt,landX:f.landX,landY:f.landY,landZ:f.landZ,birthX:f.birthX,birthY:f.birthY,birthZ:f.birthZ,finalePosition:f.finalePosition?.slice()||null,visibility:burstStarted?0:f.visibility*f.viewVisibility,viewVisibility:f.viewVisibility}));}};
 reset();return result;
}
