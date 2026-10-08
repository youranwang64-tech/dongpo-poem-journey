import * as T from './vendor/three.module.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),MAX_ROUTES=12,MAX_GUARDS=8;
const cloudQuad=new T.PlaneGeometry(1,1);
const vertexShader=`
attribute vec4 cloudParameters;
uniform float cloudTime,cloudTravel;
uniform vec2 cloudWind;
uniform vec3 cloudRight,cloudUp;
varying vec2 cloudUv;
varying vec3 cloudWorld;
varying float cloudAlpha,cloudPhase;
void main(){
 cloudUv=uv;cloudAlpha=cloudParameters.y;cloudPhase=cloudParameters.x;
 vec3 centre=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
 float width=length(instanceMatrix[0].xyz),height=length(instanceMatrix[1].xyz);
 float speed=cloudParameters.z,layer=cloudParameters.w;
 float shear=layer>2.5?.58:layer>1.5?1.32:layer>.5?1.05:.72;
 float span=layer>2.5?6.:layer>1.5?28.:layer>.5?22.:16.;
 float journey=fract(cloudTravel*speed*shear/span+cloudPhase*.159);
 vec2 crossWind=vec2(-cloudWind.y,cloudWind.x);
 vec2 drift=cloudWind*(journey-.5)*span+crossWind*sin(cloudTime*.12+cloudPhase)*.26;
 centre.xz+=drift;
 centre.y+=sin(cloudTime*.085+cloudPhase)*min(.11,height*.035);
 cloudAlpha*=smoothstep(0.,.09,journey)*(1.-smoothstep(.91,1.,journey));
 cloudWorld=centre+cloudRight*position.x*width+cloudUp*position.y*height;
 gl_Position=projectionMatrix*viewMatrix*vec4(cloudWorld,1.);
}`;
const fragmentShader=`
uniform vec3 cloudTint;
uniform float cloudTime,cloudFloor,cloudRouteRadius;
uniform int cloudRouteCount;
uniform vec4 cloudRoutes[12],cloudPaintGuard;
uniform int cloudGuardCount,cloudBoxCount;
uniform vec4 cloudGuards[8];
uniform vec3 cloudBoxCentres[8],cloudBoxHalf[8];
varying vec2 cloudUv;
varying vec3 cloudWorld;
varying float cloudAlpha,cloudPhase;
float ccHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ccNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(ccHash(i),ccHash(i+vec2(1.,0.)),f.x),mix(ccHash(i+vec2(0.,1.)),ccHash(i+vec2(1.,1.)),f.x),f.y);}
float ccSegmentDistance(vec2 p,vec4 line){vec2 a=line.xy,b=line.zw,d=b-a;float t=clamp(dot(p-a,d)/max(dot(d,d),.001),0.,1.);return length(p-a-t*d);}
void main(){
 vec2 p=cloudUv*2.-1.;
 float broad=ccNoise(cloudUv*vec2(4.9,2.1)+vec2(-cloudTime*.046+cloudPhase,cloudPhase*.37));
 float folds=ccNoise(cloudUv*vec2(13.,5.)-vec2(cloudTime*.095,cloudPhase+cloudTime*.012));
 float density=.39+.37*broad+.24*folds;
 float silhouette=1.-smoothstep(.22,1.18,dot(p*vec2(.88,1.),p*vec2(.88,1.))+(broad-.5)*.26);
 float edge=smoothstep(0.,.13,cloudUv.x)*smoothstep(0.,.13,1.-cloudUv.x)*smoothstep(0.,.16,cloudUv.y)*smoothstep(0.,.16,1.-cloudUv.y);
 float alpha=cloudAlpha*silhouette*edge*density;
 float routeClear=0.;
 for(int i=0;i<12;i++){if(i>=cloudRouteCount)break;routeClear=max(routeClear,1.-smoothstep(cloudRouteRadius*.68,cloudRouteRadius*1.32,ccSegmentDistance(cloudWorld.xz,cloudRoutes[i])));}
 float lowPart=1.-smoothstep(cloudFloor+1.1,cloudFloor+2.0,cloudWorld.y);
 alpha*=1.-routeClear*lowPart*.91;
 if(cloudPaintGuard.w>0.)alpha*=1.-(1.-smoothstep(cloudPaintGuard.w*.7,cloudPaintGuard.w*1.25,distance(cloudWorld,cloudPaintGuard.xyz)))*.94;
 for(int i=0;i<8;i++){if(i>=cloudGuardCount)break;float radius=cloudGuards[i].w;alpha*=1.-(1.-smoothstep(radius*.68,radius*1.22,distance(cloudWorld,cloudGuards[i].xyz)))*.91;}
 for(int i=0;i<8;i++){if(i>=cloudBoxCount)break;vec3 relative=abs(cloudWorld-cloudBoxCentres[i])/max(cloudBoxHalf[i],vec3(.01));float edgeBox=max(max(relative.x,relative.y),relative.z);alpha*=mix(.06,1.,smoothstep(.80,1.12,edgeBox));}
 alpha*=smoothstep(1.8,5.5,distance(cloudWorld,cameraPosition));
 if(alpha<.001)discard;
 gl_FragColor=vec4(cloudTint,alpha);
 #include <colorspace_fragment>
}`;

