import {brushPathSamples} from './brush-surface.js';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));

/** A stroke in the real canal bed chooses its flow. This measures a deliberate
 * sweep, not handwriting accuracy or tracing a prescribed start and end. */
export function createDwellingFlowStroke(template,{width,height,minTravel=.36,minSpan=.30,bedTolerance=.58}={}){
 const templates=[brushPathSamples(template)],paths=[],recognized=new Set();
 const metric=p=>[p[0]*width,p[1]*height],bed=template.map(metric);
 let current=null,ready=false,clock=0;
 function bedDistance(p){const q=metric(p);let best=Infinity;for(let i=1;i<bed.length;i++){const a=bed[i-1],b=bed[i],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(dx*dx+dy*dy||1));best=Math.min(best,Math.hypot(q[0]-a[0]-dx*t,q[1]-a[1]-dy*t));}return best;}
 function values(path=current||paths.at(-1)||[]){
  let travel=0,usefulTravel=0,inBed=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const samples=path.map(metric);
  for(let i=0;i<path.length;i++){const p=samples[i];minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);if(bedDistance(path[i])<=bedTolerance)inBed++;if(i){const a=samples[i-1],b=samples[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);travel+=d;const middle=[(path[i-1][0]+path[i][0])*.5,(path[i-1][1]+path[i][1])*.5];if(bedDistance(middle)<=bedTolerance)usefulTravel+=d;}}
  const span=path.length?Math.hypot(maxX-minX,maxY-minY):0;
  const accuracy=path.length?inBed/path.length:0,intent=Math.min(travel/minTravel,span/minSpan,usefulTravel/(minTravel*.67));
  return {coverage:clamp(intent),accuracy,travel,usefulTravel,span,samples:Math.max(0,path.length-1),bedTolerance,minTravel,minSpan};
 }
 function begin(uv){if(current||ready||bedDistance(uv)>bedTolerance)return false;current=[[clamp(uv[0]),clamp(uv[1])]];paths.push(current);return true;}
 function move(uv){if(!current)return false;const point=[clamp(uv[0]),clamp(uv[1])],last=current.at(-1);if(Math.hypot((point[0]-last[0])*width,(point[1]-last[1])*height)<.003)return false;current.push(point);return true;}
 function end(){if(!current)return false;const submitted=current,s=values(submitted);current=null;ready=s.travel>=minTravel&&s.span>=minSpan&&s.usefulTravel>=minTravel*.67&&s.accuracy>=.45;if(!ready)paths.splice(paths.indexOf(submitted),1);return ready;}
 function cancel(){if(current){paths.splice(paths.indexOf(current),1);current=null;}return false;}
 function reset(){paths.length=0;current=null;ready=false;clock=0;recognized.clear();}
 return {begin,move,end,cancel,reset,templates,strokes:[template],paths,recognized,bedDistance,update(dt){clock+=Math.max(0,dt||0);return ready;},setViewSize(){},get current(){return current;},get active(){return !!current;},get ready(){return ready;},get waiting(){return false;},get progress(){return ready?1:Math.min(.99,values().coverage);},get stats(){return {...values(),ready,active:!!current,waiting:false,restSeconds:0,motionSeconds:clock,interaction:'intentional-canal-sweep',endpointCheck:false,directionCheck:false};}};
}
