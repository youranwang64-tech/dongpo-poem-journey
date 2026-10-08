import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),MAX_GUARDS=6;

// Long, uneven cloud tongues cross the foreground at three different depths.
// The matrix stores authored NDC dimensions, not a world-space exclusion box.
// In particular, a twenty-metre viewing window never clears this entire layer.
export const FOREGROUND_MIST_BANDS=[
 {x:-.55,y:.17,depth:6.5,width:2.36,height:.38,phase:.65,speed:1.03,opacity:.42},
 {x:.60,y:-.11,depth:10.2,width:2.42,height:.31,phase:2.45,speed:.64,opacity:.39},
 {x:-1.15,y:-.47,depth:14.4,width:2.60,height:.48,phase:4.85,speed:1.22,opacity:.19}
];
export function foregroundBandCentre(band,time,travel,wind=[1,0]){
 const shift=travel*.105*band.speed,x=((band.x+shift+2.60)%5.20+5.20)%5.20-2.60;
 return [x*wind[0],band.y+shift*wind[1]*.24+Math.sin(time*.16+band.phase)*.042];
}
const vertexShader=`
attribute vec4 mistParameters;
uniform float mistTime,mistTravel;
uniform vec2 mistWind,mistFrustum;
uniform vec3 mistEye,mistRight,mistUp,mistForward;
varying vec2 mistUv,mistNdc;
varying float mistPhase,mistAlpha,mistDepth;
void main(){
 vec3 centre=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
 float width=length(instanceMatrix[0].xyz),height=length(instanceMatrix[1].xyz);
 float shift=mistTravel*.105*mistParameters.z;
 centre.x=(mod(centre.x+shift+2.60,5.20)-2.60)*mistWind.x;
 centre.y+=shift*mistWind.y*.24+sin(mistTime*.16+mistParameters.x)*.042;
 vec2 ndc=centre.xy+position.xy*vec2(width,height);
 vec3 world=mistEye+mistForward*centre.z+mistRight*(ndc.x*centre.z*mistFrustum.x)+mistUp*(ndc.y*centre.z*mistFrustum.y);
 mistUv=uv;mistNdc=ndc;mistPhase=mistParameters.x;mistAlpha=mistParameters.y;mistDepth=centre.z;
 gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
}`;
const fragmentShader=`
uniform float mistTime,mistStrength;
uniform vec3 mistTint;
uniform int mistGuardCount;
uniform vec4 mistGuards[6];
varying vec2 mistUv,mistNdc;
varying float mistPhase,mistAlpha,mistDepth;
float fmHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float fmNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fmHash(i),fmHash(i+vec2(1.,0.)),f.x),mix(fmHash(i+vec2(0.,1.)),fmHash(i+vec2(1.,1.)),f.x),f.y);}
void main(){
 vec2 p=mistUv*2.-1.;
 float broad=fmNoise(vec2(mistUv.x*5.2-mistTime*.043+mistPhase,mistPhase*.31+mistTime*.023));
 float folds=fmNoise(mistUv*vec2(17.,4.1)+vec2(-mistTime*.092,mistPhase));
 float centre=.18*sin(p.x*3.4+mistPhase+mistTime*.13)+.10*sin(p.x*7.1-mistTime*.17+mistPhase*.4);
 float thickness=mistDepth>13.?.39+.20*broad:.13+.11*broad;
 float crossCloud=abs(p.y-centre)+(folds-.5)*.065;
 float tongue=1.-smoothstep(thickness*.24,thickness+.12,crossCloud);
 float clumps=fmNoise(vec2(mistUv.x*7.6-mistTime*.081+mistPhase*.6,mistPhase*.71+mistTime*.018));
 float breaks=smoothstep(.26,.63,clumps+.12*(folds-.5));
 float ridgeWidth=.055+.23*pow(clumps,1.5)+.035*folds;
 float ridgeCentre=centre+(broad-.5)*.18+thickness*.14;
 float ridge=(1.-smoothstep(ridgeWidth*.22,ridgeWidth,abs(p.y-ridgeCentre)))*breaks;
 float ends=smoothstep(0.,.16,mistUv.x)*(1.-smoothstep(.81,1.,mistUv.x));
 float edge=smoothstep(0.,.13,mistUv.y)*(1.-smoothstep(.87,1.,mistUv.y));
 float fibres=.56+.30*broad+.14*folds;
 float gaps=.45+.55*smoothstep(.18,.72,broad);
 float ribbon=mistDepth>13.?tongue*.68:tongue*(.16+.30*breaks)+ridge*.63;
 float alpha=mistAlpha*mistStrength*ribbon*ends*edge*fibres*gaps;
 for(int i=0;i<6;i++){if(i>=mistGuardCount)break;vec4 guard=mistGuards[i];float r=length((mistNdc-guard.xy)/guard.zw);alpha*=1.-.86*(1.-smoothstep(.65,1.75,r));}
 // A passing cloud changes local contrast, while its translucent holes keep
 // the mountain silhouette readable. This is never an opaque screen wash.
 alpha=min(alpha,.23);if(alpha<.002)discard;
 gl_FragColor=vec4(mistTint,alpha);
 #include <colorspace_fragment>
}`;

