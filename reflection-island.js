import * as T from './vendor/three.module.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const CENTER=V(12.4,0,8.5),SEAT=[13,.15,8.1],SPAWN=[9.3,.15,9.8];
const SHOT={position:[0,17,39],lookAt:[0,3,0],fov:35};
const EVENTS=[
 {at:1,text:'心似已灰之木',left:true},
 {at:8,text:'身如不系之舟',left:true},
 {at:15,text:'问汝平生功业',left:true},
 {at:22,text:'黄州惠州儋州',left:true},
 {at:35,text:'此心安处是吾乡',left:true,storyEvent:'home',holdSeconds:120}
];
const clamp=T.MathUtils.clamp,smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
function random(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function radiusAt(a){return 1+.072*Math.sin(a*3+.35)+.047*Math.cos(a*5-1.2)+.029*Math.sin(a*9+2.0);}
function islandCoordinate(x,z){const xx=(x-CENTER.x)/4.1,zz=(z-CENTER.z)/2.72,a=Math.atan2(zz,xx);return {a,r:Math.hypot(xx,zz)/radiusAt(a)};}

let rockMap;
function stoneTexture(){
 if(rockMap)return rockMap;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d'),r=random(987);
 ctx.fillStyle='#aaa9a0';ctx.fillRect(0,0,512,512);
 for(let i=0;i<60;i++){const x=r()*512,y=r()*512,rad=8+r()*93,g=ctx.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,`rgba(62,65,58,${.02+r()*.09})`);g.addColorStop(1,'rgba(62,65,58,0)');ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);}
 for(let i=0;i<19500;i++){const n=65+r()*160;ctx.fillStyle=`rgba(${n},${n},${n-3},${.035+r()*.08})`;ctx.fillRect(r()*512,r()*512,.3+r()*1.6,.4+r()*2.0);}
 for(let i=0;i<27;i++){ctx.strokeStyle=`rgba(51,57,50,${.06+r()*.10})`;ctx.lineWidth=.30+r()*.65;let x=r()*512,y=r()*512;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<8;j++){x+=4+r()*11;y+=-4+r()*17;ctx.lineTo(x,y);}ctx.stroke();}
 rockMap=new T.CanvasTexture(canvas);rockMap.colorSpace=T.SRGBColorSpace;rockMap.wrapS=rockMap.wrapT=T.RepeatWrapping;rockMap.anisotropy=4;return rockMap;
}

function makeIsland(scene,root){
 const p=[],uv=[],indices=[],rings=12,sides=88;
 for(let j=0;j<=rings;j++)for(let i=0;i<=sides;i++){
  const a=i/sides*Math.PI*2,u=j/rings,outline=radiusAt(a),x=Math.cos(a)*4.1*outline*u,z=Math.sin(a)*2.72*outline*u;
  // The walkable rock shelf is flat; only its weathered shore drops into the water.
  const edge=smooth(.88,1,u),y=.15-edge*.24+edge*.035*Math.sin(a*7+u*13);
  p.push(CENTER.x+x,y,CENTER.z+z);uv.push(x/5,z/5);
 }
 for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){const n=j*(sides+1)+i;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const material=new T.MeshStandardMaterial({color:0x9a9e95,map:stoneTexture(),bumpMap:stoneTexture(),bumpScale:.037,roughness:.92});
 const island=new T.Mesh(geo,material);island.name='QuietIslandRockShelf';island.castShadow=true;island.receiveShadow=true;root.add(island);
 const sp=[],suv=[],si=[];
 for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,r=radiusAt(a);for(let j=0;j<2;j++){const u=1+j*.16;sp.push(CENTER.x+Math.cos(a)*4.1*r*u,-.086-j*.020,CENTER.z+Math.sin(a)*2.72*r*u);suv.push(i/sides,j);}}
 for(let i=0;i<sides;i++){const n=i*2;si.push(n,n+1,n+2,n+1,n+3,n+2);}
 const shoalGeo=new T.BufferGeometry();shoalGeo.setAttribute('position',new T.Float32BufferAttribute(sp,3));shoalGeo.setAttribute('uv',new T.Float32BufferAttribute(suv,2));shoalGeo.setIndex(si);
 const shoal=new T.Mesh(shoalGeo,new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float alpha=pow(1.-vUv.y,2.)*.15*(.7+.3*sin(vUv.x*29.));gl_FragColor=vec4(.45,.47,.44,alpha);}'}));root.add(shoal);
 return island;
}

