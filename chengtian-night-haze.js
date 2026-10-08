// The mist lives at authored world positions, rather than on a screen overlay.
// A small bounded ray march integrates an advected, irregular density field.
// It floats behind the eaves and wall tops. There is no ground-level smoke.
const VERTEX=`
varying vec3 hazeLocal;
void main(){
 hazeLocal=position;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`;

const FRAGMENT=`
uniform mat4 hazeWorld,hazeInverse;
uniform vec3 hazeWind,hazeTint;
uniform float hazeTime,hazeDensity,hazeSeed,hazeMaximum;
varying vec3 hazeLocal;
float hHash(vec3 p){
 p=fract(p*vec3(.1031,.1030,.0973));
 p+=dot(p,p.yzx+33.33);
 return fract((p.x+p.y)*p.z);
}
float hNoise(vec3 p){
 vec3 a=floor(p),b=fract(p);b=b*b*(3.-2.*b);
 return mix(mix(mix(hHash(a),hHash(a+vec3(1.,0.,0.)),b.x),
                mix(hHash(a+vec3(0.,1.,0.)),hHash(a+vec3(1.,1.,0.)),b.x),b.y),
            mix(mix(hHash(a+vec3(0.,0.,1.)),hHash(a+vec3(1.,0.,1.)),b.x),
                mix(hHash(a+vec3(0.,1.,1.)),hHash(a+vec3(1.,1.,1.)),b.x),b.y),b.z);
}
float hFbm(vec3 p){
 float f=.55*hNoise(p);
 p=vec3(p.z+p.y*.17,p.x-p.z*.13,p.y+p.x*.21)*2.03+vec3(13.2,5.7,9.1);
 f+=.29*hNoise(p);
 p=vec3(p.y-p.x*.11,p.z+p.y*.23,p.x-p.z*.19)*2.09+vec3(7.1,17.3,3.6);
 return f+.16*hNoise(p);
}
float hBox(vec2 p,vec2 lo,vec2 hi,float softness){
 vec2 enter=smoothstep(lo-vec2(softness),lo+vec2(softness),p);
 vec2 leave=1.-smoothstep(hi-vec2(softness),hi+vec2(softness),p);
 return enter.x*enter.y*leave.x*leave.y;
}
float hClearance(vec3 world){
 // Low indoor mist would obscure the original paper and the way out.
 float study=hBox(world.xz,vec2(-6.7,-4.4),vec2(5.8,-1.),.4)
             *(1.-smoothstep(2.3,3.05,world.y));
 float courtyard=hBox(world.xz,vec2(-3.2,.15),vec2(5.75,9.1),.85)
                 *(1.-smoothstep(2.2,3.6,world.y));
 float exitDoor=hBox(world.xz,vec2(-1.3,-1.7),vec2(2.05,.6),.28)
                *(1.-smoothstep(2.65,3.3,world.y));
 float friendDoor=hBox(world.xz,vec2(5.8,.9),vec2(6.85,3.3),.25)
                  *(1.-smoothstep(2.6,3.35,world.y));
 return (1.-study)*(1.-courtyard*.76)*(1.-exitDoor)*(1.-friendDoor);
}
float hDensity(vec3 local,vec3 world){
 if(world.y<2.4)return 0.;
 vec3 p=(world-hazeWind)*vec3(.39,.53,.39)+vec3(hazeSeed*.83,hazeSeed*.19,hazeSeed*.41);
 vec3 warp=vec3(hNoise(p*.63+vec3(4.1,1.3,7.2)),
                hNoise(p*.59+vec3(1.7,8.2,2.5)),
                hNoise(p*.67+vec3(7.9,3.6,5.4)))-.5;
 float clouds=hFbm(p+warp*.95+vec3(0.,hazeTime*.008,0.));
 float shape=length(local*2.);
 float soft=(1.-smoothstep(.65,1.015,shape))*exp(-shape*shape*1.25);
 float broken=smoothstep(.24,.73,clouds);
 return soft*broken*hClearance(world);
}
void main(){
 vec3 eye=(hazeInverse*vec4(cameraPosition,1.)).xyz;
 vec3 ray=normalize(hazeLocal-eye);
 // A finite safe denominator works with WebGL 1 / GLSL ES 1.00 as well.
 vec3 inverseRay=sign(ray+vec3(.000001))/max(abs(ray),vec3(.000001));
 vec3 ta=(-.5-eye)*inverseRay,tb=(.5-eye)*inverseRay;
 vec3 nearAxis=min(ta,tb),farAxis=max(ta,tb);
 float start=max(max(nearAxis.x,nearAxis.y),nearAxis.z);
 float stop=min(min(farAxis.x,farAxis.y),farAxis.z);
 start=max(start,0.);if(stop<=start)discard;
 vec3 first=eye+ray*start,last=eye+ray*stop;
 vec3 worldFirst=(hazeWorld*vec4(first,1.)).xyz;
 vec3 worldLast=(hazeWorld*vec4(last,1.)).xyz;
 float worldStep=length(worldLast-worldFirst)/10.;
 float opticalDepth=0.;
 for(int i=0;i<10;i++){
  float along=(float(i)+.5)/10.;
  vec3 local=mix(first,last,along);
  vec3 world=(hazeWorld*vec4(local,1.)).xyz;
  opticalDepth+=hDensity(local,world)*worldStep*hazeDensity;
 }
 float alpha=min(1.-exp(-opticalDepth),hazeMaximum);
 if(alpha<.0008)discard;
 vec3 worldRay=normalize(worldLast-worldFirst);
 float moonFacing=pow(max(dot(-worldRay,normalize(vec3(-14.,23.,9.))),0.),3.);
 vec3 color=hazeTint+vec3(.016,.024,.032)*moonFacing;
 gl_FragColor=vec4(color,alpha);
 #include <colorspace_fragment>
}`;

