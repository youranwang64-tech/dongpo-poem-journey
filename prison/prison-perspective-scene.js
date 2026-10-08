import * as T from '../vendor/three.module.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;

/** Two real depths, viewed through the original ironwork. There are no painted
 * circles, corner markers or rectangular alignment overlays in this scene. */
export function decoratePrisonPerspective(building){
 if(!building?.scene?.isScene||!building.stage?.architecture)throw new TypeError('借景需要原狱建筑。');
 const stage=building.stage,scene=building.scene,root=new T.Group();root.name='原狱的月色透光与重门视差';root.userData.prisonPerspective=true;scene.add(root);
 const highWindow=stage.architecture.group.children.find(o=>o.isGroup&&Math.abs(o.position.x+3)<.01&&Math.abs(o.position.y-2.25)<.01);
 const gate=stage.architecture.group.children.find(o=>o.isGroup&&Math.abs(o.position.x-5.15)<.01&&Math.abs(o.position.z-.8)<.01);
 if(!highWindow||!gate)throw new Error('借景不能以浮窗代替原狱高窗与牢门。');
 const hinges=highWindow.children.filter(o=>o.isGroup&&Math.abs(Math.abs(o.position.x)-1.2)<.01),completed=new Set();
 const oldMoon=stage.borrowedViewObjects?.target;if(oldMoon)oldMoon.visible=false;
 const peekAngle=1.74,windowSolution=.35,windowStart=-.65;
 function windowShot(offset){offset=clamp(offset,-.75,.85);return {eye:[.10+offset,4.35,7.20],look:[-1.50+offset,2.03,-.80],fov:43};}
 const moonEye=V(...windowShot(windowSolution).eye),aperture=V(-2.68,3.56,-2.5),moonDepth=-9,depthScale=(moonDepth-moonEye.z)/(aperture.z-moonEye.z),moonCentre=moonEye.clone().add(aperture.clone().sub(moonEye).multiplyScalar(depthScale));
 const moonRadius=.10*depthScale,moonMaterial=new T.MeshBasicMaterial({color:0x738993,map:oldMoon?.material?.map||null,fog:false,toneMapped:false});
 const moon=new T.Mesh(new T.SphereGeometry(moonRadius,48,32),moonMaterial);moon.name='原高窗之外的固定月圆';moon.position.copy(moonCentre);root.add(moon);
 const glowUniforms={strength:{value:.025},tint:{value:new T.Color(0xb3cedf)}};
 const glow=new T.Mesh(new T.PlaneGeometry(moonRadius*5,moonRadius*5),new T.ShaderMaterial({uniforms:glowUniforms,transparent:true,depthTest:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,vertexShader:'varying vec2 haloUv;void main(){haloUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 haloUv;uniform float strength;uniform vec3 tint;void main(){float r=length((haloUv-.5)*2.);float a=exp(-r*r*8.)*(1.-smoothstep(.45,1.,r))*strength;gl_FragColor=vec4(tint,a);}'}));
 glow.name='真实月圆散射光';glow.position.copy(moonCentre).add(V(0,0,-.015));glow.lookAt(moonEye);root.add(glow);
 const moonReturn=new T.PointLight(0xb7d5e3,.05,4.0,1.7);moonReturn.position.set(-2.68,3.5,-2.2);root.add(moonReturn);
 // Project the real moon centre into a genuine narrow cell of the iron window.
 // The cell is an unmarked architectural aperture, never a visible ring.
 const nearMoonPoints=[aperture.clone()],farMoonPoints=[moonCentre.clone()];
 const gateSolution=.38,gateStart=-.90;
 function gateShot(offset){offset=clamp(offset,-1.05,1.05);return {eye:[.90,3.65,5.05+offset],look:[4.40,1.40,1.0+offset],fov:47};}
 const gateEye=V(...gateShot(gateSolution).eye),frontX=5.15,backX=5.70,gateScale=(backX-gateEye.x)/(frontX-gateEye.x);
 const iron=new T.MeshStandardMaterial({color:0x161b20,roughness:.76,metalness:.28});iron.userData.prisonTonalRole='iron';
 const farGate=new T.Group();farGate.name='原牢门之后的第二重真实铁栅';farGate.userData.prisonPerspectiveIronwork=true;root.add(farGate);
 const frontGatePoints=[],backGatePoints=[],rearLeaves=[];
 function rod(a,b,r,parent){const delta=b.clone().sub(a),mesh=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),10),iron);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());mesh.castShadow=mesh.receiveShadow=true;mesh.name='第二重牢门的铁栏';parent.add(mesh);return mesh;}
 // These correspond to actual vertical rods of the first, original gate.
 // The distant rods have their own fixed depth and real hinge movement.
 for(const side of [-1,1]){
  const nearHinge=V(frontX,0,.8+side*1.35),rearHinge=gateEye.clone().add(nearHinge.clone().sub(gateEye).multiplyScalar(gateScale));
  rearHinge.y=0;const leaf=new T.Group();leaf.position.copy(rearHinge);farGate.add(leaf);rearLeaves.push({leaf,side});
  for(let i=1;i<=7;i++){
   const z=.8+side*(1.35-i*.18),a=V(frontX,.06,z),b=V(frontX,3.06,z);
   const ra=gateEye.clone().add(a.clone().sub(gateEye).multiplyScalar(gateScale)),rb=gateEye.clone().add(b.clone().sub(gateEye).multiplyScalar(gateScale));ra.y=.06;rod(ra.clone().sub(rearHinge),rb.clone().sub(rearHinge),.022*gateScale,leaf);
   if(i===2||i===5){const centre=a.clone().lerp(b,.5),rear=gateEye.clone().add(centre.clone().sub(gateEye).multiplyScalar(gateScale));frontGatePoints.push(centre);backGatePoints.push(rear);}
  }
  for(const y of [.10,1.404,3.02]){
   const a=V(frontX,y,.8+side*1.35),b=V(frontX,y,.8);
   const ra=gateEye.clone().add(a.clone().sub(gateEye).multiplyScalar(gateScale)),rb=gateEye.clone().add(b.clone().sub(gateEye).multiplyScalar(gateScale));ra.y=rb.y=Math.max(.10,ra.y);rod(ra.sub(rearHinge),rb.sub(rearHinge),.025*gateScale,leaf);
  }
 }
 const gateLight=new T.PointLight(0xc3d9e3,.05,2.8,1.8);gateLight.position.set(5.47,2.15,.80);root.add(gateLight);
 const gateMeshes=[];gate.traverse(o=>{if(o.isMesh)gateMeshes.push(o);});farGate.traverse(o=>{if(o.isMesh)gateMeshes.push(o);});
 const puzzles={
  window:{title:'借隙见月',hint:'月光被铁栅遮住了。按住画面左右移步，找月亮最明亮的角度；松手，让月光入窗。',range:{min:-.75,max:.85},solution:windowSolution,start:windowStart,shot:windowShot,targets:[nearMoonPoints,farMoonPoints],focusMeshes:[highWindow,moon],ignoreMeshes:[moon],entryPath:[windowShot(windowStart).eye],nearDepth:-2.5,farDepth:moonDepth},
  gate:{title:'重门成隙',hint:'两层铁栅挡着去路。左右移步，让前后铁栏叠在一起；亮起的门隙最宽时松手。',range:{min:-1.05,max:1.05},solution:gateSolution,start:gateStart,shot:gateShot,targets:[frontGatePoints,backGatePoints],focusMeshes:[gate,farGate],ignoreMeshes:gateMeshes,entryPath:[gateShot(gateStart).eye],nearDepth:frontX,farDepth:backX}
 };
 let moonBrightness=.18,gateOpenness=0;
 function setAlignment(id,error,visible){const quality=visible&&Number.isFinite(error)?Math.exp(-Math.pow(error/.025,2)):0;
  if(id==='window'){moonBrightness=.15+quality*.85;moonMaterial.color.setRGB(.32+.60*quality,.40+.56*quality,.45+.53*quality);glowUniforms.strength.value=.025+quality*.25;moonReturn.intensity=.05+quality*.85;if(scene.userData.prisonMoonShaft)scene.userData.prisonMoonShaft.intensity=8+quality*20;}
  if(id==='gate'){gateOpenness=quality;gateLight.intensity=.05+quality*1.20;}
 }
 function apply(){const amount=completed.has('window')?stage.architecture.progress('window'):0;for(const hinge of hinges)hinge.rotation.y=Math.sign(hinge.position.x)*T.MathUtils.lerp(peekAngle,2.95,amount);
  const opening=completed.has('gate')?stage.architecture.progress('letter'):0;for(const {leaf,side}of rearLeaves)leaf.rotation.y=side*opening*1.42;
  if(completed.has('window')){moonMaterial.color.setRGB(.92,.96,.98);glowUniforms.strength.value=.275;moonReturn.intensity=.90;moonBrightness=1;if(scene.userData.prisonMoonShaft)scene.userData.prisonMoonShaft.intensity=28;}
  if(completed.has('gate'))gateLight.intensity=1.25;
  const prior=scene.children.find(o=>o.name==='原狱建筑上的三重薄墨');if(prior)for(const mesh of prior.children)if(mesh.name.startsWith('window_')||mesh.name.startsWith('gate_'))mesh.visible=false;
  if(oldMoon)oldMoon.visible=false;scene.updateMatrixWorld(true);
 }
 function complete(id){if(!puzzles[id]||completed.has(id))return false;completed.add(id);apply();return true;}
 function reset(){completed.clear();setAlignment('window',Infinity,false);setAlignment('gate',Infinity,false);apply();}
 const api={root,stage,moon,nearGate:gate,farGate,puzzles,update:apply,reset,complete,setAlignment};
 Object.defineProperty(api,'stats',{get:()=>({fixedWorld:true,objectsMoveWithView:false,originalWindow:true,originalGate:true,moonPosition:moon.position.toArray(),moonRadius,moonBrightness,gateOpenness,windowHinges:hinges.map(o=>o.rotation.y),completed:[...completed],visibleAlignmentCircles:0,paintedGateFrames:0,realRearGate:true,particles:0,floatingWindows:0,groundGuideLines:0,worldTargets:Object.fromEntries(Object.entries(puzzles).map(([id,p])=>[id,p.targets.map(a=>a.map(v=>v.toArray()))]))})});
 reset();return api;
}
