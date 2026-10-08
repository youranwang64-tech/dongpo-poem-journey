/** Fixed architectural moon windows. Parallax comes from walking and the
 * actual camera, never from rotating a freestanding screen or a guide image. */
export function createChengtianMoonGallery({THREE,root,materials={}}={}){
 if(!THREE?.Mesh||!root?.isObject3D)throw new TypeError('借景圆窗需要 THREE 和实体场景。');
 const T=THREE,V=(...a)=>new T.Vector3(...a),group=new T.Group();group.name='循廊借景 · 前后两重固定圆窗';root.add(group);
 const wallMaterial=materials.wall||new T.MeshStandardMaterial({color:0xc0cadb,roughness:.9}),wood=materials.wood||new T.MeshStandardMaterial({color:0x5f5144,roughness:.78}),metal=new T.MeshStandardMaterial({color:0x8c958e,metalness:.30,roughness:.68}),frames=[],walls=[],controls=[],collisionBoxes=[];
 const approachPosition=[8.15,0,7.35],alignedPosition=[9.45,0,7.35],cameraOffset=[-.55,2.8,4.25],referenceEye=V(8.9,2.8,11.6);
 const observationBounds={minX:7.0,maxX:11.8,minZ:6.25,maxZ:9.6},viewBounds={minX:6.4,maxX:12.3,minZ:5.9,maxZ:10.1};
 const frontCentre=V(9.45,1.84,5.398),rearZ=2.948,ratio=(referenceEye.z-rearZ)/(referenceEye.z-frontCentre.z),rearCentre=referenceEye.clone().lerp(frontCentre,ratio);
 const specifications=[{id:'moon-screen-a',name:'寻友廊正墙圆窗',wallCentre:[9.4,0,5.27],width:6.25,height:3.08,depth:.20,centre:frontCentre,radius:.64},
  {id:'moon-screen-b',name:'内廊借景圆窗',wallCentre:[9.5,0,2.82],width:4.4,height:3.08,depth:.20,centre:rearCentre,radius:.64*ratio}];
 let travelledDistance=0,lastPlayer=null,firstPlayer=null,confirmed=false,reveal=0,simTime=0,previousTime=null,lastMeasurement=null,disposed=false;
 const contains=(p,b)=>!!p&&p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ;
 function mesh(geometry,material,position,parent=group,pick=false){const o=new T.Mesh(geometry,material);o.position.copy(position);o.castShadow=o.receiveShadow=true;parent.add(o);if(!pick)o.raycast=()=>{};return o;}
 function box(w,h,d,p,material=wood,parent=group,pick=false){return mesh(new T.BoxGeometry(w,h,d),material,p,parent,pick);}
 function rod(a,b,r,material=wood,parent=group){const delta=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,delta.length(),10),material,a.clone().add(b).multiplyScalar(.5),parent);o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return o;}
 for(const spec of specifications){
  const localX=spec.centre.x-spec.wallCentre[0],shape=new T.Shape();shape.moveTo(-spec.width/2,0);shape.lineTo(spec.width/2,0);shape.lineTo(spec.width/2,spec.height);shape.lineTo(-spec.width/2,spec.height);shape.closePath();
  const hole=new T.Path();hole.absarc(localX,spec.centre.y,spec.radius,0,Math.PI*2,true);shape.holes.push(hole);
  const geometry=new T.ExtrudeGeometry(shape,{depth:spec.depth,steps:1,curveSegments:72,bevelEnabled:false});geometry.translate(0,0,-spec.depth/2);
  const wall=mesh(geometry,wallMaterial,V(...spec.wallCentre),group,true);wall.name=spec.name+' · 实体墙身与真实圆洞';walls.push(wall);
  collisionBoxes.push({id:wall.name,minX:spec.wallCentre[0]-spec.width/2,maxX:spec.wallCentre[0]+spec.width/2,minZ:spec.wallCentre[2]-spec.depth/2,maxZ:spec.wallCentre[2]+spec.depth/2,object:wall});
  for(const side of[-1,1])box(.13,3.12,.24,V(spec.wallCentre[0]+side*(spec.width/2-.065),1.56,spec.wallCentre[2]),wood);
  box(spec.width,.12,.25,V(spec.wallCentre[0],3.08,spec.wallCentre[2]),wood);
  box(spec.width,.15,.27,V(spec.wallCentre[0],.075,spec.wallCentre[2]),materials.stone||wallMaterial);
  const frame=new T.Group();frame.position.copy(spec.centre);frame.name=spec.name+' · 固定嵌入廊墙的窗圈';frame.userData.fixedArchitecture=true;group.add(frame);
  const ring=mesh(new T.TorusGeometry(spec.radius+.012,.043,10,96),wood,V(),frame,true);ring.name=spec.name+' · 木质圆窗框';
  const inset=mesh(new T.TorusGeometry(spec.radius-.015,.011,8,96),metal,V(0,0,.021),frame,true);inset.name=spec.name+' · 细嵌边';
  for(const side of[-1,1]){const x=side*spec.radius*.78,half=Math.sqrt(spec.radius*spec.radius-x*x);rod(V(x,-half,0),V(x,half,0),.013,wood,frame);}
  frame.userData.spec=spec;frame.userData.ring=ring;frames.push(frame);
 }
 // Visible carpentry joints hold pressure-ink feedback on timber. There is no
 // invisible screen-sized plane and nothing that can be rotated by input.
 for(let i=0;i<2;i++){const side=i?-1:1,frame=frames[0],joint=box(.115,.145,.084,V(side*.468,-.438,.037),wood,frame,true);joint.name='圆窗窗框上的卯榫 · '+(i?'左':'右');
  controls.push({id:specifications[i].id,label:i?'借景窗框左侧':'借景窗框右侧',mesh:joint,frame:frames[i],window:frames[i],position:frontCentre.toArray(),foot:[...approachPosition],approachPosition:[...approachPosition],fixed:true,mode:'confirm-window-view'});
 }
 function getViewPose(player){if(!contains(player,viewBounds))return null;return {id:'moon-gallery',position:[player.x+cameraOffset[0],player.y+cameraOffset[1],player.z+cameraOffset[2]],lookAt:[frontCentre.x,1.1-Math.max(0,player.z-7.35)*.23,5.27],fov:46,followPlayer:true};}
 const ray=new T.Raycaster(),cameraRay=new T.Raycaster();
 function sampleRing(frame,camera){const radius=frame.userData.spec.radius,centre=frame.getWorldPosition(V()).project(camera),rim=[];for(let i=0;i<32;i++){const angle=i/32*Math.PI*2;rim.push(V(Math.cos(angle)*radius,Math.sin(angle)*radius,0).applyMatrix4(frame.matrixWorld).project(camera));}return{centre,rim};}
 function getAlignment(camera,player){
  const blank={alignment:0,aligned:false,readyToConfirm:false,projectionError:Infinity,normalizedError:Infinity,travelledDistance,minimumTravel:.35,crossings:null,blockers:[],inObservationZone:contains(player,observationBounds)};
  if(!camera||!player||disposed)return blank;camera.updateMatrixWorld(true);group.updateWorldMatrix(true,true);const a=sampleRing(frames[0],camera),b=sampleRing(frames[1],camera),front=frames[0].getWorldPosition(V()),rear=frames[1].getWorldPosition(V());
  const inFront=camera.position.z>front.z+.50,visible=a.centre.z>-1&&a.centre.z<1&&Math.abs(a.centre.x)<1&&Math.abs(a.centre.y)<1;
  const direction=front.clone().sub(camera.position).normalize(),plane=new T.Plane(V(0,0,1),-rear.z),farPoint=new T.Ray(camera.position,direction).intersectPlane(plane,V()),farOffset=farPoint?Math.hypot(farPoint.x-rear.x,farPoint.y-rear.y):Infinity;
  cameraRay.set(camera.position,direction);cameraRay.near=.05;cameraRay.far=farPoint?camera.position.distanceTo(farPoint)+.03:1;const blockers=inFront?cameraRay.intersectObjects(walls,false).map(hit=>({name:hit.object.name,distance:hit.distance,point:hit.point.toArray()})):[];
  let squared=0,radiusSquared=0;for(let i=0;i<a.rim.length;i++){const dx=(a.rim[i].x-b.rim[i].x)*camera.aspect,dy=a.rim[i].y-b.rim[i].y;squared+=dx*dx+dy*dy;const rx=(a.rim[i].x-a.centre.x)*camera.aspect,ry=a.rim[i].y-a.centre.y;radiusSquared+=rx*rx+ry*ry;}
  const projectionError=Math.sqrt(squared/a.rim.length),radius=Math.sqrt(radiusSquared/a.rim.length),normalizedError=projectionError/Math.max(.00001,radius),alignment=inFront&&visible&&!blockers.length?Math.exp(-Math.pow(normalizedError/.35,2)):0,aligned=alignment>=.9&&blank.inObservationZone;
  return {...blank,alignment,aligned,readyToConfirm:aligned&&travelledDistance>=.35,projectionError,normalizedError,crossings:{front:{point:front.toArray(),radius:specifications[0].radius},rear:{point:farPoint?.toArray()||null,radialOffset:farOffset,radius:specifications[1].radius,inside:farOffset<specifications[1].radius}},blockers,centres:[a.centre.toArray(),b.centre.toArray()]};
 }
 function observe(player,camera,dt){
  if(!(dt>0)||!player||disposed)return getAlignment(camera,player);
  if(contains(player,observationBounds)){if(!firstPlayer)firstPlayer=player.clone();if(lastPlayer&&contains(lastPlayer,observationBounds)){const travel=Math.hypot(player.x-lastPlayer.x,player.z-lastPlayer.z);if(travel<=Math.max(.18,dt*4.6))travelledDistance+=travel;}}lastPlayer=player.clone();lastMeasurement=getAlignment(camera,player);return lastMeasurement;
 }
 function commit(player,camera){const measured=getAlignment(camera,player);lastMeasurement=measured;if(!measured.readyToConfirm)return false;if(confirmed)reveal=Math.min(reveal,.65);confirmed=true;return true;}
 function getControlRect(camera,id='moon-screen-a'){
  const control=controls.find(c=>c.id===id);if(!camera||!control)return null;camera.updateMatrixWorld(true);group.updateWorldMatrix(true,true);const frame=control.window,ring=sampleRing(frame,camera),centre={x:ring.centre.x,y:ring.centre.y,z:ring.centre.z},corners=ring.rim.map(p=>({x:p.x,y:p.y,z:p.z}));
  return{id:control.id,mode:'confirm-window-view',centre,corners,halfWidth:Math.max(...corners.map(p=>Math.abs(p.x-centre.x))),halfHeight:Math.max(...corners.map(p=>Math.abs(p.y-centre.y))),worldPosition:frame.getWorldPosition(V()).toArray(),pressureAnchor:control.mesh.getWorldPosition(V()).toArray(),visible:centre.z>-1&&centre.z<1,position:[...control.position],approachPosition:[...approachPosition],fixedArchitecture:true};
 }
 function pickWindow(ndc,camera){if(!camera||disposed)return null;camera.updateMatrixWorld(true);group.updateWorldMatrix(true,true);ray.setFromCamera(ndc,camera);const hits=[];
  for(let i=0;i<frames.length;i++){const frame=frames[i],origin=frame.getWorldPosition(V()),normal=V(0,0,1).transformDirection(frame.matrixWorld),point=ray.ray.intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(normal,origin),V());if(!point||camera.position.z<=origin.z)continue;const local=frame.worldToLocal(point.clone()),radius=frame.userData.spec.radius+.14;if(Math.hypot(local.x,local.y)<=radius)hits.push({id:controls[i].id,exact:true,distance:camera.position.distanceTo(point),worldPoint:point.toArray(),method:'actual-architectural-aperture'});}
  hits.sort((a,b)=>a.distance-b.distance);return hits[0]||null;
 }
 function update(t,dt){if(disposed)return;const delta=Number.isFinite(dt)?Math.max(0,Math.min(.12,dt)):previousTime===null?0:Math.max(0,Math.min(.12,t-previousTime));if(Number.isFinite(t))previousTime=t;if(delta>0){simTime+=delta;reveal=T.MathUtils.damp(reveal,confirmed?1:0,2.3,delta);}}
 function reset(){travelledDistance=0;lastPlayer=firstPlayer=null;confirmed=false;reveal=simTime=0;previousTime=null;lastMeasurement=null;}
 function dispose(){if(disposed)return;disposed=true;root.remove(group);const geometries=new Set();group.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});for(const g of geometries)g.dispose();metal.dispose();}
 const stats={interaction:'walk-to-align-fixed-architectural-windows',fixedArchitecture:true,windowCentres:specifications.map(s=>s.centre.toArray()),windowRadii:specifications.map(s=>s.radius),approachPosition,alignedPosition,observationBounds,viewBounds,cameraOffset,minimumTravel:.35,projection:'actual-camera-perspective-window-rims',controlFaces:0,freestandingScreens:0,rotationSpeed:0,textures:0,particles:0,automaticCompletion:false,releaseCommitRequired:true};
 Object.defineProperties(stats,{alignment:{enumerable:true,get:()=>lastMeasurement?.alignment||0},aligned:{enumerable:true,get:()=>lastMeasurement?.aligned||false},readyToConfirm:{enumerable:true,get:()=>lastMeasurement?.readyToConfirm||false},travelledDistance:{enumerable:true,get:()=>travelledDistance},projectedShapeError:{enumerable:true,get:()=>lastMeasurement?.projectionError??null},lastMeasurement:{enumerable:true,get:()=>lastMeasurement},confirmed:{enumerable:true,get:()=>confirmed},reveal:{enumerable:true,get:()=>reveal},simulationTime:{enumerable:true,get:()=>simTime},angles:{enumerable:true,get:()=>frames.map(f=>f.rotation.y)}});
 const api={root:group,frames,walls,controls,collisionBoxes,projections:[],viewCamera:{offset:cameraOffset,lookAt:[frontCentre.x,1.1,5.27],fov:46,followPlayer:true,bounds:viewBounds},getViewPose,getAlignment,observe,commit,update,reset,getControlRect,pickWindow,stats,dispose};Object.defineProperties(api,{alignment:{enumerable:true,get:()=>lastMeasurement?.alignment||0},aligned:{enumerable:true,get:()=>lastMeasurement?.aligned||false},confirmed:{enumerable:true,get:()=>confirmed}});api.ready=Promise.resolve(api);reset();return api;
}
