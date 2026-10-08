import * as T from './vendor/three.module.js';

const MAX_POINTS=48,CURVE_POINTS=25,clamp=T.MathUtils.clamp;
const vertex=`varying vec2 inkUV;
void main(){inkUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`
varying vec2 inkUV;
uniform vec2 panelSize,curve[25];
uniform vec4 trail[48];
uniform sampler2D fibers;
uniform float trailCount,guideAlpha,opacity,clock,wetAge,plankSpacing;
float segment(vec2 p,vec2 a,vec2 b,out float t){
 vec2 v=b-a;t=clamp(dot(p-a,v)/max(dot(v,v),.000001),0.,1.);
 return length(p-a-v*t);
}
void main(){
 vec2 uv=vec2(inkUV.x,1.-inkUV.y),p=uv*panelSize;
 vec3 grain=texture2D(fibers,uv).rgb;
 vec3 spread=texture2D(fibers,uv*vec2(.43,.56)+vec2(.31,.17)).rgb;
 float edge=smoothstep(0.,.028,uv.x)*smoothstep(0.,.028,1.-uv.x)*smoothstep(0.,.035,uv.y)*smoothstep(0.,.035,1.-uv.y);
 float guideDistance=999.,along=0.;
 for(int i=0;i<24;i++){
  float t;float d=segment(p,curve[i]*panelSize,curve[i+1]*panelSize,t);
  if(d<guideDistance){guideDistance=d;along=(float(i)+t)/24.;}
 }
 // The invitation is a few uneven, dry ink washes, rather than a luminous line.
 float islands=smoothstep(.42,.88,sin(along*24.2+spread.g*2.1)*.5+.5);
 float guideFeather=exp(-pow(guideDistance/(.13+.14*spread.g),2.));
 float guide=guideFeather*islands*(.30+.70*grain.r)*guideAlpha;
 float ink=0.,wet=0.;
 for(int i=0;i<48;i++){
  if(float(i)>=trailCount)break;
  float t=0.,d,pressure,strength;
  if(i==0){d=length(p-trail[0].xy*panelSize);pressure=trail[0].w;strength=trail[0].z;}
  else{
   d=segment(p,trail[i-1].xy*panelSize,trail[i].xy*panelSize,t);
   pressure=mix(trail[i-1].w,trail[i].w,t);strength=mix(trail[i-1].z,trail[i].z,t);
  }
  float moisture=1.-exp(-wetAge*14.);
  float radius=mix(.055,.13,pressure),capillary=mix(.04,.08,pressure)*mix(.66,1.,moisture);
  // Paper-like capillary bloom follows the plank fibers, with a broken dry edge.
  float rough=(spread.g-.5)*capillary+(grain.r-.5)*.024;
  float width=radius+rough;
  float core=exp(-pow(max(d-.004,0.)/max(.007,width),2.));
  float bleed=exp(-pow(d/max(.018,radius*(2.0+moisture*.8)+rough*1.5),2.))*.28;
  float dry=smoothstep(.12,.48,grain.r+core*.48);
  float body=(core*mix(.63,.98,pressure)+bleed)*dry*strength;
  ink=max(ink,body);
  wet=max(wet,exp(-pow(d/(radius*3.2+.036),2.))*strength*pressure);
 }
 float blot=max(guide,ink);
 // Only the actual narrow timber joints catch a little reflected warmth.
 float joint=abs(fract(p.y/max(.08,plankSpacing)+.17)-.5)*plankSpacing;
 float fissure=(1.-smoothstep(.0008,.0055,joint))*(.30+.70*grain.b);
 float shimmer=.73+.27*sin(p.x*23.-clock*1.2+spread.g*3.);
 float warmth=fissure*wet*.26*shimmer;
 float rim=wet*(1.-clamp(ink*1.7,0.,1.))*.06*(.45+.55*grain.g);
 vec3 inkColor=mix(vec3(.24,.25,.20),vec3(.035,.052,.037),clamp(ink*1.5,0.,1.));
 float glow=warmth+rim;
 vec3 color=mix(inkColor,vec3(.71,.58,.37),glow/max(.0001,blot*.78+glow));
 float alpha=clamp(blot*.88+glow,0.,.92)*edge*opacity;
 gl_FragColor=vec4(color,alpha);
 #include <colorspace_fragment>
}`;

// Original, deterministic absorption/fiber map. A CanvasTexture is used in
// browsers; the same authored pixels remain available in headless geometry QA.
function createFiberTexture(){
 const width=256,height=512,pixels=new Uint8Array(width*height*4);
 const hash=(x,y)=>{let n=Math.imul(x+17,374761393)^Math.imul(y+71,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,fine=hash(x,y),fiber=hash(Math.floor(x/20),y),cloud=hash(Math.floor(x/23),Math.floor(y/17)),grain=.5+.5*Math.sin(y*.83+Math.sin(x*.026)*2.4);
  pixels[i]=Math.round(clamp(.16+fine*.34+fiber*.38+grain*.12,0,1)*255);
  pixels[i+1]=Math.round(clamp(.22+cloud*.58+fine*.20,0,1)*255);
  pixels[i+2]=Math.round(clamp(.16+fiber*.66+grain*.18,0,1)*255);pixels[i+3]=255;
 }
 let texture;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');
  if(context?.createImageData&&context?.putImageData){const image=context.createImageData(width,height);image.data.set(pixels);context.putImageData(image,0,0);texture=new T.CanvasTexture(canvas);}
 }
 texture??=new T.DataTexture(pixels,width,height,T.RGBAFormat);
 texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.colorSpace=T.NoColorSpace;texture.needsUpdate=true;texture.name='原创木纤维毛细吸墨';
 return texture;
}

/** Visual skin on the real brush hit mesh. This does not recognize strokes,
 * change navigation, complete tasks, or keep a mark on repaired architecture. */
export function createRecallInkWash(surface,{template=surface.state?.strokes?.[0],width=1.55,height=1.2,parent=surface.root,plankSpacing=.258}={}){
 const sourceMaterial=surface.mesh.material,texture=createFiberTexture();
 const samples=new T.CatmullRomCurve3(template.map(([u,v])=>new T.Vector3(u,v,0))).getPoints(CURVE_POINTS-1).map(p=>new T.Vector2(p.x,p.y));
 const trail=Array.from({length:MAX_POINTS},()=>new T.Vector4());
 const material=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{panelSize:{value:new T.Vector2(width,height)},curve:{value:samples},trail:{value:trail},fibers:{value:texture},trailCount:{value:0},guideAlpha:{value:0},opacity:{value:1},clock:{value:0},wetAge:{value:0},plankSpacing:{value:plankSpacing}},transparent:true,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,side:T.DoubleSide,fog:false,toneMapped:false});
 surface.mesh.material=material;surface.mesh.name='顺木纤维渗开的笔墨_'+surface.id;
 // Kept for the old visual API. No moon pool, particles or extra hit target.
 const pool=new T.Group();pool.name='无额外光圈的接缝墨晕_'+surface.id;pool.visible=false;parent?.add(pool);
 let time=0,points=[],path=null,index=0,releaseAge=-1,done=false,canceled=false,holdSeconds=0,lastCaptureTime=0;
 const releaseFade=()=>releaseAge<0?1:Math.pow(Math.max(0,1-releaseAge/.48),1.35);
 function capture(){
  if(!path)return;
  for(;index<path.length;index++){
   const uv=path[index],last=points.at(-1),distance=last?Math.hypot((uv[0]-last.uv[0])*width,(uv[1]-last.uv[1])*height):0;
   const speed=distance/Math.max(.016,time-lastCaptureTime),pressure=last?clamp(.25+.38*Math.exp(-speed*.45),.25,.63):.32;
   points.push({uv:[...uv],time,pressure});lastCaptureTime=time;
  }
  if(points.length>MAX_POINTS)points.splice(0,points.length-MAX_POINTS);
 }
 function sync(){
  const u=material.uniforms;u.clock.value=time;u.wetAge.value=holdSeconds;u.opacity.value=material.opacity;u.trailCount.value=points.length;
  for(let i=0;i<points.length;i++){
   const p=points[i],age=time-p.time,fade=path?Math.max(.28,1-age/1.6):Math.max(0,1-age/1.6);
   trail[i].set(p.uv[0],p.uv[1],fade*releaseFade(),p.pressure);
  }
  u.guideAlpha.value=surface.enabled&&!surface.completed&&!surface.state.waiting&&!done&&!canceled?.13:0;
  surface.cursor.visible=false;pool.visible=false;
 }
 function begin(){points=[];path=surface.state.current;index=0;releaseAge=-1;done=canceled=false;holdSeconds=0;lastCaptureTime=time;capture();sync();}
 function move(){capture();sync();}
 function release(){capture();path=null;releaseAge=0;done=surface.ready||surface.state.waiting;sync();}
 function clear(){points=[];path=null;index=0;releaseAge=-1;done=false;canceled=true;holdSeconds=0;sync();}
 function update(dt){
  if(dt>0){time+=dt;if(path){holdSeconds+=dt;capture();const tip=points.at(-1);if(tip){tip.pressure=clamp(tip.pressure+dt*.32,0,.96);tip.time=time;}}if(releaseAge>=0){releaseAge+=dt;if(releaseAge>=.50)points=[];}}
  sync();
 }
 function reset(){time=0;clear();canceled=false;material.opacity=1;sync();}
 sync();
 return {mesh:surface.mesh,pool,begin,move,release,update,clear,reset,sourceMaterial,
  get stats(){return {time,trailPoints:points.length,strokeAlpha:points.length?Math.max(...trail.slice(0,points.length).map(p=>p.z))*material.opacity:0,guideAlpha:material.uniforms.guideAlpha.value,windowOpacity:material.uniforms.opacity.value,releaseAge,completed:surface.completed,waiting:surface.state.waiting,pressure:points.at(-1)?.pressure||0,holdSeconds,poolAmount:0,poolVisible:false,hitMeshPreserved:true,particles:0,capillaryInk:true,originalFiberTexture:true,fiberPixels:256*512};}
 };
}