export function createForegroundMist(stage,index){
 const scene=stage.scene,bands=FOREGROUND_MIST_BANDS.map(b=>({...b})),geometry=new T.PlaneGeometry(1,1),parameters=new Float32Array(bands.length*4),matrix=new T.Object3D();
 const uniforms={mistTime:{value:0},mistTravel:{value:0},mistStrength:{value:index===6?1:.57},mistWind:{value:new T.Vector2(1,0)},mistFrustum:{value:new T.Vector2(1,1)},mistEye:{value:V()},mistRight:{value:V(1,0,0)},mistUp:{value:V(0,1,0)},mistForward:{value:V(0,0,-1)},mistTint:{value:new T.Color(index===2||index===5?0xc4d4c9:0xf0f4ed)},mistGuardCount:{value:0},mistGuards:{value:Array.from({length:MAX_GUARDS},()=>new T.Vector4(0,0,.1,.1))}};
 const material=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,fog:false,side:T.DoubleSide}),mesh=new T.InstancedMesh(geometry,material,bands.length);
 bands.forEach((band,i)=>{matrix.position.set(band.x,band.y,band.depth);matrix.scale.set(band.width,band.height,1);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);parameters.set([band.phase,band.opacity,band.speed,band.depth],i*4);});geometry.setAttribute('mistParameters',new T.InstancedBufferAttribute(parameters,4));mesh.instanceMatrix.needsUpdate=true;mesh.name='镜头前_三层风过云舌';mesh.frustumCulled=false;mesh.renderOrder=2.9;mesh.castShadow=mesh.receiveShadow=false;scene.add(mesh);
 const stats={layers:3,meshes:1,triangles:6,mode:'mountain-waist-wisps-and-low-tongue',depths:bands.map(b=>b.depth),screenWidths:bands.map(b=>b.width),baseOpacities:bands.map(b=>b.opacity),alphaCeiling:.23,simTime:0,travel:0,centres:bands.map(b=>foregroundBandCentre(b,0,0)),wind:[1,0],guardCount:0,guardAreaUpperBound:0,actorGuard:false,entireWindowExcluded:false,shape:'broken-wisps-with-variable-width-and-soft-plumes',cameraMoved:false};let actorRoot=null;
 function actor(){if(actorRoot?.parent===scene)return actorRoot;let object=scene.getObjectByName('TravelerMesh');if(!object)return null;while(object.parent&&object.parent!==scene)object=object.parent;actorRoot=object.parent===scene?object:null;return actorRoot;}
 function update(time,camera,{travel=0,wind=[1,-.26],strength=index===6?1:.57}={}){
  if(!camera)return;camera.updateMatrixWorld(true);uniforms.mistTime.value=time;uniforms.mistTravel.value=travel;uniforms.mistStrength.value=strength;
  uniforms.mistEye.value.copy(camera.getWorldPosition(V()));uniforms.mistRight.value.setFromMatrixColumn(camera.matrixWorld,0).normalize();uniforms.mistUp.value.setFromMatrixColumn(camera.matrixWorld,1).normalize();camera.getWorldDirection(uniforms.mistForward.value);
  const tangent=Math.tan(T.MathUtils.degToRad(camera.fov*.5));uniforms.mistFrustum.value.set(tangent*camera.aspect,tangent);
  const direction=V(wind[0],0,wind[1]).normalize(),right=direction.dot(uniforms.mistRight.value),up=direction.dot(uniforms.mistUp.value);uniforms.mistWind.value.set(Math.abs(right)<.045?1:right,up*.35).normalize();
  const points=[],add=(point,width=.11,height=.14)=>{const p=point.clone().project(camera);if(p.z>-1&&p.z<1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.2&&points.length<MAX_GUARDS)points.push(new T.Vector4(p.x,p.y,width,height));};
  const person=actor();if(person){const foot=person.getWorldPosition(V()),head=foot.clone().add(V(0,1.9,0)),a=foot.clone().project(camera),b=head.clone().project(camera),height=Math.abs(a.y-b.y);if(a.z>-1&&a.z<1){add(foot.add(V(0,.95,0)),Math.max(.035,height*.21),Math.max(.065,height*.56));stats.actorGuard=true;}}else stats.actorGuard=false;
  if(stage.brushSurfaces)for(const surface of stage.brushSurfaces.values())add(surface.root.getWorldPosition(V()),.10,.18);
  else if(stage.windowFrames)for(const frame of stage.windowFrames.values())add(frame.hitPlane.getWorldPosition(V()),.12,.15);
  else for(const target of stage.targets||[])add(V(...target.position).add(V(0,1.35,0)),.10,.15);
  uniforms.mistGuardCount.value=points.length;points.forEach((point,i)=>uniforms.mistGuards.value[i].copy(point));
  Object.assign(stats,{simTime:time,travel,wind:uniforms.mistWind.value.toArray(),centres:bands.map(b=>foregroundBandCentre(b,time,travel,uniforms.mistWind.value.toArray())),guardCount:points.length,guardAreaUpperBound:Math.min(1,points.reduce((sum,p)=>sum+Math.PI*p.z*p.w/4,0)),strength});
 }
 function reset(){uniforms.mistTime.value=uniforms.mistTravel.value=0;uniforms.mistStrength.value=index===6?1:.57;Object.assign(stats,{simTime:0,travel:0,centres:bands.map(b=>foregroundBandCentre(b,0,0,uniforms.mistWind.value.toArray()))});}
 function dispose(){scene.remove(mesh);geometry.dispose();material.dispose();}
 return {mesh,uniforms,bands,stats,update,reset,dispose};
}
