import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);

export function auditArchitectureBoundary(stage){
 const walls=[],floors=[];stage.root?.updateWorldMatrix(true,true);
 stage.root?.traverse(object=>{
  if(!object.isMesh||object.userData.architectureEnvelope||object.geometry?.type!=='BoxGeometry')return;
  const p=object.geometry.parameters,box=new T.Box3().setFromObject(object),thin=Math.min(p.width,p.depth),long=Math.max(p.width,p.depth);
  const entry={name:object.name||'建筑盒构件',min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(V()).toArray()};
  if(p.height>=2&&thin>=.13&&thin<=.8&&long>=2)walls.push(entry);
  if(p.height<=.4&&p.width>=4&&p.depth>=3)floors.push(entry);
 });return {walls,floors};
}

const presets={
 0:{walls:[[-10,1.25,17,.68,2.5,22],[0,1.8,-17,33,3.6,.50]],apron:[0,-.049,5,38,32],anchors:[[-11.5,2.4,9,5.7,5.2],[13,2.8,-12,6.8,5.6],[-12,3,-13,6.8,6.0]],guards:[{center:[-4,1.9,-1],half:[2,1.7,1.4]}]},
 1:{walls:[[-5.5,1.5,19.3,.68,3,21.2],[5.5,1.5,19.3,.68,3,21.2],[-5.5,1.5,-16,.68,3,13.4],[5.5,1.5,-16,.68,3,13.4],[0,2.5,-23,25,5,.55]],apron:[0,-.049,5,32,43],anchors:[[-7,2.7,12,5.2,5.9],[7,2.7,12,5.2,5.9],[0,3.5,-22,27,6.5]],guards:[{center:[0,2.1,7.9],half:[3.2,2.7,1.8]},{center:[0,2.2,-8.4],half:[2.2,2.7,1.5]}]},
 2:{walls:[[-7,2.5,16.5,.50,5,25],[6,2.15,16.0,.28,4.3,27.8],[0,2.5,-14,31,5,.55]],apron:[0,-.049,5,39,43],anchors:[[-8.1,2.8,8.6,5.6,6.2],[7.1,2.6,8.0,5.6,5.8],[-10,3,-7,8,6.3],[0,3.5,-13,28,6.6]],guards:[{center:[-3,3.1,-2.5],half:[1.7,1.3,1.4]},{center:[5.15,1.6,.8],half:[1.0,2.0,1.8]}]},
 3:{walls:[],apron:[0,-.063,-9,22,20],anchors:[[-5.2,2.9,-4.9,6.3,6.0],[5.1,2.6,-5.4,6.2,5.5],[-8.6,2,5.8,7,4.8]],guards:[{center:[0,1.7,.25],half:[2.1,2.2,1.8]},{center:[2.7,1.2,4.5],half:[2.3,1.8,1.9]},{center:[-2.4,1.6,2.1],half:[2.2,2.0,1.4]}]},
 4:{walls:[],apron:[0,-.049,1,37,9],anchors:[[-12.0,2.2,.5,7,4.7],[13,2.3,-.5,7,4.8]],guards:[{center:[-.5,2.05,1.25],half:[2,2,1]}]},
 5:{walls:[],apron:[-.15,-.049,2.5,21,17],anchors:[[-6.5,2.6,3.8,5.7,5.5],[5.9,2.4,2.0,5.4,5.2],[-6.8,.15,-4.7,6.4,1.6],[6.1,.15,-4.5,6.4,1.6]],guards:[{center:[-2.25,1.78,-.175],half:[1.75,1.5,1.2]},{center:[.25,1.65,-1.075],half:[1,1.5,1.1]},{center:[-2.45,1.74,-3.34],half:[1.4,1.5,1.1]},{center:[0,1.5,-4.1],half:[2.2,2.1,1.5]}]},
 6:{walls:[],apron:null,anchors:[[1.1,1,-29.7,7.5,2.4],[-14.5,.3,2.5,7.2,2.2],[3.4,-.35,-15,4.5,1.8]],guards:[{center:[-2.35,5.4,-17],half:[5,6.1,11.2]},{center:[-10.15,4.7,-2.5],half:[3.4,5.5,3.0]}]},
 7:{walls:[[-6.45,1.27,19.7,.25,2.5,20.4],[6.3,1.27,19.5,.25,2.5,20.1],[-6.45,1.27,-15.2,.25,2.5,13.4],[6.3,1.27,-15.2,.25,2.5,13.4],[0,1.4,-22,29,2.8,.35]],apron:[0,-.054,3,36,38],anchors:[[-8.2,2.6,10,6.3,5.6],[8.6,2.6,11.2,6.4,5.6],[-7.6,2.5,-10,6.2,5.4],[8.2,2.5,-11,6.2,5.4]],guards:[{center:[0,2.3,-3.2],half:[1.9,2.4,1.5]},{center:[6.3,1.55,1.08],half:[1.6,1.9,1.7]}]}
};

