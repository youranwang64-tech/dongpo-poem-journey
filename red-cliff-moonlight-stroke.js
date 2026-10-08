import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp,TRAIL_COUNT=48,CURVE_COUNT=25;
const vertex='varying vec2 lightUV;void main(){lightUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const fragment=`varying vec2 lightUV;uniform vec2 panelSize;uniform vec2 curve[25];uniform vec3 trail[48];uniform float trailCount,guideAlpha,opacity,clock;
float segment(vec2 p,vec2 a,vec2 b,out float u){vec2 d=b-a;u=clamp(dot(p-a,d)/max(dot(d,d),.000001),0.,1.);return length(p-a-d*u);}
void main(){vec2 p=vec2(lightUV.x,1.-lightUV.y)*panelSize;float d=999.,along=0.;for(int i=0;i<24;i++){float u;float q=segment(p,curve[i]*panelSize,curve[i+1]*panelSize,u);if(q<d){d=q;along=(float(i)+u)/24.;}}
 float taper=mix(.055,.018,pow(along,.75));float guide=(.40*exp(-pow(d/taper,2.))+.60*exp(-pow(d/(taper*.30),2.)))*guideAlpha*(.86+.14*sin(along*5.-clock*.65));float drawn=0.;
 for(int i=0;i<47;i++){if(float(i+1)>=trailCount)break;float u;float q=segment(p,trail[i].xy*panelSize,trail[i+1].xy*panelSize,u);float strength=mix(trail[i].z,trail[i+1].z,u);float width=mix(.028,.012,along);float feather=exp(-pow(q/(width*3.5),2.))*.20;float core=exp(-pow(q/width,2.))*.61;drawn=max(drawn,(core+feather)*strength);}
 float alpha=max(guide,drawn)*opacity;vec3 color=mix(vec3(.68,.80,.80),vec3(.91,.92,.84),clamp(drawn*1.5,0.,1.));gl_FragColor=vec4(color,alpha);
 #include <colorspace_fragment>}`;

/** A local visual skin for the existing genuine UV hit mesh. Recognition,
 * samples and cancellation still belong to the original brush surface. */
export function createMoonlightStroke(surface,{template,width,height,parent}={}){
 const original=surface.mesh.material,curve=new T.CatmullRomCurve3(template.map(([u,v])=>V(u,v,0))),curveSamples=curve.getPoints(CURVE_COUNT-1).map(p=>new T.Vector2(p.x,p.y)),trailUniform=Array.from({length:TRAIL_COUNT},()=>V());
 const material=new T.ShaderMaterial({uniforms:{panelSize:{value:new T.Vector2(width,height)},curve:{value:curveSamples},trail:{value:trailUniform},trailCount:{value:0},guideAlpha:{value:0},opacity:{value:1},clock:{value:0}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,side:T.DoubleSide,toneMapped:false,fog:false});
 surface.mesh.material=material;surface.mesh.name='顺笔落下的渐细月光_'+surface.id;
 const pool=new T.Mesh(new T.PlaneGeometry(3.6,11).rotateX(-Math.PI/2),new T.ShaderMaterial({uniforms:{clock:{value:0},amount:{value:0},reach:{value:0}},transparent:true,depthWrite:false,depthTest:true,toneMapped:false,fog:false,vertexShader:vertex,fragmentShader:`varying vec2 lightUV;uniform float clock,amount,reach;void main(){float v=lightUV.y;float x=lightUV.x-.5-sin(v*6.+clock*.32)*.018;float width=mix(.06,.30,v);float side=exp(-pow(x/width,2.));float edge=smoothstep(0.,.055,v)*(1.-smoothstep(.84,1.,v));float front=1.-smoothstep(reach-.08,reach+.12,v);float waves=.72+.28*sin(v*48.-clock*1.4+sin(x*11.));gl_FragColor=vec4(.72,.82,.80,side*edge*front*waves*amount*.22);#include <colorspace_fragment>}`.replace(';#include',';\n#include')}));
 pool.name='由落笔引到江面的软月光_'+surface.id;pool.renderOrder=3;pool.raycast=()=>{};parent.add(pool);
 let time=0,points=[],path=null,index=0,releaseAge=-1,done=false,canceled=false,lastProgress=0;
 function capture(){if(!path)return;for(;index<path.length;index++){const p=path[index];points.push({uv:[...p],time});}if(points.length>TRAIL_COUNT)points.splice(0,points.length-TRAIL_COUNT);}
 function begin(){points=[];path=surface.state.current;index=0;releaseAge=-1;done=canceled=false;capture();sync();}
 function move(){capture();sync();}
 function release(){capture();path=null;releaseAge=0;done=surface.ready||surface.state.waiting;sync();}
 function clear(){points=[];path=null;index=0;releaseAge=-1;done=false;canceled=true;lastProgress=0;material.uniforms.trailCount.value=0;material.uniforms.guideAlpha.value=0;pool.material.uniforms.amount.value=0;pool.visible=false;surface.cursor.visible=false;}
 function sync(){const u=material.uniforms;u.clock.value=time;u.opacity.value=material.opacity;u.trailCount.value=points.length;let strength=0;for(let i=0;i<points.length;i++){const age=time-points[i].time,fade=age>=.62?0:Math.pow(1-age/.62,1.6),releaseFade=releaseAge<0?1:Math.max(0,1-releaseAge/.38);trailUniform[i].set(points[i].uv[0],points[i].uv[1],fade*releaseFade);strength=Math.max(strength,fade*releaseFade);}u.guideAlpha.value=surface.enabled&&!surface.completed&&!surface.state.waiting&&!done&&!canceled?.16:0;surface.cursor.visible=false;
  lastProgress=surface.progress;const after=releaseAge<0?0:Math.min(1,releaseAge/1.2),reach=path?lastProgress*.82:done?Math.min(1,lastProgress*.75+after*.25):0,amount=canceled?0:path?lastProgress*.60:done?Math.max(0,1-releaseAge/2.2):0;pool.material.uniforms.clock.value=time;pool.material.uniforms.amount.value=amount;pool.material.uniforms.reach.value=reach;pool.visible=amount>.0001;
  const source=surface.root.position;pool.position.set(source.x,.013,source.z-5.5);return strength;
 }
 function update(dt){if(dt>0){time+=dt;if(releaseAge>=0)releaseAge+=dt;capture();if(releaseAge>=.40)points=[];}sync();}
 function reset(){time=0;clear();canceled=false;material.opacity=1;material.uniforms.opacity.value=1;material.uniforms.clock.value=0;pool.material.uniforms.clock.value=0;pool.material.uniforms.reach.value=0;}
 return {mesh:surface.mesh,pool,begin,move,release,clear,update,reset,sourceMaterial:original,get stats(){return {time,trailPoints:points.length,strokeAlpha:points.reduce((a,p)=>Math.max(a,(time-p.time)>=.62?0:Math.pow(1-(time-p.time)/.62,1.6)*(releaseAge<0?1:Math.max(0,1-releaseAge/.38))),0)*material.uniforms.opacity.value,guideAlpha:material.uniforms.guideAlpha.value,releaseAge,completed:surface.completed,waiting:surface.state.waiting,windowOpacity:material.uniforms.opacity.value,poolAmount:pool.material.uniforms.amount.value,poolVisible:pool.visible,hitMeshPreserved:true,particles:0};}};
}

/** Two tapered, feathered portions still expose the true alignment gap;
 * they are scenery only and never participate in the brush hit test. */
export function createMoonlightConnection(parent){
 const positions=new T.Float32BufferAttribute(new Float32Array(8*3),3),uv=new T.Float32BufferAttribute([0,0,1,0,0,.5,1,.5,0,.5,1,.5,0,1,1,1],2),geometry=new T.BufferGeometry();geometry.setAttribute('position',positions);geometry.setAttribute('uv',uv);geometry.setIndex([0,1,2,1,3,2,4,5,6,5,7,6]);
 const material=new T.ShaderMaterial({uniforms:{opacity:{value:0},clock:{value:0}},vertexShader:vertex,fragmentShader:`varying vec2 lightUV;uniform float opacity,clock;void main(){float side=exp(-pow((lightUV.x-.5)*3.8,2.));float edge=smoothstep(0.,.08,lightUV.y)*(1.-smoothstep(.90,1.,lightUV.y));float flow=.82+.18*sin(lightUV.y*5.-clock*.65);gl_FragColor=vec4(.78,.86,.82,side*edge*flow*opacity);#include <colorspace_fragment>}`.replace(';#include',';\n#include'),transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,fog:false,toneMapped:false});
 const mesh=new T.Mesh(geometry,material);mesh.name='水月之间轻晕渐细的月痕';mesh.raycast=()=>{};mesh.renderOrder=3;parent.add(mesh);
 function line(a,b,gap){const parts=[[a,a.clone().lerp(b,.5-gap/2)],[a.clone().lerp(b,.5+gap/2),b]];parts.forEach(([p,q],i)=>{const side=V(1,0,0),w0=.050-i*.015,w1=w0*.60;for(const [j,point,width]of [[0,p,w0],[1,q,w1]])for(const sign of [-1,1]){const out=point.clone().addScaledVector(side,sign*width);positions.setXYZ(i*4+j*2+(sign===1?1:0),out.x,out.y,out.z);}});positions.needsUpdate=true;geometry.computeBoundingSphere();}
 function setOpacity(value){material.opacity=value;material.uniforms.opacity.value=value;mesh.visible=value>.0001;}
 function update(time){material.uniforms.clock.value=time;}
 function clear(){setOpacity(0);}
 clear();return {mesh,line,setOpacity,update,clear,get opacity(){return material.opacity;},get stats(){return {opacity:material.uniforms.opacity.value,visible:mesh.visible,time:material.uniforms.clock.value,particles:0,tapered:true};}};
}