function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function arrayPoint(point){return Array.isArray(point)?point:point?.toArray?.();}

// Motes live inside existing light shafts and follow their live strength.
// They do not add lights or brighten a shadowed room by themselves.
export function createShaftDust(stage,index){
 const sources=[];stage.scene.updateMatrixWorld(true);
 stage.scene.traverse(o=>{if(sources.length>=8||!o.isMesh||o.geometry?.type!=='CylinderGeometry'||!o.material?.uniforms?.strength||!o.material.uniforms.tint)return;const height=o.geometry.parameters.height,from=V(0,height/2,0).applyMatrix4(o.matrixWorld),to=V(0,-height/2,0).applyMatrix4(o.matrixWorld);sources.push({object:o,from,to,radius:o.geometry.parameters.radiusBottom,strength:o.material.uniforms.strength,tint:o.material.uniforms.tint});});
 if(!sources.length)return null;
 const r=rng(3901+index*73),countPerSource=index===2?78:56,positions=[],parameters=[];
 for(let source=0;source<sources.length;source++)for(let i=0;i<countPerSource;i++){positions.push(0,0,0);parameters.push(r(),Math.sqrt(r())*.88,r()*Math.PI*2,source);}
 const fill=(mapper,fallback)=>Array.from({length:8},(_,i)=>sources[i]?mapper(sources[i]):fallback());
 const uniforms={dustTime:{value:0},dustWind:{value:V(1,0,-.26).normalize()},dustFrom:{value:fill(s=>s.from.clone(),()=>V())},dustTo:{value:fill(s=>s.to.clone(),()=>V(0,-1,0))},dustShape:{value:fill(s=>new T.Vector4(s.radius,0,0,0),()=>new T.Vector4())},dustTint:{value:fill(s=>s.tint.value.clone(),()=>new T.Color())}};
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('dustParameters',new T.Float32BufferAttribute(parameters,4));
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,blending:T.AdditiveBlending,
  vertexShader:`attribute vec4 dustParameters;uniform float dustTime;uniform vec3 dustWind;uniform vec3 dustFrom[8],dustTo[8],dustTint[8];uniform vec4 dustShape[8];varying float moteAlpha;varying vec3 moteTint;
   void main(){int source=int(dustParameters.w);vec3 from=dustFrom[source],to=dustTo[source],axis=normalize(to-from),side=normalize(cross(axis,abs(axis.y)<.95?vec3(0.,1.,0.):vec3(1.,0.,0.))),up=cross(side,axis);float journey=fract(dustParameters.x+dustTime*(.012+.009*dustParameters.y)),angle=dustParameters.z+dustTime*.055,radius=mix(.06,dustShape[source].x,journey)*dustParameters.y;vec3 p=mix(from,to,journey)+(side*cos(angle)+up*sin(angle))*radius+dustWind*sin(dustTime*.21+dustParameters.z)*.075;float ends=smoothstep(.04,.20,journey)*(1.-smoothstep(.83,.98,journey));moteAlpha=ends*(1.-dustParameters.y*dustParameters.y)*min(1.,dustShape[source].y*.21)*(.52+.22*sin(dustTime*.43+dustParameters.z));moteTint=dustTint[source];vec4 mvPosition=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;gl_PointSize=clamp(27./max(6.,-mvPosition.z),1.05,2.6);}`,
  fragmentShader:`varying float moteAlpha;varying vec3 moteTint;void main(){float radius=length(gl_PointCoord-.5)*2.;float alpha=(1.-smoothstep(.05,1.,radius))*moteAlpha;if(alpha<.006)discard;gl_FragColor=vec4(moteTint,alpha);#include <colorspace_fragment>}`.replace(';#include',';\n#include')
 });
 const mesh=new T.Points(geometry,material);mesh.name='仅在窗光月光中浮动的尘粒';mesh.frustumCulled=false;mesh.renderOrder=3;stage.scene.add(mesh);
 // Existing ambient motes stay faint in unlit corners. Their lamps, shafts and
 // geometry are untouched; the brighter particles now belong to actual light.
 const dimmed=[];stage.scene.traverse(o=>{if(o.isPoints&&o.material?.isPointsMaterial&&o.parent?.name==='Atmosphere'&&o.material.size===.018){dimmed.push({material:o.material,opacity:o.material.opacity});o.material.opacity*=.28;}});
 const stats={points:positions.length/3,sources:sources.length,drawCalls:1,ambientDustDimmed:dimmed.length,litSources:0,maxStrength:0};
 function update(time,wind){uniforms.dustTime.value=time;if(wind)uniforms.dustWind.value.set(wind[0],0,wind[1]).normalize();stats.litSources=0;stats.maxStrength=0;sources.forEach((source,i)=>{const strength=Math.max(0,Number(source.strength.value)||0);uniforms.dustShape.value[i].y=strength;uniforms.dustTint.value[i].copy(source.tint.value);if(strength>.02)stats.litSources++;stats.maxStrength=Math.max(stats.maxStrength,strength);});}
 function dispose(){stage.scene.remove(mesh);geometry.dispose();material.dispose();for(const item of dimmed)item.material.opacity=item.opacity;}
 update(0);return {mesh,uniforms,sources,stats,update,dispose};
}

