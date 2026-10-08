import * as T from './vendor/three.module.js';
import {createGlyphWritingState} from './glyph-writing.js';
import {paintBrushStroke,paintFormalGlyph} from './brush-glyph.js';
import {appendBrushPoint} from './brush-input-path.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function distanceToPath(p,path){let result=Infinity;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],s=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1);result=Math.min(result,Math.hypot(p[0]-a[0]-dx*s,p[1]-a[1]-dy*s));}return result;}
const pathLength=path=>path.reduce((sum,p,i)=>sum+(i?distance(p,path[i-1]):0),0);
export function brushPathSamples(path){const points=[path[0]];for(let i=1;i<path.length;i++){const n=Math.max(1,Math.ceil(distance(path[i-1],path[i])*52));for(let j=1;j<=n;j++)points.push([T.MathUtils.lerp(path[i-1][0],path[i][0],j/n),T.MathUtils.lerp(path[i-1][1],path[i][1],j/n)]);}return points;}

// Accumulated ink coverage, rather than a slider or a prescribed grab point.
// A pause/blur drops only the uncommitted stroke and cannot finish the surface.
export function createBrushPathState(template,{waitSeconds=0}={}){
 const templates=[brushPathSamples(template)],paths=[],totalLength=pathLength(template);let current=null,ready=false,waiting=false,restSeconds=0,motionSeconds=0,lastMoveAge=99,baseMotion=0,viewScale=[1,1];
 function metricDistance(point,path){return distanceToPath([point[0]*viewScale[0],point[1]*viewScale[1]],path.map(p=>[p[0]*viewScale[0],p[1]*viewScale[1]]));}
 function setViewSize(widthPixels,heightPixels){viewScale=[clamp(widthPixels/58,.45,1),clamp(heightPixels/58,.45,1)];}
 function directionalSegments(path){const result=[];for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],ta=path[Math.max(0,i-2)],tb=path[Math.min(path.length-1,i+3)],dx=tb[0]-ta[0],dy=tb[1]-ta[1],length=Math.hypot(dx,dy);if(length>.0001)result.push({a,b,dx:dx/length,dy:dy/length});}return result;}
 const guideSegments=directionalSegments(templates[0]);
 function alignedDistance(point,dx,dy,segments){let best=Infinity;for(const s of segments){if(Math.abs(dx*s.dx+dy*s.dy)<.78)continue;best=Math.min(best,metricDistance(point,[s.a,s.b]));}return best;}
 function values(){const points=paths.flat(),segments=paths.flatMap(directionalSegments),coverage=templates[0].filter((p,i)=>{const a=templates[0][Math.max(0,i-2)],b=templates[0][Math.min(templates[0].length-1,i+2)],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);return length>0&&alignedDistance(p,dx/length,dy/length,segments)<.115;}).length/templates[0].length,accuracy=points.length?points.filter(p=>metricDistance(p,template)<.15).length/points.length:0,travel=paths.reduce((sum,p)=>sum+pathLength(p),0),samples=paths.reduce((sum,p)=>sum+Math.max(0,p.length-1),0),endpoints=template.length>1&&[template[0],template.at(-1)].every(p=>paths.some(path=>path.length>1&&metricDistance(p,path)<Math.min(.115,totalLength*.32)));return {coverage,accuracy,travel,samples,endpoints,viewScale:viewScale.slice()};}
 function valid(){const s=values();return s.coverage>=.78&&s.accuracy>=.66&&s.travel>=totalLength*.62&&s.endpoints;}
 function begin(uv){if(ready||waiting||current)return false;current=[[clamp(uv[0],0,1),clamp(uv[1],0,1)]];paths.push(current);baseMotion=motionSeconds;lastMoveAge=99;return true;}
 function move(uv){if(!appendBrushPoint(current,uv))return false;lastMoveAge=0;return true;}
 function end(){if(!current)return false;const submitted=current;current=null;
  // An off-surface attempt must not poison every later retry. Keep useful
  // partial ink, but discard a stroke drawn mainly away from the water line.
  const accuracy=submitted.filter(p=>metricDistance(p,template)<.15).length/submitted.length,directional=directionalSegments(submitted),useful=directional.length?directional.filter(s=>alignedDistance(s.b,s.dx,s.dy,guideSegments)<.15).length/directional.length:0;
  if(accuracy<.55||useful<.55||pathLength(submitted)>totalLength*2.8+.12)paths.splice(paths.indexOf(submitted),1);
  if(valid()){if(waitSeconds>0){waiting=true;restSeconds=0;}else ready=true;}return ready;}
 function cancel(){if(current){paths.splice(paths.indexOf(current),1);current=null;motionSeconds=baseMotion;}waiting=false;restSeconds=0;lastMoveAge=99;}
 function update(dt){if(dt<=0)return ready;lastMoveAge+=dt;if(current&&lastMoveAge<.13)motionSeconds+=dt;if(waiting&&!current){restSeconds=Math.min(waitSeconds,restSeconds+dt);if(restSeconds>=waitSeconds){ready=true;waiting=false;}}return ready;}
 function reset(){paths.length=0;current=null;ready=waiting=false;restSeconds=motionSeconds=baseMotion=0;lastMoveAge=99;}
 return {begin,move,end,cancel,update,reset,setViewSize,templates,strokes:[template],paths,recognized:new Set(),get current(){return current;},get active(){return !!current;},get ready(){return ready;},get waiting(){return waiting;},get progress(){return ready?1:clamp(values().coverage,.0,.99);},get stats(){return {...values(),motionSeconds,activeSeconds:motionSeconds+restSeconds,restSeconds,waitSeconds,ready,waiting,active:!!current};}};
}

