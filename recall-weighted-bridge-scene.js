import * as T from './vendor/three.module.js';
import {makeRecallSpaceCourt} from './recall-space-court.js';
import {makeBuildingKit} from './huangzhou-dwelling.js';
import {RECALL_SPACE} from './recall-space-navigation.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
export const WEIGHTED_BRIDGE={...RECALL_SPACE,northFoot:[0,.32,4.72],southFoot:[4.60,.32,-5],loadSeconds:2.3,returnSeconds:1.8,extension:3.10};

/** Keep the original water court, hall and roofed-gallery silhouette. The
 * bridge decks now move on stone bearings and nested beams, never on ropes. */
export function buildWeightedBridgeScene(){
 const court=makeRecallSpaceCourt(),{scene,root,materials:m}=court;
 const foregroundLamps=[],exitForeground=[];root.traverse(o=>{if(o.isMesh&&o.material===court.lampMaterial)foregroundLamps.push(o);});
 // The old builder batches the two hanging lantern stems into its main timber
 // mesh. Split just those stems so the same foreground cutaway can reveal the
 // actor inside the hall without changing the rest of the authored building.
 function splitForeground(o,test,name){
  const g=o.geometry,p=g.attributes.position,kept=[],cut=[];
  for(let i=0;i<p.count;i+=3)(test(p,i)&&test(p,i+1)&&test(p,i+2)?cut:kept).push(i,i+1,i+2);
  if(!cut.length)return null;
  const subset=indices=>{const copy=new T.BufferGeometry();for(const [name,a]of Object.entries(g.attributes)){const data=new a.array.constructor(indices.length*a.itemSize);for(let j=0;j<indices.length;j++)for(let k=0;k<a.itemSize;k++)data[j*a.itemSize+k]=a.array[indices[j]*a.itemSize+k];copy.setAttribute(name,new T.BufferAttribute(data,a.itemSize,a.normalized));}copy.computeBoundingSphere();return copy;};
  o.geometry=subset(kept);const foreground=new T.Mesh(subset(cut),o.material);foreground.name=name;foreground.castShadow=foreground.receiveShadow=true;o.parent.add(foreground);g.dispose();return foreground;
 }
 for(const o of [...root.children]){
  if(!o.isMesh||o.material!==m.darkWood)continue;
  const stem=splitForeground(o,(p,i)=>Math.abs(Math.abs(p.getX(i))-2.15)<.05&&Math.abs(p.getZ(i)+3.75)<.05&&p.getY(i)>2.76&&p.getY(i)<4.02,'随前墙剖开的灯杆');if(stem)foregroundLamps.push(stem);
 }
 const gateHouse=root.getObjectByName('南行门门楼');
 for(const o of [...gateHouse.children])if(o.isMesh){const part=splitForeground(o,(p,i)=>p.getY(i)>3.50||p.getX(i)<-1.24&&p.getX(i)>-1.90&&Math.abs(p.getZ(i))<.29,'靠近南行门时剖开的前柱与檐梁');if(part)exitForeground.push(part);}
 root.name='诏命再起 · 压梁接廊';
 for(const span of court.spans)span.group.removeFromParent();
 court.southAssembly.root.removeFromParent();
 const kit=makeBuildingKit(root,m),{box,rod,roof}=kit;
 const dynamic=(name,parent=root)=>{const g=new T.Group();g.name=name;g.userData.animated=true;parent.add(g);return g;};
 const part=(name,w,h,d,p,parent=root,material=m.wood)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),material);o.name=name;o.position.copy(p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 // Cover only the old carved lever slot; no coplanar sheet covers the court.
 part('桥头旧踏槽的实木补面',1.31,.055,1.02,V(0,.292,3.95));
 function rail(a,b,parent){rod(a.clone().add(V(0,.87,0)),b.clone().add(V(0,.87,0)),.043,m.darkWood,parent);rod(a.clone().add(V(0,.38,0)),b.clone().add(V(0,.38,0)),.030,m.wood,parent);for(let i=0,n=Math.ceil(a.distanceTo(b)/.90);i<=n;i++){const p=a.clone().lerp(b,i/n);rod(p,p.clone().add(V(0,.90,0)),.040,m.darkWood,parent);}}
 function gallery(id,position,angle,length){
  const group=dynamic(id==='turn-near'?'北廊 · 可压落的整段廊桥':'东廊 · 梁轨内伸出的木桥');group.position.fromArray(position);group.rotation.y=angle;
  const deck=dynamic('实际行走桥面_'+id,group),roofGroup=dynamic('可以剖看的廊顶_'+id,group);roofGroup.position.z=-length/2;roofGroup.rotation.y=Math.PI/2;roof(0,2.82,0,length-.8,1.94,.63,roofGroup);
  const cameraSideFrame=dynamic('随剖面让开的近侧廊柱_'+id,group);
  for(const x of[-.90,.90]){rail(V(x,0,0),V(x,0,-length),group);const frame=x>0?cameraSideFrame:group;for(let z=-.28;z>-length;z-=2.05){rod(V(x,0,z),V(x,2.82,z),.075,m.darkWood,frame);box(.26,.11,.26,V(x,.015,z),m.stone,group);box(.35,.13,.33,V(x,2.65,z),m.wood,frame);}}
  const gates=[];for(const z of[id==='turn-far'?-.76:0,-length]){const gate=dynamic('连接未承稳时的实体栏门',group);gate.position.set(-.9,0,z);rail(V(),V(1.8,0,0),gate);gates.push(gate);}
  return {id,position,width:1.8,length,start:0,end:-length,joinedAngle:angle,group,deck,roofGroup,cameraSideFrame,gates,gateProgress:0,deckComplete:false,motion:null};
 }
 const north=gallery('turn-near',[0,.32,3.35],0,6.2),south=gallery('turn-far',[4.60,.32,-5],-Math.PI/2,6.9),spans=[north,south];
 function boards(parent,length,top=.0){for(let i=0,n=Math.ceil(length/.26);i<n;i++)part('真正承载人物的横向木板',1.8,.085,length/n-.008,V(0,top-.0425,-(i+.5)*length/n),parent);for(const x of[-.66,.66])part('桥面下的纵向承梁',.17,.19,length,V(x,top-.18,-length/2),parent,m.darkWood);}
 boards(north.deck,6.2);
 // The whole northern span lowers and slides back into its hall bearing.
 // The broad balance plate stays on the entry slab, outside the moving span.
 const balance=dynamic('桥头压梁踏板与轴承');balance.position.set(0,.32,4.72);
 const balancePlate=part('可站稳的宽踏木',1.48,.067,1.36,V(0,-.025,0),balance);
 const spindle=new T.Mesh(new T.CylinderGeometry(.075,.075,1.70,14).rotateZ(Math.PI/2),m.darkWood);spindle.position.set(0,-.20,-.48);spindle.name='压梁的真实横轴';balance.add(spindle);
 for(const x of[-.58,.58]){part('踏板下的石轴座',.34,.35,.46,V(x,-.16,-.48),balance,m.stone);part('踏板连向桥座的平行木臂',.16,.16,1.66,V(x,-.14,-.74),balance,m.darkWood);}
 const northBearing=dynamic('北廊下两座导向承架');
 for(const x of[-.60,.60])for(const z of[3.18,-2.68]){part('导梁的石承台',.48,.30,.60,V(x,.15,z),northBearing,m.stone);for(const side of[-1,1])part('石承台木肩',.10,.58,.66,V(x+side*.20,.56,z),northBearing,m.darkWood);}
 const northLock=dynamic('北廊可锁住承梁的楔肩');northLock.position.set(.75,.84,4.38);part('随承梁归位的卯口',.49,.40,.26,V(0,-.14,-.06),northLock,m.darkWood);const northWedge=part('北廊木楔',.34,.38,.20,V(0,.01,.13),northLock);
 // The east roof and posts remain fixed. Overlapping decking extends beneath
 // them on two lower timber rails, preserving the gallery's architecture.
 boards(south.deck,3.82);
 const slidingDeck=dynamic('沿两根承梁推出的叠梁桥面',south.group);boards(slidingDeck,3.82,.016);
 for(const x of[-.66,.66])part('连续导轨木梁',.18,.23,6.94,V(x,-.29,-3.47),south.group,m.darkWood);
 const handlePivot=dynamic('锁梁后沿外栏让开的推梁铰座',slidingDeck);handlePivot.position.set(-.86,0,-.90);south.handlePivot=handlePivot;
 const crossbar=part('横贯桥面的结构推梁',1.72,.20,.26,V(.86,.81,0),handlePivot,m.wood);
 for(const x of[.16,1.56])part('推梁连到活动桥面的榫柱',.12,.70,.14,V(x,.43,0),handlePivot,m.darkWood);
 const southLock=dynamic('东廊的轨梁锁楔',south.group);southLock.position.set(-.70,.71,-.31);part('接收活动梁肩的固定卯口',.44,.31,.24,V(0,-.12,-.10),southLock,m.darkWood);const southWedge=part('东廊木楔',.34,.36,.20,V(0,.08,.12),southLock);
 for(const z of[-5.62,-4.38])part('接住活动桥头的真实石托',.58,.30,.40,V(11.30,.15,z),root,m.stone);
 kit.batchStatic();
 let load=0,extension=0,northLocked=false,southLocked=false;
 function northPose(value,locked=false){load=clamp(value,0,1);northLocked=locked;north.group.position.set(0,.32+(1-load)*.52,3.35+(1-load)*.62);balancePlate.rotation.x=load*.010;balancePlate.position.y=-.025;northWedge.position.y=.01-(locked?.14:0);north.deckComplete=locked&&load>=.999;north.group.updateMatrixWorld(true);}
 function southPose(value,locked=false){extension=clamp(value,0,1);southLocked=locked;slidingDeck.position.z=-extension*WEIGHTED_BRIDGE.extension;southWedge.position.y=.08-(locked?.14:0);south.deckComplete=locked&&extension>=.999;south.group.updateMatrixWorld(true);}
 function gatePose(span,value){span.gateProgress=clamp(value,0,1);for(const g of span.gates)g.rotation.y=span.gateProgress*Math.PI/2;if(span.handlePivot)span.handlePivot.rotation.y=span.gateProgress*Math.PI/2;}
 function setView(player){const inside=player.z<-2.62&&player.x<5.16,inNorth=player.z<4.3&&player.z>-8.5&&Math.abs(player.x)<5.16,inSouth=player.x>3.1&&Math.abs(player.z+5)<1.4;court.hallCutaway.visible=court.frontDoor.base.visible=court.eastDoor.base.visible=!inside;court.southDoor.base.visible=player.x<11.10;for(const o of exitForeground)o.visible=player.x<11.10;for(const o of foregroundLamps)o.visible=!inside;north.roofGroup.visible=north.cameraSideFrame.visible=!inNorth;south.roofGroup.visible=south.cameraSideFrame.visible=!inSouth;}
 function reset(){northPose(0,false);southPose(0,false);for(const span of spans)gatePose(span,0);for(const pair of[court.frontDoor,court.eastDoor,court.southDoor])for(const {hinge}of pair.leaves)hinge.rotation.y=0;court.updateDecreePaper(0,0);for(const {hinge,side,paper}of court.windowLeaves){hinge.rotation.y=0;paper.material.opacity=.78;}court.windowBeam.material.uniforms.amount.value=0;scene.traverse(o=>{if(o.isPoints)o.visible=false;});setView(V(...WEIGHTED_BRIDGE.spawn));}
 reset();
 return {...court,spans,north,south,balance,balancePlate,northWedge,southWedge,crossbar,slidingDeck,northPose,southPose,gatePose,setView,reset,
  get stats(){return {mode:'weighted-and-telescopic-covered-galleries',load,extension,northLocked,southLocked,northHeight:north.group.position.y,northSlide:north.group.position.z-3.35,southSlide:slidingDeck.position.z,mechanicalSupport:true,particles:0,ropes:0,userBridgeRotation:0,detachedWindows:0,groundGuideLines:0,roofCutaway:!court.hallCutaway.visible,bridgeAngles:spans.map(s=>s.group.rotation.y),restorableOriginalArchitecture:true};}};
}
