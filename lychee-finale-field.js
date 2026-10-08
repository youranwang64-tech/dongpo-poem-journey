import * as T from './vendor/three.module.js';
import {lycheeUnfoldAmount,lycheeDelayedAmount} from './lychee-motion.js';
const V=(...v)=>new T.Vector3(...v),smooth=t=>{const q=Math.max(0,Math.min(1,t));return q*q*q*(q*(q*6-15)+10);};
const hash=i=>{const x=Math.sin(i*12.9898+47.17)*43758.5453;return x-Math.floor(x);};
const ASPECT=16/9,FOV=42,TAN=Math.tan(FOV*Math.PI/360);

// Near fruit are composed around the frame, with smaller overlapping clusters
// behind them. These are the same landed bodies, moving through real depth;
// screen coordinates only describe the authored destination of that movement.
function seaPlan(bodies){
 const points=[],sorted=bodies.slice().sort((a,b)=>b.radius-a.radius);
 // A few close fruit run beyond the view. Their different sizes and depths
 // prevent a row of equal balls or a rectangular border around the sea.
 const foreground=[
  [-1.02,.89,.45],[-.73,.53,.34],[-.99,.08,.38],[-.86,-.53,.38],[-.53,-.94,.37],
  [-.30,.96,.32],[.11,1.00,.43],[.73,.94,.40],[1.00,.59,.43],[.81,.13,.30],
  [1.03,-.46,.42],[.62,-.90,.39],[.36,.57,.31],[-.36,-.05,.32],[.31,-.12,.30],
  [-.59,.86,.25],[.67,-.33,.23],[.54,.36,.22]
 ];
 // Unequal clusters leave winding paper gaps. The lower central slit is the
 // standing actor's view, rather than a straight corridor through every row.
 const clusters=[[-.69,.58,.31,.43],[-.24,.72,.31,.27],[.54,.59,.36,.38],
  [.82,-.12,.26,.42],[-.72,-.35,.31,.41],[-.40,-.59,.24,.32],[.27,.02,.36,.40]];
 const normal=(seed)=>((hash(seed)+hash(seed+17)+hash(seed+43)+hash(seed+71))-2)*.87;
 for(let rank=0;rank<sorted.length;rank++){
  const b=sorted[rank];let x,v,r,tier;
  if(rank<foreground.length){const a=foreground[rank];x=a[0]+(hash(b.index+337)-.5)*.052;v=a[1]+(hash(b.index+547)-.5)*.052;r=a[2]*(.94+hash(b.index+797)*.12);tier='foreground';}
  else{
   const mid=rank<104,c=clusters[Math.floor(hash(b.index+1871)*clusters.length)],spread=mid?1:1.18;
   x=c[0]+normal(b.index*131+31)*c[2]*spread;v=c[1]+normal(b.index*113+97)*c[3]*spread;
   r=mid?.078+Math.pow(hash(b.index+2011),.7)*.085:.026+Math.pow(hash(b.index+2291),.8)*.047;
   // Preserve full-body readability without making the whole lower half empty.
   if(v-r<-.59&&Math.abs(x)*ASPECT<r+.20)x=(x<0?-1:1)*((r+.23)/ASPECT);
   x=Math.max(-1.10,Math.min(1.10,x));v=Math.max(-1.08,Math.min(1.10,v));tier=mid?'middle':'deep';
  }
  const depth=b.radius*3/(r*TAN);points.push({u:x*ASPECT,v,r,depth,index:b.index,tier});
 }
 let minGap=Infinity;for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)minGap=Math.min(minGap,Math.hypot(points[j].u-points[i].u,points[j].v-points[i].v)-points[i].r-points[j].r);
 return {points:points.sort((a,b)=>a.index-b.index),minGap,tiers:{foreground:18,middle:86,deep:Math.max(0,bodies.length-104)}};
}
export function createLycheeFinaleField(bodies){
 const plan=seaPlan(bodies);let entries=[],amount=0,growthAmount=0,growthScale=1,heroEntry=null,worldMinGap=null;
 function prepare({player=[0,-5,-14],hero=[-1.35,-2.4,-17.4]}={}){
  const direction=V(.6,.18,-1).normalize(),right=V(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right).normalize(),actor=V(...player).add(V(0,1.15,0)),distance=45,actorY=-.86,camera=actor.clone().addScaledVector(direction,distance).addScaledVector(up,-actorY*distance*TAN);
  const view={actor:actor.toArray(),position:camera.toArray(),direction:direction.toArray(),distance,actorY,referenceAspect:ASPECT,fov:FOV};
  const heroDepth=39;heroEntry={from:hero.slice(),target:camera.clone().addScaledVector(direction,-heroDepth).addScaledVector(right,.23*ASPECT*heroDepth*TAN).addScaledVector(up,-.825*heroDepth*TAN).toArray()};
  entries=bodies.map(b=>{
   const lift=.5+hash(b.index+1)*3.6,history=[b.landX??b.x,(b.landY??b.y)+lift,b.landZ??b.z],p=plan.points[b.index],target=camera.clone().addScaledVector(direction,-p.depth).addScaledVector(right,p.u*p.depth*TAN).addScaledVector(up,p.v*p.depth*TAN).toArray();
   b.finalePosition=target.slice();b.finaleHistoryPosition=history.slice();b.finaleCameraView=view;b.finaleBaseScale=b.scale;b.finaleBaseRadius=b.radius;
   const delay=(p.tier==='foreground'?0:p.tier==='middle'?.018:.034)+hash(b.index+2903)*.035;
   const distance=V(...history).distanceTo(V(...target)),arcSize=Math.max(.25,Math.min(1.10,distance*.018));
   const arc=right.clone().multiplyScalar((hash(b.index+3211)-.5)*arcSize*.55).addScaledVector(up,arcSize*(.50+hash(b.index+3347)*.35)).toArray();
   return {body:b,from:[b.x,b.y,b.z],history,target,depth:p.depth,u:p.u,v:p.v,tier:p.tier,visibility:b.visibility,baseScale:b.scale,baseRadius:b.radius,delay,revealDelay:hash(b.index+3517)*.035,arc};
  });amount=growthAmount=0;growthScale=1;
  // Allow projected overlaps, but put those fruit at different physical depths.
  // An exact ray/sphere separation keeps the close composition while avoiding
  // visibly intersecting shells; no screen-grid relaxation is applied.
  for(let pass=0;pass<32;pass++){let moved=false;
   for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const a=entries[i],b=entries[j],dx=a.target[0]-b.target[0],dy=a.target[1]-b.target[1],dz=a.target[2]-b.target[2],need=(a.baseRadius+b.baseRadius)*3+.04;
    if(dx*dx+dy*dy+dz*dz>=need*need)continue;
    const e=a.depth>b.depth?a:b,other=e===a?b:a,ray=direction.clone().negate().addScaledVector(right,e.u*TAN).addScaledVector(up,e.v*TAN),offset=V(...e.target).sub(V(...other.target)),dot=offset.dot(ray),square=ray.lengthSq();
    e.depth+=(-dot+Math.sqrt(dot*dot-square*(offset.lengthSq()-need*need)))/square+.001;
    e.target=camera.clone().addScaledVector(ray,e.depth).toArray();moved=true;
   }if(!moved)break;
  }
  worldMinGap=Infinity;for(let i=0;i<entries.length;i++){entries[i].body.finalePosition=entries[i].target.slice();for(let j=i+1;j<entries.length;j++)worldMinGap=Math.min(worldMinGap,Math.hypot(...entries[i].target.map((v,k)=>v-entries[j].target[k]))-(entries[i].baseRadius+entries[j].baseRadius)*3);}
 }
 function place(){const alpha=smooth(Math.max(0,(amount-.03)/.82));
  for(const e of entries){const b=e.body,reveal=smooth(Math.max(0,Math.min(1,(amount-e.revealDelay)/(1-e.revealDelay)))),expand=lycheeDelayedAmount(growthAmount,e.delay),arc=Math.sin(Math.PI*expand)**2;
   for(let i=0;i<3;i++){const history=e.from[i]+(e.history[i]-e.from[i])*reveal;b[['x','y','z'][i]]=history+(e.target[i]-e.history[i])*expand+e.arc[i]*arc;}
   b.visibility=e.visibility+(1-e.visibility)*alpha;b.viewVisibility=1;
  }
 }
 function reveal(value){if(!entries.length)return;amount=Math.max(0,Math.min(1,value));place();}
 function grow(value,maxScale=3){if(!entries.length)return;growthAmount=Math.max(0,Math.min(1,value));growthScale=1+(maxScale-1)*lycheeUnfoldAmount(growthAmount);for(const e of entries){const size=1+(maxScale-1)*lycheeDelayedAmount(growthAmount,e.delay);e.body.scale=e.baseScale*size;e.body.radius=e.baseRadius*size;}place();}
 function reset(){for(const e of entries){e.body.scale=e.baseScale;e.body.radius=e.baseRadius;}entries=[];heroEntry=worldMinGap=null;amount=growthAmount=0;growthScale=1;for(const b of bodies){delete b.finalePosition;delete b.finaleHistoryPosition;delete b.finaleCameraView;delete b.finaleBaseScale;delete b.finaleBaseRadius;}}
 return {prepare,reveal,grow,reset,get positions(){return entries.map(e=>e.target.slice());},get heroTarget(){return heroEntry?.target.slice()||null;},get heroPosition(){return heroEntry?.from.map((v,i)=>v+(heroEntry.target[i]-v)*lycheeUnfoldAmount(growthAmount))||null;},get stats(){return {prepared:entries.length===bodies.length,historySources:entries.length,revealAmount:amount,originalXZ:false,coherentExpansion:true,minLift:.5,maxLift:4.1,growthAmount,growthScale,motion:'gentle-coast-curved-unfold',easing:'integrated-C2-velocity',maximumDelay:.069,maximumArc:1.1,projectedMinGap:plan.minGap,worldMinGap,layout:'clustered-perspective-sea',depthTiers:plan.tiers,referenceAspect:ASPECT,actorBand:[-.98,-.75],heroTarget:heroEntry?.target.slice()||null};}};
}
