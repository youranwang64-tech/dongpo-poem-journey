import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

// A variable-radius branch, including a little uneven bark in its silhouette.
// Shared forks begin on the parent curve, rather than floating beside the trunk.
function taperedWood(curve,startRadius,endRadius,segments=12,sides=7,seed=0){
 const p=[],colours=[],indices=[],frames=curve.computeFrenetFrames(segments,false),colour=new T.Color();
 for(let i=0;i<=segments;i++){
  const t=i/segments,centre=curve.getPointAt(t),radius=endRadius+(startRadius-endRadius)*Math.pow(1-t,.92);
  for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI*2,bark=1+.058*Math.sin(a*3+t*8+seed)+.021*Math.sin(a*7-t*17+seed*1.8),point=centre.clone().addScaledVector(frames.normals[i],Math.cos(a)*radius*bark).addScaledVector(frames.binormals[i],Math.sin(a)*radius*bark);
   p.push(...point.toArray());colour.set(0x596258).multiplyScalar(.88+.15*(Math.sin(a*3+t*13+seed)*.5+.5));colours.push(colour.r,colour.g,colour.b);
   if(i<segments&&j<sides){const q=i*(sides+1)+j;indices.push(q,q+sides+1,q+1,q+1,q+sides+1,q+sides+2);}
  }
 }
 for(const end of [0,1]){
  const centre=curve.getPointAt(end),at=p.length/3,row=end?segments*(sides+1):0;p.push(...centre.toArray());colour.set(0x505a50);colours.push(colour.r,colour.g,colour.b);
  for(let j=0;j<sides;j++)indices.push(at,row+j+(end?0:1),row+j+(end?1:0));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colours,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

function leafletGeometry(){
 const p=[],uv=[],indices=[];
 for(let i=0;i<=4;i++){
  const t=i/4,width=Math.pow(Math.sin(t*Math.PI),.73)*.083,arch=Math.sin(t*Math.PI)*.025;
  p.push(-width,t*.40,arch,width*.03,t*.40,arch+.012*Math.sin(t*Math.PI),width,t*.40,arch-.005);uv.push(0,t,.5,t,1,t);
  if(i<4){const q=i*3;indices.push(q,q+3,q+1,q+1,q+3,q+4,q+1,q+4,q+2,q+2,q+4,q+5);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

const rootFogFragment=`
varying vec2 treeUv;varying float treePhase;
uniform float treeTime,treeFade;
float th(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float tn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(th(i),th(i+vec2(1.,0.)),f.x),mix(th(i+vec2(0.,1.)),th(i+vec2(1.)),f.x),f.y);}
void main(){vec2 q=treeUv*2.-1.;float fold=tn(treeUv*vec2(6.,3.)+vec2(treeTime*.012,treePhase));float edge=pow(max(0.,1.-dot(q,q)),1.6);float alpha=edge*(.11+.14*fold)*treeFade;if(alpha<.002)discard;gl_FragColor=vec4(.86,.875,.83,alpha);
 #include <colorspace_fragment>
}
`;

/** One rounded grey-ink lychee tree holds the last fruit. No texture downloads.
 * stemAttach, when supplied, is the actual upper end of the fruit's stalk.
 * The default derives that end from the existing .23-high, -.11-rotated stalk.
 */
export function buildLycheeEndingTree(scene,{floorY=-5,fruitPosition=[-1.35,-2.4,-17.4],fruitScale=.55,stemAttach=null}={}){
 const fruit=Array.isArray(fruitPosition)?V(...fruitPosition):fruitPosition.clone(),dx=fruit.x+1.35,dz=fruit.z+17.4;
 const P=(x,height,z)=>V(x+dx,floorY+height,z+dz),stemCentre=fruit.clone().add(V(.025,1.14*fruitScale,0));
 const attachment=stemAttach?(Array.isArray(stemAttach)?V(...stemAttach):stemAttach.clone()):stemCentre.clone().add(V(0,.115*fruitScale,0).applyAxisAngle(V(0,0,1),-.11));
 const group=new T.Group();group.name='最后一颗荔枝的独树';group.userData.lycheeEndingTree=true;scene.add(group);
 const random=seeded(84913),parts=[],branches=[],leaflets=[],crownClusters=[],forkErrors=[];
 function branch(points,r0,r1,steps=12,sides=7){const curve=new T.CatmullRomCurve3(points,false,'centripetal');parts.push(taperedWood(curve,r0,r1,steps,sides,branches.length*.73));branches.push(curve);return curve;}
 const rootX=-4.75,rootZ=-20.15;
 const trunk=branch([P(rootX,-.055,rootZ),P(-4.68,.57,-20.18),P(-4.53,1.20,-20.23),P(-4.55,1.90,-20.37),P(-4.77,2.58,-20.61),P(-4.71,3.19,-20.78),P(-4.84,3.82,-20.86)],.325,.085,24,10);
 const fruitStart=trunk.getPointAt(.51),fruitBranch=branch([fruitStart,P(-3.58,3.08,-19.58),P(-2.83,3.70,-18.94),P(-2.07,3.87,-18.15),P(-1.55,3.57,-17.65),attachment.clone()],.125,.0105,24,8);
 forkErrors.push(fruitBranch.getPointAt(0).distanceTo(fruitStart));
 const crown=[];
 for(let i=0;i<8;i++){
  const angle=i*Math.PI*.25+.10*(random()-.5),start=trunk.getPointAt(.40+i*.066),spread=i<6?1.64:1.20;
  const end=P(-4.87+Math.cos(angle)*spread,4.06+random()*.59+(i>5?.14:0),-20.77+Math.sin(angle)*(i<6?1.34:1.02));
  const mid=start.clone().lerp(end,.48).add(V(0,.34,0)),nearTip=start.clone().lerp(end,.82).add(V(0,.14,0));
  const fork=branch([start,mid,nearTip,end],.12-i*.006,.016,14,7);crown.push(fork);forkErrors.push(fork.getPointAt(0).distanceTo(start));
 }
 function leafyTwig(parent,t,index){
  const at=parent.getPointAt(t),angle=index*2.39996+random()*.4,outward=V(Math.cos(angle),.08+random()*.24,Math.sin(angle)),tip=at.clone().addScaledVector(outward,.54+random()*.16);
  const twig=branch([at,at.clone().lerp(tip,.48).add(V(0,.07,0)),tip],.018,.0035,5,5);forkErrors.push(twig.getPointAt(0).distanceTo(at));
  for(let k=0;k<7;k++){
   const terminal=k===6,f=terminal?.96:.24+Math.floor(k/2)*.25,anchor=twig.getPointAt(f),sgn=k%2?-1:1;
   const leafAngle=angle+(terminal?0:sgn*(.66+random()*.18)),direction=V(Math.cos(leafAngle),-.08+random()*.34,Math.sin(leafAngle)).normalize();
   const quaternion=new T.Quaternion().setFromUnitVectors(V(0,1,0),direction).multiply(new T.Quaternion().setFromAxisAngle(V(0,1,0),(random()-.5)*2.6));
   leaflets.push({anchor,quaternion,size:.75+random()*.36,tint:.74+random()*.30});
  }
 }
 crown.forEach((curve,i)=>[.66,.83,.98].forEach((t,j)=>{
  const centre=curve.getPointAt(t).add(V(-.10,j===1?.25:.12,-.12));crownClusters.push({centre,scale:V(.65+random()*.19,.49+random()*.29,.64+random()*.22),turn:random()*Math.PI,tint:.84+random()*.19});
  leafyTwig(curve,t,i*6+j*2);leafyTwig(curve,Math.min(1,t+.018),i*6+j*2+1);
 }));
 // The crown needs leaves facing through its depth as well as along its twigs;
 // otherwise the low rear camera sees only a thin umbrella of leaf edges.
 for(const cluster of crownClusters)for(let i=0;i<18;i++){
  const azimuth=random()*Math.PI*2,vertical=random()*1.7-.85,radial=Math.sqrt(1-vertical*vertical),direction=V(Math.cos(azimuth)*radial,vertical,Math.sin(azimuth)*radial);
  const anchor=cluster.centre.clone().add(direction.clone().multiply(cluster.scale).multiplyScalar(.25+random()*.62));
  const quaternion=new T.Quaternion().setFromUnitVectors(V(0,1,0),direction).multiply(new T.Quaternion().setFromAxisAngle(V(0,1,0),random()*Math.PI*2));
  leaflets.push({anchor,quaternion,size:1.1+random()*.5,tint:.64+random()*.35});
 }
 // A bare arched tip makes the stalk and the last fruit readable against paper.
 for(let i=0;i<5;i++){
  const base=trunk.getPointAt(.014+i*.011),a=.65+i*1.26,tip=P(rootX+Math.cos(a)*(.53+i*.06),-.065,rootZ+Math.sin(a)*(.45+i*.045));
  const root=branch([base,base.clone().lerp(tip,.54).add(V(0,-.06,0)),tip],.11-i*.011,.012,8,7);forkErrors.push(root.getPointAt(0).distanceTo(base));
 }
 const woodGeometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());woodGeometry.computeBoundingSphere();
 const woodMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,envMapIntensity:.08,transparent:true});
 const wood=new T.Mesh(woodGeometry,woodMaterial);wood.name='渐细弯干与自然分叉';wood.receiveShadow=true;wood.castShadow=false;group.add(wood);
 // Small foliage volumes sit underneath the paired leaflets. Their uneven,
 // overlapping edges give the crown depth without turning it into a flat fan.
 const crownGeometry=new T.IcosahedronGeometry(1,1),crownPositions=crownGeometry.attributes.position,crownNormals=crownGeometry.attributes.normal,crownColours=[],crownColour=new T.Color(),point=V();
 for(let i=0;i<crownPositions.count;i++){
  point.fromBufferAttribute(crownPositions,i);const radius=1+.10*Math.sin(point.x*8.4+point.z*5.3)*Math.sin(point.y*7.1-point.z*4.7);
  point.multiplyScalar(radius);crownPositions.setXYZ(i,point.x,point.y,point.z);point.normalize();crownNormals.setXYZ(i,point.x,point.y,point.z);
  crownColour.set(0x647562).multiplyScalar(.85+.13*Math.sin(point.x*13.1+point.y*7.4+point.z*9.2));crownColours.push(crownColour.r,crownColour.g,crownColour.b);
 }
 crownGeometry.setAttribute('color',new T.Float32BufferAttribute(crownColours,3));crownGeometry.computeBoundingSphere();
 const crownOpacity=.62,crownMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,transparent:true,opacity:crownOpacity,depthWrite:false,envMapIntensity:.04});
 crownMaterial.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 endingCrownPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nendingCrownPosition=position;');
  shader.fragmentShader='varying vec3 endingCrownPosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat crownGrain=.86+.14*sin(endingCrownPosition.x*27.+endingCrownPosition.z*17.)*sin(endingCrownPosition.y*23.-endingCrownPosition.x*11.);float crownSoftEdge=pow(abs(dot(normalize(vNormal),normalize(vViewPosition))),.55);diffuseColor.rgb*=crownGrain;diffuseColor.a*=(.82+.18*crownGrain)*(.28+.72*crownSoftEdge);');
 };crownMaterial.customProgramCacheKey=()=> 'last-lychee-rounded-crown-v2';
 const canopy=new T.InstancedMesh(crownGeometry,crownMaterial,crownClusters.length),dummy=new T.Object3D();canopy.name='荔枝树层叠的圆阔叶冠';canopy.receiveShadow=true;canopy.castShadow=false;
 crownClusters.forEach((cluster,i)=>{dummy.position.copy(cluster.centre);dummy.quaternion.identity();dummy.rotation.y=cluster.turn;dummy.scale.copy(cluster.scale);dummy.updateMatrix();canopy.setMatrixAt(i,dummy.matrix);canopy.setColorAt(i,new T.Color().setScalar(cluster.tint));});canopy.instanceMatrix.needsUpdate=true;canopy.instanceColor.needsUpdate=true;canopy.computeBoundingSphere();group.add(canopy);
 const leafTime={value:0},leafMaterial=new T.MeshStandardMaterial({color:0x42533f,roughness:1,metalness:0,side:T.DoubleSide,transparent:true,envMapIntensity:.05});leafMaterial.forceSinglePass=true;
 leafMaterial.onBeforeCompile=shader=>{
  shader.uniforms.endingTreeTime=leafTime;shader.vertexShader='uniform float endingTreeTime;varying vec2 endingLeafUV;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nendingLeafUV=uv;transformed.z+=sin(endingTreeTime*.62+instanceMatrix[3].x*1.7)*uv.y*uv.y*.014;`);
  shader.fragmentShader='varying vec2 endingLeafUV;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat leafVein=exp(-pow((endingLeafUV.x-.5)*43.,2.));float leafRib=pow(max(0.,sin(endingLeafUV.y*41.+abs(endingLeafUV.x-.5)*16.)),8.);diffuseColor.rgb*=.92+leafVein*.10+leafRib*.035;`);
 };leafMaterial.customProgramCacheKey=()=> 'last-lychee-rounded-compound-leaves-v2';
 const leaves=new T.InstancedMesh(leafletGeometry(),leafMaterial,leaflets.length);leaves.name='荔枝树成簇的灰绿复叶';leaves.userData.lycheeLeaflets=true;leaves.receiveShadow=true;
 leaflets.forEach((leaf,i)=>{dummy.position.copy(leaf.anchor);dummy.quaternion.copy(leaf.quaternion);dummy.scale.setScalar(leaf.size);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,new T.Color().setScalar(leaf.tint));});leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor.needsUpdate=true;leaves.computeBoundingSphere();if(leaves.boundingSphere)leaves.boundingSphere.radius+=.025;group.add(leaves);
 const shadowUniform={value:1},shadowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,uniforms:{fade:shadowUniform},vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float fade;void main(){vec2 q=(p-.5)*2.;float root=exp(-dot(q*vec2(1.3,2.1),q*vec2(1.3,2.1))*3.);float crown=exp(-dot((q-vec2(.12,-.27))*vec2(1.1,1.25),(q-vec2(.12,-.27))*vec2(1.1,1.25))*3.);float edge=pow(max(0.,1.-dot(q,q)),1.6);gl_FragColor=vec4(.32,.345,.31,fade*edge*(root*.09+crown*.06));}'});
 const shadow=new T.Mesh(new T.PlaneGeometry(4.6,5.2).rotateX(-Math.PI/2),shadowMaterial);shadow.name='独树根部的细柔落影';shadow.position.copy(P(rootX,.015,rootZ));shadow.renderOrder=.2;group.add(shadow);
 const rootUniforms={treeTime:{value:0},treeFade:{value:1}},fogGeometry=new T.PlaneGeometry(1,1),phases=new Float32Array([0,2.1,4.9,1.2,3.7]);fogGeometry.setAttribute('rootPhase',new T.InstancedBufferAttribute(phases,1));
 const fogMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:false,uniforms:rootUniforms,vertexShader:'attribute float rootPhase;varying vec2 treeUv;varying float treePhase;void main(){treeUv=uv;treePhase=rootPhase;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:rootFogFragment});fogMaterial.forceSinglePass=true;
 const mist=new T.InstancedMesh(fogGeometry,fogMaterial,5);mist.name='荔枝树根与冠沿的轻薄纸雾';mist.renderOrder=2.3;
 [[rootX,.18,rootZ+.35,2.25,.60,false],[rootX-.12,.25,rootZ-.2,2.50,.70,false],[rootX,.047,rootZ,2.40,1.7,true],[-6.20,3.46,-20.33,1.85,.80,false],[-4.75,4.72,-21.78,2.25,.74,false]].forEach(([x,y,z,w,h,ground],i)=>{dummy.position.copy(P(x,y,z));dummy.quaternion.identity();if(ground)dummy.rotation.x=-Math.PI/2;else dummy.rotation.y=.14;dummy.scale.set(w,h,1);dummy.updateMatrix();mist.setMatrixAt(i,dummy.matrix);});mist.instanceMatrix.needsUpdate=true;mist.computeBoundingSphere();group.add(mist);
 const triangles=woodGeometry.index.count/3+leaves.geometry.index.count/3*leaves.count+crownGeometry.attributes.position.count/3*canopy.count+2+mist.count*2,connectionError=fruitBranch.getPointAt(1).distanceTo(attachment);let fade=1,burstAge=null;
 function applyFade(value){fade=T.MathUtils.clamp(value,0,1);woodMaterial.opacity=leafMaterial.opacity=fade;crownMaterial.opacity=crownOpacity*fade;crownMaterial.depthWrite=false;woodMaterial.depthWrite=leafMaterial.depthWrite=fade>.985;rootUniforms.treeFade.value=shadowUniform.value=fade;}
 function update(time){leafTime.value=rootUniforms.treeTime.value=Number.isFinite(time)?time:0;}
 function setBurst(age){burstAge=Math.max(0,Number.isFinite(age)?age:0);applyFade(1-T.MathUtils.smoothstep(burstAge,.65,4.5)*.65);}
 function reset(){burstAge=null;applyFade(1);update(0);group.visible=true;}
 reset();
 return {group,update,reset,setBurst,attachmentPoint:attachment.toArray(),get stats(){return {enabled:true,trees:1,style:'rounded-compound-lychee',branches:branches.length,leaflets:leaflets.length,crownClusters:crownClusters.length,triangles,drawCalls:5,externalAssets:0,rootMistCards:3,crownMistCards:2,rootPosition:P(rootX,0,rootZ).toArray(),trunkDiameter:.65,crownLayers:3,attachmentPoint:attachment.toArray(),attachmentError:connectionError,maxForkError:Math.max(...forkErrors),opacity:Number(fade.toFixed(5)),burstAge};}};
}
