import * as T from './vendor/three.module.js';
import {makeRecallSpaceCourt} from './recall-space-court.js';
import {makeBuildingKit} from './huangzhou-dwelling.js';
import {RECALL_SPACE} from './recall-space-navigation.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
export const ROTATING_BRIDGE={...RECALL_SPACE,northFoot:[0,.32,4.62],southFoot:[4.60,.32,-5],inkSeconds:1.55,inkTargetMin:.90,inkTargetMax:1.08,lockSeconds:1.10,retrySeconds:.60};

/** Original water court and roofed galleries, turning on fixed stone pivots.
 * The two sweep areas remain outside the hall and never cross each other. */
export function buildRotatingBridgeScene(){
 const court=makeRecallSpaceCourt(),{scene,root,materials:m}=court;
 root.name='诏命再起 · 晕墨转廊';
 for(const span of court.spans)span.group.removeFromParent();
 court.southAssembly.root.removeFromParent();
 const foregroundLamps=[],exitForeground=[];
 root.traverse(o=>{if(o.isMesh&&o.material===court.lampMaterial)foregroundLamps.push(o);});
 function splitForeground(o,test,name){
  const g=o.geometry,p=g.attributes.position,kept=[],cut=[];
  for(let i=0;i<p.count;i+=3)(test(p,i)&&test(p,i+1)&&test(p,i+2)?cut:kept).push(i,i+1,i+2);
  if(!cut.length)return null;
  const subset=indices=>{const copy=new T.BufferGeometry();for(const[name,a]of Object.entries(g.attributes)){const data=new a.array.constructor(indices.length*a.itemSize);for(let j=0;j<indices.length;j++)for(let k=0;k<a.itemSize;k++)data[j*a.itemSize+k]=a.array[indices[j]*a.itemSize+k];copy.setAttribute(name,new T.BufferAttribute(data,a.itemSize,a.normalized));}copy.computeBoundingSphere();return copy;};
  o.geometry=subset(kept);const foreground=new T.Mesh(subset(cut),o.material);foreground.name=name;foreground.castShadow=foreground.receiveShadow=true;o.parent.add(foreground);g.dispose();return foreground;
 }
 for(const o of [...root.children])if(o.isMesh&&o.material===m.darkWood){const stem=splitForeground(o,(p,i)=>Math.abs(Math.abs(p.getX(i))-2.15)<.05&&Math.abs(p.getZ(i)+3.75)<.05&&p.getY(i)>2.76&&p.getY(i)<4.02,'随殿内镜头让开的灯杆');if(stem)foregroundLamps.push(stem);}
 const gateHouse=root.getObjectByName('南行门门楼');
 for(const o of [...gateHouse.children])if(o.isMesh){const part=splitForeground(o,(p,i)=>p.getY(i)>3.50||p.getX(i)<-1.24&&p.getX(i)>-1.90&&Math.abs(p.getZ(i))<.29,'靠近南行門时让开的前柱与檐梁');if(part)exitForeground.push(part);}
 const kit=makeBuildingKit(root,m),{box,rod,roof}=kit;
 const dynamic=(name,parent=root)=>{const g=new T.Group();g.name=name;g.userData.animated=true;parent.add(g);return g;};
 function part(name,w,h,d,p,parent=root,material=m.wood){const o=new T.Mesh(new T.BoxGeometry(w,h,d),material);o.name=name;o.position.copy(p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 part('旧踏槽的实木补面',1.31,.055,1.02,V(0,.292,3.95));
 function rail(a,b,parent){rod(a.clone().add(V(0,.87,0)),b.clone().add(V(0,.87,0)),.043,m.darkWood,parent);rod(a.clone().add(V(0,.38,0)),b.clone().add(V(0,.38,0)),.030,m.wood,parent);for(let i=0,n=Math.max(1,Math.ceil(a.distanceTo(b)/.90));i<=n;i++){const p=a.clone().lerp(b,i/n);rod(p,p.clone().add(V(0,.90,0)),.040,m.darkWood,parent);}}
 function gallery(id,position,joinedAngle,length,offset){
  const group=dynamic(id==='turn-near'?'北廊 · 晕墨转合的整段廊桥':'东廊 · 晕墨转合的整段廊桥');group.position.fromArray(position);
  const deck=dynamic('真实承载人物的木板桥面_'+id,group),roofGroup=dynamic('随人物剖看的廊顶_'+id,group);roofGroup.position.z=-length/2;roofGroup.rotation.y=Math.PI/2;roof(0,2.82,0,length-.84,1.88,.63,roofGroup);
  const cameraSideFrame=dynamic('近侧可剖开的廊柱_'+id,group);
  for(const x of[-.90,.90]){rail(V(x,0,0),V(x,0,-length),group);const frame=x>0?cameraSideFrame:group;for(let z=-.28;z>-length;z-=2.05){rod(V(x,0,z),V(x,2.82,z),.075,m.darkWood,frame);box(.26,.11,.26,V(x,.015,z),m.stone,group);box(.35,.13,.33,V(x,2.65,z),m.wood,frame);}}
  for(let i=0,n=Math.ceil(length/.26);i<n;i++)part('真正承载人物的横向木板',1.8,.085,length/n-.008,V(0,-.0425,-(i+.5)*length/n),deck);
  for(const x of[-.66,.66])part('整段廊桥的纵向承梁',.17,.19,length,V(x,-.18,-length/2),deck,m.darkWood);
  const gates=[];for(const z of[id==='turn-far'?-.76:0,-length]){const gate=dynamic('廊桥未锁定时闭合的实体栏门',group);gate.position.set(-.9,0,z);rail(V(),V(1.8,0,0),gate);gates.push(gate);}
  const pivot=dynamic('廊桥下的石转座_'+id);pivot.position.fromArray(position);const bearing=new T.Mesh(new T.CylinderGeometry(.66,.75,.24,24),m.stone);bearing.position.y=-.24;bearing.castShadow=bearing.receiveShadow=true;pivot.add(bearing);
  return {id,position,width:1.8,length,start:0,end:-length,joinedAngle,initialAngle:joinedAngle+offset,rotationOffset:offset,group,deck,roofGroup,cameraSideFrame,gates,pivot,gateProgress:0,deckComplete:false,motion:'waiting-for-ink'};
 }
 const north=gallery('turn-near',[0,.32,3.35],0,6.2,.46),south=gallery('turn-far',[4.60,.32,-5],-Math.PI/2,6.9,-.36),spans=[north,south];
 // Receiving shoulders sit below the deck and outside the player's corridor.
 for(const[x,z]of[[-.62,-2.67],[.62,-2.67],[11.30,-5.62],[11.30,-4.38]])part('转廊归位后承住梁头的石托',.45,.24,.42,V(x,.14,z),root,m.stone);
 kit.batchStatic();
 const states=new Map(spans.map(s=>[s.id,{progress:0,locked:false}]));
 function bridgePose(span,value,locked=false){const p=clamp(value,0,1);states.set(span.id,{progress:p,locked});span.group.rotation.y=span.joinedAngle+span.rotationOffset*(1-T.MathUtils.smootherstep(p,0,1));span.deckComplete=locked;span.motion=locked?null:'waiting-for-ink';span.group.updateMatrixWorld(true);}
 function gatePose(span,value){span.gateProgress=clamp(value,0,1);for(const gate of span.gates)gate.rotation.y=span.gateProgress*Math.PI/2;}
 function setView(player){const inside=player.z<-2.62&&player.x<5.16,inNorth=player.z<4.3&&player.z>-8.5&&Math.abs(player.x)<5.16,inSouth=player.x>3.1&&Math.abs(player.z+5)<1.4;court.hallCutaway.visible=court.frontDoor.base.visible=court.eastDoor.base.visible=!inside;court.southDoor.base.visible=player.x<11.10;for(const o of exitForeground)o.visible=player.x<11.10;for(const o of foregroundLamps)o.visible=!inside;north.roofGroup.visible=north.cameraSideFrame.visible=!inNorth;south.roofGroup.visible=south.cameraSideFrame.visible=!inSouth;}
 function reset(){for(const span of spans){bridgePose(span,0,false);gatePose(span,0);}for(const pair of[court.frontDoor,court.eastDoor,court.southDoor])for(const{hinge}of pair.leaves)hinge.rotation.y=0;court.updateDecreePaper(0,0);for(const{hinge,paper}of court.windowLeaves){hinge.rotation.y=0;paper.material.opacity=.78;}court.windowBeam.material.uniforms.amount.value=0;court.decreeLight.intensity=0;scene.traverse(o=>{if(o.isPoints)o.visible=false;});setView(V(...ROTATING_BRIDGE.spawn));}
 reset();return {...court,spans,north,south,bridgePose,gatePose,setView,reset,get stats(){return {mode:'ink-bloom-rotating-covered-galleries',northLocked:states.get(north.id).locked,southLocked:states.get(south.id).locked,bridgeAngles:spans.map(s=>s.group.rotation.y),bridgeProgress:spans.map(s=>states.get(s.id).progress),rotatingBridges:2,inkSeconds:ROTATING_BRIDGE.inkSeconds,inkTargetMin:ROTATING_BRIDGE.inkTargetMin,inkTargetMax:ROTATING_BRIDGE.inkTargetMax,mechanicalSupport:true,particles:0,ropes:0,detachedWindows:0,groundGuideLines:0,roofCutaway:!court.hallCutaway.visible,restorableOriginalArchitecture:true};}};
}
