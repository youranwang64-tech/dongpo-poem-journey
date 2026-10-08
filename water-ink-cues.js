import * as T from './vendor/three.module.js';
import {paintBrushStroke,paintFormalGlyph} from './brush-glyph.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
export const WORLD_BRUSH_INK=Object.freeze({ink:'#f4f1e3',hint:'#e6e8db'});
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

/** World ink with no backing board. Recognition stays in the owning surface. */
export function createWaterInkCue(surface,{word=null,seed=1,ink=WORLD_BRUSH_INK.ink,hint=WORLD_BRUSH_INK.hint,formalGuideOnly=!!word}={}){
 const canvas=typeof document!=='undefined'?document.createElement('canvas'):{getContext:()=>null};canvas.width=canvas.height=512;const context=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 surface.mesh.material.map=texture;surface.mesh.material.needsUpdate=true;surface.mesh.name=word?'无背板的'+word+'字墨面':'水面上的渠口墨纹';surface.mesh.castShadow=false;
 const width=surface.mesh.geometry.parameters.width,height=surface.mesh.geometry.parameters.height,r=random(seed),points=[],parameters=[];
 if(word&&context){
  context.clearRect(0,0,512,512);paintFormalGlyph(context,word,{size:512,pixels:384,color:'#ffffff',opacity:1});const image=context.getImageData(0,0,512,512).data,candidates=[],alpha=new Uint8Array(512*512);for(let i=0;i<alpha.length;i++)alpha[i]=image[i*4+3];surface.state.setGuideMask?.(alpha,512,512);
  for(let y=8;y<504;y+=2)for(let x=8;x<504;x+=2){const alpha=image[(y*512+x)*4+3];if(alpha<35)continue;const edge=[[6,0],[-6,0],[0,6],[0,-6]].some(([dx,dy])=>image[((y+dy)*512+x+dx)*4+3]<25);if(edge)candidates.push([x/512,y/512]);}
  for(let i=0;i<Math.min(118,candidates.length);i++){const j=Math.floor(r()*candidates.length),[u,v]=candidates.splice(j,1)[0];points.push((u-.5)*width,(.5-v)*height,.010);parameters.push(1.05+r()*1.05,r()*6.28,.65+r()*.35);}
 }else if(!word){
  const path=surface.state.templates[0];for(let i=0;i<26;i++){const p=path[Math.round(i/25*(path.length-1))],u=p[0]+(r()-.5)*.011,v=p[1]+(r()-.5)*.011;points.push((u-.5)*width,(.5-v)*height,.010);parameters.push(.95+r()*.95,r()*6.28,.62+r()*.38);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));geometry.setAttribute('moteParameters',new T.Float32BufferAttribute(parameters,3));
 const uniforms={time:{value:0},strength:{value:.12},tint:{value:new T.Color(hint)}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
  vertexShader:'attribute vec3 moteParameters;uniform float time;varying float moteAlpha;void main(){vec3 p=position;p.x+=sin(time*.33+moteParameters.y)*.004;p.y+=cos(time*.24+moteParameters.y)*.004;moteAlpha=moteParameters.z*(.76+.18*sin(time*.63+moteParameters.y));gl_PointSize=moteParameters.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
  fragmentShader:'uniform float strength;uniform vec3 tint;varying float moteAlpha;void main(){float alpha=(1.-smoothstep(.05,1.,length(gl_PointCoord-.5)*2.))*strength*moteAlpha;if(alpha<.003)discard;gl_FragColor=vec4(tint,alpha);#include <colorspace_fragment>}'.replace(';#include',';\n#include')
 });
 const motes=new T.Points(geometry,material);motes.name=word?'正楷'+word+'字边缘的轻墨粒':'沿渠口水纹的细墨粒';motes.renderOrder=5;motes.frustumCulled=false;surface.root.add(motes);
 let clock=0,settle=-1,previous='',hintRevealed=false,guideVisible=false,guideOpacity=0;
 function update(dt,{near=false,selected=false,finished=false}={}){
  const ready=surface.ready,writing=!!surface.state.current,hasInk=surface.state.paths.some(path=>path.length>1);if(!near&&!writing)hintRevealed=false;if(ready&&settle<0)settle=0;if(dt>0){clock+=dt;if(settle>=0)settle=Math.min(.55,settle+dt);}guideVisible=!word||!finished&&!ready&&(writing||near&&(hasInk||hintRevealed));uniforms.time.value=clock;uniforms.strength.value=word&&!guideVisible&&!ready?0:(near?.29:.14)*(finished?.15:selected?.62:1);motes.visible=!word||guideVisible||ready;
  const blend=word&&settle>=0?T.MathUtils.smootherstep(settle,.07,.50):0,signature=[near,selected,finished,ready,writing,guideVisible,surface.state.recognized.size,...surface.state.paths.map(p=>p.length),Math.round(blend*50)].join('|');
  if(context&&signature!==previous){previous=signature;context.clearRect(0,0,512,512);context.globalAlpha=1;
   const faint=(word?(guideVisible?(formalGuideOnly?.28:.10):0):(near?.10:.065))*(finished?.16:1)*(1-blend);guideOpacity=faint;
   if(word)paintFormalGlyph(context,word,{size:512,pixels:384,color:hint,opacity:faint});else paintBrushStroke(context,surface.state.strokes[0],{size:512,width:13,color:hint,opacity:faint});
   if(word&&guideVisible&&!formalGuideOnly&&!finished&&!ready){const next=surface.state.strokes.findIndex((_,i)=>!surface.state.recognized.has(i));for(let i=0;i<surface.state.strokes.length;i++){const accepted=surface.state.recognized.has(i),focus=near&&i===next;
    paintBrushStroke(context,surface.state.strokes[i],{size:512,width:focus?8.5:6.5,color:hint,opacity:accepted?.12:focus?.46:near?.23:.12});}
    if(near&&next>=0){const [u,v]=surface.state.strokes[next][0];context.globalAlpha=.42;context.fillStyle=hint;context.beginPath();context.arc(u*512,v*512,4.2,0,Math.PI*2);context.fill();context.globalAlpha=1;}}
   for(const path of surface.state.paths)paintBrushStroke(context,path,{size:512,width:word?16:11,color:ink,opacity:.94*(1-blend)*(finished?.22:1)});
   if(word&&blend>0)paintFormalGlyph(context,word,{size:512,pixels:384,color:ink,opacity:blend*.91*(finished?.22:1)});context.globalAlpha=1;texture.needsUpdate=true;
  }
 }
 function reset(){clock=0;settle=-1;previous='';hintRevealed=false;update(0);}
 function revealGuide(){hintRevealed=true;previous='';update(0,{near:true});return true;}
 update(0);return {motes,texture,uniforms,update,reset,revealGuide,get guideVisible(){return guideVisible;},get stats(){return {word:word||'',style:'Kai ink without board',guideLayers:word?1:0,guideVisible,guideOpacity,guidePhase:surface.ready?'settling':guideVisible?'writing':'context',hintRevealed,formalGuideOnly,points:points.length/3,clock,settle,backingBoard:false};}};
}

