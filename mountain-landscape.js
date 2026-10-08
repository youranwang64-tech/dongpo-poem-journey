import * as T from './vendor/three.module.js';
import {addTree} from './plants.js';
import {createCloudBank} from './chapter-clouds.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const INK_PANORAMA_URL=new URL('./assets/textures/lushan-ink-panorama-v1.png',import.meta.url);
let inkPanoramaPromise;
function loadInkPanorama(){
 if(!inkPanoramaPromise)inkPanoramaPromise=new T.ImageBitmapLoader().setOptions({imageOrientation:'flipY',premultiplyAlpha:'none'}).loadAsync(INK_PANORAMA_URL.href).then(bitmap=>{
  const texture=new T.Texture(bitmap);texture.name='原创庐山水墨长卷';texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=4;texture.flipY=false;texture.needsUpdate=true;return texture;
 });
 return inkPanoramaPromise;
}
const ROCK_TEXTURE_URL=new URL('./assets/textures/lushan-rock-v1.png',import.meta.url);
let rockTexturePromise;
function loadRockTexture(){
 if(!rockTexturePromise)rockTexturePromise=new T.ImageBitmapLoader().setOptions({imageOrientation:'flipY',premultiplyAlpha:'none'}).loadAsync(ROCK_TEXTURE_URL.href).then(bitmap=>{
  const texture=new T.Texture(bitmap);texture.name='庐山灰岩裂隙';texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=4;texture.flipY=false;texture.needsUpdate=true;return texture;
 });
 return rockTexturePromise;
}
export const LUSHAN={valley:-86,front:92,back:-492,halfWidth:122,mainCentre:-165,rearCentre:-10.15};
export const LUSHAN_SUMMITS=[
 {id:'岭一',x:-173,z:44,height:125,left:34,right:41,depth:37,lean:-7},
 {id:'岭二',x:-164,z:4,height:116,left:33,right:39,depth:35,lean:5},
 {id:'岭三',x:-160,z:-38,height:121,left:31,right:38,depth:35,lean:-5},
 {id:'岭四',x:-158,z:-80,height:112,left:31,right:36,depth:36,lean:6},
 {id:'岭五',x:-136,z:-125,height:117,left:31,right:37,depth:40,lean:-7},
 {id:'主峰',x:-10.8,z:-224,height:128,left:27,right:34,depth:83,lean:-7},
 {id:'主峰左岩齿',x:-23.4,z:-219,height:113,left:5,right:7,depth:19,lean:1.5},
 {id:'主峰右岩齿',x:.4,z:-229,height:104,left:7,right:7,depth:17,lean:-1.2},
 {id:'主峰前岩脊',x:-3,z:-204,height:112,left:6,right:4,depth:13,lean:2.1},
 {id:'峰左肩',x:-34,z:-206,height:89,left:17,right:17,depth:31,lean:3},
 {id:'峰右肩',x:12,z:-239,height:91,left:18,right:22,depth:35,lean:-4},
 {id:'远峰一',x:-52,z:-282,height:103,left:31,right:27,depth:39,lean:6},
 {id:'远峰二',x:23,z:-338,height:109,left:29,right:36,depth:41,lean:-8},
 {id:'远峰三',x:-22,z:-405,height:98,left:26,right:30,depth:44,lean:5}
];