function fadingApron(spec,source){
 const [x,y,z,width,depth]=spec,geometry=new T.PlaneGeometry(width,depth,24,20).rotateX(-Math.PI/2),position=geometry.attributes.position,color=new Float32Array(position.count*4);
 for(let i=0;i<position.count;i++){
  const px=position.getX(i),pz=position.getZ(i),edge=Math.min(width/2-Math.abs(px),depth/2-Math.abs(pz)),soft=T.MathUtils.smoothstep(edge,.15,3.9),grain=.90+.10*Math.sin(px*1.37+pz*.63);
  color.set([grain,grain,grain,soft],i*4);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(color,4));const material=source.clone();material.transparent=true;material.opacity=.85;material.vertexColors=true;material.depthWrite=false;material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;material.roughness=.98;
 const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.name='接入环境且边缘渐隐的外台地';mesh.userData.architectureEnvelope=true;mesh.renderOrder=.2;return mesh;
}

/** Extend the exterior only; original openings, input and walking keep ownership. */
export function decorateArchitectureEnvelope(stage,index){
 if(!stage?.scene||!stage.root||!presets[index]||stage.architectureEnvelope)return stage;
 const recipe=presets[index],before=auditArchitectureBoundary(stage),root=new T.Group();root.name='建筑延续与外缘过渡_'+(index+1);root.userData.architectureEnvelope=true;stage.root.add(root);
 let wallSource=null,stoneSource=null;
 stage.root.traverse(o=>{if(!o.isMesh||o.userData.architectureEnvelope||!o.material?.isMeshStandardMaterial)return;const p=o.geometry.parameters||{};if(!wallSource&&p.height>=2&&Math.min(p.width||999,p.depth||999)<=.7)wallSource=o.material;if(!stoneSource&&p.height<.4&&(p.width>4||p.depth>4))stoneSource=o.material;});
 wallSource??=new T.MeshStandardMaterial({color:0x7c897d,roughness:1});stoneSource??=wallSource;
 const extensions=[];
 for(const [x,y,z,w,h,d]of recipe.walls){
  const wall=new T.Mesh(new T.BoxGeometry(w,h,d),wallSource.clone());wall.position.set(x,y,z);wall.castShadow=wall.receiveShadow=true;wall.name='向镜头外续接的院墙';wall.userData.architectureEnvelope=true;root.add(wall);
  const capMaterial=wallSource.clone();capMaterial.color.multiplyScalar(.80);const cap=new T.Mesh(new T.BoxGeometry(w+.06,.10,d+.08),capMaterial);cap.position.set(x,y+h/2+.02,z);cap.castShadow=true;cap.name='续墙压顶';cap.userData.architectureEnvelope=true;root.add(cap);
  extensions.push({name:wall.name,min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2]});
 }
 if(recipe.apron)root.add(fadingApron(recipe.apron,stoneSource));
 // The prison remains a low, quiet following view. A small move inward keeps
 // the cell readable without introducing another orbit or an oversized actor.
 if(index===2)stage.followCamera={offset:[3.1,3.45,15.2],lookHeight:1.35,trackX:.50,trackZ:.15,fov:39,...stage.followCamera};
 stage.architectureBoundaryAnchors=recipe.anchors.map(([x,y,z,width,height],i)=>({position:[x,y,z],width,height,opacity:index===2?.17:.145,layer:3,phase:i*1.7+index*.63,speed:.60+i*.10}));
 stage.architectureFogGuards=recipe.guards.map(g=>({center:[...g.center],half:[...g.half]}));
 stage.root.updateMatrixWorld(true);
 stage.architectureEnvelope={index,originalWalls:before.walls.length,originalFloors:before.floors.length,originalWallBounds:before.walls,extensions,exteriorApron:recipe.apron?{center:recipe.apron.slice(0,3),size:recipe.apron.slice(3),fadeMeters:3.9}:null,highSideBands:recipe.anchors.filter(a=>a[1]>1.5).length,guardVolumes:recipe.guards.length,drawCalls:root.children.length,triangles:root.children.reduce((n,o)=>n+(o.geometry?.index?.count||0)/3,0),cameraAdjusted:index===2,inputPreserved:true};
 return stage;
}
