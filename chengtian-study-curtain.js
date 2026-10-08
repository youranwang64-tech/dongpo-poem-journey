import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
let sharedCloth=null;
function clothTexture(){
 if(sharedCloth)return sharedCloth;
 const size=512,data=new Uint8Array(size*size*4);let seed=10831012;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const pulp=(random()-.5)*4.2,weave=(Math.sin(x*Math.PI*.83)*Math.sin(y*Math.PI*.79))*.8,i=(y*size+x)*4;data[i]=Math.round(222+pulp+weave);data[i+1]=Math.round(224+pulp+weave);data[i+2]=Math.round(220+pulp+weave);data[i+3]=255;}
 for(let fibre=0;fibre<5500;fibre++){const x=random()*size,y=random()*size,angle=random()*Math.PI*2,length=3+random()*20,density=1+random()*2.8;for(let s=0;s<length;s+=.65){const px=Math.floor(x+Math.cos(angle)*s),py=Math.floor(y+Math.sin(angle)*s);if(px<0||py<0||px>=size||py>=size)continue;const i=(py*size+px)*4,amount=Math.sin(s/length*Math.PI)*density;for(let c=0;c<3;c++)data[i+c]=Math.max(0,data[i+c]-amount);}}
 const map=new T.DataTexture(data,size,size,T.RGBAFormat);map.name='承天书斋 · 细纤维月灰布';map.colorSpace=T.SRGBColorSpace;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.wrapS=map.wrapT=T.ClampToEdgeWrapping;map.anisotropy=4;map.needsUpdate=true;map.userData={fineFibrousCloth:true,noCoarseBands:true,stableSeed:10831012};sharedCloth=map;return map;
}

/** A quiet furnishing beneath the existing study lintel, not a new task.
 * The top edge stays on its hooks. Only a shoulder actually reaching the cloth
 * pushes a local fold forwards; the hanging hem lifts, trails and settles back.
 * All folds are actual surface geometry; no alpha veil or floor fog is used. */
