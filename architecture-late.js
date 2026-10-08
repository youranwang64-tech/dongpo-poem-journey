import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function buildLateArchitecture(index,{scene,root,box,rod,roof,materials,mat}){
 const actions=new Set(),level=new Map(),preview=new Map(),animated=[],owned=[],gestureComponents={},group=new T.Group();group.name='ArchitectureInteraction_'+index;root.add(group);let lastTime=0;
 const wood=materials.wood,stone=materials.stone,wall=materials.wall,softWood=mat(0x4a4b3a,{roughness:.98});
 function mesh(g,m,p=V(),parent=group){const o=new T.Mesh(g,m);o.position.copy(p);o.castShadow=true;o.receiveShadow=true;parent.add(o);owned.push(o);return o;}
 const b=(w,h,d,p,m=wood,parent=group)=>box(w,h,d,p,m,parent),r=(a,bp,rad=.035,m=wood,parent=group)=>rod(a,bp,rad,m,parent);
 function frame(x,y,z,w,h,rotation=0,parent=group){const f=new T.Group();f.position.set(x,y,z);f.rotation.y=rotation;parent.add(f);for(const a of [-1,1])b(.105,h+.2,.16,V(a*w/2,0,0),wood,f);for(const a of [-1,1])b(w+.2,.11,.16,V(0,a*h/2,0),wood,f);return f;}
 function lattice(parent,w,h,axis='x'){if(axis==='x'){for(let x=-w/2+.09;x<w/2;x+=.20)b(.035,h,.055,V(x,h/2,0),softWood,parent);for(let y=.14;y<h;y+=.26)b(w,.025,.052,V(0,y,0),wood,parent);}else{for(let z=.10;z<w;z+=.20)b(.055,h,.035,V(0,h/2,z),softWood,parent);for(let y=.14;y<h;y+=.26)b(.052,.025,w,V(0,y,w/2),wood,parent);}}
 function shutters(x,z,w=2.8,h=2.35,bottom=.70){const pair=[];frame(x,bottom+h/2,z,w,h);for(const side of [-1,1]){const g=new T.Group();g.position.set(x+side*w/2,bottom,z+.035);group.add(g);const pane=new T.Group();pane.position.x=-side*w/4;g.add(pane);lattice(pane,w/2,h);for(const y of [0,h])b(w/2,.08,.09,V(0,y,0),wood,pane);pair.push({g,side});}return pair;}
 function foldingAcrossX(x,z,w=2.8,h=2.9){const leaves=[],count=4,len=w/count;let parent=group;for(let i=0;i<count;i++){const g=new T.Group();g.position.set(i?0:x,0,i?len:z);parent.add(g);lattice(g,len,h,'z');for(const yy of [0,h])b(.09,.075,len,V(0,yy,len/2),wood,g);leaves.push(g);parent=g;}return leaves;}
 const get=id=>preview.has(id)?preview.get(id):level.get(id)||0,motion=id=>T.MathUtils.smoothstep(get(id),0,.78),has=(done,id)=>done instanceof Set?done.has(id):Array.isArray(done)?done.includes(id):Boolean(done?.[id]);let targets=[];
 if(index===3){
  const pivot=new T.Group();pivot.name='渡江升降栈桥';pivot.position.set(0,.006,-.45);pivot.rotation.x=Math.PI/2;group.add(pivot);const length=3.7,width=1.62;
  for(let i=0;i<18;i++)b(width,.085,length/18-.012,V(0,-.037,-(i+.5)*length/18),wood,pivot);
  for(const x of [-width/2,width/2]){b(.09,.13,length,V(x,-.05,-length/2),wood,pivot);for(let i=0;i<5;i++)r(V(x,0,-i*length/4),V(x,.72,-i*length/4),.033,wood,pivot);r(V(x,.70,0),V(x,.70,-length),.026,wood,pivot);}
  const winch=new T.Group();winch.position.set(-1.0,0,2.95);group.add(winch);b(.68,.24,.72,V(0,.12,0),stone,winch);for(const x of [-.25,.25])b(.10,.90,.12,V(x,.66,0),wood,winch);const drum=mesh(new T.CylinderGeometry(.18,.18,.63,14),wood,V(0,.90,0),winch);drum.rotation.z=Math.PI/2;const handle=new T.Group();handle.position.set(-.41,.9,0);winch.add(handle);r(V(0,0,0),V(0,.29,0),.03,wood,handle);r(V(0,.29,0),V(-.16,.29,0),.027,wood,handle);
  handle.visible=false;
  const cableG=new T.BufferGeometry();cableG.setAttribute('position',new T.Float32BufferAttribute([-.83,1.1,2.95,-.83,3.8,-.45,-.83,3.8,-.45,-.70,.0,-4.15],3));const cable=new T.LineSegments(cableG,new T.LineBasicMaterial({color:0x777a68}));group.add(cable);r(V(-.98,0,-.45),V(-.98,3.8,-.45),.095);r(V(-1.2,3.8,-.45),V(-.65,3.8,-.45),.07);
  animated.push(t=>{const a=motion('boat');pivot.rotation.x=(1-a)*Math.PI/2;pivot.updateMatrixWorld(true);const tip=V(-.70,0,-length).applyMatrix4(pivot.matrixWorld);const points=cableG.attributes.position;points.setXYZ(3,tip.x,tip.y,tip.z);points.needsUpdate=true;});
  targets=[{id:'boat',position:[0,0,3],label:'通舟栈桥',hint:'走到木栈边，以笔风展开通向渡舟的木桥。',verse:'一叶渡江',kind:'brush'},{id:'dock',position:[0,0,-1],label:'落下的踏桥',hint:'木桥落好了，沿着桥板向渡舟走。',verse:'长江绕郭知鱼美',kind:'walk',radius:.35,requires:['boat']}];
 }
 if(index===4){
  roof(-.8,3.55,1,16.6,3.45,.88,group);for(let x=-8;x<7;x+=3.2)for(const z of [-1.27,3.2]){r(V(x,0,z),V(x,3.59,z),.085);b(.33,.13,.33,V(x,.06,z),stone);}
  const windDoor=new T.Group();windDoor.name='风雨廊折叠格屏';windDoor.position.set(-.72,0,-.35);group.add(windDoor);const windLeaves=[],windHits=[],windWidth=2.75/4;let windParent=windDoor;
  const panelHitMaterial=new T.MeshBasicMaterial({color:0xc1c7b3,transparent:true,opacity:.013,side:T.DoubleSide,depthWrite:false});
  for(let i=0;i<4;i++){const leaf=new T.Group();leaf.name='风雨廊格屏第'+(i+1)+'扇';leaf.position.z=i?windWidth:0;windParent.add(leaf);lattice(leaf,windWidth,2.9,'z');for(const yy of [0,2.9])b(.085,.09,windWidth,V(0,yy,windWidth/2),wood,leaf);for(const zz of [0,windWidth])b(.085,2.9,.075,V(0,1.45,zz),wood,leaf);const hit=mesh(new T.PlaneGeometry(windWidth-.03,2.78).rotateY(Math.PI/2),panelHitMaterial,V(.035,1.45,windWidth/2),leaf);hit.name='风雨格扇操作面';hit.castShadow=false;windLeaves.push(leaf);windHits.push(hit);windParent=leaf;}
  for(const z of [-.35,2.4])b(.14,3.12,.14,V(-.72,1.56,z));b(.15,.13,2.9,V(-.72,3.0,1.0));
  const windHandle=mesh(new T.TorusGeometry(.095,.015,6,18),softWood,V(.075,1.45,windWidth*.68),windLeaves[3]);windHandle.rotation.y=Math.PI/2;windHandle.name='风雨格屏拉环';
  gestureComponents.wind={mode:'fold',group:windDoor,handle:windHandle,hitObjects:windHits,centre:V(-.685,1.45,2.18),normal:V(1,0,0),start:V(-.685,1.45,2.18),axis:V(0,0,-1),length:2.10,leaves:windLeaves};
  r(V(-8,3.43,2.9),V(2.75,3.43,2.9),.06,softWood);r(V(-8,3.36,2.81),V(2.75,3.36,2.81),.03,wood);r(V(2.75,3.43,2.90),V(2.75,.10,2.90),.036,softWood);
  const valve=new T.Group();valve.name='檐槽疏水木闸';valve.position.set(1,2.58,2.8);group.add(valve);b(.42,.46,.08,V(),softWood,valve);r(V(0,.10,.06),V(.33,.15,.09),.025,wood,valve);
  valve.visible=false;
  const channel=mesh(new T.PlaneGeometry(.84,3.35).rotateX(-Math.PI/2),mat(0x29433a,{roughness:.22,metalness:.11}),V(2.72,.012,1));channel.castShadow=false;for(const x of [2.22,3.21])b(.10,.045,3.4,V(x,.018,1),stone);
  const shortBridge=new T.Group();shortBridge.name='烟雨跨渠桥';shortBridge.position.set(2.23,.020,1);shortBridge.rotation.z=Math.PI/2;group.add(shortBridge);for(let i=0;i<6;i++)b(.155,.06,1.80,V(.075+i*.165,0,0),wood,shortBridge);for(const z of [-.88,.88])b(.98,.09,.07,V(.48,-.02,z),wood,shortBridge);
  const rainP=[];for(let i=0;i<65;i++)rainP.push(2.75+Math.sin(i*2.4)*.035,.18+(i/65)*3.15,2.91);const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(rainP,3));const drops=new T.Points(rg,new T.PointsMaterial({color:0xa4b7ad,size:.025,transparent:true,opacity:0,depthWrite:false,fog:true}));drops.name='檐槽下水';group.add(drops);
  frame(5.2,1.92,-1.26,3.0,2.25);for(const x of [3.4,6.9])b(.28,2.25,.19,V(x,1.14,-1.26),wall);b(3.6,.13,.40,V(5.2,.61,-1.26),wood);b(1.7,.10,.44,V(5.2,.54,2.45),wood);for(const x of [4.6,5.8])b(.1,.51,.31,V(x,.25,2.45));
  animated.push(t=>{const openness=preview.has('wind')?get('wind'):motion('wind');for(let i=0;i<windLeaves.length;i++)windLeaves[i].rotation.y=openness*(i===0?1.35:i%2?-2.70:2.70);shortBridge.rotation.z=(1-openness)*Math.PI/2;drops.material.opacity=openness*.35;drops.position.y=-(t*.9)% .20;});
  targets=[{id:'wind',position:[-3,0,1],label:'风雨廊格屏',hint:'走近格屏，让风穿过廊间，展开雨中的通路。',verse:'莫听穿林打叶声',kind:'brush'},{id:'rain',position:[1,0,1],label:'雨廊开口',hint:'格屏打开了，穿过雨廊，走到前方的观雨开口。',verse:'何妨吟啸且徐行',kind:'walk',radius:.50,requires:['wind']},{id:'path',position:[5,0,1],label:'廊外观雨窗',hint:'跨过排水渠，走到窗边看竹林里的雨。',verse:'一蓑烟雨任平生',kind:'walk',radius:.45,requires:['rain']}];
 }
 if(index===5){
  const window=shutters(-2,-.20,2.65,2.32,.62);for(const x of [-3.7,-.3])r(V(x,0,-.28),V(x,3.6,-.28),.08);roof(-2,3.55,-.22,4.0,1.8,.56,group);b(1.7,.095,.45,V(-2,.52,2.1),wood);for(const x of [-2.6,-1.4])b(.10,.49,.33,V(x,.24,2.1));
  const leaves=[],waterHits=[],width=.75;let parent=group;const waterHitMaterial=new T.MeshBasicMaterial({color:0xc1c7b3,transparent:true,opacity:.013,side:T.DoubleSide,depthWrite:false});for(let i=0;i<4;i++){const leaf=new T.Group();leaf.name='望江格屏第'+(i+1)+'扇';leaf.position.set(i?width:-1.5,0,i?0:-4.25);parent.add(leaf);const pane=new T.Group();pane.position.x=width/2;leaf.add(pane);lattice(pane,width,2.8);for(const y of [0,2.8])b(width,.075,.075,V(0,y,0),wood,pane);for(const x of [-width/2,width/2])b(.075,2.8,.075,V(x,1.40,0),wood,pane);const hit=mesh(new T.PlaneGeometry(width-.03,2.70),waterHitMaterial,V(0,1.40,.035),pane);hit.name='望江格扇操作面';hit.castShadow=false;leaves.push(leaf);waterHits.push(hit);parent=leaf;}
  const waterHandle=mesh(new T.TorusGeometry(.10,.016,6,18),softWood,V(width*.72,1.40,.09),leaves[3]);waterHandle.name='望江格屏拉环';gestureComponents.water={mode:'fold',handle:waterHandle,hitObjects:waterHits,centre:V(1.29,1.40,-4.215),normal:V(0,0,1),start:V(1.29,1.40,-4.215),axis:V(-1,0,0),length:2.60,leaves};
  for(const x of [-1.67,1.67]){r(V(x,0,-3.45),V(x,.78,-3.45),.055);r(V(x,.75,-3.45),V(x,.75,-6.3),.043);for(let z=-4.2;z>-6.5;z-=.8)r(V(x,0,z),V(x,.75,z),.04);}b(3.5,.12,.12,V(0,3.0,-4.25));
  const planks=[];for(let i=0;i<12;i++){const plank=b(3.12,.066,.225,V(0,-.022,-3.6-i*.015),wood);planks.push({o:plank,z:-3.6-i*.235});}
  animated.push(t=>{for(const {g,side} of window)g.rotation.y=side*motion('moon')*1.34;const openness=preview.has('water')?get('water'):motion('water');for(let i=0;i<leaves.length;i++)leaves[i].rotation.y=openness*(i===0?1.37:i%2?-2.74:2.74);for(const p of planks)p.o.position.z=T.MathUtils.lerp(-3.6,p.z,openness);});
  targets=[{id:'moon',position:[-2,0,1],label:'临江轩观月窗',hint:'在轩窗前挥笔，打开格扇，借窗看见江月。',verse:'大江东去，浪淘尽',kind:'brush'},{id:'water',position:[1,0,-3],label:'望江平台格屏',hint:'展开格屏与活动桥板，走到临江的平台上。',verse:'渺沧海之一粟',kind:'brush'}];
 }
 if(index===6){
  roof(0,3.75,-.2,5.0,3.5,.70,group);for(const x of [-2.38,2.38])for(const z of [-1.70,1.25])r(V(x,0,z),V(x,3.78,z),.085);
  const horizontal=frame(-2.35,2.07,-1.0,4.1,1.38,Math.PI/2);for(const z of [-3.05,1.05])b(.16,1.37,.17,V(-2.35,.65,z),wall);const louvers=[];for(let i=0;i<7;i++){const g=new T.Group();g.position.set(-2.35,1.47,-2.86+i*.60);group.add(g);b(.06,1.28,.13,V(0,.63,0),wood,g);louvers.push(g);}
  frame(0,1.79,-4.50,1.85,3.55);for(const x of [-1.16,1.16])b(.22,3.68,.18,V(x,1.84,-4.50),wall);b(2.9,.18,.32,V(0,3.57,-4.50),wood);
  animated.push(t=>{for(const l of louvers)l.rotation.y=motion('mountain')*.91;});
  targets=[{id:'mountain',position:[0,0,-1],label:'横向借景窗',hint:'走到廊窗前，隔着横向开口看山岭。',verse:'横看成岭',kind:'walk',radius:.45},{id:'mountain-rear',position:[0,0,-3.8],label:'竖向框景窗',hint:'沿廊走到第二处景窗，再看山峰的另一面。',verse:'侧成峰',kind:'walk',radius:.40,requires:['mountain']}];
 }
 if(index===7){
  const leaves=foldingAcrossX(.35,-.38,2.78,2.93);for(const z of [-.40,2.42])b(.15,3.28,.18,V(.35,1.64,z));b(.17,.13,3.02,V(.35,3.11,1.02));
  gestureComponents.lantern={mode:'write',centre:V(-1.1,2.20,1.2),leaves};
  frame(4,1.7,1,2.8,3.38,Math.PI/2);for(const z of [-.5,2.5])r(V(4,0,z),V(4,3.35,z),.08);b(.11,.10,2.85,V(4,3.30,1.0));
  const lampMat=mat(0xbca876,{emissive:0xd6b576,emissiveIntensity:.035,roughness:.8}),lamp=mesh(new T.CylinderGeometry(.18,.18,.49,10),lampMat,V(-2,2.08,2.35));const lampLight=new T.PointLight(0xffd398,.10,7.5,1.6);lampLight.position.set(-2,2.08,2.35);group.add(lampLight);r(V(-2,3.28,2.35),V(-2,2.30,2.35),.018);
  animated.push(t=>{const openness=preview.has('lantern')?get('lantern'):motion('lantern');for(let i=0;i<leaves.length;i++)leaves[i].rotation.y=openness*(i===0?1.40:i%2?-2.80:2.80);lampMat.emissiveIntensity=.035+openness*.8;lampLight.intensity=.10+openness*4.1;});
  targets=[{id:'lantern',position:[-2,0,1],label:'折廊灯火',hint:'点亮廊灯，展开折屏，让长廊露出后面的门。',verse:'回首向来萧瑟处',kind:'brush'},{id:'gate',position:[4,0,1],label:'折廊转口',hint:'穿过廊门，回望来路，再走向归去之门。',verse:'也无风雨也无晴',kind:'walk',radius:.28,requires:['lantern']}];
 }
 function previewAction(id,progress){if(!gestureComponents[id])return false;preview.set(id,T.MathUtils.clamp(progress,0,1));group.updateMatrixWorld(true);for(const f of animated)f(lastTime);group.updateMatrixWorld(true);return true;}
 function interact(id){const target=targets.find(t=>t.id===id);if(!target)return true;if(target.requires?.some(p=>!actions.has(p)))return false;if(preview.has(id)){level.set(id,preview.get(id));preview.delete(id);}actions.add(id);return true;}
 function update(t,dt){const delta=dt===undefined?Math.min(.06,Math.max(0,t-lastTime)):Math.min(.06,Math.max(0,dt));lastTime=t;for(const id of actions)level.set(id,T.MathUtils.damp(get(id),1,1.1,delta));group.updateMatrixWorld(true);for(const f of animated)f(t);}
 function reset(){actions.clear();level.clear();preview.clear();lastTime=0;update(0,0);}
 function canMove(from,to,done=actions){
  if(index===3&&to.z<-.45&&get('boat')<.78)return false;
  if(index===4){if(to.x>-.72&&from.x<=-.72&&get('wind')<(preview.has('wind')?.995:.78))return false;if(to.x>2.22&&from.x<=2.22&&get('wind')<(preview.has('wind')?.995:.78))return false;if(to.x>=2.22&&to.x<=3.24&&Math.abs(to.z-1)>.69)return false;}
  if(index===5){if(to.z<-3.65&&Math.abs(to.x)>1.56)return false;if(to.z<-4.25&&get('water')<(preview.has('water')?.995:.78))return false;}
  if(index===6){if(to.z<-1.72&&!has(done,'mountain'))return false;if(to.z<-4.52&&!has(done,'mountain-rear'))return false;if(to.z<-4.4&&to.z>-4.64&&Math.abs(to.x)>.79)return false;}
  if(index===7&&to.x>.35&&from.x<=.35&&get('lantern')<(preview.has('lantern')?.995:.78))return false;
  return true;
 }
 reset();return {group,targets,interact,previewAction,gestureComponents,actionProgress:get,update,reset,canMove};
}
