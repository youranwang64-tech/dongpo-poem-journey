import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {addBamboo,addTree} from './plants.js';
import {createAtmosphere} from './atmosphere.js';
import {attachDwellingCamera} from './dwelling-camera.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const smooth=x=>T.MathUtils.smootherstep(T.MathUtils.clamp(x,0,1),0,1);
const random=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const maps=new Map();

// Shared construction tools for the two architectural chapters. Static pieces
// merge by material; doors, windows and the repairable roof remain independent.
export function createCraftMaterials(){
 function texture(kind){if(maps.has(kind))return maps.get(kind);const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),r=random(kind==='wood'?47:kind==='straw'?91:19);ctx.fillStyle={wood:'#76695a',straw:'#a49678',earth:'#777767',stone:'#91958c',plaster:'#b1b09e'}[kind];ctx.fillRect(0,0,256,256);
  for(let i=0;i<6200;i++){const n=40+r()*170;ctx.fillStyle=`rgba(${n},${n},${n*.9},${.04+r()*.13})`;ctx.fillRect(r()*256,r()*256,kind==='wood'?.4+r()*1.1:1+r()*3,kind==='wood'?9+r()*85:kind==='straw'?2+r()*15:1+r()*4);}
  if(kind==='wood'||kind==='straw')for(let i=0;i<55;i++){ctx.strokeStyle=`rgba(25,22,17,${.03+r()*.12})`;ctx.lineWidth=.35+r()*.7;ctx.beginPath();const x=r()*256;ctx.moveTo(x,0);ctx.lineTo(x+Math.sin(i)*5,256);ctx.stroke();}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(kind==='earth'?20:1,kind==='earth'?20:2);t.anisotropy=4;maps.set(kind,t);return t;
 }
 const material=(color,kind,bump=.02)=>new T.MeshStandardMaterial({color,map:texture(kind),bumpMap:texture(kind),bumpScale:bump,roughness:.93});
 return {wood:material(0x9e9989,'wood',.032),darkWood:material(0x615d50,'wood',.02),earth:material(0x999b84,'earth',.035),stone:material(0xa1a59b,'stone',.028),plaster:material(0xb3b5a5,'plaster',.045),straw:material(0xb9b18b,'straw',.035),roof:material(0x686f66,'stone',.018),leaf:new T.MeshStandardMaterial({color:0x68785b,roughness:1,side:T.DoubleSide}),paper:new T.MeshStandardMaterial({color:0xe7d8b5,roughness:1})};
}
export function makeBuildingKit(root,materials){
 const pieces=[];
 function mesh(g,m,p=V(),parent=root){const o=new T.Mesh(g,m);o.position.copy(p);o.castShadow=true;o.receiveShadow=true;parent.add(o);pieces.push(o);return o;}
 const box=(w,h,d,p,m=materials.wood,parent=root)=>mesh(new T.BoxGeometry(w,h,d),m,p,parent);
 function rod(a,b,r=.05,m=materials.wood,parent=root){const d=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,d.length(),8),m,a.clone().add(b).multiplyScalar(.5),parent);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;}
 function lattice(w,h,parent,z=.03){box(w,.07,.10,V(0,h/2,z),materials.wood,parent);box(w,.07,.10,V(0,-h/2,z),materials.wood,parent);box(.07,h,.10,V(-w/2,0,z),materials.wood,parent);box(.07,h,.10,V(w/2,0,z),materials.wood,parent);for(let x=-w/2+.19;x<w/2;x+=.19)box(.025,h-.08,.055,V(x,0,z),materials.darkWood,parent);for(let y=-h/2+.24;y<h/2;y+=.27)box(w-.08,.028,.055,V(0,y,z),materials.darkWood,parent);}
 function roof(x,y,z,w,d,h=.9,parent=root,m=materials.roof,tiled=true){
  for(const side of [-1,1]){const p=[],uv=[],ids=[],nx=16,nz=10;for(let a=0;a<=nx;a++)for(let b=0;b<=nz;b++){const u=b/nz,v=a/nx;p.push(x+(v-.5)*(w+.7),y+h-u*(h+.23)+u*u*.21+Math.pow(Math.abs(v-.5)*2,5)*u*.11,z+side*u*(d/2+.5));uv.push(v*3,u*2);}for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){const n=a*(nz+1)+b;if(side===1)ids.push(n,n+1,n+nz+1,n+1,n+nz+2,n+nz+1);else ids.push(n,n+nz+1,n+1,n+1,n+nz+1,n+nz+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();mesh(g,m,V(),parent);
   if(tiled)for(let a=0;a<=nx;a++){const xx=x+(a/nx-.5)*(w+.7),curve=[];for(let b=0;b<=10;b++){const u=b/10;curve.push(V(xx,y+h-u*(h+.23)+u*u*.21,z+side*u*(d/2+.5)));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(curve),10,.027,5,false),m,V(),parent);}
  }box(w+.58,.09,.18,V(x,y+h+.03,z),materials.darkWood,parent);
 }
 function batchStatic(){root.updateMatrixWorld(true);const grouped=new Map();for(const o of pieces){if(!o.parent||!o.visible){o.geometry.dispose();continue;}let container=root;for(let p=o.parent;p&&p!==root;p=p.parent)if(p.userData.animated){container=p;break;}if(!grouped.has(container))grouped.set(container,new Map());const byMaterial=grouped.get(container),local=new T.Matrix4().copy(container.matrixWorld).invert().multiply(o.matrixWorld),g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(local);if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(g);o.removeFromParent();o.geometry.dispose();}for(const [parent,byMaterial]of grouped)for(const [material,geometries]of byMaterial){const g=mergeGeometries(geometries,false);if(!g)throw Error('Architectural geometry cannot merge');const o=new T.Mesh(g,material);o.name='合批建筑构件';o.castShadow=true;o.receiveShadow=true;parent.add(o);for(const part of geometries)part.dispose();}}
 return {mesh,box,rod,lattice,roof,batchStatic};
}

