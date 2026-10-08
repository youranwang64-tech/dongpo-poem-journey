import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {addBamboo} from './plants.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const noop=()=>{};
const unitBox=new T.BoxGeometry(1,1,1);
const unitCylinder=new T.CylinderGeometry(1,1,1,12);
const ringGeometry=new T.TorusGeometry(.055,.009,6,18);
const geometries={box:unitBox,cylinder:unitCylinder,ring:ringGeometry,pebble:new T.IcosahedronGeometry(1,1)};

function tileGeometry(){
 const vertices=[],indices=[];
 for(let i=0;i<=8;i++)for(let end=0;end<2;end++){
  const angle=-Math.PI/2+i*Math.PI/8;
  vertices.push(Math.sin(angle)*.085,Math.cos(angle)*.031,end-.5);
 }
 for(let i=0;i<8;i++){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
geometries.tile=tileGeometry();

// These are restrained joinery details for the existing fictional buildings,
// not a claim that the game reconstructs a particular historical building.
function detailMaterials(){
 const texture=document.createElement('canvas');texture.width=texture.height=256;
 const ctx=texture.getContext('2d');ctx.fillStyle='#898574';ctx.fillRect(0,0,256,256);
 let seed=941;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<1600;i++){const value=55+random()*130;ctx.fillStyle=`rgba(${value},${value},${value},${.025+random()*.07})`;ctx.fillRect(random()*256,random()*256,.45+random(),5+random()*45);}
 for(let i=0;i<31;i++){ctx.strokeStyle='rgba(39,38,31,.08)';ctx.lineWidth=.35;ctx.beginPath();const x=i*8.1;ctx.moveTo(x,0);ctx.bezierCurveTo(x+3,72,x-2,171,x+1,256);ctx.stroke();}
 const woodMap=new T.CanvasTexture(texture);woodMap.colorSpace=T.SRGBColorSpace;woodMap.wrapS=woodMap.wrapT=T.RepeatWrapping;woodMap.anisotropy=4;
 return {
  wood:new T.MeshStandardMaterial({color:0x797b68,map:woodMap,bumpMap:woodMap,bumpScale:.016,roughness:.94}),
  dark:new T.MeshStandardMaterial({color:0x525d50,map:woodMap,bumpMap:woodMap,bumpScale:.012,roughness:.96}),
  stone:new T.MeshStandardMaterial({color:0x919788,roughness:.97}),
  tile:new T.MeshStandardMaterial({color:0x626e61,roughness:.94,side:T.DoubleSide}),
  metal:new T.MeshStandardMaterial({color:0x655f4e,roughness:.76,metalness:.16})
 };
}

// A roof is recognized by the actual 9-point slope strips used by the scene
// builders. Terrain, foliage, painted mountain planes and collision planes
// cannot pass this check. No guessed world bounding box is decorated.
function roofSurface(object){
 const g=object.geometry,p=g?.attributes?.position;
 if(g?.type!=='BufferGeometry'||!g.index||!p||p.count<81||p.count%9||object.material?.transparent)return null;
 const columns=p.count/9;if(columns<9||columns>160)return null;
 const x0=p.getX(0),x1=p.getX((columns-1)*9),z0=p.getZ(0),z1=p.getZ(8),span=Math.abs(z1-z0);
 if(Math.abs(x1-x0)<1.3||span<.7||span>7.5||Math.abs(p.getY(0)-p.getY(8))<.35)return null;
 for(let i=0;i<columns;i++)for(let j=0;j<9;j++){
  const k=i*9+j;
  if(Math.abs(p.getX(k)-p.getX(i*9))>.0001||Math.abs(p.getZ(k)-(z0+(z1-z0)*j/8))>.0001)return null;
 }
 const point=(a,b)=>V(p.getX(a*9+b),p.getY(a*9+b),p.getZ(a*9+b));
 function sample(x,u){
  const a=T.MathUtils.clamp(x,0,1)*(columns-1),b=T.MathUtils.clamp(u,0,1)*8,ai=Math.min(columns-2,Math.floor(a)),bi=Math.min(7,Math.floor(b));
  return point(ai,bi).lerp(point(ai+1,bi),a-ai).lerp(point(ai,bi+1).lerp(point(ai+1,bi+1),a-ai),b-bi);
 }
 return {width:Math.abs(x1-x0),span,sample};
}

export function decorateArchitecture(stage,index){
 if(!stage?.root||!stage.scene||index<0||index>7||stage.architectureDetail)return stage;
 const materials=detailMaterials(),batches=new Map(),stats={chapter:index+1,roofs:0,columns:0,wallRuns:0,leafHardware:0,edgeClusters:0,instanceCount:0,drawCalls:0,triangles:0,originalObjects:0};
 const originals=[];stage.root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)originals.push(o);});stats.originalObjects=originals.length;
 function batch(parent,kind,material,source=null){
  if(!batches.has(parent))batches.set(parent,new Map());const map=batches.get(parent),key=kind+':'+material;
  if(!map.has(key))map.set(key,{parent,kind,material,source,transforms:[]});return map.get(key);
 }
 function instance(parent,kind,material,position,scale=V(1,1,1),quaternion=new T.Quaternion(),source=null){
  batch(parent,kind,material,source).transforms.push(new T.Matrix4().compose(position,quaternion,scale));
 }
 const box=(parent,w,h,d,p,material='wood',source=null)=>instance(parent,'box',material,p,V(w,h,d),new T.Quaternion(),source);
 function rod(parent,a,b,r,material='wood',source=null){const direction=b.clone().sub(a);instance(parent,'cylinder',material,a.clone().add(b).multiplyScalar(.5),V(r,direction.length(),r),new T.Quaternion().setFromUnitVectors(V(0,1,0),direction.normalize()),source);}
 function ring(parent,p,rotation=0,source=null){instance(parent,'ring','metal',p,V(1,1,1),new T.Quaternion().setFromAxisAngle(V(0,1,0),rotation),source);}
 function roofDetail(parent,surface,source=null,tiled=true,frontGap=false){
  stats.roofs++;
  const columns=Math.ceil(surface.width/.22),rows=Math.ceil(surface.span/.29);
  if(tiled)for(let a=0;a<columns;a++)for(let b=0;b<rows;b++){
   const u=(b+.5)/rows,x=(a+.5)/columns,p=surface.sample(x,u),d=surface.sample(x,Math.min(1,u+.015)).sub(surface.sample(x,Math.max(0,u-.015))).normalize();
   const across=V(Math.sign(d.z)||1,0,0),up=d.clone().cross(across).normalize(),rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,up,d));
   p.y+=.016;instance(parent,'tile','tile',p,V(surface.width/columns/.17*.94,1,surface.span/rows/Math.max(.65,Math.abs(d.z))*.97),rotation,source);
  }
  const left=surface.sample(0,1),right=surface.sample(1,1),width=left.distanceTo(right),centre=left.clone().add(right).multiplyScalar(.5);
  if(!frontGap){box(parent,width,.10,.14,centre.clone().add(V(0,-.045,0)),'dark',source);box(parent,width+.02,.045,.17,centre.clone().add(V(0,-.113,0)),'wood',source);}
  // Visible rafter tails stop at the roof edge; they never cross a window.
  for(let i=0;i<=Math.ceil(width/.48);i++){
   const x=i/Math.ceil(width/.48),end=surface.sample(x,1).add(V(0,-.10,0)),start=surface.sample(x,.81).add(V(0,-.10,0));
   if(frontGap&&Math.abs(end.x)<1.35)continue;rod(parent,start,end,.037,'wood',source);
  }
 }
 function roofRecipe(parent,{x=0,y,z=0,w,d,h=.9},tiled=true,sides=[-1,1],gap=false){
  for(const side of sides){const surface={width:w+.7,span:d/2+.5,sample:(a,u)=>V(x+(a-.5)*(w+.7),y+h-u*(h+.23)+u*u*.21+Math.pow(Math.abs(a-.5)*2,5)*u*.11,z+side*u*(d/2+.5))};roofDetail(parent,surface,null,tiled,gap&&side===1);}
 }
 function capital(parent,x,y,z,r=.11,source=null){
  box(parent,r*3.7,.10,r*3.7,V(x,y-.15,z),'wood',source);
  box(parent,r*5.5,.095,r*2.4,V(x,y-.042,z),'wood',source);
  box(parent,r*2.4,.095,r*5.4,V(x,y-.044,z),'wood',source);
  for(const side of [-1,1])box(parent,r*1.65,.065,r*2.4,V(x+side*r*1.75,y+.018,z),'wood',source);
 }
 function foot(parent,x,y,z,r=.11,source=null){
  box(parent,r*3.6,.07,r*3.6,V(x,y+.015,z),'stone',source);
  instance(parent,'cylinder','stone',V(x,y+.083,z),V(r*1.53,.074,r*1.53),new T.Quaternion(),source);
 }
 function trimFrame(parent,x,z,w,h,bottom=0,source=null){
  for(const side of [-1,1]){box(parent,.055,h+.10,.085,V(x+side*(w/2+.10),bottom+h/2,z+.042),'dark',source);box(parent,.085,h+.13,.042,V(x+side*(w/2+.17),bottom+h/2,z+.065),'wood',source);}
  box(parent,w+.42,.06,.11,V(x,bottom+h+.10,z+.05),'wood',source);
  box(parent,w+.42,.09,.26,V(x,bottom-.035,z+.03),'stone',source);
 }
 function stoneCourse(parent,x,z,length,height=.23,rotation=0){
  const q=new T.Quaternion().setFromAxisAngle(V(0,1,0),rotation);
  for(let i=0;i<Math.ceil(length/.80);i++){const width=length/Math.ceil(length/.80),local=V(-length/2+(i+.5)*width,height/2,z);local.z=0;local.applyQuaternion(q).add(V(x,0,z));instance(parent,'box','stone',local,V(width-.018,height,.095),q);}
 }

 if(index===3){
  // These coordinates belong to the named, already merged house. Its missing
  // front patch remains missing; the loose repaired patch is never bridged.
  roofRecipe(stage.root,{x:0,y:2.95,z:-2.3,w:6.5,d:5.5,h:1.1},false,[-1,1],true);
  for(const x of [-3.12,-.95,.95,3.12])for(const z of [.35,-4.97]){capital(stage.root,x,2.84,z,.09);foot(stage.root,x,0,z,.105);stats.columns++;}
  for(const x of [-2.08,2.08])trimFrame(stage.root,x,.44,1.65,1.37,.89);
  trimFrame(stage.root,0,.43,1.74,2.55,.025);
  stoneCourse(stage.root,0,.735,6.9,.19);stoneCourse(stage.root,-3.49,-2.3,6.0,.19,Math.PI/2);stoneCourse(stage.root,3.49,-2.3,6.0,.19,Math.PI/2);stats.wallRuns+=3;
  for(const group of stage.root.children.filter(o=>o.name==='修屋后敞开的木门')){const side=Math.sign(group.position.x);ring(group,V(-side*.72,1.25,.12));for(const y of [.45,2.15])rod(group,V(0,y-.055,.095),V(0,y+.055,.095),.023,'metal');stats.leafHardware++;}
  for(const group of stage.root.children.filter(o=>o.name==='打开借光的居所窗')){const bounds=new T.Box3().setFromObject(group),centre=group.worldToLocal(bounds.getCenter(V())),sign=Math.sign(centre.x);box(group,.037,.15,.055,V(sign*.69,0,.10),'metal');stats.leafHardware++;}
 }else if(index===7){
  roofRecipe(stage.root,{y:4.4,z:-5.7,w:8.7,d:5.8,h:1.22});
  for(const group of stage.root.children.filter(o=>o.name==='西侧偏殿'||o.name==='东侧偏殿')){
   const side=group.name==='西侧偏殿'?-1:1,x=side*7.8;roofRecipe(group,{x,y:3.2,z:-2.6,w:2.8,d:10.1,h:.78});
   for(const z of [-6.8,-3.7,-.6,2.5])capital(group,x-side*.82,3.05,z,.08);
  }
  const gate=stage.root.children.find(o=>o.name==='南行门门楼');if(gate)roofRecipe(gate,{y:3.15,w:2.6,d:1.55,h:.62});
  for(const x of [-4,-1.43,1.43,4]){capital(stage.root,x,4.26,-3.2,.12);foot(stage.root,x,.36,-3.2,.145);stats.columns++;}
  trimFrame(stage.root,0,-3.11,2.60,3.25,.36);stoneCourse(stage.root,0,-2.955,8.8,.28);stats.wallRuns++;
  const doors=[];stage.root.traverse(o=>{if(o.name==='召回时打开的正殿门'||o.name==='再贬之后打开的南行门')doors.push(o);});
  for(const group of doors){const side=Math.sign(group.position.x),width=group.name==='召回时打开的正殿门'?1.29:.99;ring(group,V(-side*(width-.18),1.45,.15));for(const y of [.48,2.52])rod(group,V(0,y-.08,.09),V(0,y+.08,.09),.030,'metal');stats.leafHardware++;}
 }else{
  for(const object of originals){
   const surface=roofSurface(object);if(surface){roofDetail(object,surface,object);continue;}
   const p=object.geometry?.parameters||{},upright=V(0,1,0).applyQuaternion(object.quaternion).y>.995;
   const round=p.radiusTop>=.075&&p.radiusTop<=.19&&p.radiusBottom>=.075&&p.height>=2.5&&p.height<=12;
   const square=p.width>=.16&&p.width<=.31&&p.depth>=.16&&p.depth<=.34&&p.height>=2.7&&p.height<=12;
   if(upright&&(round||square)){
    const r=round?p.radiusTop:Math.max(p.width,p.depth)*.5;
    capital(object,0,p.height/2-.15,0,r,object);foot(object,0,-p.height/2,0,r,object);stats.columns++;continue;
   }
   if(object.geometry?.type==='BoxGeometry'&&p.width>=.075&&p.width<=.18&&p.depth>=.08&&p.depth<=.25&&p.height>=1.4&&p.height<=11){
    box(object,.022,p.height+.026,.065,V(p.width/2+.008,0,p.depth/2-.005),'dark',object);
    box(object,.022,p.height+.026,.065,V(-p.width/2-.008,0,p.depth/2-.005),'dark',object);
   }
   // Long, thin walls receive a stone water table and narrow plaster coping,
   // never another solid plane through a passage or an operating window.
   const thin=Math.min(p.width||0,p.depth||0),long=Math.max(p.width||0,p.depth||0);
   if(object.geometry?.type==='BoxGeometry'&&p.height>1.0&&p.height<5.5&&thin>=.13&&thin<=.7&&long>2.0){
    if(p.width>p.depth){box(object,p.width+.04,.065,p.depth+.035,V(0,p.height/2-.02,0),'stone',object);box(object,p.width,.13,p.depth+.06,V(0,-p.height/2+.064,0),'stone',object);}
    else{box(object,p.width+.035,.065,p.depth+.04,V(0,p.height/2-.02,0),'stone',object);box(object,p.width+.06,.13,p.depth,V(0,-p.height/2+.064,0),'stone',object);}
    stats.wallRuns++;
   }
  }
  if(index===5){
   const group=stage.architecture?.group;
   if(group){
    // The existing three apertures remain open. Only their outer rebates and
    // sill ends gain a second reveal; the raycast planes stay in front.
    const frame=group.children.find(o=>o.isGroup&&Math.abs(o.position.x+2.25)<.001&&Math.abs(o.position.z+.35)<.001);
    for(const hinge of frame?.children.filter(o=>o.isGroup&&Math.abs(Math.abs(o.position.x)-1.4)<.001)||[]){const side=Math.sign(hinge.position.x),source=hinge.children.flatMap(o=>o.children||[]).find(o=>o.isMesh&&o.geometry.parameters?.width>.06&&o.geometry.parameters?.height>2);ring(hinge,V(-side*1.22,1.16,.125),0,source);for(const y of [.38,2.04])rod(hinge,V(0,y-.04,.11),V(0,y+.04,.11),.022,'metal',source);stats.leafHardware++;}
   }
  }
 }

 const edgeCoordinates=stage.spaceCourt?[]:({
  0:[[-10,-2],[8,-2],[10,-8]],1:[[-8,-4],[8,-10],[-9,-10]],2:[[-7.3,-2],[5.4,-1]],
  3:[[-3.8,1.1],[-3.75,-4.7],[3.85,-3.8],[3.9,.50]],
  4:[[-8.7,-1.5],[6.9,-2.3],[-8.5,3.8]],
  5:[[-4.7,3.2],[4.5,-3.6],[-4.55,-3.0]],
  6:[[2.45,-24],[2.55,-7.2],[-13.05,1.6]],
  7:[[-6.85,-4.8],[6.78,-5.0],[-4.7,8.52],[4.8,8.4]]
 }[index]||[]);
 stage.architectureGroundingAnchors=edgeCoordinates.map(([x,z])=>({position:[x,.16,z],width:index===6?3.8:3.2,height:.95}));
 const plants=[];let edgeSeed=801+index*57;const edgeRandom=()=>{edgeSeed=(Math.imul(edgeSeed,1664525)+1013904223)>>>0;return edgeSeed/4294967296;};
 for(const [x,z]of edgeCoordinates){
  stats.edgeClusters++;
  for(let i=0;i<7;i++){
   const radius=.11+edgeRandom()*.15,p=V(x+(edgeRandom()-.5)*1.1,-.027+radius*.24,z+(edgeRandom()-.5)*1.2),q=new T.Quaternion().setFromEuler(new T.Euler(edgeRandom()*.15,edgeRandom()*6.28,edgeRandom()*.17));
   instance(stage.root,'pebble','stone',p,V(radius*(1.1+edgeRandom()*.4),radius*.35,radius*(.7+edgeRandom()*.5)),q);
  }
  // Existing local CC0 bamboo meshes become irregular low foliage clumps;
  // each clump is outside a doorway, window gesture and the walking route.
  const plant=addBamboo(stage.root,{count:3,bounds:{minX:x-.3,maxX:x+.3,minZ:z-.22,maxZ:z+.22},height:[.62,1.1],seed:edgeSeed});plant.name='台基边缘疏植';plants.push(plant);
 }
 if(index===3){
  for(let i=0;i<5;i++)rod(stage.root,V(-3.93,-.015,-1.6+i*.13),V(-3.90,.08,-.8+i*.13),.065,'wood');
  for(let i=0;i<3;i++)box(stage.root,.095,1.05+i*.10,.23,V(3.47,.54,-4.37+i*.25),'wood');
 }
 const priorReady=stage.ready;stage.ready=Promise.all([priorReady,...plants.map(p=>p.userData.ready)]).then(()=>stage);

 for(const [parent,map] of batches){
  const byMaterial=new Map();for(const entry of map.values()){if(!byMaterial.has(entry.material))byMaterial.set(entry.material,[]);byMaterial.get(entry.material).push(entry);}
  for(const [material,entries] of byMaterial){
  const source=entries[0].source,componentCount=entries.reduce((n,e)=>n+e.transforms.length,0);let geometry,transforms,label;
  if(entries.length===1){geometry=geometries[entries[0].kind];transforms=entries[0].transforms;label=entries[0].kind;}
  else{const pieces=[];for(const entry of entries)for(const transform of entry.transforms)pieces.push((geometries[entry.kind].index?geometries[entry.kind].toNonIndexed():geometries[entry.kind].clone()).applyMatrix4(transform));geometry=mergeGeometries(pieces,false);for(const piece of pieces)piece.dispose();transforms=[new T.Matrix4()];label='box';}
  const mat=materials[material].clone();
  // Rendering reads the real source material after the camera-occlusion pass.
  // Child details follow the same fade, including the large Lushan shutters.
  if(source){mat.transparent=true;mat.depthWrite=true;}
  const mesh=new T.InstancedMesh(geometry,mat,transforms.length);mesh.name='建筑细部 · '+(entries.some(e=>e.kind==='ring')?'铜环与铰链':({tile:'灰瓦叠缝',box:'檐框与石脚',cylinder:'承托与椽尾',ring:'铜环与铰链',pebble:'台基碎石'}[label]));mesh.userData.architectureDetail=true;mesh.userData.architectureDetailSource=source?.uuid||null;
  for(let i=0;i<transforms.length;i++)mesh.setMatrixAt(i,transforms[i]);mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;mesh.raycast=noop;
  if(source){const follow=()=>{const original=Array.isArray(source.material)?source.material[0]:source.material;mat.opacity=original.opacity;mat.depthWrite=original.depthWrite;mesh.castShadow=source.castShadow;};mesh.onBeforeRender=follow;mesh.onBeforeShadow=follow;}
  parent.add(mesh);stats.instanceCount+=componentCount;stats.drawCalls++;stats.triangles+=(geometry.index?.count||geometry.attributes.position.count)/3*transforms.length;
  }
 }
 const textures=new Set();Object.values(materials).forEach(m=>{if(m.map)textures.add(m.map);m.dispose();});
 stats.textureCount=textures.size;stats.triangles=Math.round(stats.triangles);stage.root.updateMatrixWorld(true);
 stage.architectureDetail=Object.freeze(stats);return stage;
}