function rock(root,x,y,z,sx,sy,sz,seed=7){
 const g=new T.SphereGeometry(1,13,9),p=g.attributes.position,r=random(seed);
 const phases=[r()*6.28,r()*6.28];for(let i=0;i<p.count;i++){const a=V().fromBufferAttribute(p,i),n=1+.115*Math.sin(a.x*4.5+a.y*6.8+a.z*3+phases[0])+.042*Math.cos(a.z*12-a.x*6+phases[1]);a.multiplyScalar(n);p.setXYZ(i,a.x,a.y,a.z);}g.computeVertexNormals();
 const o=new T.Mesh(g,new T.MeshStandardMaterial({color:0x7d8279,map:stoneTexture(),bumpMap:stoneTexture(),bumpScale:.036,roughness:.96}));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(-.06,.17+seed*.21,.08);o.castShadow=o.receiveShadow=true;root.add(o);return o;
}

function makePine(root){
 const tree=new T.Group();tree.name='IslandWeatheredPine';tree.position.set(14.75,.15,7.0);root.add(tree);
 const wood=new T.MeshStandardMaterial({color:0x555a51,roughness:1,map:stoneTexture(),bumpMap:stoneTexture(),bumpScale:.026});
 function branch(points,radius){const curve=new T.CatmullRomCurve3(points.map(p=>V(...p))),g=new T.TubeGeometry(curve,18,radius,6,false),p=g.attributes.position;for(let i=0;i<p.count;i++){const u=Math.floor(i/7)/18,center=curve.getPointAt(u),v=V().fromBufferAttribute(p,i).sub(center).multiplyScalar(1-u*.88).add(center);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();const o=new T.Mesh(g,wood);o.castShadow=o.receiveShadow=true;tree.add(o);}
 branch([[0,0,0],[-.10,.68,.04],[-.38,1.34,-.04],[-.47,2.07,.06],[-.91,2.66,.08]],.14);
 branch([[-.28,1.10,0],[.18,1.48,-.02],[.84,1.51,-.07],[1.48,1.69,-.14]],.065);
 branch([[-.42,1.61,.03],[-.89,1.80,.12],[-1.57,1.77,.10],[-2.02,2.03,.04]],.058);
 branch([[-.56,2.17,.07],[-.18,2.39,.02],[.40,2.45,-.10],[.80,2.71,-.20]],.050);
 branch([[-.09,.46,0],[.32,.74,.25],[.76,.85,.45]],.047);
 for(const [origin,direction] of [
  [[.79,1.51,-.07],[.37,.35,.11]],[[1.19,1.62,-.11],[.17,-.19,-.20]],
  [[-1.37,1.77,.1],[-.26,.37,.06]],[[-1.72,1.86,.07],[-.15,-.21,.22]],
  [[.27,2.44,-.07],[.13,.33,.05]],[[-.80,2.52,.08],[-.35,.16,.13]],
  [[.53,.80,.37],[.19,.27,.03]]
 ]){branch([origin,origin.map((v,i)=>v+direction[i]*.6),origin.map((v,i)=>v+direction[i])],.025);}
 for(const [x,z] of [[.4,.1],[-.5,.18],[-.3,-.35]])branch([[0,.10,0],[x*.7,.01,z*.7],[x,.0,z]],.06);
 return tree;
}

function islandWorld(){
 const scene=new T.Scene(),root=new T.Group();scene.add(root);scene.background=new T.Color(0xf7f6f1);scene.fog=new T.FogExp2(scene.background,.007);scene.userData.saturation=.12;
 scene.add(new T.HemisphereLight(0xfffef9,0xa6b0a5,1.0));const light=new T.DirectionalLight(0xfffdf4,2.3);light.position.set(3,16,19);light.target.position.copy(CENTER);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:45});light.shadow.bias=-.0002;light.shadow.normalBias=.024;light.shadow.radius=3;scene.add(light,light.target);
 const fill=new T.DirectionalLight(0xdee5df,.35);fill.position.set(20,5,-9);scene.add(fill);
 const waterMaterial=new T.ShaderMaterial({uniforms:{time:{value:0},island:{value:CENTER}},vertexShader:'varying vec3 wp;void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}',fragmentShader:`
  uniform float time;uniform vec3 island;varying vec3 wp;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
  void main(){vec2 p=wp.xz,adv=vec2(time*.018,-time*.021),bend=vec2(noise(p*.17+adv*.21),noise(p*.11+vec2(7.,2.)))-.5;
   float field=noise((p+bend*2.4)*vec2(.27,1.55)+adv),crossing=noise((mat2(.91,-.41,.41,.91)*p)*vec2(.20,.88)-adv*.51);
   float ink=exp(-pow((field-.52)*57.,2.))*smoothstep(.40,.75,crossing),shore=exp(-pow((length((p-island.xz)/vec2(4.6,3.0))-1.05)*2.3,2.));
   float grain=(hash(floor(p*170.))-.5)*.003,broad=noise(p*.025)*.0018;
   vec3 col=vec3(.927,.925,.910)+grain+broad-vec3(ink*(.005+shore*.022));
   float farFade=smoothstep(38.,120.,distance(p,cameraPosition.xz));col=mix(col,vec3(.931,.928,.917),farFade);
   gl_FragColor=vec4(col,1.);
  }`});
 const water=new T.Mesh(new T.PlaneGeometry(480,480).rotateX(-Math.PI/2),waterMaterial);water.position.y=-.12;water.receiveShadow=false;scene.add(water);
 const walkSurface=makeIsland(scene,root);
 rock(root,13.04,.258,8.06,.78,.17,.53,31); // A low, broad stone seat, not a pedestal.
 for(const [x,y,z,sx,sy,sz,seed] of [[15.9,.31,7.4,.82,.44,.69,13],[16.15,.11,8.4,.49,.24,.70,72],[11.8,.18,6.6,.72,.29,.39,19],[10.9,.09,10.6,.47,.18,.30,21],[15.0,.08,10.7,.41,.17,.49,45]])rock(root,x,y,z,sx,sy,sz,seed);
 makePine(root);
 const seatRing=new T.Mesh(new T.RingGeometry(.79,.803,64),new T.MeshBasicMaterial({color:0x7b8579,transparent:true,opacity:.26,depthWrite:false,side:T.DoubleSide}));seatRing.rotation.x=-Math.PI/2;seatRing.position.set(SEAT[0],.168,SEAT[2]);root.add(seatRing);
 return {scene,root,waterMaterial,seatRing,walkSurface};
}