export function chapterWindBoost(stage,index){
 if(index===4)return 1+Math.max(stage.architecture?.actionProgress?.('wind')||stage.architecture?.progress?.('wind')||0,stage.progress||0)*2.8;
 if(index===5)return 1+(stage.redCliffStats?.freedom||0)*3.2;
 return 1;
}

// One instanced draw per bank. No external images, no per-frame instance uploads.
export function createCloudBank(scene,{cards=[],color=0x9eafa2,routePoints=[],routeSegments=[],guardPoints=[],guardVolumes=[],floorY=0,clearRadius=1.6,name='流动云雾'}={}){
 const routes=routeSegments.length?routeSegments:routePoints.slice(1).map((b,i)=>[routePoints[i],b]);
 const lines=Array.from({length:MAX_ROUTES},()=>new T.Vector4());routes.slice(0,MAX_ROUTES).forEach(([a,b],i)=>lines[i].set(a[0],a[2],b[0],b[2]));
 const guards=Array.from({length:MAX_GUARDS},(_,i)=>{const point=guardPoints[i];return point?new T.Vector4(point[0],point[1],point[2],point[3]||2.4):new T.Vector4();}),boxCentres=Array.from({length:MAX_GUARDS},(_,i)=>guardVolumes[i]?V(...guardVolumes[i].center):V()),boxHalf=Array.from({length:MAX_GUARDS},(_,i)=>guardVolumes[i]?V(...guardVolumes[i].half):V(1,1,1));
 const uniforms={cloudTime:{value:0},cloudTravel:{value:0},cloudWind:{value:new T.Vector2(1,-.26).normalize()},cloudRight:{value:V(1,0,0)},cloudUp:{value:V(0,1,0)},cloudTint:{value:new T.Color(color)},cloudFloor:{value:floorY},cloudRouteRadius:{value:clearRadius},cloudRouteCount:{value:Math.min(routes.length,MAX_ROUTES)},cloudRoutes:{value:lines},cloudPaintGuard:{value:new T.Vector4()},cloudGuardCount:{value:Math.min(guardPoints.length,MAX_GUARDS)},cloudGuards:{value:guards},cloudBoxCount:{value:Math.min(guardVolumes.length,MAX_GUARDS)},cloudBoxCentres:{value:boxCentres},cloudBoxHalf:{value:boxHalf}};
 const geometry=cloudQuad.clone(),parameters=new Float32Array(cards.length*4),material=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:false,fog:false}),mesh=new T.InstancedMesh(geometry,material,cards.length),dummy=new T.Object3D();
 cards.forEach((card,i)=>{dummy.position.fromArray(card.position);dummy.scale.set(card.width,card.height,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);parameters.set([card.phase??i*1.731,Math.min(.23,card.opacity??.08),card.speed??1,card.layer??0],i*4);});
 geometry.setAttribute('cloudParameters',new T.InstancedBufferAttribute(parameters,4));mesh.instanceMatrix.needsUpdate=true;mesh.name=name;mesh.renderOrder=2.6;mesh.castShadow=false;mesh.receiveShadow=false;mesh.computeBoundingSphere();if(mesh.boundingSphere)mesh.boundingSphere.radius+=16;scene.add(mesh);
 const stats={cards:cards.length,meshes:1,triangles:cards.length*2,routeSegments:Math.min(routes.length,MAX_ROUTES),low:cards.filter(c=>c.layer===0).length,upper:cards.filter(c=>c.layer===1).length,far:cards.filter(c=>c.layer===2).length,maxOpacity:Math.max(0,...cards.map(c=>Math.min(.23,c.opacity??.08)))};
 stats.highSide=cards.filter(c=>c.layer===3).length;stats.guardPoints=uniforms.cloudGuardCount.value;stats.guardVolumes=uniforms.cloudBoxCount.value;
 function update(time,camera,paintGuard=null,{travel=time*.26,wind=[1,-.26]}={}){uniforms.cloudTime.value=Number.isFinite(time)?time:0;uniforms.cloudTravel.value=Number.isFinite(travel)?travel:0;uniforms.cloudWind.value.set(...wind).normalize();if(camera){camera.updateMatrixWorld();uniforms.cloudRight.value.setFromMatrixColumn(camera.matrixWorld,0).normalize();uniforms.cloudUp.value.setFromMatrixColumn(camera.matrixWorld,1).normalize();}if(paintGuard){const p=arrayPoint(paintGuard);uniforms.cloudPaintGuard.value.set(p[0],p[1],p[2],3.0);}else uniforms.cloudPaintGuard.value.w=0;}
 function dispose(){scene.remove(mesh);geometry.dispose();material.dispose();}
 return {mesh,uniforms,cards,stats,update,dispose};
}

