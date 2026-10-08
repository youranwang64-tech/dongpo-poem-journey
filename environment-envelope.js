import * as T from './vendor/three.module.js';

// Bounded mist lives at a wall end or under an eave. It has no rectangular
// billboard silhouette and leaves the centre of the walking route unobscured.
const vertexShader=`
varying vec3 worldPosition;
void main(){
  worldPosition=(modelMatrix*vec4(position,1.)).xyz;
  gl_Position=projectionMatrix*viewMatrix*vec4(worldPosition,1.);
}`;
const fragmentShader=`
varying vec3 worldPosition;
uniform vec3 centre,extent,tint;
uniform float time,density,phase,flow,clarity;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
void main(){
  vec3 ray=normalize(worldPosition-cameraPosition);
  vec3 origin=(cameraPosition-centre)/extent,direction=ray/extent;
  bool inside=dot(origin,origin)<1.;
  if((inside&&gl_FrontFacing)||(!inside&&!gl_FrontFacing))discard;
  float a=dot(direction,direction),b=dot(origin,direction);
  float c=dot(origin,origin)-1.,disc=b*b-a*c;
  if(disc<=0.)discard;
  float start=max(0.,(-b-sqrt(disc))/a),end=(-b+sqrt(disc))/a;
  float stepSize=min(42.,end-start)/6.,opticalDepth=0.;
  for(int i=0;i<6;i++){
    vec3 p=cameraPosition+ray*(start+(float(i)+.5)*stepSize);
    vec3 local=(p-centre)/extent;
    float boundary=pow(max(0.,1.-dot(local,local)),2.15);
    vec2 drift=vec2(time*.025*flow+phase,-time*.013*flow-phase);
    float broad=noise(p.xz*.15+drift);
    float wisp=noise(vec2(p.x*.36+p.y*.83,p.z*.32-p.y*.62)+drift*1.8);
    float cloud=.07+.66*pow(broad,1.20)+.24*wisp;
    opticalDepth+=boundary*cloud*stepSize;
  }
  float alpha=min(.67,1.-exp(-opticalDepth*density*.17))*(1.-clarity*.18);
  if(alpha<.002)discard;
  // The variation changes thickness rather than drawing bright smoke blobs.
  gl_FragColor=vec4(tint,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createMistEnvelopes(parent,options={}){
  const group=new T.Group();group.name='Building edge mist';parent.add(group);
  const geometry=new T.SphereGeometry(1,24,16),volumes=[];
  const defaultColor=options.color??0x84998c;
  function setEnvelopes(specifications=[]){
    for(const {mesh} of volumes){group.remove(mesh);mesh.material.dispose();}
    volumes.length=0;
    specifications.forEach((spec,i)=>{
      if(!Array.isArray(spec.center)||!Array.isArray(spec.size)||spec.size.some(v=>!Number.isFinite(v)||v<=0))throw new Error('Mist envelope needs a centre and positive half extents');
      const uniforms={centre:{value:new T.Vector3(...spec.center)},extent:{value:new T.Vector3(...spec.size)},tint:{value:new T.Color(spec.color??defaultColor)},time:{value:0},density:{value:spec.density??.35},phase:{value:i*1.731+(options.seed??1)*.037},flow:{value:spec.flow??1},clarity:{value:0}};
      const material=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide});
      const mesh=new T.Mesh(geometry,material);mesh.name=spec.id??`Edge mist ${i+1}`;
      mesh.position.fromArray(spec.center);mesh.scale.fromArray(spec.size);mesh.renderOrder=3;
      mesh.userData.envelope={...spec,center:[...spec.center],size:[...spec.size]};group.add(mesh);volumes.push({mesh,uniforms});
    });
  }
  function update(time,clarity=0){for(const volume of volumes){volume.uniforms.time.value=time;volume.uniforms.clarity.value=T.MathUtils.clamp(clarity,0,1);}}
  function dispose(){for(const {mesh} of volumes)mesh.material.dispose();geometry.dispose();parent.remove(group);}
  setEnvelopes(options.envelopes);
  return {group,volumes,setEnvelopes,update,dispose};
}
