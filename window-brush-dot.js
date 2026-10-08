import * as T from './vendor/three.module.js';
import {createInteractionHitTester} from './interaction-hit.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);

/** One brush contact on a real latch. Release commits; waiting never does. */
export function createWindowBrushDot({id,parent,latch,position,width=.55,height=.55,label='笔点窗闩',hint='轻点窗闩上的淡墨点，松笔开窗。'}={}){
 const root=new T.Group();root.name='窗闩上可轻点的毛笔墨点';root.position.fromArray(position);parent.add(root);
 const uniforms={phase:{value:0},contact:{value:0},fade:{value:1}},material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,fog:false,toneMapped:false,
  vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 p;uniform float phase,contact,fade;float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 q=(p-.5)*vec2(1.,.86);float grain=hash(floor(p*127.));float radius=length(q);float soft=exp(-radius*radius/mix(.009,.026,contact));float edge=.77+.23*grain;float alpha=soft*edge*mix(.34,.73,contact);vec3 tint=mix(vec3(.84,.86,.73),vec3(.21,.26,.22),contact*.68);alpha*=.96+.04*sin(phase*.8);if(alpha<.006)discard;gl_FragColor=vec4(tint,alpha*fade);#include <colorspace_fragment>}'.replace(';#include',';\n#include')});
 const mesh=new T.Mesh(new T.PlaneGeometry(width,height),material);mesh.name='窗闩上的小淡墨点';mesh.renderOrder=5;mesh.castShadow=false;root.add(mesh);
 const particlePositions=[],seeds=[];for(let i=0;i<13;i++){const angle=i*2.39996,radius=.022+((i*7)%13)/13*.055;particlePositions.push(Math.cos(angle)*radius,Math.sin(angle)*radius,.006);seeds.push(i*.77);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(particlePositions,3));geometry.setAttribute('seed',new T.Float32BufferAttribute(seeds,1));
 const motes=new T.Points(geometry,new T.ShaderMaterial({uniforms:{phase:uniforms.phase,strength:{value:.24}},transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
  vertexShader:'attribute float seed;uniform float phase;varying float a;void main(){a=.7+.18*sin(phase*.61+seed);gl_PointSize=1.1+mod(seed,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float strength;varying float a;void main(){float soft=1.-smoothstep(.1,1.,length(gl_PointCoord-.5)*2.);gl_FragColor=vec4(.88,.89,.76,soft*strength*a);#include <colorspace_fragment>}'.replace(';#include',';\n#include')}));motes.name='窗闩墨点的少量细粒';motes.renderOrder=6;root.add(motes);
 let enabled=false,completed=false,ready=false,active=false,valid=false,current=null,clock=0,samples=0,viewport={width:1280,height:720};
 const pick=createInteractionHitTester([{id,objects:[mesh,latch].filter(Boolean),pixelTolerance:18}]);
 function down(ndc,camera){if(!enabled||completed||ready||active||!pick(ndc,camera,viewport))return false;active=valid=true;current=[[.5,.5]];samples=1;uniforms.contact.value=1;return true;}
 function move(ndc,camera){if(!active)return false;valid=!!pick(ndc,camera,viewport);return true;}
 function up(){if(!active)return false;ready=valid;active=valid=false;current=null;uniforms.contact.value=ready?1:0;return true;}
 function cancel(){active=valid=false;current=null;uniforms.contact.value=ready?1:0;}
 function update(dt){if(dt>0)clock+=dt;uniforms.phase.value=clock;}
 function setEnabled(value){enabled=!!value;}
 function setCompleted(value){completed=!!value;active=valid=false;current=null;uniforms.contact.value=completed?1:0;}
 function setOpacity(opacity){material.opacity=uniforms.fade.value=opacity;uniforms.contact.value=ready||completed?1:0;motes.material.uniforms.strength.value=.24*opacity;mesh.visible=motes.visible=opacity>.002;}
 function reset(){enabled=completed=ready=active=valid=false;current=null;clock=samples=0;uniforms.phase.value=uniforms.contact.value=0;setOpacity(1);}
 function getRect(camera){if(!camera)return null;camera.updateMatrixWorld(true);root.updateWorldMatrix(true,true);const project=(u,v)=>{const q=V((u-.5)*width,(.5-v)*height,.015).applyMatrix4(root.matrixWorld).project(camera);return {x:q.x,y:q.y,z:q.z};},centre=project(.5,.5),corners=[[0,0],[1,0],[0,1],[1,1]].map(([u,v])=>project(u,v));return {id,kind:'spatial-gesture',mode:'brush-dot',word:'',brush:true,label,hint,x:centre.x,y:centre.y,centre,halfWidth:Math.max(...corners.map(p=>Math.abs(p.x-centre.x))),halfHeight:Math.max(...corners.map(p=>Math.abs(p.y-centre.y))),worldPosition:root.getWorldPosition(V()).toArray(),start:centre,current:centre,end:centre,strokes:[],guide:[centre],guideNDC:[centre],strokeCount:0,recognized:[],progress:ready?1:0,coverage:ready?1:0,enabled,completed,visible:root.visible&&mesh.visible,hitHalo:18};}
 return {id,root,mesh,latch,motes,state:{get current(){return current;},get waiting(){return false;},cancel},down,move,up,cancel,update,setEnabled,setCompleted,setOpacity,reset,getRect,setViewport(value){if(value?.width&&value?.height)viewport={...value};},get active(){return active;},get ready(){return ready;},get enabled(){return enabled;},get completed(){return completed;},get progress(){return ready?1:0;},get stats(){return {interaction:'brush-dot',progress:ready?1:0,coverage:ready?1:0,samples,ready,active,waiting:false,restSeconds:0,clock,inkOpacity:material.uniforms.fade.value,outlineStrokes:0};}};
}