function protectedRoute(stage,index){
 if(index===6)return [[0,0,-22],[0,0,-17],[0,0,1],[-10.15,0,1],[-10.15,0,-3.4]];
 const points=[arrayPoint(stage.spawn),...(stage.targets||stage.architecture?.targets||[]).map(t=>arrayPoint(t.position)),arrayPoint(stage.exit?.position)].filter(p=>p?.length>=3);
 return points.length>1?points:[[0,0,3],[0,0,-5]];
}

export function decorateChapterClouds(stage,index){
 if(!stage?.scene)throw new TypeError('云雾层需要篇章场景。');if(stage.chapterCloudsDecorated||stage.chapterClouds)return stage;
 // The falling-lychee chapter deliberately keeps its clean white space.
 if(index===8){
  stage.chapterClouds=null;stage.chapterCloudsDecorated=true;
  stage.cloudStats={index,mode:'paper-clear',low:0,upper:0,far:0,cards:0,meshes:0,triangles:0,specialCards:0,maxOpacity:0,routeSegments:0,existingAtmosphere:stage.atmosphere?1:0};
  stage.updateChapterClouds=()=>{};
  return stage;
 }
 const route=protectedRoute(stage,index),spawn=arrayPoint(stage.spawn)||[0,0,0],floorY=spawn[1]||0,bounds=stage.bounds||{minX:-12,maxX:12,minZ:-18,maxZ:12},centre=V((bounds.minX+bounds.maxX)/2,floorY,(bounds.minZ+bounds.maxZ)/2);
 const paper=stage.paper===true,night=index===2||index===5,cinematic=stage.cinematic===true,hasAtmosphere=!!stage.atmosphere,r=rng(1219+index*271),wide=index===6?32:Math.max(24,Math.min(52,bounds.maxX-bounds.minX+14)),deep=Math.max(28,Math.min(65,bounds.maxZ-bounds.minZ+17));
 const count=cinematic?{low:4,upper:3,far:4}:index===2?{low:4,upper:2,far:3}:index===6?{low:6,upper:5,far:7}:{low:6,upper:4,far:6};
 const scale=paper?.46:hasAtmosphere?.76:1,baseOpacity=night?.072:.097,cards=[];
 for(let layer=0;layer<3;layer++)for(let i=0;i<count[['low','upper','far'][layer]];i++){
  const a=(i+.3+r()*.25)/count[['low','upper','far'][layer]]*Math.PI*2,far=layer===2,radial=far?1.04:.66;
  const x=centre.x+Math.cos(a)*wide*.5*radial,z=centre.z+Math.sin(a)*deep*.5*radial-(far?deep*.18:0);
  const y=layer===0?floorY+.14+r()*.12:layer===1?floorY+7.8+r()*3.7:floorY+2.4+r()*1.6;
  cards.push({position:[x,y,z],width:layer===0?11+r()*8:layer===1?17+r()*10:23+r()*12,height:layer===0?.68+r()*.54:layer===1?1.35+r()*1.3:2.1+r()*1.8,opacity:baseOpacity*scale*(layer===1?.86:1),phase:r()*6.28,speed:.65+r()*.55,layer});
 }
 const grounding=(stage.architectureGroundingAnchors||[]).filter(a=>Array.isArray(a.position)&&a.position.every(Number.isFinite));
 for(const [i,anchor] of grounding.entries())cards.push({position:anchor.position,width:anchor.width||3.2,height:anchor.height||.95,opacity:night?.12:.15,phase:1.19+i*1.87,speed:.65,layer:0});
 const sideBands=(stage.architectureBoundaryAnchors||[]).filter(a=>Array.isArray(a.position)&&a.position.every(Number.isFinite));
 const guardPoints=(stage.targets||stage.architecture?.targets||[]).map(t=>{const point=arrayPoint(t.position);return point?[point[0],point[1]+1.6,point[2],2.25]:null;}).filter(Boolean),guardVolumes=stage.architectureFogGuards||[];
 const tint=paper?0xdfe5da:night?0x80958b:0xa6b7aa,bank=createCloudBank(stage.scene,{cards,color:tint,routePoints:route,guardPoints,guardVolumes,floorY,clearRadius:1.65,name:`篇章${index+1}_三层流云`}),sideTint=stage.scene.background?.isColor?stage.scene.background.clone().lerp(new T.Color(tint),.18):new T.Color(tint),sideBank=sideBands.length?createCloudBank(stage.scene,{cards:sideBands,color:sideTint,routePoints:route,guardPoints,guardVolumes,floorY,clearRadius:1.65,name:`篇章${index+1}_同环境色侧雾带`}):null,dust=createShaftDust(stage,index);
 const special=stage.mountainLandscape?.skyClouds,stats={index,mode:paper?'paper':night?'night':'ink',low:bank.stats.low,upper:bank.stats.upper,far:bank.stats.far,meshes:bank.stats.meshes+(sideBank?1:0)+(special?.stats.meshes||0),cards:bank.stats.cards+(sideBank?.stats.cards||0)+(special?.stats.cards||0),triangles:bank.stats.triangles+(sideBank?.stats.triangles||0)+(special?.stats.triangles||0),specialCards:special?.stats.cards||0,maxOpacity:Math.max(bank.stats.maxOpacity,sideBank?.stats.maxOpacity||0,special?.stats.maxOpacity||0),routeSegments:bank.stats.routeSegments,existingAtmosphere:hasAtmosphere?1:0};
 stats.grounding=grounding.length;stats.highSide=sideBands.filter(a=>a.position[1]>1.5).length;stats.guardPoints=guardPoints.length;stats.guardVolumes=guardVolumes.length;stats.dust=dust?.stats||null;stats.windDirection=index===4?[1,-.15]:index===5?[.86,-.50]:[1,-.26];stats.windSpeed=.26;stats.windBoost=1;stats.simTime=0;stats.windTravel=0;
 // The requested foreground cloud tongues have been withdrawn. Keep only
 // environmental distance/grounding mist and existing shaft dust at runtime.
 stats.foreground={enabled:false,layers:0,meshes:0,triangles:0,alphaCeiling:0,reason:'camera-facing-mist-removed'};
 let simTime=0,travel=0,lastInput=null,boost=1;stage.chapterClouds=bank;stage.architectureBoundaryClouds=sideBank;stage.foregroundMist=null;stage.shaftDust=dust;stage.chapterCloudsDecorated=true;stage.cloudStats=stats;
 stage.updateChapterClouds=(time,camera,dt)=>{
  const step=Number.isFinite(dt)?T.MathUtils.clamp(dt,0,.08):lastInput===null?0:T.MathUtils.clamp(time-lastInput,0,.08);lastInput=time;
  if(step>0){simTime+=step;boost=T.MathUtils.damp(boost,chapterWindBoost(stage,index),1.8,step);travel+=step*.26*boost;}
  bank.update(simTime,camera,stage.journey?stage.heroPosition:null,{travel,wind:stats.windDirection});sideBank?.update(simTime,camera,null,{travel,wind:stats.windDirection});dust?.update(simTime,stats.windDirection);stage.mountainLandscape?.updateClouds?.(simTime,camera,step);
  Object.assign(stats,{simTime,windTravel:travel,windSpeed:.26*boost,windBoost:boost});
 };
 const oldReset=stage.reset;stage.reset=function(...args){const result=oldReset?.apply(stage,args);simTime=travel=0;lastInput=null;boost=1;bank.update(0,null,null,{travel:0,wind:stats.windDirection});sideBank?.update(0,null,null,{travel:0,wind:stats.windDirection});dust?.update(0,stats.windDirection);Object.assign(stats,{simTime:0,windTravel:0,windSpeed:.26,windBoost:1});return result;};
 return stage;
}