// A broad, continuous mountain turns into a distant peak as the gallery turns.
// The gallery stays at y=0: it is a lookout above a real, deep valley.
export function mountainCentre(z){
 const turn=T.MathUtils.smootherstep(-z,104,248);
 return T.MathUtils.lerp(LUSHAN.mainCentre,LUSHAN.rearCentre,turn)+Math.sin(z*.023)*2.4*(1-turn);
}
export function mountainHeight(u,z){
 const edge=Math.abs(u*2-1),end=T.MathUtils.smoothstep(z,LUSHAN.back,LUSHAN.back+60)*(1-T.MathUtils.smoothstep(z,LUSHAN.front-42,LUSHAN.front));
 const x=mountainCentre(z)+(u-.5)*LUSHAN.halfWidth*2,crown=Math.pow(Math.max(0,1-Math.pow(edge,1.6)),.69);
 // Low connected foothills hold distinct, narrow elliptical rock ridges.
 // From the back, the principal peak rises thirty metres above either
 // shoulder. From the side, five offset summits form a long, notched ridge.
 const foot=57*crown;let peak=0;
 for(const summit of LUSHAN_SUMMITS){
  const along=(z-summit.z)/summit.depth;if(Math.abs(along)>=1)continue;
  const shiftedX=summit.x+summit.lean*along+Math.sin(along*3.7)*2.0*(1-Math.abs(along)),dx=x-shiftedX,width=dx<0?summit.left:summit.right,across=Math.abs(dx)/width;if(across>=1)continue;
  const rawBlade=Math.pow(1-Math.pow(across,.86),.77),side=dx<0?1:-1,ledge=.075*Math.exp(-Math.pow((across-.29-side*.035)/.065,2))+.055*Math.exp(-Math.pow((across-.62+side*.025)/.093,2))-.046*Math.exp(-Math.pow((across-.45)/.06,2));
  const blade=Math.max(0,Math.min(1,rawBlade+ledge)),shoulder=Math.pow(1-Math.pow(Math.abs(along),1.35),.83),summitU=(summit.x-mountainCentre(summit.z))/(LUSHAN.halfWidth*2)+.5,summitFoot=57*Math.pow(Math.max(0,1-Math.pow(Math.abs(summitU*2-1),1.6)),.69);
  peak=Math.max(peak,(summit.height-summitFoot)*blade*shoulder);
 }
 const chisel=(.62*Math.sin(x*.61+z*.43)+.37*Math.sin(x*1.14-z*.29)+.25*Math.cos(x*.27+z*.93))*Math.min(1,peak/18);
 const gullies=Math.pow(Math.max(0,Math.sin(x*.14+z*.09)),8)*Math.min(2.8,peak*.047);
 const fractureMask=T.MathUtils.smoothstep(peak,9,32)*(1-T.MathUtils.smoothstep(peak,56,69)),rib=(Math.sin(x*.31+z*.037)*3.1+Math.sin(x*.69-z*.051)*1.2+Math.cos(z*.19+x*.06)*.8)*fractureMask;
 return LUSHAN.valley+Math.max(0,(foot+peak+chisel-gullies+rib)*end);
}
export function mountainPoint(u,z){return V(mountainCentre(z)+(u-.5)*LUSHAN.halfWidth*2,mountainHeight(u,z),z);}
export function createMountainRidgeGeometry(crossSegments=84,lengthSegments=196){
 const positions=[],indices=[],uvs=[];
 for(let i=0;i<=lengthSegments;i++){
  const z=T.MathUtils.lerp(LUSHAN.front,LUSHAN.back,i/lengthSegments);
  for(let j=0;j<=crossSegments;j++){
   let u=j/crossSegments;
   // Place a real vertex along the upper blade rather than accidentally
   // flattening a narrow summit between two uniform cross-grid columns.
   for(const summit of LUSHAN_SUMMITS){
    const along=(z-summit.z)/summit.depth;if(Math.abs(along)>.75)continue;
    const tipU=(summit.x+summit.lean*along+Math.sin(along*3.7)*2.0*(1-Math.abs(along))-mountainCentre(z))/(LUSHAN.halfWidth*2)+.5;
    if(Math.round(tipU*crossSegments)===j)u=tipU;
   }
   const p=mountainPoint(u,z);positions.push(...p.toArray());uvs.push(u,i/lengthSegments);
  }
 }
 for(let i=0;i<lengthSegments;i++)for(let j=0;j<crossSegments;j++){
  const a=i*(crossSegments+1)+j,b=a+crossSegments+1;indices.push(a,a+1,b,a+1,b+1,b);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={valleyY:LUSHAN.valley,continuous:true,crestSamples:Array.from({length:58},(_,i)=>mountainPoint(.5,65-i*8).toArray())};return geometry;
}

// The farther ranges are separately sculpted landforms. Their paired distant
// peaks sit on either side of the principal summit in the rear window;
// across the gallery, their long ridges rise behind different foreground gaps.
export const LUSHAN_RANGES=[
 {id:'中景重岭',front:109,back:-467,sideCentre:-252,rearCentre:-8,turnStart:116,turnEnd:304,halfWidth:136,foot:42,seed:3,peaks:[
  {x:-261,z:65,y:42,left:26,right:38,depth:39,lean:-6},{x:-249,z:16,y:59,left:30,right:23,depth:47,lean:5},
  {x:-251,z:-58,y:52,left:28,right:43,depth:52,lean:-4},{x:-185,z:-151,y:35,left:24,right:31,depth:54,lean:7},
  {x:-36,z:-292,y:50,left:18,right:25,depth:57,lean:-4},{x:19,z:-330,y:51,left:19,right:26,depth:60,lean:5},
  {x:-6,z:-401,y:37,left:29,right:21,depth:48,lean:-6}]},
 {id:'后景峰群',front:147,back:-590,sideCentre:-354,rearCentre:5,turnStart:141,turnEnd:367,halfWidth:150,foot:36,seed:7,peaks:[
  {x:-375,z:99,y:64,left:36,right:24,depth:46,lean:7},{x:-348,z:43,y:80,left:24,right:37,depth:37,lean:-8},
  {x:-340,z:-12,y:69,left:31,right:24,depth:41,lean:5},{x:-356,z:-71,y:78,left:29,right:35,depth:48,lean:-5},
  {x:-254,z:-223,y:31,left:22,right:39,depth:43,lean:8},{x:-40,z:-417,y:82,left:31,right:37,depth:58,lean:-7},
  {x:28,z:-438,y:76,left:29,right:32,depth:49,lean:4},{x:1,z:-531,y:49,left:28,right:31,depth:40,lean:-5}]},
 {id:'远景叠嶂',front:163,back:-704,sideCentre:-466,rearCentre:-17,turnStart:166,turnEnd:447,halfWidth:159,foot:32,seed:11,peaks:[
  {x:-456,z:121,y:74,left:29,right:38,depth:48,lean:-8},{x:-479,z:45,y:95,left:35,right:24,depth:55,lean:6},
  {x:-456,z:-38,y:86,left:27,right:36,depth:40,lean:-5},{x:-424,z:-112,y:84,left:34,right:24,depth:54,lean:7},
  {x:-265,z:-302,y:43,left:30,right:23,depth:46,lean:-8},{x:-29,z:-530,y:100,left:25,right:26,depth:69,lean:6},
  {x:10,z:-555,y:94,left:24,right:28,depth:61,lean:-7},{x:-11,z:-633,y:64,left:24,right:19,depth:55,lean:6}]}
];

export function createLayeredRangeGeometry(spec,crossSegments=72,lengthSegments=168){
 const positions=[],uvs=[],indices=[],centre=z=>T.MathUtils.lerp(spec.sideCentre,spec.rearCentre,T.MathUtils.smootherstep(-z,spec.turnStart,spec.turnEnd))+Math.sin(z*.012+spec.seed)*4;
 const base=(u,z)=>{const edge=Math.abs(u*2-1);return spec.foot*Math.pow(Math.max(0,1-Math.pow(edge,1.4)),.76);};
 const peakX=(peak,z)=>{const a=(z-peak.z)/peak.depth;return peak.x+peak.lean*a+Math.sin(a*4.1+spec.seed)*1.5*(1-Math.abs(a));};
 function height(u,z){
  const x=centre(z)+(u-.5)*spec.halfWidth*2,foot=base(u,z);let top=0;
  for(const peak of spec.peaks){const a=(z-peak.z)/peak.depth;if(Math.abs(a)>=1)continue;const dx=x-peakX(peak,z),width=dx<0?peak.left:peak.right,q=Math.abs(dx)/width;if(q>=1)continue;
   const shoulder=Math.pow(1-Math.pow(Math.abs(a),1.21),.9),notch=.045*Math.exp(-Math.pow((q-.37)/.09,2)),tooth=.07*Math.exp(-Math.pow((q-.62)/.085,2));
   const blade=Math.max(0,Math.min(1,Math.pow(1-Math.pow(q,.82),.83)-notch+tooth));
   const summitU=(peak.x-centre(peak.z))/(spec.halfWidth*2)+.5;
   top=Math.max(top,(peak.y-LUSHAN.valley-base(summitU,peak.z))*blade*shoulder);
  }
  const fractures=(Math.sin(x*.17+z*.039+spec.seed)*2.1+Math.sin(x*.43-z*.074)*.7)*T.MathUtils.smoothstep(top,10,30)*(1-T.MathUtils.smoothstep(top,105,140));
  const fade=T.MathUtils.smoothstep(z,spec.back,spec.back+35)*(1-T.MathUtils.smoothstep(z,spec.front-25,spec.front));
  return LUSHAN.valley+(foot+top+fractures)*fade;
 }
 for(let i=0;i<=lengthSegments;i++){const z=T.MathUtils.lerp(spec.front,spec.back,i/lengthSegments);for(let j=0;j<=crossSegments;j++){
  let u=j/crossSegments;for(const peak of spec.peaks){if(Math.abs((z-peak.z)/peak.depth)>.7)continue;const tip=(peakX(peak,z)-centre(z))/(spec.halfWidth*2)+.5;if(Math.round(tip*crossSegments)===j)u=tip;}
  positions.push(centre(z)+(u-.5)*spec.halfWidth*2,height(u,z),z);uvs.push(u,i/lengthSegments);
 }}
 for(let i=0;i<lengthSegments;i++)for(let j=0;j<crossSegments;j++){const a=i*(crossSegments+1)+j,b=a+crossSegments+1;indices.push(a,a+1,b,a+1,b+1,b);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData={independentRange:true,rangeId:spec.id,summits:spec.peaks.map(p=>[p.x,p.y,p.z])};return geometry;
}

export function mountainRockMaterial(color,{distance=0}={}){
 const material=new T.MeshStandardMaterial({color,roughness:1,metalness:0,side:T.DoubleSide,flatShading:true});
 material.userData.rockSurface={texturePeriod:19,distance,bumpStrength:.025};
 material.onBeforeCompile=shader=>{
  shader.uniforms.ridgeRockMap={value:material.map};shader.uniforms.ridgeRockScale={value:1/19};shader.uniforms.ridgeRockBump={value:material.userData.rockSurface.bumpStrength};shader.uniforms.ridgeDistance={value:distance};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 ridgeWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nridgeWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 ridgeWorld;
   uniform sampler2D ridgeRockMap;
   uniform float ridgeRockScale;
   uniform float ridgeRockBump;
   uniform float ridgeDistance;
   float ridgeHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float ridgeNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(ridgeHash(i),ridgeHash(i+vec3(1,0,0)),f.x),mix(ridgeHash(i+vec3(0,1,0)),ridgeHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(ridgeHash(i+vec3(0,0,1)),ridgeHash(i+vec3(1,0,1)),f.x),mix(ridgeHash(i+vec3(0,1,1)),ridgeHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   vec3 ridgeTriplanar(vec3 point,vec3 face){
    vec3 weights=pow(abs(face),vec3(3.5));weights/=max(dot(weights,vec3(1.)),.0001);
    vec3 a=texture2D(ridgeRockMap,point.zy*ridgeRockScale+vec2(.13,.31)).rgb;
    vec3 b=texture2D(ridgeRockMap,point.xz*ridgeRockScale+vec2(.37,.07)).rgb;
    vec3 c=texture2D(ridgeRockMap,point.xy*ridgeRockScale+vec2(.11,.43)).rgb;
    return a*weights.x+b*weights.y+c*weights.z;
   }`);
  // Each nineteen-metre patch uses the same small rock-surface image in world
  // space. Vertical cliffs keep their detail; no UV spans the entire ridge.
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 ridgeFace=normalize(cross(dFdx(ridgeWorld),dFdy(ridgeWorld)));
   float ridgeBumpHeight=0.;
   #ifdef USE_MAP
    vec3 ridgePigment=ridgeTriplanar(ridgeWorld,ridgeFace);
    ridgeBumpHeight=dot(ridgePigment,vec3(.2126,.7152,.0722));
    float ridgeGrey=pow(max(ridgeBumpHeight,.015),.79);
    ridgePigment=mix(vec3(ridgeGrey),ridgePigment,.04)*vec3(.94,1.,.97);
    ridgePigment=mix(ridgePigment,vec3(.43,.50,.46),ridgeDistance*.52);
    diffuseColor.rgb*=ridgePigment;
   #endif`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float broadRock=ridgeNoise(ridgeWorld*vec3(.027,.044,.034));
   float brokenStone=ridgeNoise(ridgeWorld*vec3(.18,.11,.21));
   float grain=ridgeNoise(ridgeWorld*vec3(1.8,1.4,2.1));
   float seam=1.-smoothstep(.045,.16,abs(sin(ridgeWorld.x*.21+ridgeWorld.z*.034+broadRock*1.3)));
   float fissure=(1.-smoothstep(.03,.15,abs(sin(ridgeWorld.z*.16-ridgeWorld.y*.035+brokenStone*2.1))))*smoothstep(.28,.65,brokenStone);
   float rockValue=.92+smoothstep(.29,.71,broadRock)*.14+brokenStone*.06+grain*.025;
   diffuseColor.rgb*=rockValue*(1.-seam*.08-fissure*.09);
   float lowerMist=1.-smoothstep(-42.,-2.,ridgeWorld.y);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.42,.50,.46),lowerMist*.16);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   #ifdef USE_MAP
    vec3 ridgeDx=dFdx(-vViewPosition),ridgeDy=dFdy(-vViewPosition);
    vec3 ridgeR1=cross(ridgeDy,normal),ridgeR2=cross(normal,ridgeDx);
    float ridgeDet=dot(ridgeDx,ridgeR1);
    vec3 ridgeGradient=sign(ridgeDet)*(dFdx(ridgeBumpHeight)*ridgeR1+dFdy(ridgeBumpHeight)*ridgeR2);
    if(abs(ridgeDet)>.000001)normal=normalize(normal-ridgeRockBump*ridgeGradient/abs(ridgeDet));
   #endif`);
 };
 material.customProgramCacheKey=()=>`grand-continuous-lushan-grey-rock-v5-${material.map?'bitmap':'fallback'}-${distance}`;return material;
}

function mergePieces(pieces){
 const positions=[],indices=[];let offset=0;
 for(const {geometry,matrix} of pieces){
  const p=geometry.attributes.position;for(let i=0;i<p.count;i++)positions.push(...V().fromBufferAttribute(p,i).applyMatrix4(matrix).toArray());
  const index=geometry.index;if(index)for(let i=0;i<index.count;i++)indices.push(index.getX(i)+offset);else for(let i=0;i<p.count;i++)indices.push(offset+i);
  offset+=p.count;geometry.dispose();
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

// Fine needles cannot be resolved on a four-pixel tree. These distant pines
// still have curved trunks, radial boughs, uneven flat crowns and three
// silhouettes. They complement the high-detail CC0 pines on exposed ledges.
function distantPineGeometry(variant){
 const wood=[],needles=[],object=new T.Object3D(),twist=.32+variant*.38;
 const stem=new T.CatmullRomCurve3([V(0,0,0),V(.018,.40,0),V(-.017,.84,.015),V(.03,1.38,.023)]);
 wood.push({geometry:new T.TubeGeometry(stem,8,.018,5,false),matrix:new T.Matrix4()});
 function branch(a,b,radius){const d=b.clone().sub(a);object.position.copy(a).add(b).multiplyScalar(.5);object.quaternion.setFromUnitVectors(V(0,1,0),d.clone().normalize());object.scale.set(1,1,1);object.updateMatrix();wood.push({geometry:new T.CylinderGeometry(radius*.28,radius,d.length(),5),matrix:object.matrix.clone()});}
 for(let level=0;level<5;level++)for(let arm=0;arm<3;arm++){
  const angle=arm*Math.PI*2/3+level*.83+twist,reach=(.38-level*.032)*(1+.11*Math.sin(level*3.4+arm+variant)),y=.39+level*.195;
  const start=stem.getPoint(y/1.4),end=V(Math.cos(angle)*reach,y+.06+Math.sin(angle*2.4)*.025,Math.sin(angle)*reach);
  branch(start,end,.013-level*.0014);
  for(let tuft=0;tuft<2;tuft++){
   const point=start.clone().lerp(end,.58+tuft*.39),size=.12+level*.003+(tuft?.045:0);object.position.copy(point);object.rotation.set(.12*Math.sin(angle),angle,Math.sin(level+arm)*.1);object.scale.set(size*1.5,size*.56,size*1.04);object.updateMatrix();
   const cloud=new T.SphereGeometry(1,7,4),p=cloud.attributes.position;for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),c=p.getZ(i),rough=1+.19*Math.sin(a*9+c*7+b*11+variant);p.setXYZ(i,a*rough,b*rough,c*rough);}needles.push({geometry:cloud,matrix:object.matrix.clone()});
  }
 }
 return {wood:mergePieces(wood),needles:mergePieces(needles)};
}

function groundedMountainPoint(ridge,u,z){
 const p=mountainPoint(u,z),ray=new T.Raycaster(V(p.x,180,p.z),V(0,-1,0));ridge.updateWorldMatrix(true,false);const hit=ray.intersectObject(ridge,false)[0];
 if(hit)p.y=hit.point.y-.13;
 return p;
}

function addDistantPines(parent,ridge){
 const group=new T.Group();group.name='远崖低面数分枝松林';parent.add(group);const dummy=new T.Object3D(),wood=new T.MeshStandardMaterial({color:0x44564a,roughness:1}),needles=new T.MeshStandardMaterial({color:0x4b6252,roughness:1});
 group.userData.groundingSamples=[];
 const groves=[{x:-169,z:34},{x:-158,z:-7},{x:-153,z:-49},{x:-21,z:-209},{x:3,z:-247},{x:-30,z:-268}];
 for(let variant=0;variant<3;variant++){
  const geo=distantPineGeometry(variant),count=24,branches=new T.InstancedMesh(geo.wood,wood,count),crowns=new T.InstancedMesh(geo.needles,needles,count);group.add(branches,crowns);
  for(let i=0;i<count;i++){
   const grove=groves[Math.floor(i/4)],angle=(i%4)*1.67+variant*2.1,radius=1.6+variant*1.6,z=grove.z+Math.sin(angle)*radius,u=(grove.x+Math.cos(angle)*radius-mountainCentre(z))/(LUSHAN.halfWidth*2)+.5,p=groundedMountainPoint(ridge,u,z),height=2.0+(Math.sin(i*2.11+variant)*.5+.5)*1.8;
   group.userData.groundingSamples.push(p.toArray());
   dummy.position.copy(p);dummy.rotation.set(0,i*2.13+variant,0);dummy.scale.setScalar(height/1.4);dummy.updateMatrix();branches.setMatrixAt(i,dummy.matrix);crowns.setMatrixAt(i,dummy.matrix);
  }
  for(const mesh of [branches,crowns]){mesh.castShadow=false;mesh.receiveShadow=false;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();}
 }
 return group;
}

export const INK_PANORAMA={radius:230,height:220,centre:[-10.15,0,-17],sideAngle:Math.PI*1.5,rearAngle:Math.PI,sideImageHeight:80,rearImageHeight:152.5,sideImageCentre:6.72,rearImageCentre:-.065,sideSpan:1.075,rearSpan:2.0,peakUV:[.625,.83]};
function inkPanoramaMaterial({feather=.045,contrast=.87,backdrop=0x8a9d92}={}){
 const material=new T.MeshBasicMaterial({transparent:true,depthWrite:false,depthTest:true,side:T.BackSide,fog:false,toneMapped:false});
 material.userData.inkPanorama={feather,contrast,unlit:true,originalPanorama:true,continuous360:true};
 material.onBeforeCompile=shader=>{
  shader.uniforms.paintOrigin={value:V(...INK_PANORAMA.centre)};shader.uniforms.paintBackdrop={value:new T.Color(backdrop)};shader.uniforms.paintInk={value:new T.Color(0x25352c)};shader.uniforms.paintFeather={value:feather};shader.uniforms.paintContrast={value:contrast};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 paintWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\npaintWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 paintWorld;uniform vec3 paintOrigin,paintBackdrop,paintInk;uniform float paintFeather,paintContrast;
   float paintAngleDelta(float angle){return atan(sin(angle),cos(angle));}
   float paintMirror(float value){return 1.-abs(mod(value,2.)-1.);}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   #ifdef USE_MAP
    float paintAngle=mod(atan(paintWorld.x-paintOrigin.x,paintWorld.z-paintOrigin.z)+6.283185307,6.283185307);
    float paintRear=1.-smoothstep(.20,1.38,abs(paintAngleDelta(paintAngle-3.141592654)));
    float paintSideU=.5-paintAngleDelta(paintAngle-4.71238898)/1.075;
    float paintRearU=.625-paintAngleDelta(paintAngle-3.141592654)/2.00;
    float paintU=paintMirror(mix(paintSideU,paintRearU,paintRear));
    float paintHeight=mix(80.,152.5,paintRear),paintCentre=mix(6.72,-.065,paintRear);
    vec2 paintUv=vec2(paintU,clamp(.5+(paintWorld.y-paintCentre)/paintHeight,0.,1.));
    vec3 paintSample=texture2D(map,paintUv).rgb;
    float paintGrey=dot(paintSample,vec3(.2126,.7152,.0722));
    float paintDensity=pow(clamp((1.-paintGrey)/.88,0.,1.),.91);
    // Match the painting's paper to the actual sky. Only the ink remains
    // dark, so neither a pale rectangular board nor a hard edge is visible.
    diffuseColor.rgb=mix(paintBackdrop,paintInk,paintDensity*mix(paintContrast,.95,paintRear));
    // The complete circle has no lateral border. Its only geometry edges
    // fade far above and below the player's view into matching grey sky.
    float paintEdge=smoothstep(0.,paintFeather,vMapUv.y)*smoothstep(0.,paintFeather,1.-vMapUv.y);
    diffuseColor.a*=paintEdge;
   #endif`);
 };
 material.customProgramCacheKey=()=> 'lushan-original-curved-ink-panorama-v3';return material;
}

export function inkPanoramaPeakPoint(id){
 const rear=id==='mountain-rear',angle=rear?INK_PANORAMA.rearAngle:INK_PANORAMA.sideAngle-(INK_PANORAMA.peakUV[0]-.5)*INK_PANORAMA.sideSpan,height=rear?INK_PANORAMA.rearImageHeight:INK_PANORAMA.sideImageHeight,centre=rear?INK_PANORAMA.rearImageCentre:INK_PANORAMA.sideImageCentre;
 return V(INK_PANORAMA.centre[0]+INK_PANORAMA.radius*Math.sin(angle),centre+(INK_PANORAMA.peakUV[1]-.5)*height,INK_PANORAMA.centre[2]+INK_PANORAMA.radius*Math.cos(angle));
}

export function addMountainLandscape(parent){
 const group=new T.Group();group.name='窗外原创水墨画境';parent.add(group);
 const panorama=new T.Mesh(new T.CylinderGeometry(INK_PANORAMA.radius,INK_PANORAMA.radius,INK_PANORAMA.height,160,1,true),inkPanoramaMaterial());panorama.name='连续弧形原创水墨画境';panorama.position.fromArray(INK_PANORAMA.centre);panorama.renderOrder=-2;group.add(panorama);
 panorama.userData.inkPanorama=true;panorama.userData.originalPanoramaUrl=INK_PANORAMA_URL.href;panorama.userData.continuous360=true;panorama.castShadow=false;panorama.receiveShadow=false;
 const floor=new T.Mesh(new T.PlaneGeometry(1600,1600).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x82968b,roughness:1}));floor.name='八十六米下的谷底';floor.position.set(-170,LUSHAN.valley-.1,-180);group.add(floor);
 // These trees frame the building's ends, never its two view apertures.
 const edgeTrees=[{position:[4.8,-.06,-25.6],height:7.7,rotation:.8},{position:[-17.4,-.09,4.2],height:8.6,rotation:2.2},{position:[6.8,-.15,5.8],height:6.4,rotation:4.0}].map(o=>addTree(parent,{...o,tint:0x799178}));
 const landscape={group,ridge:panorama,layers:[panorama],panoramaPlanes:[panorama],panoramaSurface:panorama,panoramaViews:INK_PANORAMA,peakPoint:inkPanoramaPeakPoint,treeGroups:[],edgeTrees,geometry:panorama.geometry,valleyY:LUSHAN.valley,textureStatus:'loading',textureUrl:INK_PANORAMA_URL.href,mode:'continuous-curved-ink-panorama',peakSourceUV:[.625,.83]};
 const skyClouds=createCloudBank(parent,{color:0xa3b4a8,name:'庐山_上梁流云与山间云带',cards:[
  {position:[-1.95,10.72,-17],width:26,height:1.10,opacity:.19,phase:1.2,speed:.72,layer:1},
  {position:[-10.15,9.83,-2.05],width:8.2,height:.9,opacity:.18,phase:3.4,speed:.67,layer:1},
  {position:[-177,16,-33],width:150,height:6.5,opacity:.17,phase:2.1,speed:.63,layer:2},
  {position:[-135,6,-20],width:180,height:8,opacity:.18,phase:4.3,speed:.72,layer:2},
  {position:[-23,25,-201],width:105,height:7,opacity:.14,phase:5.8,speed:.58,layer:2},
  {position:[-10,10,-173],width:145,height:9,opacity:.16,phase:.7,speed:.63,layer:2},
  {position:[-150,36,-100],width:120,height:9,opacity:.12,phase:3.0,speed:.67,layer:1},
  {position:[-66,1,-86],width:96,height:5,opacity:.17,phase:4.8,speed:.71,layer:0}
 ]});
 landscape.skyClouds=skyClouds;landscape.updateClouds=(time,camera)=>skyClouds.update(time,camera);skyClouds.update(0);
 const textureReady=loadInkPanorama().then(texture=>{
  landscape.texture=texture;landscape.textureStatus='loaded';
  panorama.material.map=texture;panorama.material.needsUpdate=true;
 }).catch(error=>{landscape.textureStatus='fallback';landscape.textureError=String(error);console.warn('原创水墨山景未能加载。',error);});
 landscape.ready=Promise.all([textureReady,...edgeTrees.map(g=>g.userData.ready)]).then(()=>landscape);
 return landscape;
}

