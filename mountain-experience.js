import * as T from './vendor/three.module.js';
import {createInteractionHitTester} from './interaction-hit.js';
import {addMountainLandscape,createLookoutTerrace} from './mountain-landscape.js';
export {createMountainRidgeGeometry} from './mountain-landscape.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
const ids=['mountain','mountain-rear'];

// A light brush touch starts one architectural action. Progress belongs to the
// hinged shutters, never to pointer distance or a vertical lifting gesture.
export function createBrushWindowState(){
 const amounts=new Map(ids.map(id=>[id,0])),opened=new Set();
 const duration=2.15;let opening=null,age=0,completed=null;
 function request(id){
  if(!ids.includes(id)||opening||completed||opened.has(id)||id==='mountain-rear'&&!opened.has('mountain'))return false;
  opening=id;age=0;return true;
 }
 function advance(dt){
  if(!opening)return null;age+=Math.max(0,dt);amounts.set(opening,clamp(age/duration,0,1));
  if(age<duration)return null;const id=opening;amounts.set(id,1);opened.add(id);completed=id;opening=null;return id;
 }
 function reset(){for(const id of ids)amounts.set(id,0);opened.clear();opening=null;age=0;completed=null;}
 return {request,advance,reset,amount:id=>amounts.get(id)||0,isComplete:id=>opened.has(id),acknowledge:id=>{if(completed===id)completed=null;},duration,
  get completedId(){return completed;},get openingId(){return opening;},get progress(){return opening?amounts.get(opening):completed?amounts.get(completed):opened.has('mountain')?amounts.get('mountain-rear'):amounts.get('mountain');}};
}

