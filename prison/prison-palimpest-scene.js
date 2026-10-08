import * as T from '../vendor/three.module.js';
import {buildScene} from '../scenes.js';
import {decorateBorrowedView} from '../borrowed-view-experience.js';
import {decorateArchitecture} from '../architecture-detail.js';
import {decorateArchitectureEnvelope} from '../architecture-envelope.js';
import {decoratePanoramaBackdrop} from '../backdrop-panorama.js';
import {buildPrisonInteriorEnvelope,createPrisonArtMaterials} from './prison-interior-envelope.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
const ORDER=['window','gate','corridor'];
const HINTS={
 window:'窗外还有月。把笔落在窗扇，轻轻拂去积墨；松笔，让一线月色进来。',
 gate:'铁门被重重门影封住。沿门面拂墨，等影子退薄，再松笔让门扇让开。',
 corridor:'墙上留下一个戴斗笠的墨影。沿它的轮廓轻扫一笔；松笔，等墨影退淡、廊墙让出一人宽的路。'
};
const vertexShader=`varying vec2 inkUv;\n#include <fog_pars_vertex>\nvoid main(){inkUv=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}`;
const fragmentShader=`
varying vec2 inkUv;uniform float fade,phase,opacity;uniform vec3 tint;
#include <fog_pars_fragment>
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.56+noise(p*2.03+2.7)*.27+noise(p*4.09-3.2)*.12+noise(p*8.17)*.05;}
void main(){
 vec2 uv=inkUv;float grain=fbm(uv*vec2(15.,9.)+phase);
 float edge=smoothstep(.01,.11,uv.x)*smoothstep(.01,.11,1.-uv.x)*smoothstep(.01,.12,uv.y)*smoothstep(.01,.12,1.-uv.y);
 vec2 field=uv+vec2(phase*.013,phase*.021);
 float upright=1.-smoothstep(.032,.070,abs(fract(field.x*7.5)-.5));
 float crossbar=1.-smoothstep(.025,.065,abs(fract(field.y*3.3)-.5));
 float lattice=max(upright,crossbar*.68);
 // Pigment clings to plaster and timber. It is neither a floating board nor
 // a bright path drawn on the floor; the old building supplies every edge.
 float wash=smoothstep(fade*.99-.07,fade*.99+.15,grain);
 float alpha=opacity*edge*(.19+grain*.24+lattice*.48)*wash*(1.-smoothstep(.92,1.,fade));
 if(alpha<.001)discard;gl_FragColor=vec4(tint,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;

/** A separate interpretation of the existing prison, not a second literal
 * prison model. The source builder owns the real stone, timber and iron; this
 * module owns only the thin, surface-bound palimpsest and its three releases. */
export function buildPrisonPalimpsestScene(){
 const stage=decoratePanoramaBackdrop(decorateArchitectureEnvelope(decorateArchitecture(decorateBorrowedView(buildScene(2),2),2),2),2);
 const {scene}=stage,root=new T.Group();root.name='原狱建筑上的三重薄墨';root.userData.prisonPalimpsest=true;scene.add(root);
 // Heavy ink belongs to the bars and timber, while plaster and paper retain
 // a lighter body. Sparse local light, rather than a raised global grey floor,
 // separates those values in the enclosed cell.
 const darkLights=[];
 scene.traverse(o=>{if(o.isHemisphereLight){o.color.set(0xc3cad4);o.groundColor.set(0x393b40);darkLights.push({light:o,intensity:.48});}
  else if(o.isDirectionalLight){const key=o.castShadow;o.color.set(key?0xc6d2df:0x9ca7b5);if(key){o.position.set(-5.8,5.8,2.2);o.target.position.set(-1.8,1.0,-2.6);Object.assign(o.shadow.camera,{left:-12,right:12,top:9,bottom:-9,near:.1,far:32});o.shadow.radius=1.6;}darkLights.push({light:o,intensity:key?1.12:.12});}
  else if(o.isPointLight){const lantern=o.intensity>3;o.color.set(lantern?0xe6c49f:0x9eacbd);o.distance=lantern?5.1:3.5;darkLights.push({light:o,intensity:lantern?3.0:.16});}
  else if(o.isSpotLight){o.color.set(0x9dacc2);o.distance=4.5;darkLights.push({light:o,intensity:0});}});
 stage.gateLight.visible=false;
 scene.background=new T.Color(0x252b34);scene.fog=new T.FogExp2(0x333b47,.009);scene.userData.saturation=.16;
 stage.atmosphere.setEnvelopes([]);
 function applyDarkLighting(){for(const {light,intensity}of darkLights)light.intensity=intensity;scene.background.set(0x252b34);scene.fog.color.set(0x333b47);scene.fog.density=.009;}
 applyDarkLighting();
 // Clone before tinting: textures may be shared by other chapters, materials
 // and their palette must remain local to this prison scene.
 const art=createPrisonArtMaterials(),paletteMaterials=new Map(),hsl={h:0,s:0,l:0},tonalMeshes=[];
 stage.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry?.parameters||{},tint=m=>{
  if(!m?.isMeshStandardMaterial)return m;
  m.color.getHSL(hsl,T.SRGBColorSpace);
  const paper=hsl.l>.69||o===stage.borrowedViewObjects.paper,emissive=m.emissive?.getHex()>0&&!paper;
  if(emissive)return m;
  const wall=p.height>1&&Math.min(p.width||999,p.depth||999)<.8&&Math.max(p.width||0,p.depth||0)>2;
  const floor=(o.geometry.type==='PlaneGeometry'&&p.width>=12)||(p.height<=.3&&p.width>=4&&p.depth>=3);
  const iron=m.color.getHex()===0x35443f||((p.height||0)>1.5&&Math.max(p.width||0,p.depth||0)<.08);
  const role=paper?'paper':wall?'plaster':floor?'floor':iron?'iron':(p.height||0)<.4?'timber':'stone';
  let byRole=paletteMaterials.get(m);if(!byRole){byRole=new Map();paletteMaterials.set(m,byRole);}if(byRole.has(role))return byRole.get(role);
  const copy=paper?m.clone():art[role].clone();
  if(paper){copy.color.set(0xd9d6c9);copy.emissive.set(0xd5d4c5);copy.emissiveIntensity=.045;copy.userData.prisonTonalRole='paper';}
  else if(role==='floor'){copy.map=art.woodMap.clone();copy.map.repeat.set(Math.max(1,(p.width||12)/6),Math.max(1,(p.depth||p.height||6)/6));copy.bumpMap=copy.map;}
  byRole.set(role,copy);return copy;
 };o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);tonalMeshes.push(o);});
 const originalMeshes=[];stage.root.traverse(o=>{if(o.isMesh)originalMeshes.push(o);});
 const highWindow=stage.architecture.group.children.find(o=>o.isGroup&&Math.abs(o.position.x+3)<.01&&Math.abs(o.position.y-2.25)<.01);
 const prisonDoor=stage.architecture.group.children.find(o=>o.isGroup&&Math.abs(o.position.x-5.15)<.01&&Math.abs(o.position.z-.8)<.01);
 if(!highWindow||!prisonDoor)throw new Error('原狱高窗或铁门构件丢失，不能用新模型替代。');
 for(const target of [highWindow,prisonDoor])target.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.parameters||{};if(p.depth<=.03&&p.height>1){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();return;}o.material=art.iron;});
 // Closed ironwork occupies the identical plane. Facing the original pair
 // inward makes its original hinge animation open into the cell rather than
 // across the narrow return passage beside the original right masonry wall.
 const originalDoorFacing=prisonDoor.rotation.y;prisonDoor.rotation.y=-Math.PI/2;
 const originalRightWall=originalMeshes.find(o=>o.geometry?.type==='BoxGeometry'&&Math.abs(o.position.x-6)<.01&&Math.abs(o.position.z+.4)<.06&&o.geometry.parameters.height>4);
 if(!originalRightWall)throw new Error('原狱右侧廊墙丢失。');
 const originalWallX=originalRightWall.position.x;
 scene.updateMatrixWorld(true);const rightWallDetails=[];
 scene.traverse(o=>{if(!o.isMesh||o===originalRightWall)return;const box=new T.Box3().setFromObject(o),size=box.getSize(V()),center=box.getCenter(V());
  if(center.x>5.70&&center.x<6.30&&center.z>-2.95&&center.z<2.30&&size.x<.5&&size.y>.2){rightWallDetails.push({mesh:o,rest:o.position.clone(),direction:V(1,0,0).applyQuaternion(o.parent.getWorldQuaternion(new T.Quaternion()).invert())});}});
 // Open the near side as an architectural cutaway. Pulling the lens outside
 // the cell must not leave the player behind the old foreground grating/roof.
 const cutaway=[];
 for(const o of originalMeshes){const p=o.geometry?.parameters;if(!p)continue;
  if((p.width===12.8&&p.depth===5.1&&Math.abs(o.position.y-4.25)<.01)||(p.width===.12&&p.height===.30&&p.depth===5.1&&Math.abs(o.position.y-4.10)<.01)||(p.width===.034&&p.height===3.9&&Math.abs(o.position.z-2.5)<.01)||(p.width===4.2&&Math.abs(o.position.z-2.5)<.01)){o.visible=false;o.userData.prisonCutaway=true;cutaway.push(o);}}
 // The original portal's little external tile cap looks like a pavilion in
 // this enclosed corridor. Its posts, threshold and working iron gate remain.
 const indoorPortal=stage.root.children.find(o=>o.isGroup&&Math.abs(o.position.x-5.15)<.01&&Math.abs(o.position.z-.8)<.01);
 const hiddenPortalCaps=[];indoorPortal?.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const bounds=o.geometry.boundingBox.clone().applyMatrix4(o.matrix);if(bounds.min.y>2.9&&bounds.max.y>3.42){o.visible=false;o.userData.prisonIndoorCapRemoved=true;hiddenPortalCaps.push(o);}});
 if(indoorPortal){const beam=new T.Mesh(new T.BoxGeometry(3.10,.20,.23),art.beam);beam.name='牢门室内墨木横梁';beam.position.set(0,3.31,0);beam.castShadow=beam.receiveShadow=true;indoorPortal.add(beam);}
 // Only the later boundary continuation is shortened. The source room wall
 // still ends at z=2.10; a genuine 1.15m return opening permits a person to
 // turn around that end instead of walking through the original solid wall.
 const envelope=stage.root.children.find(o=>o.userData.architectureEnvelope);
 const continuation=[];
 for(const o of envelope?.children||[])if(o.isMesh&&Math.abs(o.position.x-6)<.01&&o.geometry.parameters?.depth>20){
  const previous={position:o.position.toArray(),depth:o.geometry.parameters.depth};
  const end=o.position.z+o.geometry.parameters.depth/2,start=3.25;
  const p=o.geometry.parameters;o.geometry.dispose();o.geometry=new T.BoxGeometry(p.width,p.height,end-start);o.position.z=(end+start)/2;
  continuation.push({name:o.name,previous,current:{position:o.position.toArray(),depth:end-start},reason:'keep the original wall intact and leave a real return opening'});
 }
 const legacyHidden=[];
 const hideLegacy=()=>{
  for(const o of [stage.borrowedViewObjects.dot?.root,stage.borrowedViewObjects.surface?.root,stage.borrowedViewObjects.ink?.pool])if(o)o.visible=false;
  scene.traverse(o=>{if(o.isPoints||o.isSprite){if(!legacyHidden.includes(o))legacyHidden.push(o);o.visible=false;}});
 };
 hideLegacy();
 const interior=buildPrisonInteriorEnvelope({scene,stage,movingWall:originalRightWall,materials:art});
 const layers=[],channels=new Map(ORDER.map(id=>[id,{preview:0,completed:false,age:0}]));
 let simTime=0,baseClock=0;
 function inkPlane(id,{parent=root,position,width,height,rotation=0,phase=0,pick=false,opacity=.22}){
  const uniforms=T.UniformsUtils.merge([T.UniformsLib.fog,{fade:{value:0},phase:{value:phase},opacity:{value:opacity},tint:{value:new T.Color(0x182624)}}]);
  const material=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,fog:true,transparent:true,depthTest:true,depthWrite:pick,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  material.opacity=opacity;
  const mesh=new T.Mesh(new T.PlaneGeometry(width,height),material);mesh.name=`${id}_建筑表面薄墨_${phase}`;mesh.position.fromArray(position);mesh.rotation.y=rotation;mesh.castShadow=mesh.receiveShadow=false;
  mesh.userData.prisonPalimpsestInk=!pick;mesh.userData.prisonWashPick=pick;mesh.renderOrder=pick?.6:.7;parent.add(mesh);layers.push({id,mesh,uniforms,pick,opacity,restPosition:mesh.position.clone()});return mesh;
 }
 // Window pigment is attached to the original two leaves, so their real
 // hinges carry it. The original iron crossbars and actual opening survive.
 const windowPicks=[highWindow];
 for(const hinge of highWindow.children.filter(o=>o.isGroup)){
  const sign=-Math.sign(hinge.position.x),cx=sign*.60;
  const plane=inkPlane('window',{parent:hinge,position:[cx,.91,.070],width:1.15,height:1.49,phase:sign+2,pick:true,opacity:.24});windowPicks.push(plane);
 }
 for(let i=0;i<3;i++)inkPlane('window',{position:[-3+i*.025,3.12,-2.34+i*.009],width:2.32,height:1.62,phase:2.3+i*1.4,opacity:.13-i*.015});
 // Pigment spans the iron opening only while it is closed. It is a translucent
 // seal on the actual gate, not an independently standing interaction board.
 const gatePick=inkPlane('gate',{position:[5.081,1.57,.8],width:2.60,height:3.02,rotation:-Math.PI/2,phase:4,pick:true,opacity:.16});
 for(let i=0;i<2;i++)inkPlane('gate',{position:[5.090+i*.009,1.57,.8],width:2.61,height:3.01,rotation:-Math.PI/2,phase:5.7+i*1.2,opacity:.13});
 let silhouettePixels=null;
 const silhouetteTexture=new T.Texture();silhouetteTexture.colorSpace=T.SRGBColorSpace;
 const silhouetteMaterial=new T.MeshBasicMaterial({map:silhouetteTexture,transparent:true,opacity:.90,depthWrite:true,side:T.DoubleSide,alphaTest:.012,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const corridorPick=new T.Mesh(new T.PlaneGeometry(1.92,3.0),silhouetteMaterial);corridorPick.position.set(5.765,1.56,1.05);corridorPick.rotation.y=-Math.PI/2;corridorPick.name='真实廊墙上的斗笠长袍水墨剪影';corridorPick.userData.prisonWashPick=true;root.add(corridorPick);
 const corridorRest=corridorPick.position.clone(),corridorPicks=[corridorPick];
 const silhouetteReady=new Promise((resolve,reject)=>new T.TextureLoader().load('./assets/wall-ink-silhouette-v2.png',texture=>{
  silhouetteMaterial.map=texture;texture.colorSpace=T.SRGBColorSpace;
  const c=document.createElement('canvas');c.width=64;c.height=96;const cx=c.getContext('2d');cx.drawImage(texture.image,0,0,64,96);silhouettePixels=cx.getImageData(0,0,64,96).data;resolve();
 },undefined,reject));
 const moonReturn=new T.PointLight(0xa6bfd5,0,3.5,1.6);moonReturn.position.set(5.48,2.2,2.48);scene.add(moonReturn);
 const quietFill=new T.PointLight(0xc6d1df,2.5,6.2,1.4);quietFill.position.set(-4.5,3.2,1.6);quietFill.castShadow=false;scene.add(quietFill);
 const corridorFill=new T.PointLight(0xb6c4d3,2.25,6.5,1.4);corridorFill.position.set(2.55,3.7,1.4);corridorFill.castShadow=false;scene.add(corridorFill);
 // A genuine shaft crosses the existing aperture and iron bars. Only its
 // projected light/shadows brighten the dark boards; there is no floor decal.
 const windowMoon=new T.SpotLight(0xd4e0ed,12,11,.50,.28,1.5);windowMoon.name='穿过真实高窗铁栏的月光';windowMoon.position.set(-3,3.68,-3.70);windowMoon.target.position.set(-1.9,-.04,1.2);windowMoon.castShadow=true;windowMoon.shadow.mapSize.set(1024,1024);windowMoon.shadow.bias=-.00004;windowMoon.shadow.normalBias=.006;windowMoon.shadow.radius=1.2;scene.add(windowMoon,windowMoon.target);
 scene.userData.prisonMoonShaft=windowMoon;
 const inkWallLight=new T.PointLight(0x94abc0,0,5.5,1.2);inkWallLight.position.set(4.1,2.2,.8);inkWallLight.castShadow=false;scene.add(inkWallLight);
 const actorStart=[-3.4,.02,.8],exitPosition=[7.35,.02,2.675];
 const exitPath=[[4.56,.02,.8],[6.10,.02,.8],[6.10,.02,2.675],[7.35,.02,2.675]];
 const shots={
  intro:{eye:[-.15,4.4,7.4],look:[-1.85,1.9,-.3],fov:43},
  overview:{eye:[3.5,5.25,11.6],look:[-.25,2.03,-.8],fov:41},
  window:{eye:[.2,3.55,5.6],look:[-2.85,1.9,-1.4],fov:44},
  gate:{eye:[2.1,2.85,5.35],look:[4.95,1.55,.8],fov:46},
  corridor:{eye:[.6,4.0,.9],look:[4.75,1.45,1.1],fov:46},
  exit:{eye:[10.7,4.35,6.0],look:[6.8,1.15,2.5],fov:46}
 };
 const actions=[
  {id:'window',label:'拂窗借月',hint:HINTS.window,pickMeshes:windowPicks,center:V(-3,3.08,-2.305)},
  {id:'gate',label:'拂门退影',hint:HINTS.gate,pickMeshes:[gatePick,prisonDoor],center:V(5.081,1.57,.8)},
  {id:'corridor',label:'描影出困',hint:HINTS.corridor,pickMeshes:corridorPicks,center:V(5.765,1.56,1.05),hitTest:hit=>{if(!hit.uv||!silhouettePixels)return false;const x=clamp(Math.floor(hit.uv.x*64),0,63),y=clamp(Math.floor((1-hit.uv.y)*96),0,95);return silhouettePixels[(y*64+x)*4+3]>14;}}
 ];
 function apply(){
  for(const layer of layers){const channel=channels.get(layer.id),fade=channel.completed?1:channel.preview;layer.uniforms.fade.value=fade;layer.mesh.visible=fade<.999;}
  const space=T.MathUtils.smoothstep(channels.get('corridor').age/1.8,0,1)*.85;
  originalRightWall.position.x=originalWallX+space;
  for(const detail of rightWallDetails)detail.mesh.position.copy(detail.rest).addScaledVector(detail.direction,space);
  corridorPick.position.copy(corridorRest).add(V(space,0,0));silhouetteMaterial.opacity=.90*(1-(channels.get('corridor').completed?1:channels.get('corridor').preview));corridorPick.visible=!channels.get('corridor').completed;
  for(const layer of layers)if(layer.id==='corridor'&&layer.restPosition.x>5.7)layer.mesh.position.x=layer.restPosition.x+space;
  moonReturn.intensity=T.MathUtils.smoothstep(channels.get('corridor').age/1.8,0,1)*.68;
  inkWallLight.intensity=channels.get('gate').completed?T.MathUtils.smoothstep(channels.get('gate').age/1.8,0,1)*4.2:0;
  applyDarkLighting();
  interior.update();
  hideLegacy();scene.updateMatrixWorld(true);
 }
 function previewAction(id,value){const channel=channels.get(id);if(!channel||!Number.isFinite(value))return false;if(!channel.completed)channel.preview=clamp(value,0,.985);apply();return true;}
 function readiness(id){const c=channels.get(id);if(!c?.completed)return false;return id==='window'?stage.architecture.progress('window')>=.999:id==='gate'?stage.architecture.progress('letter')>=.999:c.age>=1.8;}
 function completeAction(id){const c=channels.get(id);if(!c||c.completed)return false;const index=ORDER.indexOf(id);if(!ORDER.slice(0,index).every(readiness))return false;
  if(id==='window'&&stage.architecture.interact('window')!==true)return false;
  if(id==='gate'&&stage.architecture.interact('letter')!==true)return false;
  c.completed=true;c.preview=1;c.age=0;apply();return true;
 }
 function update(time,dt){if(!Number.isFinite(dt)||dt<=0)return;const step=clamp(dt,0,.08);simTime+=step;baseClock+=step;
  // Keep the original update closure and its clock alive. Its private clock
  // does not rewind on reset, so this transport clock also remains monotonic.
  stage.update(baseClock,0,step);stage.updateBackdrop?.();for(const c of channels.values())if(c.completed)c.age=Math.min(2,c.age+step);apply();
 }
 function reset(){stage.reset();for(const c of channels.values()){c.preview=0;c.completed=false;c.age=0;}simTime=0;moonReturn.intensity=0;apply();}
 // A camera chord from the cell to the final inner passage would cross the
 // continuation wall. These real opening waypoints pass under the doorway,
 // round its masonry end, and finish below the enclosed corridor ceiling.
 const exitCameraPath=[[.6,4.0,.9],[4.35,2.65,.8],[6.1,2.6,.8],[6.1,2.65,2.85],[6.45,3.25,3.1],[10.7,4.35,6.0]];
 const api={scene,stage,interior,actorStart,exitPosition,exitPath,exitCameraPath,corridorApproachPath:[[4.15,.02,.8]],shots,actions,previewAction,completeAction,readiness,update,reset,resetActions:reset,ready:Promise.all([stage.ready,silhouetteReady])};
 Object.defineProperty(api,'stats',{get:()=>({originalBuilder:'buildScene(2) + original borrowed view + architectural detail + envelope + panorama',originalPrison:true,interior:interior.stats,lighting:{palette:'ink-value-separated',uniformGreyWash:false,background:scene.background.getHexString(),fog:scene.fog.color.getHexString(),density:scene.fog.density,globalLights:darkLights.filter(x=>x.light.isHemisphereLight||x.light.isDirectionalLight).map(x=>({kind:x.light.type,intensity:x.light.intensity})),materials:Object.fromEntries(['iron','beam','floor','timber','plaster'].map(role=>[role,{color:art[role].color.getHexString(),linearLuminance:art[role].color.r*.2126+art[role].color.g*.7152+art[role].color.b*.0722,texture:art[role].map?.userData.prisonPigment?.kind||null}])),moonShaft:{position:windowMoon.position.toArray(),target:windowMoon.target.position.toArray(),intensity:windowMoon.intensity,castsRealIronShadow:windowMoon.castShadow,shadowPixels:windowMoon.shadow.mapSize.x},hiddenExteriorPortalCaps:hiddenPortalCaps.length,greenHaze:false,localizedMoonlight:true},originalMeshCount:originalMeshes.length,giantLock:false,physicalTimberExtraction:false,completed:ORDER.filter(id=>channels.get(id).completed),readiness:Object.fromEntries(ORDER.map(id=>[id,readiness(id)])),preview:Object.fromEntries(ORDER.map(id=>[id,channels.get(id).preview])),architectureProgress:{window:stage.architecture.progress('window'),gate:stage.architecture.progress('letter')},wallRelease:{progress:T.MathUtils.smoothstep(channels.get('corridor').age/1.8,0,1),offset:originalRightWall.position.x-originalWallX,authoredTravel:.85,originalMeshPreserved:true},thinInkLayers:layers.length,particles:0,whiteGroundLines:0,groundMistPuddles:0,legacyInstructionMeshesHidden:true,exitPath:exitPath.map(p=>p.slice()),boundaryReturnOpening:continuation,gateFacing:{original:originalDoorFacing,sample:prisonDoor.rotation.y,closedPlanePreserved:true,opensIntoCell:true},simTime,sourceUpdatePreserved:true})});
 reset();return api;
}