/** A brushable plane attached to real architecture, with UV ink and ray hits. */
export function createBrushSurface({id,parent,position,width,height,word=null,template=null,waitSeconds=0,ink='#efeede',guide='#d0d9c4',mode=word?'write':'brush-outline',label='',hint='',rotation=null,inputState=null,hitTolerancePixels=0}={}){
 const state=inputState||(word?createGlyphWritingState(word):createBrushPathState(template,{waitSeconds})),ray=new T.Raycaster(),root=new T.Group();root.name='建筑上的毛笔墨面_'+id;root.position.fromArray(position);if(rotation)root.rotation.set(...rotation);parent.add(root);
 const canvas=typeof document!=='undefined'?document.createElement('canvas'):{getContext:()=>null};canvas.width=canvas.height=512;const context=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 if(word&&context?.getImageData){paintFormalGlyph(context,word,{size:512,pixels:384,color:'#ffffff',opacity:1});const pixels=context.getImageData(0,0,512,512).data,alpha=new Uint8Array(512*512);for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3];state.setGuideMask(alpha,512,512);context.clearRect(0,0,512,512);}
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,opacity:1,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,side:T.DoubleSide,fog:false,toneMapped:false});
 const mesh=new T.Mesh(new T.PlaneGeometry(width,height),material);mesh.name='可见毛笔操作面_'+id;mesh.renderOrder=4;root.add(mesh);
 const cursor=new T.Mesh(new T.SphereGeometry(.028,8,6),new T.MeshBasicMaterial({color:ink,transparent:true,opacity:.78,depthWrite:false,depthTest:false,fog:false,toneMapped:false}));cursor.name='墨落笔尖_'+id;cursor.visible=false;cursor.position.z=.022;cursor.renderOrder=6;root.add(cursor);
 let enabled=false,completed=false,surfaceAge=0,settleAge=-1,rect=null;
 const active=()=>!!state.current,ready=()=>word?state.complete:state.ready;
 function draw(){
  if(!context){texture.needsUpdate=true;return;}if(word&&ready()&&settleAge<0)settleAge=0;const formalBlend=word&&settleAge>=0?T.MathUtils.smootherstep(settleAge,.07,.52):0;context.clearRect(0,0,512,512);context.lineCap='round';context.lineJoin='round';
  const line=(points,color,lineWidth,opacity)=>{if(points.length<2)return;context.globalAlpha=opacity;context.strokeStyle=color;context.lineWidth=lineWidth;context.beginPath();points.forEach(([u,v],i)=>i?context.lineTo(u*512,v*512):context.moveTo(u*512,v*512));context.stroke();};
  // A world stone occupies about 50 screen pixels: a 3 px guide in this
  // 512 px texture disappears under minification. Keep writing guides broad
  // enough to survive that reduction, with the next stroke slightly darker.
  if(word)paintFormalGlyph(context,word,{size:512,pixels:384,color:guide,opacity:(completed?.06:enabled?.34:.18)*(1-formalBlend)});
  else state.strokes.forEach(path=>line(path,guide,3.2,(completed?.09:enabled?.18:.11)*(1-formalBlend)));
  context.globalAlpha=1;for(const path of state.paths)paintBrushStroke(context,path,{size:512,width:word?13:9.5,color:ink,opacity:(completed?.80:.96)*(1-formalBlend)});
  if(formalBlend>0)paintFormalGlyph(context,word,{size:512,pixels:384,color:ink,opacity:formalBlend*(completed?.80:.96)});
  context.globalAlpha=1;texture.needsUpdate=true;
 }
 function sample(ndc,camera,tolerancePixels=hitTolerancePixels){if(!camera||!root.visible)return null;camera.updateMatrixWorld(true);root.updateWorldMatrix(true,true);ray.setFromCamera(ndc,camera);const hit=ray.intersectObject(mesh,false)[0];if(hit?.uv)return [hit.uv.x,1-hit.uv.y];if(!tolerancePixels)return null;
  // The same padded physical plane is used for picking and for every sample.
  // Clamp a near-edge touch onto timber instead of selecting it then refusing
  // the stroke. The default remains exact for other chapters.
  const origin=root.getWorldPosition(V()),normal=V(0,0,1).transformDirection(root.matrixWorld),point=V();if(!ray.ray.intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(normal,origin),point))return null;const local=root.worldToLocal(point.clone()),uv=[clamp(local.x/width+.5,0,1),clamp(.5-local.y/height,0,1)],closest=V((uv[0]-.5)*width,(.5-uv[1])*height,0).applyMatrix4(root.matrixWorld).project(camera),screenWidth=globalThis.innerWidth||1280,screenHeight=globalThis.innerHeight||screenWidth/camera.aspect;if(Math.hypot((ndc.x-closest.x)*screenWidth/2,(ndc.y-closest.y)*screenHeight/2)>tolerancePixels)return null;return uv;
 }
 function down(ndc,camera){const uv=sample(ndc,camera);if(!uv||!enabled||completed||ready())return false;const started=state.begin(uv);if(started){cursor.visible=true;cursor.position.set((uv[0]-.5)*width,(.5-uv[1])*height,.025);draw();}return started;}
 function move(ndc,camera){if(!active())return false;const uv=sample(ndc,camera);if(uv){cursor.position.set((uv[0]-.5)*width,(.5-uv[1])*height,.025);if(state.move(uv))draw();}return true;}
 function up(){if(!active())return false;state.end();cursor.visible=false;draw();return true;}
 function cancel(){state.cancel?.();cursor.visible=false;draw();}
 function update(dt){surfaceAge+=Math.max(0,dt);state.update?.(dt);if(word&&ready()){if(settleAge<0)settleAge=0;if(settleAge<.55&&dt>0){settleAge+=dt;draw();}}}
 function setEnabled(value){const next=!!value;if(next!==enabled){enabled=next;draw();}}
 function setCompleted(value){completed=!!value;cursor.visible=false;draw();}
 function reset(){state.reset();enabled=completed=false;surfaceAge=0;settleAge=-1;rect=null;cursor.visible=false;material.opacity=1;draw();}
 function getRect(camera){if(!camera)return null;camera.updateMatrixWorld(true);root.updateWorldMatrix(true,true);const project=([u,v])=>{const q=V((u-.5)*width,(.5-v)*height,.02).applyMatrix4(root.matrixWorld).project(camera);return {x:q.x,y:q.y,z:q.z};},centre=project([.5,.5]),corners=[[0,0],[1,0],[0,1],[1,1]].map(project),strokes=state.templates.map(path=>path.map(project)),points=strokes.flatMap((stroke,i)=>stroke.map(p=>({...p,strokeIndex:i}))),partial=state.paths.at(-1)?.at(-1);
  rect={mode,id,word:word||'',brush:true,label,hint,x:centre.x,y:centre.y,centre,halfWidth:Math.max(...corners.map(p=>Math.abs(p.x-centre.x))),halfHeight:Math.max(...corners.map(p=>Math.abs(p.y-centre.y))),worldPosition:root.getWorldPosition(V()).toArray(),strokes,guide:points,guideNDC:points,start:points[0],end:points.at(-1),current:partial?project(partial):points[0],recognized:[...state.recognized],strokeCount:word?state.strokes.length:0,progress:state.progress,coverage:word?state.progress:state.stats.coverage,listenSeconds:word?0:state.stats.restSeconds,enabled,completed,visible:root.visible};const viewWidth=globalThis.innerWidth||1280,viewHeight=globalThis.innerHeight||viewWidth/camera.aspect;state.setViewSize?.(rect.halfWidth*viewWidth,rect.halfHeight*viewHeight);return rect;
 }
 draw();return {id,root,mesh,cursor,state,sample,down,move,up,cancel,update,draw,setEnabled,setCompleted,reset,getRect,get active(){return active();},get ready(){return ready();},get enabled(){return enabled;},get completed(){return completed;},get progress(){return state.progress;},get visualStats(){return {pressureInk:true,settleAge,formalBlend:word&&settleAge>=0?T.MathUtils.smootherstep(settleAge,.07,.52):0,font:'Poem',formalGuideOnly:!!word,duplicatedMeshes:0,guideWidthPixels:word?384:3.2,guideNextOpacity:word?.34:.18,guideRemainingOpacity:word?.34:.18,depthBias:material.polygonOffset};},get stats(){return word?{word,progress:state.progress,recognized:[...state.recognized],strokeCount:state.strokes.length,samples:state.paths.reduce((sum,p)=>sum+p.length,0),ready:state.complete,active:active(),guide:state.guideStats}:state.stats;}};
}