const LAYERS=Object.freeze([
 {id:'rear-high',label:'远墙上缘间淡云',position:[1.4,3.7,-5.35],size:[16.6,2.4,2.4],angle:.012,density:.085,seed:116.9},
 {id:'west-eaves',label:'西廊屋檐后浮云',position:[-5.5,3.55,4.15],size:[4.2,2.2,8.4],angle:-.04,density:.080,seed:142.3},
 {id:'east-eaves',label:'寻友廊亭檐后淡云',position:[9.85,3.65,4.95],size:[6,2.1,4.2],angle:.04,density:.075,seed:165.8},
 {id:'study-eaves',label:'书斋屋脊上方轻云',position:[-.5,4.3,-2.55],size:[14.4,1.8,4.2],angle:0,density:.070,seed:183.4},
 {id:'east-wall-high',label:'东墙上缘远处轻云',position:[12.6,4.3,2.9],size:[3.5,3.4,9.5],angle:.018,density:.090,seed:209.1}
]);

/** No textures, sprites, particles or screen-space veil are used. The caller
 * should disable its previous simple fog cards before adding this module.
 * Pass dt=0 during pause / document reading to keep the density field still. */
export function createChengtianNightHaze({THREE,root}={}){
 if(!THREE?.ShaderMaterial||!root?.isObject3D)throw new TypeError('夜院薄雾需要 THREE 和实体场景 root。');
 const T=THREE,group=new T.Group(),geometry=new T.BoxGeometry(1,1,1),wind=new T.Vector3(),velocity=new T.Vector3(.085,0,-.042),meshes=[];
 group.name='承天寺夜院 · 随风流动的空间薄雾';root.add(group);
 let simulationTime=0,previousTime=null,frames=0,disposed=false;
 for(const layer of LAYERS){
  const uniforms={hazeWorld:{value:new T.Matrix4()},hazeInverse:{value:new T.Matrix4()},hazeWind:{value:wind},hazeTint:{value:new T.Color(0x8299af)},hazeTime:{value:0},hazeDensity:{value:layer.density},hazeSeed:{value:layer.seed},hazeMaximum:{value:.10}};
  const material=new T.ShaderMaterial({uniforms,vertexShader:VERTEX,fragmentShader:FRAGMENT,transparent:true,depthTest:true,depthWrite:false,side:T.FrontSide,blending:T.NormalBlending,fog:false,toneMapped:false});
  const mesh=new T.Mesh(geometry,material);mesh.name=layer.label;mesh.position.fromArray(layer.position);mesh.scale.fromArray(layer.size);mesh.rotation.y=layer.angle;mesh.castShadow=mesh.receiveShadow=false;mesh.renderOrder=1.15;mesh.userData.chengtianHaze=true;mesh.userData.hazeLayer=layer.id;
  // These translucent volume bounds must not steal a ground or door click.
  mesh.raycast=()=>{};group.add(mesh);meshes.push(mesh);
 }
 function sync(){group.updateWorldMatrix(true,true);for(const mesh of meshes){const u=mesh.material.uniforms;u.hazeWorld.value.copy(mesh.matrixWorld);u.hazeInverse.value.copy(mesh.matrixWorld).invert();u.hazeTime.value=simulationTime;}}
 function update(t,dt){
  if(disposed)return;
  const delta=Number.isFinite(dt)?Math.max(0,Math.min(.12,dt)):previousTime===null?0:Math.max(0,Math.min(.12,Number(t)-previousTime));
  if(Number.isFinite(t))previousTime=t;
  if(delta>0){simulationTime+=delta;wind.copy(velocity).multiplyScalar(simulationTime);frames++;}
  sync();
 }
 function reset(){simulationTime=frames=0;previousTime=null;wind.set(0,0,0);sync();}
 function dispose(){if(disposed)return;disposed=true;root.remove(group);for(const mesh of meshes)mesh.material.dispose();geometry.dispose();}
 const stats={mode:'world-space-eaves-clouds',layers:LAYERS.length,rayMarchSteps:10,drawCalls:LAYERS.length,triangles:LAYERS.length*12,textures:0,particles:0,screenOverlay:false,groundMist:false,minimumWorldHeight:2.4,noise:'three-octave value noise with domain warp',flow:'world-space wind advection',windVelocity:velocity.toArray(),alphaCeilingPerVolume:.10,densityGain:1,protectedAreas:['entire ground below 2.4m','study below eaves','wide exit','friend doorway','central moonlit paving'],layerBounds:LAYERS.map(layer=>({id:layer.id,position:[...layer.position],size:[...layer.size],density:layer.density}))};
 Object.defineProperties(stats,{simulationTime:{enumerable:true,get:()=>simulationTime},windOffset:{enumerable:true,get:()=>wind.toArray()},updatedFrames:{enumerable:true,get:()=>frames},flowDistance:{enumerable:true,get:()=>wind.length()},pausedSafe:{enumerable:true,get:()=>true},disposed:{enumerable:true,get:()=>disposed}});
 reset();return{meshes,update,stats,reset,dispose,group};
}