export function buildReflectionIsland(){
 const world=islandWorld();let sitting=false,poetryAge=0,lastTime=null;
 const heightAt=(x,z)=>{const q=islandCoordinate(x,z),edge=smooth(.88,1,q.r);return .15-edge*.24+edge*.035*Math.sin(q.a*7+q.r*13);};
 function canMove(from,to){if(sitting)return Math.hypot(to.x-from.x,to.z-from.z)<.001;if(islandCoordinate(to.x,to.z).r>=.91)return false;for(const [x,z,rx,rz] of [[15.9,7.4,1.0,.86],[16.15,8.4,.67,.85],[11.8,6.6,.85,.57],[14.75,7.0,.24,.24]])if(Math.hypot((to.x-x)/rx,(to.z-z)/rz)<1)return false;return true;}
 function interact(id){if(id!=='sit')return false;sitting=true;poetryAge=0;world.seatRing.visible=false;return true;}
 function update(t,playerPosition,dt){const delta=dt===undefined?(lastTime===null?0:clamp(t-lastTime,0,.06)):clamp(dt,0,.06);lastTime=t;world.waterMaterial.uniforms.time.value=t;if(sitting)poetryAge+=delta;world.seatRing.material.opacity=.16+Math.sin(t*.8)*.035;}
 function reset(){sitting=false;poetryAge=0;lastTime=null;world.waterMaterial.uniforms.time.value=0;world.seatRing.visible=true;}
 return {
  scene:world.scene,root:world.root,paper:true,cinematic:false,reflection:true,
  fixedCamera:{...SHOT},spawn:[...SPAWN],sitPosition:[...SEAT],sitRotation:.95,
  bounds:{minX:8.15,maxX:16.75,minZ:5.65,maxZ:11.40},heightAt,walkSurfaces:[world.walkSurface],
  targets:[{id:'sit',kind:'walk',position:[...SEAT],radius:.4,label:'岛边石座',hint:'走到岛边的光圈，坐下回望这一路。'}],
  duration:30,verseEvents:EVENTS.map(e=>({...e})),ready:Promise.resolve(),
  interact,update,reset,canMove,get sitting(){return sitting;},get poetryAge(){return poetryAge;}
 };
}

export function buildIslandEnding(){
 const world=islandWorld();world.seatRing.visible=false;
 const update=(t,response=0)=>world.waterMaterial.uniforms.time.value=t;
 return {
  scene:world.scene,root:world.root,paper:true,cinematic:true,showTraveler:true,
  travelerPosition:[...SEAT],sitPosition:[...SEAT],sit:true,sitRotation:.95,
  camera:{...SHOT},fixedCamera:{...SHOT},duration:12,
  verseEvents:[{at:1,text:'此心安处是吾乡',left:true}],ready:Promise.resolve(),update,reset:()=>update(0)
 };
}