/** Project even a halo press onto the real ink plane, then clamp its UV. */
export function sampleWaterInk(surface,ndc,camera){
 if(!camera||!surface.root.visible)return null;camera.updateMatrixWorld(true);surface.root.updateWorldMatrix(true,true);const ray=new T.Raycaster();ray.setFromCamera(ndc,camera);const origin=surface.root.getWorldPosition(V()),normal=V(0,0,1).transformDirection(surface.root.matrixWorld),world=ray.ray.intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(normal,origin),V());if(!world)return null;const local=surface.root.worldToLocal(world),{width,height}=surface.mesh.geometry.parameters;return [clamp(local.x/width+.5,0,1),clamp(.5-local.y/height,0,1)];
}

export function beginWaterInk(surface,ndc,camera){
 const uv=sampleWaterInk(surface,ndc,camera);if(!uv||!surface.enabled||surface.ready)return false;if(!surface.state.begin(uv))return false;const {width,height}=surface.mesh.geometry.parameters;surface.cursor.visible=true;surface.cursor.position.set((uv[0]-.5)*width,(.5-uv[1])*height,.025);return true;
}
export function moveWaterInk(surface,ndc,camera){
 if(!surface.active)return false;const uv=sampleWaterInk(surface,ndc,camera);if(uv){surface.state.move(uv);const {width,height}=surface.mesh.geometry.parameters;surface.cursor.position.set((uv[0]-.5)*width,(.5-uv[1])*height,.025);}return true;
}

export function waterInkScreenRect(rect,viewport={left:0,top:0,width:1280,height:720},halo=18){
 const x=(viewport.left||0)+(rect.x+1)*viewport.width/2,y=(viewport.top||0)+(1-rect.y)*viewport.height/2,halfWidth=rect.halfWidth*viewport.width/2,halfHeight=rect.halfHeight*viewport.height/2;return {left:x-halfWidth-halo,top:y-halfHeight-halo,right:x+halfWidth+halo,bottom:y+halfHeight+halo,centerX:x,centerY:y,halo};
}