// Only timber actually in the painting's sight line becomes a faint outline.
// Every participating mesh owns its material so an opening never fades floors,
// the other window, the panorama or the traveler through a shared material.
export function createMountainViewOcclusion(architectureGroup,windows,railGroup,peakPoint){
 const records=[],ray=new T.Raycaster(),localBox=new T.Box3();let selected=[],id=null,weight=0;
 function register(object,scope,type,ghost){
  if(!object.isMesh||!object.material||object.material.opacity===0)return;
  const originals=Array.isArray(object.material)?object.material:[object.material],materials=originals.map(material=>material.clone());
  object.material=Array.isArray(object.material)?materials:materials[0];object.userData.mountainViewOccluder=true;
  object.geometry.computeBoundingBox();
  records.push({object,scope,type,ghost,materials,baseline:materials.map(m=>({opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite})),castShadow:object.castShadow,box:object.geometry.boundingBox.clone()});
 }
 for(const win of windows.values())win.group.traverse(object=>{
  if(!object.isMesh)return;
  let inLeaf=false;for(let parent=object.parent;parent&&parent!==win.group;parent=parent.parent)if(parent===win.pane)inLeaf=true;
  const dimensions=object.geometry.parameters||{},mullion=!inLeaf&&dimensions.width<.12&&dimensions.height>=win.height;
  register(object,win.id,inLeaf?'窗扇':mullion?'内中柱':'外窗框',inLeaf?.065:mullion?.055:.22);
 });
 architectureGroup.traverse(object=>{if(object.name==='横窗外侧柱'||object.name==='竖窗外侧柱')register(object,null,'廊柱',.09);});
 railGroup.traverse(object=>{if(object.userData.railSegments||object.name.endsWith('栏杆扶手'))register(object,null,'栏杆',.14);});
 function applyRecord(record,amount){
  const fading=amount>1e-6;
  for(let i=0;i<record.materials.length;i++){
   const material=record.materials[i],base=record.baseline[i],transparent=fading||base.transparent;
   if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
   material.opacity=base.opacity*T.MathUtils.lerp(1,record.ghost,amount);material.depthWrite=fading?false:base.depthWrite;
  }
  record.object.castShadow=fading?false:record.castShadow;
 }
 function reset(){for(const record of records)applyRecord(record,0);selected=[];id=null;weight=0;}
 function rectangle(object,camera,box){
  const result={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};let front=0;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const p=V(x,y,z).applyMatrix4(object.matrixWorld);if(p.clone().applyMatrix4(camera.matrixWorldInverse).z>=-.01)continue;
   p.project(camera);result.minX=Math.min(result.minX,p.x);result.maxX=Math.max(result.maxX,p.x);result.minY=Math.min(result.minY,p.y);result.maxY=Math.max(result.maxY,p.y);front++;
  }
  return front?result:null;
 }
 function select(camera,windowId){
  reset();const win=windows.get(windowId);if(!win||!camera)return;
  id=windowId;architectureGroup.updateWorldMatrix(true,true);camera.updateMatrixWorld();
  // Include the sill sight line: an opened leaf sits farther away than its
  // frame, so the near low rail can overlap the bottom of its visible canvas.
  localBox.set(V(-win.width*.51,win.bottom-.30,0),V(win.width*.51,win.bottom+win.height+.05,0));
  const opening=rectangle(win.group,camera,localBox),peak=peakPoint?.(windowId),peakBlockers=new Set();
  if(peak){const direction=peak.clone().sub(camera.position);ray.set(camera.position,direction.clone().normalize());ray.far=direction.length()-1;for(const hit of ray.intersectObjects(records.map(record=>record.object),false))peakBlockers.add(hit.object);}
  for(const record of records){
   if(record.scope&&record.scope!==windowId)continue;
   const projected=rectangle(record.object,camera,record.box),overlap=opening&&projected&&projected.maxX>=opening.minX&&projected.minX<=opening.maxX&&projected.maxY>=opening.minY&&projected.minY<=opening.maxY;
   if(overlap||peakBlockers.has(record.object))selected.push(record);
  }
 }
 function apply(amount){weight=clamp(amount,0,1);for(const record of selected)applyRecord(record,weight);}
 return {select,apply,reset,get stats(){
  const byType={};let minOpacity=1;
  for(const record of selected){const opacity=record.materials[0].opacity,entry=byType[record.type]||(byType[record.type]={count:0,minOpacity:1});entry.count++;entry.minOpacity=Math.min(entry.minOpacity,opacity);minOpacity=Math.min(minOpacity,opacity);}
  return {id,weight,count:selected.length,minOpacity,byType,selected:selected.filter(record=>record.type!=='窗扇').slice(0,32).map(record=>({name:record.object.name||record.type,type:record.type,opacity:record.materials[0].opacity}))};
 }};
}

