import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),radius=.24;

export const RECALL_SPACE={
 floorY:.32,bodyRadius:radius,rotationSeconds:1.75,
 platforms:[{id:'entry',position:[0,.32,5.30],width:4,length:3.9},{id:'hall',position:[0,.32,-5.535],width:7.8,length:5.37},{id:'south',position:[12.70,.32,-5],width:3.7,length:2.4},{id:'hall-landing',position:[4.60,.32,-5],width:1.4,length:2.88}],
 bridges:[{id:'turn-near',position:[0,.32,3.35],width:1.8,length:6.2,initialAngle:0,allowedAngles:[0],joinedAngle:0},{id:'turn-far',position:[11.5,.32,-5],width:1.8,length:6.2,initialAngle:Math.PI/2,allowedAngles:[Math.PI/2],joinedAngle:Math.PI/2}],
 nearFoot:[1.05,.32,4.70],farFoot:[2.60,.32,-5.15],readFoot:[0,.32,-6.05],gateFoot:[13.88,.32,-5],spawn:[0,.32,6.70],exit:[14.05,.32,-5],eastOpeningZ:-5,southGateX:13.36
};

/** Actual deck groups define both rendered supports and walking regions.
 * A disconnected bridge has closed rail gates; water is never a nav surface. */
export function createRecallSpaceNavigation(platforms,spans,{barrier=()=>false}={}){
 const inverse=new Map(),samples=[[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius],[radius*.707,radius*.707],[-radius*.707,radius*.707],[radius*.707,-radius*.707],[-radius*.707,-radius*.707]];
 let revision=0,currentConnections=[];
 function sync(){for(const s of [...platforms,...spans]){s.group.updateWorldMatrix(true,true);inverse.set(s,new T.Matrix4().copy(s.group.matrixWorld).invert());}currentConnections=findConnections();revision++;}
 function local(p,s){return p.clone().applyMatrix4(inverse.get(s));}
 function contains(p,s,margin=0){const q=local(p,s),start=s.start??-s.length/2,end=s.end??s.length/2;return Math.abs(q.y)<.10&&Math.abs(q.x)<=s.width/2+margin&&q.z>=Math.min(start,end)-margin&&q.z<=Math.max(start,end)+margin;}
 function endpoint(span,at){span.group.updateWorldMatrix(true,false);return V(0,0,at).applyMatrix4(span.group.matrixWorld);}
 function findConnections(){const joins=[];for(const s of spans){if(s.motion)continue;for(const at of [s.start,s.end]){const p=endpoint(s,at);for(const platform of platforms)if(contains(p,platform,.035))joins.push({span:s.id,platform:platform.id,at,position:p.toArray()});}}return joins;}
 function connections(){return currentConnections.map(j=>({...j,position:[...j.position]}));}
 function spanJoined(s){const joins=currentConnections.filter(j=>j.span===s.id);return joins.length===2&&joins[0].platform!==joins[1].platform;}
 function active(s){return !s.motion&&s.deckComplete!==false&&s.gateProgress>.985&&spanJoined(s);}
 function surface(p){return platforms.some(s=>contains(p,s))||spans.some(s=>active(s)&&contains(p,s));}
 function walkable(p){if(Math.abs(p.y-RECALL_SPACE.floorY)>.08)return false;for(const [x,z]of samples)if(!surface(V(p.x+x,p.y,p.z+z)))return false;return true;}
 function canMove(from,to){if(barrier(from,to))return false;const n=Math.max(1,Math.ceil(from.distanceTo(to)/.095));for(let i=1;i<=n;i++)if(!walkable(from.clone().lerp(to,i/n)))return false;return true;}
 function occupied(span,player){return !!player&&contains(player,span,.025)&&!platforms.some(s=>contains(player,s,-radius));}
 function routeTo(goal,from){
  const target=goal.clone();target.y=RECALL_SPACE.floorY;if(!walkable(target)||!walkable(from))return [];
  if(canMove(from,target))return [target];
  const step=.24,key=(x,z)=>x+','+z,start={x:Math.round(from.x/step),z:Math.round(from.z/step),g:0,parent:null},open=[start],best=new Map(),closed=new Set();let found=null,tries=0;
  start.f=Math.hypot(start.x*step-target.x,start.z*step-target.z)/step;
  while(open.length&&tries++<6800){open.sort((a,b)=>a.f-b.f);const n=open.shift(),k=key(n.x,n.z);if(closed.has(k))continue;closed.add(k);const p=n.parent?V(n.x*step,RECALL_SPACE.floorY,n.z*step):from.clone();if(p.distanceTo(target)<step*.85&&canMove(p,target)){found=n;break;}
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,q=V(x*step,RECALL_SPACE.floorY,z*step);if(x< -34||x>62||z< -48||z>32||!canMove(p,q))continue;const k2=key(x,z),g=n.g+Math.hypot(dx,dz);if(closed.has(k2)||g>=(best.get(k2)??Infinity))continue;best.set(k2,g);open.push({x,z,g,f:g+Math.hypot(q.x-target.x,q.z-target.z)/step,parent:n});}
  }
  if(!found)return [];const points=[];for(let n=found;n&&n.parent;n=n.parent)points.unshift(V(n.x*step,RECALL_SPACE.floorY,n.z*step));points.push(target);
  // Keep click navigation readable: remove grid corners only after the exact
  // same swept-circle predicate proves that the shortcut is clear.
  const route=[];let p=from,index=0;while(index<points.length){let next=index;for(let i=index+1;i<points.length;i++){if(!canMove(p,points[i]))break;next=i;}route.push(points[next]);p=points[next];index=next+1;}return route;
 }
 sync();return {platforms,spans,sync,contains,endpoint,connections,spanJoined,active,walkable,canMove,occupied,routeTo,resolveMovement:(from,to)=>canMove(from,to)?to.clone():from.clone(),get revision(){return revision;}};
}