function lookoutMistMaterial(base,{soilCentre=null,radius=1,cliff=false}={}){
 const material=base.clone();material.transparent=true;material.depthWrite=false;material.userData.mistEdge={soilCentre,radius,cliff};
 material.onBeforeCompile=shader=>{
  shader.uniforms.lookoutSoilCentre={value:soilCentre?new T.Vector2(...soilCentre):new T.Vector2()};shader.uniforms.lookoutSoilRadius={value:radius};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 lookoutWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nlookoutWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 lookoutWorld;uniform vec2 lookoutSoilCentre;uniform float lookoutSoilRadius;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n${cliff?'diffuseColor.a*=smoothstep(-31.,-7.,lookoutWorld.y)*.91;':'float lookoutRadius=length(lookoutWorld.xz-lookoutSoilCentre)/lookoutSoilRadius;diffuseColor.a*=1.-smoothstep(.35,.94,lookoutRadius);'}`);
 };material.customProgramCacheKey=()=>cliff?'lushan-cliff-mist-fade-v1':'lushan-root-soil-fade-v1';return material;
}

export function createLookoutTerrace(parent){
 const stone=new T.MeshStandardMaterial({color:0x617464,roughness:1}),top=new T.MeshStandardMaterial({color:0x788273,roughness:.95});
 const cliffStone=lookoutMistMaterial(stone,{cliff:true});
 // The walking surface remains exactly at y=0; its irregular sides descend
 // into the valley rather than ending on a featureless infinite plane.
 const surface=new T.Group(),cliff=new T.Group();surface.name='山廊台地';cliff.name='雾中山廊岩台';parent.add(surface,cliff);
 for(const [x,z,w,d] of [[0,-16.5,4.9,25],[-5,1,14,3.2],[-10.15,-.5,5.4,7]]){
  const slab=new T.Mesh(new T.BoxGeometry(w,.25,d),top);slab.name='贴合折廊的台地石板';slab.position.set(x,-.18,z);slab.receiveShadow=true;surface.add(slab);
  const wall=new T.Mesh(new T.CylinderGeometry(1,1,1,22,12),cliffStone),p=wall.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   const a=p.getX(i),y=p.getY(i),b=p.getZ(i),wave=1+.045*Math.sin(Math.atan2(b,a)*7+y*11)+.025*Math.sin(b*13-a*7+y*9),spread=1+1.2*(.5-y);
   p.setXYZ(i,a*w*.45*wave*spread,y*65,b*d*.45*wave*spread);
  }
  wall.geometry.computeVertexNormals();wall.position.set(x,-32.9,z);wall.name='山廊下的陡岩';wall.receiveShadow=true;cliff.add(wall);
 }
 // The framing pines grow from connected rocky spurs, not from empty air
 // outside the narrow walkway. Their roots remain below the soil surface.
 for(const [x,z,radius]of [[4.8,-25.6,3.0],[-17.4,4.2,5.2],[6.8,5.8,5.5]]){
  const p=[],ids=[],rings=9,segments=24;
  for(let ring=0;ring<=rings;ring++)for(let j=0;j<=segments;j++){
   const q=ring/rings,angle=j/segments*Math.PI*2,r=radius*q*(1+.035*Math.sin(angle*5)*q),height=-.05-q*q*.55;
   p.push(x+Math.cos(angle)*r,height,z+Math.sin(angle)*r);
  }
  for(let ring=0;ring<rings;ring++)for(let j=0;j<segments;j++){const a=ring*(segments+1)+j,b=a+segments+1;ids.push(a,b,a+1,a+1,b,b+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ids);g.computeVertexNormals();const spur=new T.Mesh(g,lookoutMistMaterial(top,{soilCentre:[x,z],radius}));spur.name='松根相连的岩台土面';spur.receiveShadow=true;surface.add(spur);
  const rock=new T.Mesh(new T.CylinderGeometry(radius*.94,radius*1.7,64,19,6),cliffStone);rock.position.set(x,-32.6,z);rock.name='松根下的连续岩壁';cliff.add(rock);
 }
 return {surface,cliff};
}