export function buildHuangzhouDwelling(){
 const scene=new T.Scene(),root=new T.Group();root.name='黄州东坡 · 坡地居所';scene.add(root);const bg=new T.Color(0x67776c);scene.background=bg;scene.fog=new T.Fog(bg,22,100);const m=createCraftMaterials(),{mesh,box,rod,lattice,roof,batchStatic}=makeBuildingKit(root,m),r=random(482);
 const sky=new T.HemisphereLight(0xcddbcf,0x4d5548,.85);scene.add(sky);const sun=new T.DirectionalLight(0xc6dfd5,2.1);sun.position.set(-10,17,-10);sun.target.position.set(0,1,-1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:.1,far:60});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun,sun.target);const fill=new T.DirectionalLight(0xc9cabc,.6);fill.position.set(10,6,13);scene.add(fill);
 // Land extends past every camera edge. The walkable terrace stays level;
 // surrounding contour ridges carry the sense of a hillside without fake steps.
 const terrain=new T.PlaneGeometry(220,220,55,55).rotateX(-Math.PI/2),tp=terrain.attributes.position;for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getZ(i),edge=T.MathUtils.smoothstep(Math.max(Math.abs(x)-7,Math.abs(z+1)-11),0,22),y=-.07+edge*(.45*Math.sin(x*.09)+.7*Math.cos(z*.07)+.18*Math.sin((x+z)*.31));tp.setY(i,y);}terrain.computeVertexNormals();mesh(terrain,m.earth);
 for(const side of [-1,1])for(let row=0;row<5;row++){const z=4-row*2.7,curve=[];for(let i=0;i<15;i++)curve.push(V(side*(6.7+i*.5),-.08+Math.sin(i*.2)*.1,z+Math.sin(i*.27)*.2));mesh(new T.TubeGeometry(new T.CatmullRomCurve3(curve),20,.12,5,false),m.earth);}
 for(let i=0;i<40;i++){const x=(i%2?-1:1)*(3.9+r()*4.0),z=-6+r()*14,o=mesh(new T.IcosahedronGeometry(.18+r()*.22,1),m.stone,V(x,-.03,z));o.scale.set(1.5,.55,.8);o.rotation.set(r(),r()*6,r());}
 // Continuous stone footings, timber joinery and interior partitions.
 box(6.9,.24,6.0,V(0,-.10,-2.3),m.stone);box(6.55,.10,5.8,V(0,.015,-2.3),m.earth);
 box(.18,2.85,5.5,V(-3.18,1.46,-2.3),m.plaster);box(.18,2.85,5.5,V(3.18,1.46,-2.3),m.plaster);box(6.38,2.85,.16,V(0,1.46,-5.02),m.plaster);
 for(const x of [-3.12,-.95,.95,3.12]){rod(V(x,0,.35),V(x,3.00,.35),.115);rod(V(x,0,-4.97),V(x,3.0,-4.97),.11);box(.36,.16,.42,V(x,.02,.35),m.stone);}for(const z of [.35,-2.30,-4.97])box(6.55,.18,.21,V(0,2.90,z),m.darkWood);
 // Solid walls end around actual openings rather than covering their leaves.
 for(const side of [-1,1]){box(1.95,.86,.16,V(side*2.08,.45,.35),m.plaster);box(1.95,.66,.16,V(side*2.08,2.58,.35),m.plaster);for(const edge of [-1,1])box(.16,1.38,.18,V(side*2.08+edge*.87,1.57,.35),m.wood);}
 box(1.92,.30,.2,V(0,2.75,.35),m.wood);
 const windowLeaves=[],doorLeaves=[];for(const side of [-1,1])for(const leaf of [-1,1]){const hinge=new T.Group();hinge.name='打开借光的居所窗';hinge.userData.animated=true;hinge.position.set(side*2.08+leaf*.79,1.59,.44);root.add(hinge);const pane=new T.Group();pane.position.x=-leaf*.39;hinge.add(pane);lattice(.78,1.28,pane);windowLeaves.push({hinge,side:leaf});}
 for(const side of [-1,1]){const hinge=new T.Group();hinge.name='修屋后敞开的木门';hinge.userData.animated=true;hinge.position.set(side*.87,0,.43);root.add(hinge);for(let j=0;j<5;j++)box(.17,2.55,.09,V(-side*(.095+j*.17),1.30,0),m.wood,hinge);for(const y of [.35,2.2])box(.86,.11,.13,V(-side*.43,y,.02),m.darkWood,hinge);doorLeaves.push({hinge,side});}
 // The back slope of the roof is intact. The front has a genuinely missing
 // 2.1 m patch, which settles back into the carpentry when the player repairs it.
 const roofGroup=new T.Group();root.add(roofGroup);roof(0,2.95,-2.3,6.5,5.5,1.1,roofGroup,m.straw,false);
 // Remove the helper's full front sheet and replace it with three strips.
 const frontSheet=roofGroup.children.find(o=>o.isMesh&&o.geometry.type==='BufferGeometry'&&o.geometry.attributes.position.getZ(10)>-2.3);if(frontSheet){frontSheet.userData.removed=true;frontSheet.visible=false;}
 // Explicit partial panels make the missing eave readable from the entry view.
 // batchStatic omits the hidden sheet below; it must not seal the visible hole.
 if(frontSheet)frontSheet.removeFromParent();
 function slopePanel(width,x,parent){const g=new T.PlaneGeometry(width,3.18,8,8);g.rotateX(-1.21);const p=mesh(g,m.straw,V(x,3.46,-.84),parent);p.material.side=T.DoubleSide;return p;}
 slopePanel(2.05,-2.33,root);slopePanel(2.05,2.33,root);
 const patch=new T.Group();patch.name='补好的正面屋檐';patch.userData.animated=true;root.add(patch);slopePanel(2.72,0,patch);const strawGeometry=new T.CylinderGeometry(.009,.012,1.4,3),straw=new T.InstancedMesh(strawGeometry,m.straw,185),dummy=new T.Object3D();straw.castShadow=true;patch.add(straw);for(let i=0;i<185;i++){const x=(r()-.5)*2.62,u=r();dummy.position.set(x,3.91-u*1.02,-2.15+u*2.86);dummy.rotation.set(1.20+(r()-.5)*.08,0,(r()-.5)*.025);dummy.scale.set(1,.6+r()*.45,1);dummy.updateMatrix();straw.setMatrixAt(i,dummy.matrix);}straw.instanceMatrix.needsUpdate=true;
 for(const x of [-3.25,-1.5,1.5,3.25])rod(V(x,3.9,-2.3),V(x,2.88,.77),.052,m.darkWood);
 // The central rafter really has a missing span. Its two broken ends remain
 // static, while the loose span keeps its own transform after batching.
 const rafterTop=V(0,3.9,-2.3),rafterBottom=V(0,2.88,.77),gapTop=rafterTop.clone().lerp(rafterBottom,.31),gapBottom=rafterTop.clone().lerp(rafterBottom,.80),beamCentre=gapTop.clone().add(gapBottom).multiplyScalar(.5);
 rod(rafterTop,gapTop,.056,m.darkWood);rod(gapBottom,rafterBottom,.056,m.darkWood);
 const repairBeam=new T.Group();repairBeam.name='毛笔接回的中央断梁';repairBeam.userData.animated=true;root.add(repairBeam);
 rod(gapTop.clone().sub(beamCentre),gapBottom.clone().sub(beamCentre),.063,m.wood,repairBeam);
 for(const p of [gapTop,gapBottom]){const cut=mesh(new T.CylinderGeometry(.063,.063,.022,10),m.wood,p);cut.quaternion.setFromUnitVectors(V(0,1,0),rafterBottom.clone().sub(rafterTop).normalize());}
 // Small objects put the repaired shelter in the middle of everyday life.
 box(1.8,.10,.72,V(-1.6,.86,-3.67),m.wood);for(const x of [-2.35,-.85])for(const z of [-3.94,-3.40])rod(V(x,.05,z),V(x,.81,z),.047);box(.64,.012,.43,V(-1.6,.919,-3.67),m.paper);box(1.7,.15,.73,V(1.8,.32,-3.75),m.darkWood);for(let i=0;i<12;i++)box(.13,.025,.70,V(1.06+i*.135,.412,-3.75),m.straw);rod(V(2.85,.1,-1.2),V(2.65,1.1,-1.32),.025);box(.34,.28,.34,V(-3.8,.13,-1),m.darkWood);
 const glowMat=new T.MeshStandardMaterial({color:0xe4c28c,emissive:0xffbf6a,emissiveIntensity:.05,roughness:.8}),lamp=mesh(new T.CylinderGeometry(.16,.19,.43,12),glowMat,V(-1.55,1.26,-3.67));lamp.name='重建后的暖灯';const warmth=new T.PointLight(0xffc078,0,8,1.6);warmth.position.set(-1.55,1.65,-3.40);scene.add(warmth);
 const plants=[addTree(root,{position:[-7.1,0,-5.6],height:7.6,seed:591,tint:0xaab4a1}),addTree(root,{position:[7.5,0,-8.7],height:8.5,seed:823,tint:0xaab4a1}),addBamboo(root,{count:7,bounds:{minX:-10,maxX:-7.8,minZ:2,maxZ:7},height:[3.4,5.8],seed:498})];
 const atmosphere=createAtmosphere(scene,{seed:128,color:0xabbeb0,mistOpacity:.12,mistCount:11,countRain:0,dust:85,mistBounds:{minX:-14,maxX:14,minZ:-14,maxZ:12},shafts:[{id:'home',from:[-2,2.15,.25],to:[-1.5,.5,-3.3],radius:1.0,strength:.1,color:0xf4d9a7}]});
 const leakGeometry=new T.BufferGeometry(),leakPositions=new Float32Array(32*6);leakGeometry.setAttribute('position',new T.BufferAttribute(leakPositions,3));const leakMaterial=new T.LineBasicMaterial({color:0xd8e0ce,transparent:true,opacity:.48,depthWrite:false}),leak=new T.LineSegments(leakGeometry,leakMaterial);leak.name='缺檐下漏进屋里的雨';root.add(leak);
 let begun=false,beamBegun=false,materialsVisible=false,entered=false,clock=0,beamClock=0,simTime=0,last=null;
 const beamSeconds=1.15,roofSeconds=2.65,beamPile=V(.08,.14,3.0);
 function pose(){const q=smooth(clock/roofSeconds),w=smooth((clock-1.90)/.75),beamQ=smooth(beamClock/beamSeconds);patch.visible=materialsVisible;patch.position.set(-3.60*(1-q),-2.62*(1-q),1.20*(1-q));patch.rotation.z=-.37*(1-q);patch.rotation.x=.15*(1-q);repairBeam.visible=materialsVisible;repairBeam.position.copy(beamPile).lerp(beamCentre,beamQ);repairBeam.rotation.set(-Math.atan(1.02/3.07)*(1-beamQ),1.18*(1-beamQ),0);for(const {hinge,side}of windowLeaves)hinge.rotation.y=side*w*1.24;for(const {hinge,side}of doorLeaves)hinge.rotation.y=-side*w*1.46;warmth.intensity=4.6*w;glowMat.emissiveIntensity=.05+1.05*w;atmosphere.setLight('home',1.3*w);
  leak.visible=clock<roofSeconds;leakMaterial.opacity=.48*(1-q);for(let i=0;i<32;i++){const phase=(i*.137+simTime*1.85)%1,x=Math.sin(i*3.17)*.82,z=-.35-Math.cos(i*4.11)*.37,y=3.04-phase*2.77;leakPositions.set([x,y,z,x+.018,y-.16,z+.009],i*6);}leakGeometry.attributes.position.needsUpdate=true;
 }
 const bounds={minX:-5.6,maxX:5.6,minZ:-4.2,maxZ:8};
 function canMove(from,to){if(to.x<bounds.minX||to.x>bounds.maxX||to.z<bounds.minZ||to.z>bounds.maxZ)return false;const inside=p=>Math.abs(p.x)<3.25&&p.z<.55&&p.z>-5.14;
  if(inside(to)!==inside(from)){if(Math.abs(to.x)>.73||Math.abs(from.x)>.90||!begun||clock<roofSeconds||Math.max(to.z,from.z)<.19)return false;}
  if(inside(to)&&(Math.abs(to.x)>2.88||to.z<-4.55))return false;
  // The furniture is solid, but leaves a broad central route to the hearth.
  if(inside(to)&&((to.x<-.60&&to.x>-2.63&&to.z<-3.14)||(to.x>.75&&to.z<-3.18)))return false;return true;
 }
 const targets=[{id:'boat',position:[-1.5,0,1.62],radius:1.35,label:'接梁、补檐',hint:'排水后露出木料。先沿断梁接一笔，等梁接牢，再沿屋面缺口补檐。',verb:'修屋',verse:'',kind:'spatial-gesture',requires:['sluice']},{id:'dock',position:[0,0,-1.05],radius:.66,label:'走进新居',hint:'屋面补齐、木门打开后，沿石路走进屋里。',verb:'入屋',verse:'',kind:'walk',requires:['boat']}];
 function interact(id){if(id==='boat')return begun&&clock>=roofSeconds;if(id==='dock'){if(!begun||clock<roofSeconds)return false;entered=true;return true;}return false;}
 function update(t,response=0,explicitDt){const dt=explicitDt===undefined?(last===null?0:Math.min(.06,Math.max(0,t-last))):T.MathUtils.clamp(Number.isFinite(explicitDt)?explicitDt:0,0,.06);last=Number.isFinite(t)?t:last;simTime+=dt;if(beamBegun)beamClock=Math.min(beamSeconds,beamClock+dt);if(begun)clock=Math.min(roofSeconds,clock+dt);pose();atmosphere.update(simTime,{clarity:smooth(clock/3)*.5});}
 function reset(){begun=beamBegun=materialsVisible=entered=false;clock=beamClock=simTime=0;last=null;pose();atmosphere.update(0);}
 function routeTo(goal,from){const target=goal.clone();target.x=T.MathUtils.clamp(target.x,bounds.minX,bounds.maxX);target.z=T.MathUtils.clamp(target.z,bounds.minZ,bounds.maxZ);target.y=0;const inside=p=>Math.abs(p.x)<3.25&&p.z<.55,route=[];
  if(inside(target)&&!inside(from))route.push(V(0,0,1.02),V(0,0,-.35));
  else if(inside(from)&&!inside(target))route.push(V(0,0,-.35),V(0,0,1.02));
  else if(!inside(from)&&!inside(target)&&Math.min(from.z,target.z)<.60){const side=Math.sign(target.x)||Math.sign(from.x)||1;route.push(V(side*4.1,0,Math.max(1.05,from.z)),V(side*4.1,0,target.z));}
  route.push(target);return route.filter((p,i)=>i||p.distanceTo(from)>.12);
 }
 // The helper omits detached pieces during batching (the absent front roof).
 batchStatic();reset();const architecture={targets,interact,canMove,reset,get progress(){return smooth(clock/roofSeconds);},get repaired(){return begun&&clock>=roofSeconds;}};
 const repairParts={beam:repairBeam,beamCentre:beamCentre.toArray(),gapTop:gapTop.toArray(),gapBottom:gapBottom.toArray(),roofPatch:patch,leak,windowLeaves,doorLeaves,lampMaterial:glowMat,warmth,beamSeconds,roofSeconds,setMaterialsVisible(value){materialsVisible=!!value;pose();},beginBeam(){if(!materialsVisible||beamBegun)return false;beamBegun=true;beamClock=0;pose();return true;},beginRoof(){if(!materialsVisible||!beamBegun||beamClock<beamSeconds||begun)return false;begun=true;clock=0;pose();return true;},get materialsVisible(){return materialsVisible;},get beamProgress(){return smooth(beamClock/beamSeconds);},get beamReady(){return beamBegun&&beamClock>=beamSeconds;},get roofProgress(){return smooth(clock/roofSeconds);},get roofBegun(){return begun;},get repaired(){return begun&&clock>=roofSeconds;},get leaking(){return leak.visible;},get stats(){return {materialsVisible,beamBegun,beamClock,beamSeconds,beamProgress:smooth(beamClock/beamSeconds),beamReady:beamBegun&&beamClock>=beamSeconds,roofBegun:begun,roofClock:clock,roofSeconds,roofProgress:smooth(clock/roofSeconds),repaired:begun&&clock>=roofSeconds,leaking:leak.visible,leakOpacity:leakMaterial.opacity,lampIntensity:warmth.intensity,doorAngles:doorLeaves.map(o=>o.hinge.rotation.y),simTime};}};
 return attachDwellingCamera({scene,root,spawn:[0,0,7],bounds,targets,interact,update,reset,canMove,routeTo,architecture,repairParts,atmosphere,heightAt:()=>0,freeMovement:true,ready:Promise.all(plants.map(p=>p.userData.ready)),followCamera:{offset:[10/1.15,7.1/1.15,20/1.15],lookHeight:1.6,trackX:.60,trackZ:.66,worldAnchor:[.25,0,1.9],fov:40},exit:{position:[0,0,-2.7],crossing:{axis:'z',direction:-1,value:-2.3},label:'走入黄州新居'},get rebuilt(){return begun&&clock>=roofSeconds;},get entered(){return entered;}});
}
