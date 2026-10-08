import * as T from './vendor/three.module.js';
import {addBamboo,addTree,addBroadleaf} from './plants.js';
import {createAtmosphere} from './atmosphere.js';
import {buildEarlyArchitecture} from './architecture-early.js';
import {buildLateArchitecture} from './architecture-late.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const colors={wood:0x747a6d,wall:0x929a8e,roof:0x485248,stone:0x737e6f,paper:0xc2bea4,leaf:0x263b30};
function mat(c,extra={}){return new T.MeshStandardMaterial({color:c,roughness:.96,...extra});}
const textures={};
function surfaceTexture(kind){
 if(textures[kind])return textures[kind];
 const c=document.createElement('canvas');c.width=c.height=512;const cx=c.getContext('2d'),r=rng(kind==='ground'?971:kind==='wood'?992:141);
 cx.fillStyle=kind==='ground'?'#5b605a':kind==='wood'?'#6c665b':'#96998e';cx.fillRect(0,0,512,512);
 if(kind==='ground')for(let i=0;i<95;i++){const x=r()*512,y=r()*512,radius=12+r()*90,g=cx.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,`rgba(${i%3?18:110},${i%3?24:118},${i%3?20:111},${.2+r()*.29})`);g.addColorStop(1,'rgba(15,20,15,0)');cx.fillStyle=g;cx.fillRect(x-radius,y-radius,radius*2,radius*2);}
 for(let i=0;i<22000;i++){const n=40+r()*155;cx.fillStyle=`rgba(${n},${n},${n},${.04+r()*.11})`;const w=kind==='wood'?1+r()*2:2+r()*7,h=kind==='wood'?10+r()*90:1+r()*5;cx.fillRect(r()*512,r()*512,w,h);}
 if(kind==='ground')for(let i=0;i<220;i++){cx.strokeStyle=`rgba(20,25,20,${r()*.15})`;cx.lineWidth=.4+r();cx.beginPath();const x=r()*512,y=r()*512;cx.moveTo(x,y);cx.lineTo(x+10+r()*45,y-5+r()*9);cx.stroke();}
 const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(kind==='ground'?48:3,kind==='ground'?48:3);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;textures[kind]=tex;return tex;
}
export function buildScene(index){
 const scene=new T.Scene(),root=new T.Group();scene.add(root);const random=rng(51+index*92),dynamic=[],effects=new Map(),effectValues=new Map();
 const pale=index===7,background=new T.Color(pale?0x727b70:index===2?0x3d4640:index===5?0x4a5752:index===4?0x69766d:0x647166);scene.background=background;scene.fog=new T.FogExp2(background,index===2?.026:index===6?.021:.026);
 const sky=new T.HemisphereLight(pale?0xe4e7d9:0xd5e1d7,0x555b4d,pale?1.05:index===2?.83:.96);scene.add(sky);
 const light=new T.DirectionalLight(0xbce1df,index===2?2.25:index===4?2.7:2.35);light.position.set(-9,18,-13);light.target.position.set(0,0,0);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.1,far:70});light.shadow.bias=-.00015;light.shadow.normalBias=.027;light.shadow.radius=2;scene.add(light,light.target);
 const fill=new T.DirectionalLight(0xd7d9c7,index===2?.60:.78);fill.position.set(12,7,9);scene.add(fill);
 const materials=Object.fromEntries(Object.entries(colors).map(([n,c])=>[n,mat(c)]));
 materials.wood.map=surfaceTexture('wood');materials.wood.bumpMap=materials.wood.map;materials.wood.bumpScale=.028;materials.stone.map=surfaceTexture('stone');materials.stone.bumpMap=materials.stone.map;materials.stone.bumpScale=.046;materials.wall.map=surfaceTexture('stone');materials.wall.bumpMap=materials.wall.map;materials.wall.bumpScale=.08;materials.wall.color.set(0x929a8d);materials.roof.color.set(0x414b41);
 function mesh(g,m,p=V(),parent=root){const o=new T.Mesh(g,m);o.position.copy(p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,p,m=materials.wood,parent=root){return mesh(new T.BoxGeometry(w,h,d),m,p,parent);}
 function rod(a,b,r=.05,m=materials.wood,parent=root){const delta=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,delta.length(),7),m,a.clone().add(b).multiplyScalar(.5),parent);o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return o;}
 function ground(w=300,d=300){const g=new T.PlaneGeometry(w,d).rotateX(-Math.PI/2),m=mat(pale?0x969c88:0x8d9687,{map:surfaceTexture('ground'),bumpMap:surfaceTexture('ground'),bumpScale:.025,roughness:index===4?.48:.78,metalness:index===4?.14:.035});mesh(g,m,V(0,-.055,0));}
 function bank(mainland=false){
  // The land continues behind the camera. Only an irregular natural shoreline is visible.
  const nx=55,nz=55,p=[],uv=[],ids=[],edge=v=>mainland?-7.15+Math.sin(v*.31)*.45+Math.sin(v*.13+1)*.40+T.MathUtils.smoothstep(Math.abs(v),3,13)*2.8:-1.95+Math.sin(v*.28)*.48+Math.sin(v*.095+2)*.54;
  for(let a=0;a<=nx;a++)for(let b=0;b<=nz;b++){let x,z;if(mainland){x=-100+a/nx*200;const shore=edge(x);z=shore+b/nz*(125-shore);}else{z=-95+b/nz*220;const shore=edge(z);x=-125+a/nx*(shore+125);}const across=mainland?b/nz:1-a/nx,y=-.044+Math.min(1,across*5)*(.018*Math.sin(x*.15+z*.09)+.012*Math.sin(z*.29));p.push(x,y,z);uv.push(x/300,z/300);}
  for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){const n=a*(nz+1)+b;ids.push(n,n+1,n+nz+1,n+1,n+nz+2,n+nz+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();mesh(g,mat(0x536353,{map:surfaceTexture('ground'),bumpMap:surfaceTexture('ground'),bumpScale:.045,roughness:.85}));
  // A submerged narrow bank softens the join instead of outlining the land with a stone ring.
  const bp=[],bi=[],n=110;for(let i=0;i<=n;i++){const v=mainland?-100+i/n*200:-95+i/n*220,shore=edge(v);for(let k=0;k<2;k++)bp.push(mainland?v:shore+k*.32,-.045-k*.11,mainland?shore-k*.32:v);}for(let i=0;i<n;i++){const q=i*2;bi.push(q,q+2,q+1,q+1,q+2,q+3);}const beach=new T.BufferGeometry();beach.setAttribute('position',new T.Float32BufferAttribute(bp,3));beach.setIndex(bi);beach.computeVertexNormals();mesh(beach,mat(0x27352b,{roughness:.39,metalness:.06,side:T.DoubleSide}));
  const clusters=mainland?[[-4.2,3.8],[3.8,-1.8],[-2.7,-4.4]]:[[-3.4,3],[-4.1,7.5],[-3.6,-1.0]];for(const [cx,cz]of clusters){for(let i=0;i<7;i++){const x=cx+(random()-.5)*1.9,z=cz+(random()-.5)*2.2;rock(x,.06,z,.23+random()*.38,.10+random()*.16,.24+random()*.48);}addBamboo(root,{count:2,bounds:{minX:cx-.3,maxX:cx+.3,minZ:cz+.4,maxZ:cz+.9},seed:Math.round(cx*37+cz*21+815),height:[.75,1.15]});}
  return edge;
 }
 function shore(){bank(true);}
 function roof(x,y,z,w,d,h=.95,parent=root){
  for(const side of [-1,1]){
   const vertices=[],ids=[];const nx=Math.ceil(w*3),nz=8;
   for(let a=0;a<=nx;a++)for(let b=0;b<=nz;b++){const u=b/nz;vertices.push(x+(a/nx-.5)*(w+.9),y+h-u*(h+.32)+u*u*.28+Math.pow(Math.abs(a/nx-.5)*2,6)*u*.13,z+side*u*(d/2+.6));}
   for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){let i=a*(nz+1)+b;if(side===1)ids.push(i,i+1,i+nz+1,i+1,i+nz+2,i+nz+1);else ids.push(i,i+nz+1,i+1,i+1,i+nz+1,i+nz+2);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(ids);g.computeVertexNormals();mesh(g,materials.roof,V(),parent);
   for(let a=0;a<=nx;a+=2){const xx=x+(a/nx-.5)*(w+.9),ps=[];for(let b=0;b<=8;b++){let u=b/8;ps.push(V(xx,y+h-u*(h+.32)+u*u*.28,z+side*u*(d/2+.6)));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(ps),8,.018,3,false),materials.stone,V(),parent);}
  }box(w+.7,.1,.12,V(x,y+h+.08,z),materials.wood,parent);
 }
 function window(x,y,z,w=1,h=1.5,parent=root){box(w,.07,.06,V(x,y+h/2,z),materials.wood,parent);box(w,.07,.06,V(x,y-h/2,z),materials.wood,parent);for(let j=-w/2;j<=w/2+.01;j+=.22)box(.035,h,.07,V(x+j,y,z),materials.wood,parent);for(let k=-h/2;k<=h/2;k+=.3)box(w,.028,.06,V(x,y+k,z),materials.wood,parent);}
 function building(x,z,w=10,d=4,h=3,open=false){
  const g=new T.Group(),passThrough=index===1&&x===0;root.add(g);box(w,.28,d+.8,V(x,passThrough?-.16:.13,z),materials.stone,g);
  if(passThrough){const opening=2.5,doorHeight=3.7,wing=(w-opening)/2;box(w,h,.23,V(x,h/2+.25,z-d/2),materials.wall,g);for(const a of [-1,1]){box(.23,h,d,V(x+a*w/2,h/2+.25,z),materials.wall,g);box(wing,h,.23,V(x+a*(opening/2+wing/2),h/2+.25,z+d/2),materials.wall,g);}box(opening,h-doorHeight,.23,V(x,doorHeight+(h-doorHeight)/2+.25,z+d/2),materials.wall,g);}
  else if(!open)box(w,h,d,V(x,h/2+.25,z),materials.wall,g);else box(w,h,.2,V(x,h/2+.25,z-d/2),materials.wall,g);
  roof(x,h+.25,z,w,d,1.1,g);for(let a=-w/2+.35;a<w/2;a+=w/4){if(!passThrough||Math.abs(a)>1.35)rod(V(x+a,.3,z+d/2),V(x+a,h+.3,z+d/2),.10,materials.wood,g);if(!open&&(!passThrough||Math.abs(a+w/8)>3.1))window(x+a+w/8,h*.6,z+d/2+.12,w/5,1.4,g);}
  if(!open&&!passThrough){box(1.4,2.1,.15,V(x,1.35,z+d/2+.15),materials.wood,g);for(let i=0;i<3;i++)box(2+i*.3,.12,.3,V(x,.2-i*.06,z+d/2+.6+i*.3),materials.stone,g);}
  return g;
 }
 function wall(x,z,w,h=3.5){box(w,h,.68,V(x,h/2,z),materials.wall);box(w+.14,.32,.87,V(x,.13,z),materials.stone);roof(x,h,z,w,.52,.5);}
 function sideWall(x,z,length,h=3){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=Math.PI/2;root.add(g);box(length,h,.68,V(0,h/2,0),materials.wall,g);box(length+.14,.32,.87,V(0,.13,0),materials.stone,g);roof(0,h,0,length,.52,.38,g);return g;}
 function portal(x,z,rotation=0,w=3.25,h=3.3){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rotation;root.add(g);for(const a of [-1,1]){box(.26,h,.29,V(a*w/2,h/2,0),materials.wood,g);box(.65,.28,.60,V(a*w/2,.14,0),materials.stone,g);rod(V(a*w/2,h-.85,0),V(a*(w/2-.55),h-.13,0),.055,materials.wood,g);}box(w+.4,.22,.26,V(0,h-.13,0),materials.wood,g);roof(0,h,0,w+.65,1.3,.55,g);box(w+.12,.07,1.1,V(0,.015,0),materials.stone,g);return g;}
 function gardenPot(x,z,size=.44){const g=new T.Group();g.position.set(x,0,z);root.add(g);const shell=new T.Mesh(new T.CylinderGeometry(size*.78,size*.55,size*1.5,16,1,true),mat(0x4b5144,{side:T.DoubleSide,roughness:1}));shell.position.y=size*.75;shell.castShadow=true;g.add(shell);mesh(new T.CircleGeometry(size*.75,16).rotateX(-Math.PI/2),mat(0x282f23),V(0,size*1.47,0),g);const plant=addBamboo(g,{count:1,bounds:{minX:-.08,maxX:.08,minZ:-.08,maxZ:.08},seed:Math.floor(x*31+z*29+523),height:[size*2.9,size*3.2]});plant.position.y=size*1.42;}
 function bench(x,z,rotation=0){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rotation;root.add(g);box(2.1,.10,.46,V(0,.53,0),materials.wood,g);for(const a of [-.75,.75])box(.13,.48,.37,V(a,.24,0),materials.wood,g);return g;}
 const lanternLights=[];
 function lantern(x,y,z){const m=mat(0xb9a887,{emissive:0xf0c990,emissiveIntensity:.65});box(.33,.50,.33,V(x,y,z),m);for(const a of [-1,1])for(const b of [-1,1])rod(V(x+a*.17,y-.25,z+b*.17),V(x+a*.17,y+.25,z+b*.17),.022);roof(x,y+.25,z,.45,.45,.2);const lamp=new T.PointLight(0xffd6a1,3.8,8,1.7);lamp.position.set(x,y,z);root.add(lamp);lanternLights.push({lamp,m});return lamp;}
 function desk(x,z){box(1.9,.10,.8,V(x,.9,z));for(let a of [-.8,.8])for(let b of [-.3,.3])box(.08,.86,.08,V(x+a,.44,z+b));box(1.25,.018,.54,V(x,.96,z),materials.paper);box(.20,.05,.15,V(x+.67,.965,z),mat(0x222924));for(const a of [-1,1])rod(V(x+a*.63,.983,z-.24),V(x+a*.63,.983,z+.24),.04,materials.paper);}
 function rock(x,y,z,rx=1,ry=.6,rz=1){const geo=new T.SphereGeometry(1,10,7),p=geo.attributes.position;for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),c=p.getZ(i),n=1+.10*Math.sin(a*7+b*9+c*4)+.06*Math.cos(a*15-c*9);p.setXYZ(i,a*n,b*n,c*n);}geo.computeVertexNormals();const o=mesh(geo,materials.stone,V(x,y,z));o.scale.set(rx,ry,rz);o.rotation.set(random()*.3,random()*6.28,random()*.12);return o;}
 function stonePath(side=false,length=22){for(let i=0;i<length;i++){const p=side?V(-10+i*.8,-.013,1+Math.sin(i*.4)*.12):V(Math.sin(i*.5)*.22,-.013,8-i*.85);rock(p.x,p.y,p.z,side?.43:.88,.018,side?.62:.42);}for(let i=0;i<90;i++){const along=-11+random()*24,lateral=1.2+random()*1.1;const p=side?V(along,.015,1+(i%2?1:-1)*lateral):V((i%2?1:-1)*lateral,.015,along);rock(p.x,p.y,p.z,.02+random()*.12,.025+random()*.04,.02+random()*.1);}}
 function cypress(x,z,h=8){return addTree(root,{position:[x,0,z],height:h,rotation:random()*6.28});}
 function bamboo(count,side=false){
  if(side){
   addBamboo(root,{count:Math.round(count*.58),bounds:{minX:-24,maxX:24,minZ:-19,maxZ:-7},seed:552+index,height:[8,13]});
   addBamboo(root,{count:Math.round(count*.28),bounds:{minX:-30,maxX:30,minZ:-39,maxZ:-22},seed:734+index,height:[9,14]});
   addBamboo(root,{count:Math.round(count*.07),bounds:{minX:-16,maxX:-11,minZ:4,maxZ:10},seed:902+index,height:[11,16]});
   addBamboo(root,{count:Math.round(count*.07),bounds:{minX:11,maxX:16,minZ:4,maxZ:10},seed:938+index,height:[11,16]});
  }else addBamboo(root,{count,bounds:{minX:-22,maxX:22,minZ:-32,maxZ:-9},seed:650+index,height:[6,12]});
 }
 function mountains(count=9,near=false){
  // Continuous hill silhouettes replace disconnected cone-shaped peaks.
  for(let layer=0;layer<3;layer++){const p=[],ids=[],nx=90,nz=16,center=-47-layer*21;
   for(let a=0;a<=nx;a++)for(let b=0;b<=nz;b++){const x=-100+a/nx*200,z=center-18+b/nz*36,crest=6+layer*2+Math.sin(x*.067+layer*1.5)*2.5+Math.cos(x*.139-layer)*1.3,bank=near&&index===5?T.MathUtils.smoothstep(Math.abs(x),13,25):1,h=Math.max(0,crest)*Math.exp(-Math.pow((z-center)/15,2))*bank;p.push(x,h-.5,z);}
   for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){const n=a*(nz+1)+b;ids.push(n,n+1,n+nz+1,n+1,n+nz+2,n+nz+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ids);g.computeVertexNormals();mesh(g,mat(new T.Color().setHSL(.34,.055,.17+layer*.045),{roughness:1}));
  }
 }
 function mountainRidge(){const p=[],ids=[],nx=24,nz=70;for(let a=0;a<=nx;a++)for(let b=0;b<=nz;b++){const x=-34+a/nx*29,z=-48+b/nz*82,profile=9+Math.sin(z*.14)*2.1+Math.sin(z*.37+.4)*1.0,height=profile*Math.exp(-Math.pow((x+15)/9,2));p.push(x,height+Math.sin(x*1.1+z*.7)*.16,z);}for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){const n=a*(nz+1)+b;ids.push(n,n+1,n+nz+1,n+1,n+nz+2,n+nz+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ids);g.computeVertexNormals();mesh(g,mat(0x495547,{side:T.DoubleSide}));}
 let water;
 function river(){
  water=new T.ShaderMaterial({fog:true,uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{time:{value:0},pulse:{value:-10},moon:{value:0}}]),vertexShader:`varying vec3 wp;
 #include <fog_pars_vertex>
 void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
 }`,fragmentShader:`varying vec3 wp;uniform float time,pulse,moon;
 #include <fog_pars_fragment>
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}void main(){vec2 p=wp.xz;float fine=noise(vec2(p.x*2.7+time*.11,p.y*6.1-time*.30));float broad=noise(p*.17+vec2(time*.015,time*.008));float broken=noise(p*.63+vec2(time*.023,-time*.05));float light=pow(fine,11.)*broken*.017;float bend=(noise(p*.34+time*.012)-.5)*1.35;float glow=exp(-pow((wp.x-4.+bend)/(.55+abs(wp.z)*.021),2.))*pow(fine,4.)*broken*moon;float ring=exp(-pow((length(p)-pulse)*1.8,2.))*.022;gl_FragColor=vec4(vec3(.012,.021,.019)+vec3(broad*.003)+light+glow*.056+ring,1.);
 #include <fog_fragment>
 }`});mesh(new T.PlaneGeometry(250,250).rotateX(-Math.PI/2),water,V(0,-.10,-70));
 }
 function moon(x=7,y=13,z=-45){const o=mesh(new T.SphereGeometry(1.5,32,24),new T.MeshBasicMaterial({color:0xe7e5d2,fog:false}),V(x,y,z));o.castShadow=false;}
 const boats=[];
 function boat(x,z){const g=new T.Group();g.position.set(x,.08,z);root.add(g);boats.push({g,x,z});const shape=new T.Shape();shape.moveTo(-.7,-2);shape.quadraticCurveTo(-1.4,0,-.7,2);shape.quadraticCurveTo(0,2.8,.7,2);shape.quadraticCurveTo(1.4,0,.7,-2);shape.quadraticCurveTo(0,-2.8,-.7,-2);const geo=new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:true,bevelSize:.15,bevelThickness:.1,bevelSegments:2,steps:1});geo.rotateX(-Math.PI/2);mesh(geo,materials.wood,V(0,-.40,0),g);for(let k=-1.5;k<=1.5;k+=.3)box(1.45,.06,.19,V(0,-.025,k),materials.stone,g);roof(0,2.30,0,1.6,1.5,.55,g);for(let a of [-1,1])for(let b of [-1,1])rod(V(a*.65,.025,b*.6),V(a*.65,2.30,b*.6),.04,materials.wood,g);dynamic.push(t=>{g.position.y=.04+Math.sin(t*.5)*.025;});}
 function puddle(x,z,w=4,d=1){const g=new T.CircleGeometry(1,40);g.rotateX(-Math.PI/2);const m=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float time;void main(){float edge=1.-smoothstep(.66,1.,length(p));float ripple=pow(sin(p.y*59.+sin(p.x*19.)*.3+time*.4)*.5+.5,10.);float shine=exp(-pow((p.x+.1)*3.,2.))*ripple;gl_FragColor=vec4(vec3(.09,.12,.11)+shine*.07,edge*.53);}'});const o=mesh(g,m,V(x,.005,z));o.scale.set(w,1,d);o.castShadow=false;dynamic.push(t=>{m.uniforms.time.value=t;});return o;}
 function litter(side=false){const inst=new T.InstancedMesh(new T.PlaneGeometry(1,1),mat(0x6a6654,{side:T.DoubleSide}),440),o=new T.Object3D();inst.receiveShadow=true;for(let i=0;i<440;i++){const x=(random()-.5)*28,z=side?-14+random()*33:-8+random()*23;o.position.set(x,.003,z);o.scale.set(.025+.045*random(),.16+.16*random(),1);if(Math.abs(z-1)<.65&&side)o.scale.setScalar(0);o.rotation.set(-Math.PI/2,0,random()*6.28);o.updateMatrix();inst.setMatrixAt(i,o.matrix);inst.setColorAt(i,new T.Color().setHSL(.12,.1,.38+random()*.23));}root.add(inst);}

 let gateDoor,barrier;
 if(index===0){ground();building(-3,-4,14,5,3.6,true);building(11,-9,7,5,3.2);wall(-10,-9,14);cypress(-12,-3,8);cypress(10,-4,9);stonePath(true);desk(2,1);lantern(-6,3,-1.6);lantern(5,3,-1.6);for(let i=0;i<5;i++)box(.9,.4,.8,V(-3+i*1.15,.2,-2),materials.stone);}
 if(index===1){ground();stonePath();building(0,-12,18,7,5.3);wall(-13,-7,8,5);wall(13,-7,8,5);for(const x of [-7,7]){cypress(x,-7,x<0?9:10);lantern(x*.55,2.8,-6);}for(let z=-3;z>-11;z-=.5)for(const x of [-3,3])rod(V(x,.2,z),V(x,.85,z),.04);box(3.5,.12,2,V(0,.10,-2));gateDoor=new T.Group();gateDoor.position.set(-.85,0,-8.45);root.add(gateDoor);box(1.7,2.9,.17,V(.85,1.6,0),materials.wood,gateDoor);for(let i=0;i<6;i++)rod(V(.1+i*.3,.25,.11),V(.1+i*.3,3.0,.11),.024,materials.stone,gateDoor);}
 if(index===2){ground();for(const [w,h,x,y] of [[2.8,5,-5.6,2.5],[8.8,5,2.6,2.5],[2.4,2.25,-3,1.125],[2.4,1.05,-3,4.475]])box(w,h,.6,V(x,y,-3),mat(0x747d6f));box(.5,5,8,V(-7,2.5,0),materials.stone);for(let x=-6;x<=6;x+=.5)if(x<=-4.2||x>=-1.8)box(.025,5,.05,V(x,2.5,-2.65),materials.stone);desk(1,0);box(2.1,.15,1.2,V(4,.13,-1),mat(0x4e5141));lantern(3,2.8,-2.2);scene.fog.density=.018;light.position.set(-5,7,-4);}
 if(index===3){river();bank(false);for(let i=0;i<25;i++)box(1.7,.09,.32,V(0,-.04,8-i*.35));for(const x of [-.96,.96])for(const z of [6,2])rod(V(x,-.1,z),V(x,.6,z),.06);boat(0,-3.2);mountains(10);addBamboo(root,{count:14,bounds:{minX:-15,maxX:-4,minZ:-20,maxZ:13},seed:621,height:[6,10]});moon(10,13,-60);}
 if(index===4){ground();bamboo(54,true);mountains(9);stonePath(true);litter(true);puddle(-4,1,1.6,.64);puddle(1.4,2.3,3,.9);puddle(6.5,-.5,2.5,.7);puddle(-3.3,8,4.2,1.3);puddle(5.8,10,3.5,1.2);for(let i=0;i<13;i++){const x=(i<6?-1:1)*(7+random()*4),z=3+random()*12;rock(x,.14,z,.3+random()*.55,.2+random()*.22,.45+random()*.6);}light.position.set(-8,17,-12);light.intensity=3.3;fill.intensity=.42;scene.fog.density=.031;lantern(7,1.15,-2.7);}
 if(index===5){river();shore();mountains(6,true);moon(5,14,-45);boat(-5,-8);for(let i=0;i<10;i++){let h=10+random()*14;rock(18+random()*5,h*.3,-26-i*3.6,4,h/2.8,5);}water.uniforms.moon.value=.32;stonePath(false,17);light.position.set(6,17,-35);light.intensity=4;}
 if(index===6){ground();mountainRidge();mountains(15);for(let i=0;i<14;i++)rock(-9,3+i*.15,7-i*3,3.3,3.6+random()*5,6.3);stonePath();building(-8,-20,6,5,3.5);scene.fog.density=.019;}
 if(index===7){ground();building(-4,-9,9,6,3.7,true);wall(10,-11,9,2.8);stonePath(true);bamboo(42,true);mountains(12);for(let i=0;i<20;i++)rock(-12+random()*25,.1,-2-random()*4,.35+random()*.5,.2,.5);scene.fog.density=.019;lantern(4,1.6,-2.1);light.color.set(0xe4dfbc);light.position.set(-17,11,-20);const portal=new T.Group();portal.position.set(7.0,0,1);portal.rotation.y=Math.PI/2;root.add(portal);for(const x of [-1,1])box(.16,2.7,.18,V(x,1.35,0),materials.wood,portal);roof(0,2.65,0,2.5,.55,.4,portal);gateDoor=new T.Group();gateDoor.position.set(-1,0,0);portal.add(gateDoor);box(1.86,2.55,.12,V(.93,1.28,0),materials.wood,gateDoor);for(let i=0;i<7;i++)box(.025,2.5,.025,V(.15+i*.26,1.28,.08),materials.stone,gateDoor);}
 // Architectural layers surround the walking route, rather than sitting alone on a floor.
 if(index===0){
  roof(-.4,3.55,1,17,3.4,.92);for(let x=-8;x<=8;x+=4)for(const z of [-1.25,3.25]){rod(V(x,0,z),V(x,3.59,z),.10);box(.38,.18,.38,V(x,.08,z),materials.stone);}box(17,.18,.16,V(-.4,3.35,3.25));sideWall(-10,0,12,2.5);wall(-1,-10,22,3.6);bench(-5,2.3);bench(6,-.8);gardenPot(-8,-.6);gardenPot(6.5,-.8);lantern(-.6,2.65,2.55);portal(9.1,1,Math.PI/2,3.1,3.3);
 }
 if(index===1){
  sideWall(-5.5,-.3,18,3.0);sideWall(5.5,-.3,18,3.0);portal(0,7.9,0,5.2,4.5);for(const x of [-4.75,4.75]){for(let z=5;z>-8;z-=3)rod(V(x,0,z),V(x,3.7,z),.10);const wing=new T.Group();wing.position.set(x,0,-1.2);wing.rotation.y=Math.PI/2;root.add(wing);roof(0,3.6,0,15.5,1.8,.65,wing);}for(const x of [-3.7,3.7])gardenPot(x,-5.5,.43);box(3,.09,4,V(0,-.02,-6.4),materials.stone);
 }
 if(index===2){
  box(.28,4.3,5,V(6,2.15,-.4),materials.stone);box(12.8,.18,5.1,V(-.2,4.25,-.4),materials.wood);for(let x=-5.5;x<=5.5;x+=1.4)box(.12,.30,5.1,V(x,4.10,-.4));for(let i=0;i<11;i++)box(.034,3.9,.11,V(-5.45+i*.35,1.95,2.5),materials.wood);box(4.2,.12,.19,V(-3.6,3.83,2.5));bench(-4.9,-1.9);portal(5.15,.8,Math.PI/2,2.7,3.35);for(let i=0;i<4;i++)box(.55,.10,.33,V(2.5+i*.55,.05,-1.65),materials.stone);sky.intensity=.83;
 }
 if(index===3){
  const shed=new T.Group();shed.position.set(-5.8,0,5.0);root.add(shed);roof(0,3.1,0,5.2,4.2,.8,shed);for(const x of [-2.0,2.0])for(const z of [-1.6,1.6])rod(V(x,0,z),V(x,3.15,z),.105,materials.wood,shed);box(4.7,2.7,.2,V(0,1.45,1.5),materials.wood,shed);bench(-6,4);lantern(-3.1,2.4,5.6);for(const z of [5.5,2,-.45])for(const x of [-1.03,1.03])rod(V(x,-.1,z),V(x,.76,z),.065);for(const x of [-1.03,1.03])rod(V(x,.70,5.5),V(x,.70,-.45),.035);for(let i=0;i<5;i++){rock(-4.4-i*.75,.06,-1.4-i*.35,.75,.25,.7);}portal(0,6.9,0,2.7,2.8);
 }
 if(index===4){
  bamboo(18,false);portal(9.15,1,Math.PI/2,2.7,3.1);for(let i=0;i<9;i++){const x=-9+i*2.1;rock(x,.11,-.15,.35,.14,.5);rock(x,.13,2.7,.4,.17,.44);}const rail=new T.Group();rail.position.set(0,0,3.35);root.add(rail);for(let x=-8;x<8;x+=1.6)rod(V(x,0,0),V(x,.65,0),.035,materials.wood,rail);rod(V(-8,.55,0),V(8,.55,0),.025,materials.wood,rail);light.intensity=2.7;fill.intensity=.78;
 }
 if(index===5){
  const pavilion=new T.Group();pavilion.position.set(-4.6,0,4.2);root.add(pavilion);roof(0,3.35,0,3.5,3.7,.8,pavilion);for(const x of [-1.25,1.25])for(const z of [-1.2,1.2])rod(V(x,0,z),V(x,3.4,z),.095,materials.wood,pavilion);bench(-4.3,4.2,Math.PI/2);lantern(-3.2,2.25,3.0);for(let z=6;z>-5;z-=1.5)rock(-3.75,.18,z,.7,.34,.6);for(let z=2;z>-6;z-=1.2)rock(3.5,.14,z,.4,.25,.5);light.intensity=2.8;
 }
 if(index===6){
  portal(0,-5.4,0,2.8,3.35);for(const x of [-2.65,2.65])for(let z=6;z>-6;z-=2){box(.24,.80,.24,V(x,.4,z),materials.stone);}for(const x of [-2.65,2.65])rod(V(x,.76,6),V(x,.76,-6),.05,materials.wood);cypress(-5.9,-5.0,8.6);cypress(5.8,-12,9.4);lantern(-1.45,1.7,-5.5);light.position.set(-10,16,-14);light.intensity=2.2;
 }
 if(index===7){
  roof(-.7,3.5,1,15.5,3.0,.8);for(let x=-8;x<7;x+=3.2)for(const z of [-1.1,3.05]){rod(V(x,0,z),V(x,3.52,z),.09);box(.36,.17,.36,V(x,.08,z),materials.stone);}sideWall(-11,0,12,2.9);wall(-.5,-9,23,3.6);bench(-4,2.3);gardenPot(5.5,-1.0);lantern(1.3,2.35,2.5);light.intensity=2.25;
 }
 if(index===0||index===1){litter();puddle(-4,3,2,.5);puddle(4,4,1.7,.7);}
 if(index===2){sky.intensity=.83;light.intensity=2.5;light.position.set(-5,7,-4);fill.intensity=.60;}
 // Branches, small shrubs and a broken stone footing interrupt the isolated
 // ends of the walls. These groups stay outside the player route and windows.
 const edgePlants=[
  [[-12.2,-8.4,8.7,'broadleaf'],[11.8,-9.5,9.4,'pine'],[-12.6,4.2,7.5,'pine']],
  [[-8.3,-4.6,9.2,'pine'],[8.4,-6.9,9.6,'pine'],[-9.5,4.8,7.8,'broadleaf'],[9.2,1.4,8.8,'pine']],
  [[-8.8,-6.4,7.5,'pine'],[8.8,-7.2,8.1,'pine']],
  [[-10.1,6.0,8.3,'broadleaf'],[-9.4,-1.5,9.4,'pine']],
  [[12.5,-3.6,9.7,'broadleaf'],[-14.1,-3.8,8.3,'pine']],
  [[-8.8,5.2,8.8,'pine'],[13.0,-18,11.6,'pine']],
  [],
  [[-13.2,-6.5,8.2,'broadleaf'],[12.7,-10.5,10.3,'pine'],[-12.4,4.8,8.2,'pine']]
 ];
 const edgePlantGroups=[];
 for(const [i,[x,z,height,kind]] of edgePlants[index].entries()){
  const planting=new T.Group();planting.name=`Wall edge planting ${i+1}`;planting.userData.environmentEdge={position:[x,0,z],height,kind};root.add(planting);edgePlantGroups.push(planting);
  const options={position:[x,0,z],height,rotation:random()*6.28,width:.86,seed:1937+index*71+i*17};
  if(kind==='broadleaf')addBroadleaf(planting,options);else addTree(planting,options);
  // Real leaf meshes provide a low layer too, rather than a ring of geometric rocks.
  addBroadleaf(planting,{count:2,bounds:{minX:x-.9,maxX:x+.9,minZ:z-.7,maxZ:z+.7},height:[1.2,1.9],width:1.4,seed:2231+index*31+i*11,tint:0x91a18b});
  for(let j=0;j<4;j++)rock(x+(random()-.5)*2.5,.02,z+(random()-.5)*2.6,.3+random()*.45,.05+random()*.15,.35+random()*.6);
 }
 // Low drifting mist and shaped shafts stay in world space as the camera follows.
 const shaftPresets=[
  [{id:'lamp',from:[-.6,3.15,2.55],to:[-.6,0,1.4],radius:1.25,color:0xdacdad,strength:1.5}],
  [{id:'gate',from:[-3.0,9,-7],to:[.5,0,-3.5],radius:2.7,strength:1.7}],
  [],
  [{id:'river',from:[-6,12,-12],to:[0,0,-2],radius:3.3,strength:1.8}],
  [{id:'forest',from:[-8,15,-7],to:[-3,0,1.8],radius:3.2,strength:.65},{id:'clearing',from:[5,17,-6],to:[7,0,1],radius:3.4,strength:.60}],
  [{id:'moon',from:[6,14,-16],to:[1,0,-3.8],radius:3.8,strength:1.4}],
  [{id:'mountain',from:[-6,15,-7],to:[0,0,-1],radius:2.9,strength:1.5}],
  [{id:'dawn',from:[-3.8,4.8,-1.4],to:[-2,0,1],radius:1.75,strength:1.7}]
 ];
 const mistBounds=index===2?{minX:-6,maxX:6,minZ:-2,maxZ:2}:{minX:-13,maxX:13,minZ:-20,maxZ:10};
 const edgeMist=[
  [[-10.8,.85,.3],[3.8,1.65,8.8],1.15],
  [[11.5,1.5,-6.8],[4.0,3.0,6.8],.85]
 ];
 const envelopePresets=[
  [...edgeMist,[[-10.9,2,-8.9],[5.0,3.4,5.0],.85],[[-.6,.85,-11.9],[15.5,1.75,4.3],.65],[[-3,.24,-1.65],[8.7,.52,1.6],.8]],
  [[[-7.9,1.3,-.8],[2.7,2.5,11.3],1.15],[[7.9,1.3,-.8],[2.7,2.5,11.3],1.15],[[0,1.2,-14.4],[13.5,2.6,4.1],.85],[[0,.16,-9.7],[4.2,.48,1.3],.55]],
  [[[-8.2,1.8,-.3],[2.4,3.0,5.8],.85],[[8.1,1.8,-.3],[2.4,3.0,5.8],.85],[[0,1.5,-6.5],[10.9,2.7,2.8],1.05]],
  [[[-8.7,1.3,5.2],[3.5,2.6,5.2],.9],[[-3.8,.30,-.4],[2.1,.88,12.8],1.2],[[0,1.5,-19],[21,3.4,5.6],.65]],
  [[[12.4,1.3,.4],[3.8,2.5,7.6],1.1],[[-13.9,1.3,.4],[4.1,2.8,7.3],.9],[[0,.65,-9.5],[22,1.8,5.8],.75]],
  [[[-7.9,1.4,4.1],[3.7,2.8,5.7],1.05],[[6.9,.40,-2],[3.0,1.0,11.7],1.0],[[0,1.7,-22],[23,3.6,7],.62]],
  [[[-6.8,1.1,-10],[3.6,2.2,9],.75],[[6.8,1.1,-10],[3.6,2.2,9],.75]],
  [[[-11.8,1.5,-3.8],[4.2,3.1,8.6],1.05],[[11.8,1.3,-7.8],[4.2,2.9,6.3],.95],[[0,1.0,-11.7],[16,2.0,4.2],.85],[[-3,.18,-5.2],[9.0,.48,1.4],.72]]
 ];
 const envelopes=envelopePresets[index].map(([center,size,density],i)=>({id:`Building edge ${index+1}.${i+1}`,center,size,density,color:index===2?0x7b9187:0x88998e}));
 const atmosphere=createAtmosphere(scene,{seed:572+index*49,mistBounds,mistOpacity:index===2?.13:index===4?.21:.16,mistCount:index===2?6:index===5?17:16,rain:index===4?1:index<2?.18:0,countRain:index===4?1200:650,shafts:shaftPresets[index],dust:index===2?65:125,envelopes});
 const gateLight=new T.PointLight(0xd2ead6,1.15,4,1.5);scene.add(gateLight);
 const specifications=[
  [['lantern',[-4,0,1],'廊灯','让廊灯亮起来','灯下旧文'],['paper',[2,0,1],'书案','收拢散落的纸页','诗文入案']],
  [['seal-left',[-2.8,0,0],'左侧案字','拂去第一处案字','字字皆问'],['seal-right',[2.8,0,-2],'右侧案字','拂去第二处案字','诗亦成案'],['gate',[0,0,-6],'乌台门','推开庭院的门','乌台诗案']],
  [['window',[-3,0,.8],'窗格','引一线月光入室','柏台霜气夜凄凄'],['letter',[1,0,.8],'未寄的信','将信送向窗外','柏台霜气夜凄凄']],
  [['boat',[0,0,3],'渡舟','用笔波引渡舟靠岸','长江绕郭知鱼美'],['dock',[0,0,-1],'江面','让一条水路显出来','好竹连山觉笋香']],
  [['wind',[-3,0,1],'倒伏的竹枝','引风扶起挡路的竹枝','莫听穿林打叶声'],['rain',[1,0,1],'雨中的水洼','让雨歇一会儿，照见竹径','何妨吟啸且徐行'],['path',[5,0,1],'竹径尽头','将散字留在竹林里','一蓑烟雨任平生']],
  [['moon',[-2,0,1],'江中明月','让月光沿水面铺开','山间之明月'],['water',[1,0,-3],'江水','以清风送舟顺水而去','江上之清风']],
  [['mountain',[0,0,-1],'远山','从此处看山','横看成岭']],
  [['lantern',[-2,0,1],'归途的灯','重新点亮归途的灯','回首向来萧瑟处'],['gate',[4,0,1],'山路尽头','走出这一场风雨','也无风雨也无晴']]
 ];
 const architecture=index<3?buildEarlyArchitecture(index,{scene,root,box,rod,roof,materials,mat}):buildLateArchitecture(index,{scene,root,box,rod,roof,materials,mat});
 const targets=specifications[index].map(([id,position,label,verb,verse])=>({id,position,label,verb,verse,...architecture?.targets?.find(t=>t.id===id)}));
 const paperPositions=[];for(let i=0;i<220;i++)paperPositions.push((random()-.5)*1.3,random()*.8,0);const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(paperPositions,3));const paperTrail=new T.Points(pg,new T.PointsMaterial({color:0xdbe5d6,size:.025,transparent:true,opacity:0,depthWrite:false}));paperTrail.position.set(index===2?1:2,1.1,index===2?0:1);root.add(paperTrail);
 const seals=[];
 function interact(id){if(architecture?.interact(id)===false)return false;effects.set(id,1);}
 function reset(){effects.clear();effectValues.clear();architecture?.reset();if(gateDoor)gateDoor.rotation.y=0;if(barrier){barrier.rotation.z=-.86;barrier.position.z=1.7;}for(const {g,x,z} of boats){g.position.x=x;g.position.z=z;}for(const s of seals)s.material.opacity=1;}
 let previousTime=0;
 function update(t,response){
  const dt=Math.min(.06,Math.max(0,t-previousTime));previousTime=t;architecture?.update(t,dt);for(const [id,v] of effects){const now=effectValues.get(id)||0;effectValues.set(id,T.MathUtils.damp(now,v,1.05,dt));}const e=id=>effectValues.get(id)||0;
  for(const f of dynamic)f(t);atmosphere.update(t,{rain:index===4?.85-e('path')*.45:index<2?.18:0,clarity:index===4?e('path')*.4:0});
  if(index===4){light.intensity=2.7+e('rain')*1.25;sky.intensity=.96+e('rain')*.13;scene.background.copy(background).lerp(new T.Color(0x7b877a),e('rain')*.35);scene.fog.color.copy(scene.background);if(barrier){barrier.rotation.z=-.86+e('wind')*.78;barrier.position.z=1.7-e('wind')*5;}atmosphere.setLight('forest',.65+e('rain')*1.8);atmosphere.setLight('clearing',.60+e('path')*1.7);}
  if(gateDoor)gateDoor.rotation.y=-e('gate')*1.35;
  for(let i=0;i<seals.length;i++)seals[i].material.opacity=1-e(i?'seal-right':'seal-left');
  for(const {lamp,m} of lanternLights){lamp.intensity=3.8+(index===0?0:e('lantern')*4);m.emissiveIntensity=.65+(index===0?0:e('lantern')*.9);}
  
  paperTrail.material.opacity=(e('paper')+e('letter'))*.65;paperTrail.position.y=1.1+e('letter')*1.6;paperTrail.position.x=(index===2?1:2)-e('letter')*4;paperTrail.position.z=(index===2?0:1)-e('letter')*2;paperTrail.rotation.y=t*.12;
  for(const {g,x,z} of boats){if(index===5){g.position.z=z-e('water')*6;g.position.x=x-e('water')*2;}}
  if(water){water.uniforms.time.value=t;water.uniforms.pulse.value=response>0?response*34:-10;if(index===5)water.uniforms.moon.value=.32+e('moon')*.92;}
 }
 const exits=[
  {position:[9.6,0,1],crossing:{axis:'x',direction:1,value:9.2},label:'穿过书院东廊'},
  {position:[0,0,-8.9],crossing:{axis:'z',direction:-1,value:-8.55},label:'走过乌台的门'},
  {position:[5.45,0,.8],crossing:{axis:'x',direction:1,value:5.28},label:'离开狱中长廊'},
  {position:[0,0,-3.5],crossing:{axis:'z',direction:-1,value:-3.25},label:'登上渡江的船'},
  {position:[9.55,0,1],crossing:{axis:'x',direction:1,value:9.25},label:'走出烟雨竹径'},
  {position:[0,0,-5.45],crossing:{axis:'z',direction:-1,value:-5.10},label:'沿江岸继续前行'},
  {position:[0,0,-5.85],crossing:{axis:'z',direction:-1,value:-5.55},label:'穿过西林寺山门'},
  {position:[7.6,0,1],crossing:{axis:'x',direction:1,value:7.2},label:'走到廊外的天光'}
 ];
 const exit=exits[index],exitLight=new T.PointLight(index===2?0xafc3ba:0xceccb1,index===2?1.3:1.9,5.5,1.6);exitLight.position.fromArray(exit.position);exitLight.position.y=1.45;scene.add(exitLight);
 return {scene,root,update,gateLight,targets,interact,reset,architecture,atmosphere,edgePlantGroups,exit,bounds:index===2?{minX:-5.5,maxX:5.5,minZ:.5,maxZ:1.1}:index===4?{minX:-10,maxX:10,minZ:-.5,maxZ:2.5}:index===3?{minX:-.65,maxX:.65,minZ:-4,maxZ:8}:index===5?{minX:-4.8,maxX:4,maxZ:8,minZ:-6}:index===6?{minX:-2,maxX:2,minZ:-6,maxZ:8}:index===1?{minX:-4.6,maxX:4.6,minZ:-9,maxZ:8}:{minX:-10,maxX:10,minZ:index===7?-.5:-.4,maxZ:index===7?2.5:2.3}};

}



