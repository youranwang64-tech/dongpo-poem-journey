import * as T from './vendor/three.module.js';
import {createInteractionHitTester} from './interaction-hit.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
export const PRESSURE_INK_DEFAULTS=Object.freeze({lightAmount:.18,minimumHoldSeconds:.18,heavyHoldSeconds:.85,fullHoldSeconds:.95,hitHalo:18,pickPriority:70,bleedSeconds:1.55});

const INK_VERTEX=`varying vec2 inkUv;
void main(){inkUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const INK_FRAGMENT=`varying vec2 inkUv;
uniform vec3 inkColor;
uniform float amount,wetAge,seed,visibility,guideStrength;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float paper(vec2 p){float v=0.,weight=.57;for(int i=0;i<3;i++){v+=noise(p)*weight;p=p*2.07+vec2(9.71,17.13);weight*=.5;}return v;}
void main(){
 if(visibility<.002)discard;
 vec2 q=(inkUv-.5)*vec2(1.,.91);
 float water=1.-exp(-max(0.,wetAge)*1.8);
 vec2 warp=vec2(paper(q*14.+seed),paper(q*13.+vec2(17.,seed)))-.5;
 vec2 fibreWarp=vec2(noise(q*89.+seed),noise(q*91.+seed+12.))-.5;
 q+=warp*mix(.020,.066,amount)+fibreWarp*.0035;
 float r=length(q),density=pow(clamp(amount,0.,1.),.65);
 float radius=mix(.044,.190,pow(amount,.66));
 float edgeNoise=(paper(q*33.+seed)-.5)*(.010+.023*amount);
 float pigmentRadius=radius+edgeNoise;
 float wetRadius=pigmentRadius+(.010+.022*amount)*water;
 float feather=.011+.018*water;
 float middle=1.-smoothstep(pigmentRadius-.024,pigmentRadius+.013,r);
 float centre=1.-smoothstep(pigmentRadius*.57,pigmentRadius*.95,r);
 float wet=1.-smoothstep(wetRadius-feather,wetRadius+feather,r);
 float fibres=noise(q*183.+vec2(seed,23.));
 float granules=paper(q*72.+seed);
 float absorption=.86+.11*granules+.03*fibres;
 float inkAlpha=(middle*.60+centre*.20+wet*.13)*density*absorption;
 float capillary=wet*(1.-middle)*(.20+.80*noise(q*137.+seed))*density*.11;
 float cue=exp(-r*r/.00042)*guideStrength*(1.-step(.001,amount));
 float alpha=clamp(inkAlpha+capillary+cue,0.,.96)*visibility;
 if(alpha<.002)discard;
 vec3 pigment=inkColor*(.96+.11*(1.-middle)+.035*fibres);
 gl_FragColor=vec4(pigment,alpha);
 #include <colorspace_fragment>
}`;

/** A pressure-sensitive brush contact attached to a real architectural face.
 * Hold still for light/heavy ink; only releasing a valid contact commits.
 * Nearness and puzzle meaning belong to the stage, not this reusable surface. */
export function createPressureInkDot({id,parent,position=[0,0,0],rotation=null,width=1.20,height=1.20,inkColor=0x172119,seed=1,enabled:initiallyEnabled=false,allowRepeat=false,label='落墨',hint='轻按落淡墨，稍按久些落重墨；松笔后空间才响应。',minimumHoldSeconds=PRESSURE_INK_DEFAULTS.minimumHoldSeconds,heavyHoldSeconds=PRESSURE_INK_DEFAULTS.heavyHoldSeconds,fullHoldSeconds=PRESSURE_INK_DEFAULTS.fullHoldSeconds,hitHalo=PRESSURE_INK_DEFAULTS.hitHalo,pickPriority=PRESSURE_INK_DEFAULTS.pickPriority}={}){
 if(!id||!parent?.isObject3D)throw new TypeError('墨点需要 id 和真实建筑的父构件。');
 if(!(width>0&&height>0&&fullHoldSeconds>0&&minimumHoldSeconds>=0&&heavyHoldSeconds>=minimumHoldSeconds))throw new TypeError('墨面尺寸与按压时长不正确。');
 const root=new T.Group();root.name='真实建筑上的轻重墨点_'+id;root.position.fromArray(position);if(rotation)root.rotation.set(...rotation);parent.add(root);
 const uniforms={inkColor:{value:new T.Color(inkColor)},amount:{value:0},wetAge:{value:0},seed:{value:seed},visibility:{value:1},guideStrength:{value:initiallyEnabled?.17:.075}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,fog:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,vertexShader:INK_VERTEX,fragmentShader:INK_FRAGMENT});
 const mesh=new T.Mesh(new T.PlaneGeometry(width,height),material);mesh.name='多层水渗毛边墨面_'+id;mesh.renderOrder=5;mesh.castShadow=false;root.add(mesh);
 const pick=createInteractionHitTester([{id,objects:[mesh],pixelTolerance:hitHalo}]);
 const commits=[];let enabled=!!initiallyEnabled,completed=false,paused=false,active=false,contactValid=false,heldSeconds=0,clock=0,wetAge=0,amount=0,committedAmount=0,committedWetAge=0,hasCommit=false,fadeAge=null,fadeSeconds=0,viewport={left:0,top:0,width:1280,height:720},samples=0,cancelCount=0,current=null;
 const valueAt=seconds=>PRESSURE_INK_DEFAULTS.lightAmount+(1-PRESSURE_INK_DEFAULTS.lightAmount)*T.MathUtils.smootherstep(seconds,.045,fullHoldSeconds);
 function setViewport(value){if(value?.width&&value?.height)viewport={...value};}
 function pickPointerTarget(ndc,camera,view=viewport){setViewport(view);const hit=pick(ndc,camera,viewport);return hit?{...hit,kind:'spatial-gesture',mode:'brush-pressure-dot',pickPriority,available:enabled&&!paused&&!completed&&uniforms.visibility.value>.002&&(allowRepeat||!hasCommit),completed,pressure:true}:null;}
 function sync(){uniforms.amount.value=amount;uniforms.wetAge.value=wetAge;uniforms.guideStrength.value=enabled?.17:.075;}
 function down(ndc,camera){if(active||paused||!enabled||completed||hasCommit&&!allowRepeat)return false;if(!pickPointerTarget(ndc,camera))return false;active=contactValid=true;heldSeconds=0;wetAge=0;amount=valueAt(0);current=[[.5,.5]];samples=1;fadeAge=null;uniforms.visibility.value=1;sync();return true;}
 function move(ndc,camera){if(!active||paused)return false;contactValid=!!pick(ndc,camera,viewport);samples++;return true;}
 function worldPoint(){root.updateWorldMatrix(true,false);return root.getWorldPosition(V()).toArray();}
 function up(){if(!active)return false;if(paused||!contactValid||heldSeconds+1e-6<minimumHoldSeconds){cancel();return false;}active=contactValid=false;current=null;hasCommit=true;committedAmount=amount;committedWetAge=wetAge;commits.push({id,amount,weight:heldSeconds+1e-6>=heavyHoldSeconds?'heavy':'light',heldSeconds,worldPoint:worldPoint()});sync();return true;}
 function cancel(){if(!active)return false;active=contactValid=false;current=null;cancelCount++;heldSeconds=0;if(hasCommit){amount=committedAmount;wetAge=committedWetAge;}else{amount=0;wetAge=0;}sync();return true;}
 function update(dt,{paused:framePaused=false}={}){
  if(paused||framePaused||!Number.isFinite(dt)||dt<=0)return;const step=clamp(dt,0,.10);clock+=step;
  if(active&&contactValid){heldSeconds+=step;amount=valueAt(heldSeconds);wetAge=Math.min(PRESSURE_INK_DEFAULTS.bleedSeconds,wetAge+step);}else if(hasCommit){wetAge=Math.min(PRESSURE_INK_DEFAULTS.bleedSeconds,wetAge+step);committedWetAge=wetAge;}
  if(fadeAge!==null){fadeAge=Math.min(fadeSeconds,fadeAge+step);uniforms.visibility.value=1-T.MathUtils.smootherstep(fadeAge/fadeSeconds,0,1);}
  sync();
 }
 function setEnabled(value){enabled=!!value;sync();}
 function setCompleted(value){if(active)cancel();completed=!!value;}
 function setPaused(value,{cancelActive=true}={}){const next=!!value;if(next&&cancelActive)cancel();paused=next;}
 function fadeOut(seconds=.85){fadeSeconds=Math.max(.05,seconds);fadeAge=0;}
 function takeCommit(){return commits.shift()||null;}
 function reset(){active=contactValid=completed=paused=hasCommit=false;enabled=!!initiallyEnabled;heldSeconds=clock=wetAge=amount=committedAmount=committedWetAge=samples=cancelCount=0;current=null;fadeAge=null;fadeSeconds=0;commits.length=0;uniforms.visibility.value=1;sync();}
 function getRect(camera){if(!camera)return null;camera.updateMatrixWorld(true);root.updateWorldMatrix(true,true);const project=(u,v)=>{const q=V((u-.5)*width,(.5-v)*height,.012).applyMatrix4(root.matrixWorld).project(camera);return {x:q.x,y:q.y,z:q.z};},centre=project(.5,.5),corners=[[0,0],[1,0],[0,1],[1,1]].map(([u,v])=>project(u,v));return {id,kind:'spatial-gesture',mode:'brush-pressure-dot',pressure:true,showProgress:false,visualFeedbackOnly:true,brush:true,word:'',label,hint,x:centre.x,y:centre.y,centre,halfWidth:Math.max(...corners.map(p=>Math.abs(p.x-centre.x))),halfHeight:Math.max(...corners.map(p=>Math.abs(p.y-centre.y))),worldPosition:worldPoint(),start:centre,current:centre,end:centre,guide:[centre],guideNDC:[centre],strokes:[],strokeCount:0,recognized:[],progress:hasCommit?1:0,amount,heldSeconds,enabled:enabled&&!paused&&!completed&&uniforms.visibility.value>.002&&(allowRepeat||!hasCommit),completed,visible:root.visible&&uniforms.visibility.value>.002,hitHalo,pickPriority,minimumHoldSeconds,heavyHoldSeconds};}
 sync();return {id,root,mesh,material,uniforms,state:{get current(){return current;},get waiting(){return false;},cancel},down,move,up,cancel,update,setEnabled,setCompleted,setPaused,fadeOut,takeCommit,reset,getRect,setViewport,pickPointerTarget,pointerDown:down,pointerMove:move,pointerUp:up,pointerCancel:cancel,get active(){return active;},get ready(){return hasCommit&&!active;},get enabled(){return enabled&&!paused;},get completed(){return completed;},get amount(){return amount;},get stats(){return {id,interaction:'pressure-ink-dot',active,contactValid,paused,enabled,completed,heldSeconds,amount,committedAmount,hasCommit,queuedCommits:commits.length,clock,wetAge,visibility:uniforms.visibility.value,samples,cancelCount,particles:0,strokeCount:0,worldPoint:worldPoint(),visualFeedback:'area-density-capillary-edge',releaseRequired:true,pickPriority};}};
}
