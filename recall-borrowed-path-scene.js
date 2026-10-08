import * as T from './vendor/three.module.js';
import {createCraftMaterials,makeBuildingKit} from './huangzhou-dwelling.js';
import {addBamboo,addTree} from './plants.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),smooth=x=>T.MathUtils.smootherstep(T.MathUtils.clamp(x,0,1),0,1);
export const BORROWED_PATH={floorY:.32,bodyRadius:.25,spawn:[-.55,.32,5.10],exit:[11.85,.32,-4.65],
 firstStation:[0,.32,-1.10],secondStation:[2.35,.32,-4.70],bounds:{minX:-4.65,maxX:12.55,minZ:-8.30,maxZ:7.15}};

/** The screens are doors in a complete hall, with pockets in the adjacent
 * wall bays. They expose an existing supported gallery; no detached aperture,
 * folded bridge or camera-following architectural prop is used. */
export function buildBorrowedPathScene(){
 const scene=new T.Scene(),root=new T.Group();root.name='诏命再起 · 推扇入殿';scene.add(root);
 const bg=new T.Color(0x7b867b);scene.background=bg;scene.fog=new T.Fog(bg,38,150);
 const materials=createCraftMaterials(),kit=makeBuildingKit(root,materials),{box,rod,lattice,roof}=kit,m=materials;
 scene.add(new T.HemisphereLight(0xdce5d7,0x475046,1.25));
 const sun=new T.DirectionalLight(0xf1dfbb,2.25);sun.position.set(-8,15,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:.1,far:65});sun.shadow.normalBias=.04;scene.add(sun);
 const fill=new T.DirectionalLight(0xb2c7c5,.60);fill.position.set(15,9,-12);scene.add(fill);
 box(420,.12,420,V(0,-.35,0),m.earth);
 const floors=[],solids=[],addSolid=(id,x,z,w,d)=>solids.push({id,x,z,w,d});
 function floor(id,x,z,w,d){const mesh=box(w,.24,d,V(x,.20,z),m.stone);mesh.name=id;floors.push({id,x,z,w,d,mesh});return mesh;}
 floor('连续石铺前院',0,2.20,9.40,9.80);floor('正殿地坪',0,-5.45,9.40,5.60);floor('东侧南行廊',8.25,-4.65,8.55,3.20);
 // Paving joints belong to the whole courtyard, not an arbitrary quest line.
 for(let x=-4.25;x<4.6;x+=.75)box(.014,.006,13.4,V(x,.325,-.48),m.darkWood);
 for(let z=-7.95;z<6.95;z+=.78)box(9.1,.006,.014,V(0,.325,z),m.darkWood);
 for(let x=4.7;x<12.4;x+=.78)box(.014,.006,3.0,V(x,.325,-4.65),m.darkWood);
 const roofGroups=[];
 function roofGroup(name,x,y,z,w,d,h=.75){const g=new T.Group();g.name=name;g.userData.animated=true;root.add(g);roof(x,y,z,w,d,h,g);roofGroups.push(g);return g;}
 function wall(id,x,z,w,h,d,parent=root){const o=box(w,h,d,V(x,.32+h/2,z),m.plaster,parent);o.name=id;box(w+.04,.16,d+.05,V(x,.40,z),m.stone,parent);addSolid(id,x,z,w,d);return o;}
 function pier(x,z,h=3.25){box(.22,h,.22,V(x,.32+h/2,z),m.wood);box(.40,.15,.40,V(x,.395,z),m.stone);box(.46,.12,.33,V(x,.32+h-.08,z),m.darkWood);addSolid('廊柱',x,z,.22,.22);}
 function rail(x,z,length,axis='x'){const n=Math.ceil(length/.75);for(let i=0;i<=n;i++){const u=-length/2+i*length/n;box(.060,.92,.060,V(x+(axis==='x'?u:0),.78,z+(axis==='z'?u:0)),m.darkWood);}for(const y of [.58,1.21])box(axis==='x'?length:.06,.06,axis==='z'?length:.06,V(x,y,z),m.wood);addSolid('廊栏',x,z,axis==='x'?length:.06,axis==='z'?length:.06);}
 // The front and eastern apertures are complete architectural bays, flanked
 // by continuous walls. Closed door panels physically block their passages.
 wall('正殿后墙',0,-8.25,9.65,3.30,.25);wall('正殿西墙',-4.80,-5.45,.25,3.30,5.85);
 const frontSection=new T.Group();frontSection.name='入殿后剖开的前檐墙';frontSection.userData.animated=true;root.add(frontSection);
 wall('正殿前墙西段',-3.23,-2.70,3.00,3.15,.23,frontSection);wall('正殿前墙东段',3.23,-2.70,3.00,3.15,.23,frontSection);
 box(3.45,.55,.26,V(0,3.39,-2.70),m.plaster,frontSection);
 const eastSection=new T.Group();eastSection.name='殿内与侧廊观看时剖开的东檐墙';eastSection.userData.animated=true;root.add(eastSection);
 wall('正殿东墙后段',4.80,-7.18,.25,3.30,2.14,eastSection);wall('正殿东墙前段',4.80,-3.02,.25,3.30,.64,eastSection);
 box(.27,.70,2.95,V(4.80,3.27,-4.80),m.plaster,eastSection);
 const hallRoof=roofGroup('入殿时剖开的殿顶',0,3.91,-5.45,9.65,5.70,1.10);
 // A real covered approach and connected side gallery give the chapter a
 // readable architectural silhouette before the player touches anything.
 for(const x of [-4.38,4.37])for(const z of [6.25,2.8,-.85])pier(x,z,2.98);
 const westRoof=roofGroup('前院西侧廊顶',-4.38,3.40,2.70,1.38,8.18,.58),eastRoof=roofGroup('前院东侧廊顶',4.37,3.40,2.70,1.38,8.18,.58);
 wall('西院墙',-5.05,2.25,.25,2.60,9.20);wall('东院墙',5.15,1.80,.22,2.60,8.20);
 for(const x of [5.55,8.10,10.50,12.45]){pier(x,-6.17,2.98);pier(x,-3.12,2.98);}
 const southRoof=roofGroup('南行长廊顶',8.68,3.43,-4.65,7.55,3.16,.62);rail(8.67,-6.19,7.65);rail(8.66,-3.10,7.63);
 // Sliding leaves sit within their original structural opening and travel
 // into the adjacent wall pockets. Their broad lattice faces are the handle.
 function screens(id,center,width,axis){const group=new T.Group();group.name=id==='borrow-near'?'正殿入口木格隔扇':'正殿东侧木格隔扇';group.userData.animated=true;group.position.copy(center);if(axis==='z')group.rotation.y=Math.PI/2;root.add(group);const leaves=[];
  for(const side of [-1,1]){const leaf=new T.Group();leaf.name=group.name+(side<0?' · 左扇':' · 右扇');leaf.userData.animated=true;leaf.position.set(side*width/4,1.40,0);group.add(leaf);box(width/2-.015,2.74,.11,V(0,0,0),m.darkWood,leaf);const latticeGroup=new T.Group();latticeGroup.position.set(0,.26,.075);leaf.add(latticeGroup);lattice(width/2-.15,2.00,latticeGroup);box(width/2-.16,.52,.12,V(0,-1.04,.03),m.wood,leaf);rod(V(-side*.20,-.17,.13),V(-side*.20,.21,.13),.042,m.wood,leaf);leaves.push({leaf,side});}
  const upperTrack=new T.Group();upperTrack.name=group.name+' · 剖视上轨';upperTrack.userData.animated=true;group.add(upperTrack);box(width+.10,.10,.24,V(0,2.86,0),m.darkWood,upperTrack);box(width+.10,.07,.24,V(0,.035,0),m.darkWood,group);
  return {id,group,leaves,upperTrack,width,axis,progress:0,preview:0,age:-1};
 }
 const north=screens('borrow-near',V(0,.32,-2.65),3.42,'x'),south=screens('borrow-south',V(4.65,.32,-4.80),2.82,'z');
 // Gate is a real terminal threshold. Its leaf opens outward along the rail
 // rather than occupying the player's approach or leaving a collision slab.
 const gate=new T.Group();gate.name='南行院门';gate.position.set(10.63,.32,-4.65);gate.rotation.y=Math.PI/2;root.add(gate);
 for(const x of [-1.35,1.35]){box(.23,3.0,.23,V(x,1.5,0),m.wood,gate);box(.4,.14,.4,V(x,.07,0),m.stone,gate);addSolid('院门柱',10.63,-4.65-x,.23,.23);}
 const gateRoof=new T.Group();gateRoof.name='南门檐';gateRoof.userData.animated=true;gate.add(gateRoof);roof(0,3.39,0,2.95,1.05,.55,gateRoof);
 const gateLeaf=new T.Group();gateLeaf.name='拂封后向廊边让开的院门';gateLeaf.userData.animated=true;gateLeaf.position.set(-1.23,0,0);gate.add(gateLeaf);box(2.46,2.68,.095,V(1.23,1.34,0),m.darkWood,gateLeaf);box(2.3,.13,.13,V(1.23,.42,.08),m.wood,gateLeaf);box(2.3,.13,.13,V(1.23,2.25,.08),m.wood,gateLeaf);
 box(2.65,.13,1.15,V(-.45,1.03,-6.92),m.darkWood);for(const x of [-1.54,.64])for(const z of [-7.31,-6.53])box(.10,.72,.10,V(x,.67,z),m.wood);addSolid('书案和卷杆',-.45,-6.92,2.65,1.56);
 const paperCanvas=document.createElement('canvas');paperCanvas.width=1536;paperCanvas.height=1024;const cx=paperCanvas.getContext('2d');cx.fillStyle='#e1d3b0';cx.fillRect(0,0,1536,1024);cx.fillStyle='#292c27';cx.font='48px Poem, KaiTi, serif';cx.textAlign='center';cx.fillText('奉  诏',768,106);cx.font='37px Poem, KaiTi, serif';
 const decreeLines=['元丰八年（1085），重新起用。','旧日被摈的人，又被召回朝堂。','次年，入翰林，任知制诰。','黄州的风雨，还留在笔端。','这一次，他走回了人群之中。'];decreeLines.forEach((text,i)=>cx.fillText(text,768,236+i*130));cx.font='25px Poem, KaiTi, serif';cx.fillText('起用史事节述 · 非诏书原文',768,940);
 const paperMap=new T.CanvasTexture(paperCanvas);paperMap.colorSpace=T.SRGBColorSpace;const paper=new T.Mesh(new T.PlaneGeometry(2.20,1.46),new T.MeshStandardMaterial({map:paperMap,roughness:1,side:T.DoubleSide}));paper.rotation.x=-Math.PI/2;paper.position.set(-.45,1.107,-6.92);paper.name='案上实物诏卷';root.add(paper);
 for(const z of [-7.65,-6.19]){const r=new T.Mesh(new T.CylinderGeometry(.052,.052,2.31,12),m.wood);r.rotation.z=Math.PI/2;r.position.set(-.45,1.16,z);root.add(r);}box(.33,.055,.20,V(.48,1.15,-6.71),m.darkWood);rod(V(.15,1.16,-6.76),V(-.23,1.16,-6.91),.015,m.darkWood);
 const lampMat=new T.MeshStandardMaterial({color:0xf1d19b,emissive:0xe9bd6c,emissiveIntensity:.65,roughness:.8});const lamp=new T.Mesh(new T.CylinderGeometry(.14,.16,.30,12),lampMat);lamp.position.set(-1.29,1.28,-6.96);root.add(lamp);const warmth=new T.PointLight(0xffd09a,2.4,7,1.6);warmth.position.set(-.75,2,-6.56);scene.add(warmth);
 const sealMat=new T.MeshBasicMaterial({color:0x86352f,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),seal=new T.Group();seal.name='诏卷朱印';seal.position.set(-.45,1.116,-6.92);seal.rotation.x=-Math.PI/2;root.add(seal);seal.add(new T.Mesh(new T.PlaneGeometry(.66,.50),sealMat));
 const gateSealMat=sealMat.clone();gateSealMat.side=T.DoubleSide;const gateSeal=new T.Mesh(new T.PlaneGeometry(.64,.96),gateSealMat);gateSeal.name='院门薄墨封';gateSeal.position.set(1.23,1.38,-.061);gateLeaf.add(gateSeal);
 const plants=[addTree(root,{position:[-8,0,-10],height:8.6,seed:711}),addTree(root,{position:[16,0,-10],height:8.2,seed:177}),addBamboo(root,{count:9,bounds:{minX:-8,maxX:-6,minZ:1,maxZ:9},height:[3.7,6.5],seed:803}),addBamboo(root,{count:9,bounds:{minX:14,maxX:18,minZ:-9,maxZ:-2},height:[4,6.7],seed:955})];
 kit.batchStatic();
 let readAge=-1,gateAge=-1,simTime=0;const duration={near:1.15,south:1.15,read:7.8,gate:1.65};
 const ready=id=>id==='borrow-near'?north.age>=duration.near:id==='borrow-south'?south.age>=duration.south:id==='read-decree'?readAge>=duration.read:id==='clear-seal'?gateAge>=duration.gate:false;
 function screenPose(s){const q=s.age<0?s.preview:smooth(s.age/(s===north?duration.near:duration.south));s.progress=q;for(const {leaf,side}of s.leaves)leaf.position.x=side*s.width*(.25+.57*q);}
 function pose(){const banish=readAge<0?0:smooth((readAge-5.6)/2.1);screenPose(north);screenPose(south);if(banish>0)for(const {leaf,side}of north.leaves)leaf.position.x=side*north.width*(.25+.57*(1-banish));gateLeaf.rotation.y=-1.58*smooth(Math.max(0,gateAge)/duration.gate);sealMat.opacity=.7*(1-smooth(Math.max(0,readAge)/2.2));gateSealMat.opacity=.7*(1-smooth(Math.max(0,gateAge)/1.2));warmth.intensity=2.4*(1-banish)+.4*banish;lampMat.emissiveIntensity=.65*(1-banish)+.12*banish;sun.color.set(banish>.5?0xb7cbd0:0xf1dfbb);scene.background.copy(bg).lerp(new T.Color(0x677d80),banish);scene.fog.color.copy(scene.background);}
 function update(dt){if(!(dt>0))return;simTime+=dt;for(const s of [north,south])if(s.age>=0)s.age=Math.min(s===north?duration.near:duration.south,s.age+dt);if(readAge>=0)readAge=Math.min(duration.read,readAge+dt);if(gateAge>=0)gateAge=Math.min(duration.gate,gateAge+dt);pose();}
 function previewScreen(id,value){const s=id==='borrow-near'?north:id==='borrow-south'?south:null;if(!s||s.age>=0)return false;s.preview=T.MathUtils.clamp(value,0,1);pose();return true;}
 function begin(id){if(id==='borrow-near'&&north.age<0){north.age=duration.near*Math.max(.20,north.preview);return true;}if(id==='read-decree'&&ready('borrow-near')&&readAge<0){readAge=0;return true;}if(id==='borrow-south'&&ready('read-decree')&&south.age<0){south.age=duration.south*Math.max(.20,south.preview);return true;}if(id==='clear-seal'&&ready('borrow-south')&&gateAge<0){gateAge=0;return true;}return false;}
 function reset(){north.age=south.age=readAge=gateAge=-1;north.preview=south.preview=0;simTime=0;gateRoof.visible=north.upperTrack.visible=south.upperTrack.visible=eastSection.visible=frontSection.visible=hallRoof.visible=westRoof.visible=eastRoof.visible=southRoof.visible=true;pose();}
 function pointSupported(p){return floors.some(f=>Math.abs(p.x-f.x)<=f.w/2&&Math.abs(p.z-f.z)<=f.d/2);}
 function blocked(p){for(const r of solids)if(Math.abs(p.x-r.x)<r.w/2+.26&&Math.abs(p.z-r.z)<r.d/2+.26)return true;
  if(Math.abs(p.z+2.65)<.32&&Math.abs(p.x)<1.96&&(!ready('borrow-near')||readAge>=5.6))return true;
  if(Math.abs(p.x-4.65)<.33&&Math.abs(p.z+4.80)<1.66&&!ready('borrow-south'))return true;
  if(Math.abs(p.x-10.63)<.32&&Math.abs(p.z+4.65)<1.47&&!ready('clear-seal'))return true;
  // Door pockets and the open gate slab remain actual physical exclusions.
  for(const s of [north,south])for(const {leaf}of s.leaves){const q=leaf.getWorldPosition(V());if(s.axis==='x'?Math.abs(p.x-q.x)<s.width/4+.26&&Math.abs(p.z-q.z)<.32:Math.abs(p.z-q.z)<s.width/4+.26&&Math.abs(p.x-q.x)<.32)return true;}
  if(ready('clear-seal')&&Math.abs(p.z+3.39)<.28&&p.x>10.60&&p.x<13.16)return true;return false;}
 function walkable(p){return [[0,0],[.25,0],[-.25,0],[0,.25],[0,-.25]].every(([x,z])=>pointSupported(V(p.x+x,.32,p.z+z)))&&!blocked(p);}
 function canMove(a,b){root.updateMatrixWorld(true);const n=Math.max(1,Math.ceil(a.distanceTo(b)/.08));for(let i=0;i<=n;i++)if(!walkable(a.clone().lerp(b,i/n)))return false;return true;}
 function setView(player,id){const inside=player.z<-2.95&&player.x<7.5,side=player.x>4.3&&player.z<-2.8;north.upperTrack.visible=south.upperTrack.visible=eastSection.visible=frontSection.visible=!inside;hallRoof.visible=!inside;eastRoof.visible=!(inside||side);gateRoof.visible=southRoof.visible=!side;westRoof.visible=true;}
 pose();root.updateMatrixWorld(true);
 return {scene,root,materials:m,plants,floors,north,south,paper,seal,gateLeaf,gateSeal,frontHinges:north.leaves,eastDoor:south.group,puzzles:{},previewScreen,begin,ready,update,reset,setView,walkable,canMove,heightAt:(x,z)=>pointSupported(V(x,.32,z))?.32:NaN,
  get stats(){return {mode:'real-sliding-screen-court',fixedApertures:true,objectsFollowCamera:false,nearProgress:north.progress,southProgress:south.progress,readAge,gateAge,frontDoorAngles:north.leaves.map(()=>0),eastDoorAngle:0,frontDoorOffsets:north.leaves.map(({leaf})=>leaf.position.x),eastDoorOffsets:south.leaves.map(({leaf})=>leaf.position.x),frontPassageClosed:readAge>=5.6,gateAngle:gateLeaf.rotation.y,ready:Object.fromEntries(['borrow-near','read-decree','borrow-south','clear-seal'].map(id=>[id,ready(id)])),particles:0,groundGuideLines:0,ropeMechanisms:0,userBridgeRotation:0,detachedWindows:0,continuousCourtyard:true,roofCutaway:!hallRoof.visible,simTime};}};
}
