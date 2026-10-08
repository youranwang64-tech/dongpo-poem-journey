import * as T from './vendor/three.module.js';
const V=(x,y,z)=>new T.Vector3(x,y,z);

// The two routes share one inlet. Their sloping stone beds and moving water
// make the destination visible before the player commits to opening the gate.
export function createDwellingWaterBranches(parent){
 const paths={
  return:new T.CatmullRomCurve3([V(2.7,.034,4.36),V(1.84,.043,4.70),V(1.22,.054,4.32),V(.62,.071,3.57),V(.10,.085,3.22)],false,'centripetal'),
  field:new T.CatmullRomCurve3([V(2.7,.033,4.36),V(3.62,.019,4.93),V(4.00,.003,5.70),V(4.88,-.018,6.67),V(5.56,-.035,7.64)],false,'centripetal')
 };
 const root=new T.Group();root.name='闸后两条分叉水渠';parent.add(root);
 const stone=new T.MeshStandardMaterial({color:0x798774,roughness:1}),bed=new T.MeshStandardMaterial({color:0x465b48,roughness:1});
 const branches={};
 for(const [id,path]of Object.entries(paths)){
  const positions=[],uv=[],indices=[],left=[],right=[],steps=48,width=.31;
  for(let i=0;i<=steps;i++){
   const t=i/steps,p=path.getPointAt(t),tangent=path.getTangentAt(t),normal=V(tangent.z,0,-tangent.x).normalize().multiplyScalar(width/2);
   for(const sign of [-1,1]){const q=p.clone().addScaledVector(normal,sign);positions.push(...q.toArray());uv.push(sign===-1?0:1,t);}
   left.push(p.clone().addScaledVector(normal,-1.25).add(V(0,.034,0)));right.push(p.clone().addScaledVector(normal,1.25).add(V(0,.034,0)));
   if(i<steps){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const floor=new T.Mesh(geometry,bed);floor.name=id==='return'?'转回院内石路的浅渠':'沿田埂下降的外渠';floor.receiveShadow=true;root.add(floor);
  for(const points of [left,right]){const bank=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),48,.046,5,false),stone);bank.name='可辨坡向的石渠边_'+id;bank.castShadow=bank.receiveShadow=true;root.add(bank);}
  const uniforms={time:{value:0},flow:{value:0},preview:{value:0}};
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms,
   vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'varying vec2 p;uniform float time,flow,preview;void main(){float edge=sin(p.x*3.14159265);float ripple=pow(max(0.,sin(p.y*48.-time*4.4)),10.);float moving=flow*.48+preview*ripple*.24;vec3 color=mix(vec3(.42,.55,.43),vec3(.77,.86,.70),ripple*.7);gl_FragColor=vec4(color,edge*moving);}'
  });
  const water=new T.Mesh(geometry,material);water.position.y=.011;water.name='可观察水流方向_'+id;water.renderOrder=2;root.add(water);
  // A few stones lower toward the field make the slope readable at a distance.
  if(id==='field')for(let i=1;i<=4;i++){const p=path.getPointAt(i/5),stoneMesh=new T.Mesh(new T.BoxGeometry(.34,.16,.17),stone);stoneMesh.position.copy(p).add(V(0,-.07,0));stoneMesh.rotation.y=Math.atan2(path.getTangentAt(i/5).x,path.getTangentAt(i/5).z);stoneMesh.receiveShadow=true;root.add(stoneMesh);}
  branches[id]={path,floor,water,uniforms};
 }
 return {root,branches,update(time,{routeId=null,flow=0,preview=true}={}){for(const [id,branch]of Object.entries(branches)){branch.uniforms.time.value=time;branch.uniforms.preview.value=preview?.52:0;branch.uniforms.flow.value=id===routeId?flow:0;}},reset(){this.update(0);}};
}