export function addChengtianStudyCurtain(parent){
 const root=new T.Group();root.name='书斋门帘 · 梁下月灰垂布';root.position.set(.40,0,-1.065);parent.add(root);
 const map=clothTexture(),cloth=new T.MeshStandardMaterial({color:0x899bab,map,bumpMap:map,bumpScale:.0017,roughness:1,metalness:0,side:T.DoubleSide,transparent:false,opacity:1,depthWrite:true}),wood=new T.MeshStandardMaterial({color:0x554c42,roughness:.92});
 const rod=new T.Mesh(new T.CylinderGeometry(.022,.022,2.88,12),wood);rod.rotation.z=Math.PI/2;rod.position.set(0,3.135,0);rod.name='门楣下细木帘杆';rod.castShadow=rod.receiveShadow=true;rod.userData.preserveOpaque=true;root.add(rod);
 for(const side of[-1,1]){const bracket=new T.Mesh(new T.BoxGeometry(.085,.115,.095),wood);bracket.position.set(side*1.38,3.15,-.035);bracket.name='帘杆贴梁小托座';bracket.castShadow=true;bracket.userData.preserveOpaque=true;root.add(bracket);}
 const nx=80,ny=64,top=3.085,height=2.78,outer=1.32,width=1.31,leaves=[],bindings=[],lastPlayer=V(),localPlayer=V();let clock=0,hasPlayer=false,contact=false,contactDirection=0,contactX=0,contactAge=0,peakDeflection=0;
 for(const side of[-1,1]){
  const geometry=new T.PlaneGeometry(1,height,nx,ny),mesh=new T.Mesh(geometry,cloth);mesh.name='门帘 · '+(side<0?'左':'右')+'幅自然垂褶';mesh.castShadow=mesh.receiveShadow=true;mesh.userData.preserveOpaque=true;mesh.userData.decorativeCurtain=true;root.add(mesh);leaves.push(mesh);
  const loops=[];for(let i=0;i<=8;i++){const u=i/8,loop=new T.Mesh(new T.TorusGeometry(.032,.0065,5,12),cloth);loop.rotation.y=Math.PI/2;loop.position.set(side*outer-side*u*width,3.115,Math.sin(u*Math.PI*9)*.022);loop.name='布帘悬扣';loop.userData.preserveOpaque=true;root.add(loop);loops.push(loop);}bindings.push({side,mesh,loops,angles:new Float64Array(nx+1),velocities:new Float64Array(nx+1),gathers:new Float64Array(nx+1),gatherVelocities:new Float64Array(nx+1)});
 }
 function pose(){
  for(const {side,mesh,angles,velocities,gathers}of bindings){const positions=mesh.geometry.attributes.position;for(let row=0;row<=ny;row++){const v=row/ny;for(let col=0;col<=nx;col++){const u=col/nx,index=row*(nx+1)+col,x=side*outer-side*u*width,a=angles[col]*(.90+.10*v),gather=gathers[col],length=v*height*(1-gather*.73),fold=Math.sin(u*Math.PI*9+.08*Math.sin(v*Math.PI))*(.022+.028*v),gravity=Math.sin(u*Math.PI)**2*.025*v*v,hem=Math.cos(u*Math.PI*8)*.012*v**8;
    const y=top-length*Math.cos(a)-gravity+hem,z=fold+Math.sin(v*Math.PI)*.022+.007*side*v*v+length*Math.sin(a)+velocities[col]*.005*Math.sin(v*Math.PI)+Math.sin(v*Math.PI*9)*gather*.022;
    positions.setXYZ(index,x,y,z);}}
   positions.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();mesh.geometry.computeBoundingBox();
  }root.updateWorldMatrix(true,true);
 }
 function update(dt,player){
  if(!(Number.isFinite(dt)&&dt>0))return;const step=Math.min(.06,dt);clock+=step;let movement=0;
  if(player){root.updateWorldMatrix(true,false);localPlayer.copy(player);root.worldToLocal(localPlayer);if(hasPlayer)movement=localPlayer.z-lastPlayer.z;lastPlayer.copy(localPlayer);hasPlayer=true;}
  const reachesCloth=!!player&&Math.abs(localPlayer.x)<outer+.38&&Math.abs(localPlayer.z)<.52;
  if(!contact&&reachesCloth&&Math.abs(movement)>.00001){contact=true;contactDirection=Math.sign(movement);contactX=T.MathUtils.clamp(localPlayer.x,-outer,outer);contactAge=0;}
  if(contact){contactAge+=step;contactX=T.MathUtils.damp(contactX,localPlayer.x,16,step);if(!player||Math.abs(localPlayer.x)>outer+.58||localPlayer.z*contactDirection>1.06||localPlayer.z*contactDirection<-.65)contact=false;}
  let moved=false;const substeps=Math.max(1,Math.ceil(step/.008)),subdt=step/substeps;
  for(const {side,angles,velocities,gathers,gatherVelocities}of bindings)for(let col=0;col<=nx;col++){
   if(angles[col]!==0||velocities[col]!==0||gathers[col]!==0||gatherVelocities[col]!==0)moved=true;
   const x=side*outer-side*(col/nx)*width,distance=Math.abs(x-contactX),falloff=1-T.MathUtils.smootherstep(distance,.44,.96),angle=contact?contactDirection*T.MathUtils.clamp(Math.atan2(localPlayer.z*contactDirection+.50,top-(localPlayer.y+2.05)),0,1.10)*falloff:0,gather=contact?T.MathUtils.smootherstep(localPlayer.z*contactDirection,.12,.96)*falloff:0;
   for(let n=0;n<substeps;n++){velocities[col]+=(54*(angle-angles[col])-11*velocities[col])*subdt;angles[col]+=velocities[col]*subdt;gatherVelocities[col]+=(18*(gather-gathers[col])-8.5*gatherVelocities[col])*subdt;gathers[col]=T.MathUtils.clamp(gathers[col]+gatherVelocities[col]*subdt,0,1);}
   // A body pressing into cloth is a one-sided contact constraint. The return
   // remains a spring: it never flips sides when the body crosses the doorway.
   if(contact&&angles[col]*contactDirection<angle*contactDirection){angles[col]=angle;velocities[col]*=.45;}
   if(contact&&gathers[col]<gather){gathers[col]=gather;gatherVelocities[col]*=.45;}
   if(!contact&&Math.abs(angles[col])<.00003&&Math.abs(velocities[col])<.00005){angles[col]=0;velocities[col]=0;}
   if(!contact&&Math.abs(gathers[col])<.00003&&Math.abs(gatherVelocities[col])<.00005){gathers[col]=0;gatherVelocities[col]=0;}
   peakDeflection=Math.max(peakDeflection,Math.abs(angles[col]));if(angles[col]!==0||velocities[col]!==0||gathers[col]!==0||gatherVelocities[col]!==0)moved=true;
  }
  if(moved||contact)pose();
 }
 function reset(){clock=0;hasPlayer=false;contact=false;contactDirection=0;contactX=0;contactAge=0;peakDeflection=0;for(const {angles,velocities,gathers,gatherVelocities}of bindings){angles.fill(0);velocities.fill(0);gathers.fill(0);gatherVelocities.fill(0);}pose();}
 pose();
 return {root,leaves,rod,update,reset,get stats(){let deflection=0,speed=0,lift=0;for(const {angles,velocities,gathers,gatherVelocities}of bindings)for(let i=0;i<angles.length;i++){deflection=Math.max(deflection,Math.abs(angles[i]));speed=Math.max(speed,Math.abs(velocities[i]),Math.abs(gatherVelocities[i]));lift=Math.max(lift,gathers[i]);}root.updateWorldMatrix(true,true);return {placement:'existing first-study doorway below lintel',worldCentre:root.position.toArray(),top,height,hemMinimum:top-height-.037,contact,contactDirection,contactX,contactAge,deflection,peakDeflection,lift,speed,atRest:deflection===0&&lift===0&&speed===0,clock,clearWidth:outer*2-width*2,leafWorldBounds:leaves.map(mesh=>{const b=new T.Box3().setFromObject(mesh);return {min:b.min.toArray(),max:b.max.toArray()};}),leafCount:2,foldsPerLeaf:4.5,subdivisions:[nx,ny],vertices:leaves.reduce((n,o)=>n+o.geometry.attributes.position.count,0),opaque:!cloth.transparent&&cloth.opacity===1,depthWrite:cloth.depthWrite,topFixed:true,fixedWidth:true,contactRadius:.52,localContact:true,springDamping:true,proximityAutomatic:false,noCollision:true,noHitTargets:true,noNewObjective:true,protectedFromOcclusion:leaves.every(o=>o.userData.preserveOpaque),clothTexture:[map.image.width,map.image.height],coarseBands:false};}};
}