export function buildMountainExperience(stage){
 if(!stage?.scene||!stage?.root)throw new TypeError('庐山体验需要现有的第七章场景。');
 const {scene,root}=stage,architecture=stage.architecture||{},shutters=createBrushWindowState();
 const oldUpdate=stage.update?.bind(stage),oldReset=stage.reset?.bind(stage),oldReady=stage.ready;
 // The old little pavilion put its roof and trees between the eye and the view.
 // Keep its ground and botanical assets; replace the entire observation route.
 for(const object of [...root.children])root.remove(object);
 createLookoutTerrace(root);
 const architectureGroup=new T.Group();architectureGroup.name='庐山折廊';root.add(architectureGroup);architecture.group=architectureGroup;
 const landscape=addMountainLandscape(root),ridge=landscape.ridge;
 if(scene.fog?.isFogExp2)scene.fog.density=.00215;
 if(scene.background?.isColor)scene.background.set(0x8a9d92);else scene.background=new T.Color(0x8a9d92);scene.fog?.color.set(0x8a9d92);
 const rim=new T.DirectionalLight(0xe0eadc,.84);rim.position.set(10,100,4);rim.target.position.set(-100,12,-170);scene.add(rim,rim.target);
 stage.atmosphere?.setEnvelopes?.([
  {id:'gallery-foot-side',center:[3.8,.15,-18],size:[5.4,1.2,16],density:.8,color:0x81958b,flow:.17},
  {id:'gallery-foot-end',center:[-16.2,.35,3.7],size:[5.4,2.5,6.6],density:.76,color:0x81958b,flow:.12},
  {id:'gallery-cliff-edge',center:[-5,-6,-12],size:[21,6,27],density:1.25,color:0x91a59a,flow:.19},
  {id:'pine-root-east',center:[4.8,-.6,-25.6],size:[4.4,2.1,4.4],density:1.45,color:0x9eb1a7,flow:.15},
  {id:'pine-root-west',center:[-17.4,-.7,4.2],size:[6.2,1.9,6.2],density:1.5,color:0x9eb1a7,flow:.13},
  {id:'pine-root-south',center:[6.8,-.7,5.8],size:[6.6,2.0,6.6],density:1.5,color:0x9eb1a7,flow:.14},
  {id:'gallery-underfoot-drift',center:[-6,-2.1,-10],size:[20,2.3,25],density:.65,color:0x9eb1a7,flow:.18},
  {id:'gallery-valley-haze',center:[-31,-12,-34],size:[58,12,65],density:1.0,color:0x9eb1a7,flow:.13},
  {id:'lushan-painted-valley',center:[-184,-11,-17],size:[40,22,109],density:.74,color:0x9eb1a7,flow:.14},
  {id:'lushan-painted-peak-base',center:[-10,-15,-202],size:[86,24,40],density:.88,color:0xa6b8af,flow:.11}
 ]);

 const wood=new T.MeshStandardMaterial({color:0x645f4d,roughness:.93}),darkWood=new T.MeshStandardMaterial({color:0x424838,roughness:.96});
 const backing=new T.MeshStandardMaterial({color:0xaaa99a,roughness:1,side:T.DoubleSide}),metal=new T.MeshStandardMaterial({color:0x5a6354,roughness:.8,metalness:.12});
 const windows=new Map(),windowGroup=new T.Group();windowGroup.name='点笔开扇借景窗';architectureGroup.add(windowGroup);
 function box(w,h,d,position,parent,material=wood){const object=new T.Mesh(new T.BoxGeometry(w,h,d),material);object.position.copy(position);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;}
 const stone=new T.MeshStandardMaterial({color:0x626d60,roughness:.9});
 function roof(parent,width,depth){
  for(const side of [-1,1]){const p=[],indices=[],nx=Math.ceil(width*2),nz=8;
   for(let a=0;a<=nx;a++)for(let b=0;b<=nz;b++){const u=b/nz,x=(a/nx-.5)*(width+.6);p.push(x,.9-u*1.16+u*u*.24+Math.pow(Math.abs(a/nx-.5)*2,6)*u*.16,side*u*(depth/2+.4));}
   for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){const k=a*(nz+1)+b;indices.push(k,k+1,k+nz+1,k+1,k+nz+2,k+nz+1);}
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setIndex(indices);geometry.computeVertexNormals();const o=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x414c42,emissive:0x596455,emissiveIntensity:.14,roughness:.94,side:T.DoubleSide}));o.name='借景廊瓦顶';o.castShadow=true;parent.add(o);
   for(let a=0;a<=nx;a+=2){const points=[];for(let b=0;b<=nz;b++){const k=(a*(nz+1)+b)*3;points.push(V(p[k],p[k+1]+.012,p[k+2]));}parent.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x697366,transparent:true,opacity:.34})));}
  }
 }
 box(4.5,.12,23,V(0,-.075,-17),architectureGroup,stone);
 box(14,.12,3.2,V(-5,.0,1),architectureGroup,stone);
 box(5.4,.12,7,V(-10.15,-.035,-.5),architectureGroup,stone);
 const sideRoof=new T.Group();sideRoof.position.set(0,11.15,-17);sideRoof.rotation.y=Math.PI/2;architectureGroup.add(sideRoof);roof(sideRoof,22.6,5.2);
 const endRoof=new T.Group();endRoof.position.set(-10.15,10.0,-.7);architectureGroup.add(endRoof);roof(endRoof,5.5,7.2);
 for(const x of [-2.35,2.05])for(const z of [-27.2,-6.8]){const o=box(.22,11.2,.22,V(x,5.6,z),architectureGroup);o.name='横窗外侧柱';}
 for(const x of [-12.6,-7.7])for(const z of [-3.0,2.7]){const o=box(.22,10.05,.22,V(x,5.025,z),architectureGroup);o.name='竖窗外侧柱';}
 // Two continuous edge runs follow the bent gallery. Their shared corner posts
 // connect the long viewing corridor to the return without crossing its walk.
 const railGroup=new T.Group();railGroup.name='贴合折廊边界的栏杆';architectureGroup.add(railGroup);
 const railRuns=[
  {id:'横窗内沿',from:[-1.75,-28],to:[-1.75,-.74],path:'内沿',depth:.36},
  {id:'北侧转角',from:[-1.75,-.74],to:[-7.7,-.74],path:'内沿',depth:.36},
  {id:'竖窗内沿',from:[-7.7,-.74],to:[-7.7,-3],path:'内沿',depth:.36},
  {id:'横窗外沿',from:[1.7,-28],to:[1.7,2.78],path:'外沿',depth:.36},
  {id:'南侧廊沿',from:[1.7,2.78],to:[-12.35,2.78],path:'外沿',depth:.46},
  {id:'竖窗外沿',from:[-12.35,2.78],to:[-12.35,-3],path:'外沿',depth:.36}
 ];
 railGroup.userData.segments=railRuns.map(({id,from,to,path})=>({id,path,from:[from[0],.78,from[1]],to:[to[0],.78,to[1]]}));
 const railPosts=new Map();
 for(const run of railRuns){
  const {id,from,to,depth}=run,a=V(from[0],0,from[1]),b=V(to[0],0,to[1]),length=a.distanceTo(b),intervals=Math.ceil(length/1.65),centre=a.clone().add(b).multiplyScalar(.5),alongZ=from[0]===to[0];
  const sill=box(length+.22,.12,depth,centre.clone(),railGroup,stone);sill.name=id+'栏杆石座';sill.rotation.y=alongZ?Math.PI/2:0;
  const beam=box(length,.08,.12,centre.clone().setY(.78),railGroup);beam.name=id+'栏杆扶手';beam.rotation.y=alongZ?Math.PI/2:0;beam.userData.segment=id;
  for(let i=0;i<=intervals;i++){
   const p=a.clone().lerp(b,i/intervals),key=p.x.toFixed(6)+':'+p.z.toFixed(6);
   let post=railPosts.get(key);
   if(!post){
    post=box(.12,.76,.12,p.clone().setY(.44),railGroup);post.name=id+(i===0||i===intervals?'栏杆端柱':'栏杆立柱');post.userData.railSegments=[];railPosts.set(key,post);
    const foot=box(.20,.07,.20,p.clone().setY(.065),railGroup,stone);foot.name=id+'栏杆柱脚';
   }
   post.userData.railSegments.push(id);
   if(post.userData.railSegments.length>1)post.name=run.path+'共享转角柱';
  }
 }
 function window({id,position,rotation=0,width,height,bottom,vertical=false,pairs=1}){
  const group=new T.Group();group.name=id==='mountain'?'四联对开借景窗':'对开竖幅借景窗';group.position.copy(position);group.rotation.y=rotation;windowGroup.add(group);
  const centre=bottom+height/2;
  for(const side of [-1,1])box(.14,height+.27,.18,V(side*(width/2+.025),centre,0),group);
  for(const side of [-1,1])box(width+.32,.14,.22,V(0,centre+side*(height/2+.025),0),group);
  const pane=new T.Group();pane.name='侧铰窗扇';pane.position.y=bottom;group.add(pane);
  const leaves=[],bayWidth=width/pairs;
  for(let pair=0;pair<pairs;pair++){
   const bayLeft=-width/2+pair*bayWidth,bayRight=bayLeft+bayWidth;
   if(pair)box(.11,height+.10,.16,V(bayLeft,centre,0),group);
   for(const sign of [1,-1]){
    const leafWidth=bayWidth/2-.11,hinge=new T.Group();hinge.name=`${id}_第${pair+1}联_${sign>0?'左':'右'}侧铰`;
    hinge.position.set(sign>0?bayLeft+.055:bayRight-.055,0,0);pane.add(hinge);
    const cx=sign*leafWidth/2;
    box(leafWidth-.07,height-.12,.028,V(cx,height/2,-.025),hinge,backing);
    for(const x of [0,sign*leafWidth])box(.09,height,.10,V(x,height/2,.04),hinge);
    for(const y of [.055,height-.055])box(leafWidth,.10,.10,V(cx,y,.055),hinge);
    for(let x=.34;x<leafWidth-.13;x+=.36)box(.025,height-.18,.052,V(sign*x,height/2,.067),hinge,darkWood);
    for(let y=.37;y<height-.14;y+=.38)box(leafWidth-.15,.025,.060,V(cx,y,.066),hinge,darkWood);
    box(.065,.32,.105,V(sign*(leafWidth-.16),height*.51,.13),hinge,metal);
    for(const y of [.38,height-.38])box(.085,.17,.095,V(0,y,.05),hinge,metal);
    leaves.push({hinge,sign,pair,leafWidth});
   }
  }
  box(width+.48,.16,.28,V(0,bottom+height+.18,0),group,darkWood);
  const hitPlane=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));hitPlane.position.set(0,centre,.23);hitPlane.name='点笔触窗面_'+id;group.add(hitPlane);
  const guide=new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(width+.12,height+.12)),new T.LineBasicMaterial({color:0xc6c9ad,transparent:true,opacity:.16,depthWrite:false}));guide.position.set(0,centre,.20);group.add(guide);
  windows.set(id,{id,group,pane,leaves,hitPlane,guide,width,height,bottom,vertical,pairs,openAngle:pairs>1?85:102});return group;
 }
 window({id:'mountain',position:V(-2.35,0,-17),rotation:Math.PI/2,width:20,height:10,bottom:.4,pairs:4});
 window({id:'mountain-rear',position:V(-10.15,0,-2.5),width:4.4,height:9.2,bottom:.08,vertical:true});
 const viewOcclusion=createMountainViewOcclusion(architectureGroup,windows,railGroup,landscape.peakPoint);
 const targets=[
  {id:'mountain',kind:'brush-window',position:[0,0,-17],radius:1.65,label:'横向借景窗',hint:'走到窗前光圈，用毛笔轻点窗扇，四联窗依次打开，望见连绵山岭。',verse:'横看成岭'},
  {id:'mountain-rear',kind:'brush-window',position:[-10.15,0,-.5],radius:1.65,label:'竖向框景窗',hint:'沿折廊走到光圈，轻点窗扇；镜头靠近，看同一座山的峰顶。',verse:'侧成峰',requires:['mountain']}
 ];
 stage.targets=targets;architecture.targets=targets;stage.architecture=architecture;
 const raycaster=new T.Raycaster();let lastRect=null,lastCamera=null,lastId='mountain',lastTime=null,pointerTouched=false,focus=null;
 const lookTiming={push:1.25,hold:2.5,return:1.25};
 function near(player,id){const target=targets.find(t=>t.id===id);return target&&player&&Math.hypot((player.x??player[0])-target.position[0],(player.z??player[2])-target.position[2])<=target.radius;}
 function getActiveRect(camera,id=lastId){
  const win=windows.get(id);if(!win||!camera)return null;camera.updateMatrixWorld();win.hitPlane.updateWorldMatrix(true,false);
  const points=[],w=win.width/2,h=win.height/2;
  for(const x of [-w,w])for(const y of [-h,h])points.push(V(x,y,0).applyMatrix4(win.hitPlane.matrixWorld).project(camera));
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  lastRect={id,space:'ndc',minX,maxX,minY,maxY,x:(minX+maxX)/2,y:(minY+maxY)/2,width:maxX-minX,height:maxY-minY,direction:'point'};return lastRect;
 }
 function requestOpen(id,player){
  if(focus||!near(player,id)||!shutters.request(id))return false;
  lastId=id;updateWindows();return true;
 }
 function pointerDown(ndc,camera,player,activeId){
  if(!near(player,activeId)||shutters.isComplete(activeId)||focus)return false;
  const win=windows.get(activeId);if(!win)return false;camera.updateMatrixWorld();win.hitPlane.updateWorldMatrix(true,false);raycaster.setFromCamera(ndc,camera);
  if(!raycaster.intersectObject(win.hitPlane,false).length)return false;
  if(!requestOpen(activeId,player))return false;pointerTouched=true;lastCamera=camera;getActiveRect(camera,activeId);return true;
 }
 function pointerMove(ndc,camera,player,activeId){
  if(windows.has(activeId)){lastCamera=camera;lastId=activeId;getActiveRect(camera,activeId);}return false;
 }
 function pointerUp(){const handled=pointerTouched;pointerTouched=false;return handled;}
 const pickPointerTarget=createInteractionHitTester([...windows.values()].map(win=>({id:win.id,objects:[win.hitPlane]})));
 function updateWindows(){
  for(const win of windows.values()){
   const amount=shutters.amount(win.id),stagger=win.pairs>1?.105:0;
   for(const leaf of win.leaves){
    const t=clamp((amount-leaf.pair*stagger)/(1-(win.pairs-1)*stagger),0,1);
    leaf.hinge.rotation.y=leaf.sign*T.MathUtils.smootherstep(t,0,1)*T.MathUtils.degToRad(win.openAngle);
   }
   win.guide.material.opacity=shutters.openingId===win.id?.22:shutters.isComplete(win.id)?.025:.12;
  }
  windowGroup.updateMatrixWorld(true);
 }
 function updateCamera(camera,dt){
  if(!focus||!camera||dt<=0)return;
  if(!focus.start){
   focus.start={position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov};
   const rear=focus.id==='mountain-rear',close=new T.PerspectiveCamera();
   close.position.copy(rear?V(-10.15,4.9,19.5):V(24,4.9,-17));close.lookAt(rear?V(-10.15,4.68,-17):V(-10.15,4.9,-17));
   close.fov=rear?30:26;close.aspect=camera.aspect;close.near=camera.near;close.far=camera.far;close.updateProjectionMatrix();close.updateMatrixWorld();
   focus.close={position:close.position.clone(),rotation:close.quaternion.clone(),fov:rear?30:26};
   viewOcclusion.select(close,focus.id);
  }
  focus.age+=Math.max(0,dt);
  const total=lookTiming.push+lookTiming.hold+lookTiming.return;
  const weight=focus.age<=lookTiming.push?T.MathUtils.smootherstep(focus.age/lookTiming.push,0,1):focus.age<=lookTiming.push+lookTiming.hold?1:1-T.MathUtils.smootherstep((focus.age-lookTiming.push-lookTiming.hold)/lookTiming.return,0,1);
  camera.position.copy(focus.start.position).lerp(focus.close.position,weight);
  camera.quaternion.copy(focus.start.rotation).slerp(focus.close.rotation,weight);
  camera.fov=T.MathUtils.lerp(focus.start.fov,focus.close.fov,weight);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  viewOcclusion.apply(weight);
  lastCamera=camera;lastId=focus.id;getActiveRect(camera,lastId);
  if(focus.age>=total){camera.position.copy(focus.start.position);camera.quaternion.copy(focus.start.rotation);camera.fov=focus.start.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();focus=null;viewOcclusion.reset();}
 }
 stage.interact=id=>ids.includes(id)&&shutters.isComplete(id);architecture.interact=stage.interact;
 function canMove(from,to,done=new Set()){
  const side=to.x>=-1.35&&to.x<=1.35&&to.z>=-22&&to.z<=2.4,cross=to.x>=-11.75&&to.x<=1.35&&to.z>=-.4&&to.z<=2.4,end=to.x>=-11.75&&to.x<=-8.55&&to.z>=-3.45&&to.z<=2.4;
  if(!side&&!cross&&!end)return false;
  if(to.z>-8.35&&to.x>-3&&!done.has('mountain'))return false;
  if(to.x<-7&&to.z<-2.32&&!done.has('mountain-rear'))return false;
  return true;
 }
 architecture.canMove=canMove;architecture.update=()=>architectureGroup.updateMatrixWorld(true);architecture.reset=()=>{};
 stage.routeTo=(goal,from)=>{const route=[];if(from.x>-3&&goal.x<-3&&from.z<-.25)route.push(V(0,0,1));if(from.x>-3&&goal.x<-3)route.push(V(-10.15,0,1));if(from.x<-3&&goal.x>-3){route.push(V(from.x,0,1));route.push(V(0,0,1));}route.push(goal.clone());return route;};
 stage.update=(time,response,...args)=>{oldUpdate?.(time,response,...args);const dt=lastTime===null?0:Math.max(0,time-lastTime);lastTime=time;const openedId=shutters.advance(dt);if(openedId)focus={id:openedId,age:0,start:null};updateWindows();if(lastCamera)getActiveRect(lastCamera,lastId);};
 stage.cancelView=()=>{focus=null;pointerTouched=false;viewOcclusion.reset();};
 stage.reset=()=>{oldReset?.();shutters.reset();lastRect=null;lastCamera=null;lastId='mountain';lastTime=null;pointerTouched=false;focus=null;viewOcclusion.reset();updateWindows();};
 Object.assign(stage,{paper:false,pointerDown,pointerMove,pointerUp,pointerCancel:pointerUp,pickPointerTarget,requestOpen,updateCamera,getActiveRect,acknowledge:shutters.acknowledge,lookTiming,openingDuration:shutters.duration,turnPoint:[0,0,-8],spawn:[0,0,-12],bounds:{minX:-11.75,maxX:1.35,minZ:-22,maxZ:2.4},
  exit:{position:[-10.15,0,-3.4],crossing:{axis:'z',direction:-1,value:-3.12},label:'穿过竖窗下的山门'},
  followCamera:{worldAnchor:[0,0,0],orbitCenter:[-10.15,0,-17],offset:[25,-.4,-17],lookHeight:4.9,lookOffset:[-10.15,0,-17],trackX:0,trackZ:0,fov:30},
  followCameraRear:{worldAnchor:[0,0,0],orbitCenter:[-10.15,0,-17],offset:[-10.15,-.2,23],lookHeight:4.68,lookOffset:[-10.15,0,-17],trackX:0,trackZ:0,fov:33},
  ridgeMesh:ridge,mountainLandscape:landscape,windowFrames:windows});
 stage.ready=Promise.all([oldReady,landscape.ready]).then(()=>stage);
 Object.defineProperties(stage,{completedId:{get:()=>shutters.completedId},dragging:{get:()=>false},openingId:{get:()=>shutters.openingId},viewing:{get:()=>Boolean(focus)},focusId:{get:()=>focus?.id||null},focusAge:{get:()=>focus?.age||0},progress:{get:()=>shutters.progress},activeRect:{get:()=>lastRect},viewOcclusion:{get:()=>({phase:!focus?'idle':focus.age<lookTiming.push?'push':focus.age<lookTiming.push+lookTiming.hold?'hold':'return',...viewOcclusion.stats})}});
 stage.reset();return stage;
}
