import {makeBrushTimeline} from './brush-glyph.js';
import {appendBrushPoint} from './brush-input-path.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const GLYPH_STROKES={
 '风':[[[.24,.17],[.23,.40],[.21,.64],[.13,.84]],[[.25,.18],[.74,.18],[.76,.47],[.76,.77],[.80,.85],[.87,.80]],[[.65,.37],[.52,.52],[.34,.70]],[[.38,.38],[.56,.57],[.70,.73]]],
 '开':[[[.32,.265],[.67,.237]],[[.20,.47],[.80,.436]],[[.423,.278],[.423,.44],[.40,.54],[.36,.62],[.28,.70]],[[.575,.28],[.575,.78]]],
 '林':[[[.10,.40],[.46,.40]],[[.28,.16],[.28,.88]],[[.28,.43],[.18,.66],[.08,.80]],[[.30,.46],[.44,.71]],[[.50,.40],[.91,.40]],[[.70,.16],[.70,.88]],[[.68,.44],[.54,.71],[.44,.83]],[[.72,.46],[.82,.68],[.93,.84]]]
};
const VARIANTS={'开':[[[.20,.23],[.80,.23]],[[.12,.42],[.88,.42]],[[.38,.44],[.38,.61],[.33,.75],[.25,.86]],[[.66,.43],[.66,.87]]]};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const length=path=>path.reduce((sum,p,i)=>sum+(i?distance(p,path[i-1]):0),0);
function sample(path,spacing=.022){const out=[path[0]];for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.max(1,Math.ceil(distance(a,b)/spacing));for(let j=1;j<=n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}return out;}
function segments(paths){return paths.flatMap(path=>path.slice(1).map((b,i)=>{const a=path[i],dx=b[0]-a[0],dy=b[1]-a[1],span=Math.hypot(dx,dy),before=path[Math.max(0,i-2)],after=path[Math.min(path.length-1,i+3)],tx=after[0]-before[0],ty=after[1]-before[1],tspan=Math.hypot(tx,ty)||span;return {a,b,dx,dy,span,tx,ty,tspan};}).filter(s=>s.span>.0005));}
function pointDistance(p,s){const t=clamp(((p[0]-s.a[0])*s.dx+(p[1]-s.a[1])*s.dy)/(s.span*s.span));return Math.hypot(p[0]-s.a[0]-s.dx*t,p[1]-s.a[1]-s.dy*t);}
function nearest(p,segs){let value=Infinity;for(const s of segs)value=Math.min(value,pointDistance(p,s));return value;}
function directedCoverage(path,ink,radius=.13){const dots=sample(path);if(!ink.length)return 0;let covered=0;
 for(let i=0;i<dots.length;i++){const p=dots[i],a=dots[Math.max(0,i-1)],b=dots[Math.min(dots.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],span=Math.hypot(dx,dy)||1;
  if(ink.some(s=>Math.abs((dx*s.tx+dy*s.ty)/(span*s.tspan))>=.78&&pointDistance(p,s)<radius))covered++;
 }return covered/dots.length;
}

/** Committed ink on the actual displayed glyph. Joined or resumed strokes
 * and their order are free; directional coverage rejects circles and bars. */
export function createGlyphWritingState(word){
 const strokes=GLYPH_STROKES[word];if(!strokes)throw new TypeError('没有这个字的笔画：'+word);
 const templates=strokes.map(path=>sample(path)),recognized=new Set(),paths=[];let current=null,lastResult=null,formalPaths=[],formalTemplates=[],maskSignature='',complete=false,formalCoverage=0;
 function guideSegments(){return segments([...strokes,...(VARIANTS[word]||[]),...formalPaths]);}
 function accuracy(path,radius=.13){const guides=guideSegments(),ink=sample(path,.012);return ink.length>1?ink.filter(p=>nearest(p,guides)<radius).length/ink.length:0;}
 function proof(){
  const committed=paths.filter(path=>path!==current&&path.length>1),ink=segments(committed),travel=ink.reduce((sum,s)=>sum+s.span,0);if(!ink.length)return;
  let meaningful=0;for(const path of committed)meaningful+=length(path)*accuracy(path);
  for(let i=0;i<strokes.length;i++){const variants=[strokes[i],...(VARIANTS[word]?.[i]?[VARIANTS[word][i]]:[])],best=Math.max(...variants.map(path=>directedCoverage(path,ink)));
   if(best>=.78&&variants.some(path=>nearest(path[0],ink)<.18&&nearest(path.at(-1),ink)<.18))recognized.add(i);
  }
  const formal=formalPaths.filter(path=>length(path)>.055),weighted=formal.map(path=>({path,span:length(path),coverage:directedCoverage(path,ink,.095)})),formalLength=weighted.reduce((sum,p)=>sum+p.span,0);
  formalCoverage=formalLength?weighted.reduce((sum,p)=>sum+p.span*p.coverage,0)/formalLength:0;
  const inkAccuracy=meaningful/Math.max(.0001,travel),authoredComplete=recognized.size===strokes.length,formalComplete=weighted.length>0&&formalCoverage>=.81&&weighted.every(p=>p.coverage>=.58)&&meaningful>=formalLength*.58;
  if((authoredComplete||formalComplete)&&inkAccuracy>=.61){complete=true;for(let i=0;i<strokes.length;i++)recognized.add(i);}
  lastResult={index:[...recognized].at(-1)??null,recognized:[...recognized],coverage:formalCoverage,accuracy:inkAccuracy,length:travel,complete,guide:'actual-font-and-handwriting'};
 }
 function setGuideMask(alpha,width=512,height=512){
  if(!alpha?.length||alpha.length!==width*height)return false;let count=0,hash=2166136261;for(let i=0;i<alpha.length;i++){if(alpha[i]>100)count++;if(i%37===0)hash=Math.imul(hash^alpha[i],16777619);}if(count<32)return false;
  const signature=width+'x'+height+':'+count+':'+(hash>>>0);if(signature===maskSignature)return true;maskSignature=signature;
  const timeline=makeBrushTimeline(alpha,width,height);formalPaths=timeline.penPaths.filter(p=>p.points.length>=3).map(p=>p.points.map(q=>[q.x,q.y]));formalTemplates=formalPaths.map(path=>sample(path));proof();return true;
 }
 function begin(uv){if(complete||current||!uv?.every(Number.isFinite))return false;current=[[clamp(uv[0]),clamp(uv[1])]];paths.push(current);return true;}
 function move(uv){return appendBrushPoint(current,uv);}
 function end(){if(!current)return null;const submitted=current;current=null;lastResult=null;const travel=length(submitted),glyphLength=Math.max(strokes.reduce((sum,p)=>sum+length(p),0),formalPaths.reduce((sum,p)=>sum+length(p),0));
  // A normal connected character has a few short joins between its strokes.
  // Tens of full-sheet zigzags are unrelated ink, not extra glyph coverage.
  if(submitted.length<2||travel<.035||travel>glyphLength*2.15+.20||accuracy(submitted)<.48){paths.splice(paths.indexOf(submitted),1);return null;}proof();return lastResult;
 }
 function cancel(){if(current){paths.splice(paths.indexOf(current),1);current=null;}lastResult=null;}
 function reset(){current=null;lastResult=null;recognized.clear();paths.length=0;complete=false;formalCoverage=0;}
 return {begin,move,end,cancel,reset,setGuideMask,strokes,get templates(){return formalTemplates.length?formalTemplates:templates;},paths,recognized,get current(){return current;},get complete(){return complete;},get progress(){if(complete)return 1;const ink=segments(paths),partial=ink.length?Math.max(0,...strokes.map(path=>directedCoverage(path,ink)))*.45:0;return clamp(Math.max((recognized.size+partial)/strokes.length,formalCoverage*.94),0,.99);},get lastResult(){return lastResult;},get guideStats(){return {actualFont:formalPaths.length>0,formalPaths:formalPaths.length,formalCoverage,committedPaths:paths.filter(p=>p!==current).length,recognition:'committed-directional-coverage'};}};
}
