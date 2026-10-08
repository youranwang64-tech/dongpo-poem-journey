import * as T from './vendor/three.module.js';
import {addBamboo,addTree} from './plants.js';
import {createTraveler} from './traveler.js';
import {createChengtianMoonShadows} from './chengtian-moon-shadows.js';
import {createChengtianNightHaze} from './chengtian-night-haze.js';
import {createChengtianMoonGallery} from './chengtian-moon-gallery.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function randomSource(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const shared={};
function texture(kind){
 if(shared[kind])return shared[kind];const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),r=randomSource(kind==='wood'?451:kind==='wall'?731:kind==='tile'?628:826);
 ctx.fillStyle=kind==='wood'?'#877b69':kind==='wall'?'#d4d4c2':kind==='tile'?'#748077':kind==='stone'?'#9aa298':'#8c9a85';ctx.fillRect(0,0,512,512);
 for(let i=0;i<12000;i++){const n=55+r()*170;ctx.fillStyle=`rgba(${n},${n},${n},${.025+r()*.10})`;ctx.fillRect(r()*512,r()*512,kind==='wood'?1+r()*2:1+r()*6,kind==='wood'?8+r()*100:2+r()*6);}
 for(let i=0;i<45;i++){const x=r()*512,y=r()*512,rad=20+r()*100,g=ctx.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,`rgba(23,32,24,${r()*.20})`);g.addColorStop(1,'rgba(23,32,24,0)');ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);}
 if(kind==='stone'){ctx.strokeStyle='rgba(26,30,24,.24)';ctx.lineWidth=2;for(let row=0;row<8;row++){const yy=row*64;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(512,yy);ctx.stroke();for(let xx=(row%2)*64;xx<512;xx+=128){ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx,yy+64);ctx.stroke();}}}
 if(kind==='floor'){for(let row=0;row<6;row++){const yy=row*86;for(let col=-1;col<7;col++){const xx=col*86+(row%2)*43;ctx.fillStyle=`rgba(220,224,202,${.025+r()*.06})`;ctx.fillRect(xx+2,yy+2,82,82);ctx.strokeStyle='rgba(26,40,29,.20)';ctx.lineWidth=2;ctx.strokeRect(xx,yy,86,86);if(r()>.5){ctx.strokeStyle='rgba(38,47,31,.18)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(xx+20,yy+5);ctx.lineTo(xx+35,yy+28);ctx.lineTo(xx+30,yy+43);ctx.stroke();}}}}
 if(kind==='tile'){for(let row=-1;row<9;row++){const yy=row*64;for(let col=-1;col<14;col++){const xx=col*42+(row%2)*21;ctx.fillStyle=`rgba(31,42,33,${.08+r()*.15})`;ctx.fillRect(xx+1,yy+2,40,62);ctx.strokeStyle='rgba(202,213,188,.20)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xx+2,yy+4);ctx.quadraticCurveTo(xx+21,yy-3,xx+40,yy+4);ctx.stroke();ctx.strokeStyle='rgba(16,25,19,.30)';ctx.lineWidth=1;ctx.strokeRect(xx,yy+2,42,64);ctx.fillStyle='rgba(131,148,101,.09)';ctx.fillRect(xx+5+r()*20,yy+44,8+r()*14,11);}}}
 if(kind==='wall'){ctx.fillStyle='rgba(205,214,226,.58)';ctx.fillRect(0,0,512,512);}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(kind==='floor'?9:2,kind==='floor'?9:2);t.anisotropy=4;shared[kind]=t;return t;
}
function material(color,kind,extra={}){const map=kind?texture(kind):null;return new T.MeshStandardMaterial({color,roughness:.88,map,bumpMap:map,bumpScale:kind==='wall'?.055:.022,...extra});}

/** An original moonlit monastery setting for the prose; this is a poetic
 * interpretation, never a reconstruction of the historical Chengtian temple. */
export function buildChengtianNightScene(){
 const scene=new T.Scene(),root=new T.Group(),walkSurfaces=[],collisionBoxes=[],cutawayObjects=[],cutawayMaterials=new Set(),plantGroups=[];
 root.name='承天寺夜游 · 月入廊庭';scene.add(root);scene.background=new T.Color(0x101b32);scene.fog=new T.FogExp2(0x30415b,.019);scene.userData.saturation=.88;
 const rng=randomSource(10831012),levels=new Map(),targetLevels=new Map(),clock={last:null};let sceneTime=0,viewPlayer=null,companion=null,companionDestination=null,companionRoute=[],companionMoving=false;
 const sky=new T.HemisphereLight(0xb8cce2,0x354150,1.10);scene.add(sky);
 const moonLight=new T.DirectionalLight(0xd3dcff,2.55);moonLight.position.set(-14,23,9);moonLight.target.position.set(2,0,4);moonLight.castShadow=true;moonLight.shadow.mapSize.set(2048,2048);Object.assign(moonLight.shadow.camera,{left:-19,right:19,bottom:-17,top:17,near:1,far:60});moonLight.shadow.bias=-.0001;moonLight.shadow.normalBias=.026;moonLight.shadow.radius=3.6;scene.add(moonLight,moonLight.target);
 const fill=new T.DirectionalLight(0x9db2c8,.82);fill.position.set(15,9,12);scene.add(fill);
 const mats={wood:material(0x5f5144,'wood'),tile:material(0x415360,'tile',{bumpScale:.062}),wall:material(0xc0cadb,'wall',{bumpScale:.018}),stone:material(0x9aaebb,'stone'),floor:material(0xa9bcd2,'floor',{roughness:.36,metalness:.035,bumpScale:.006}),paper:material(0xd7c8a3,null),dark:material(0x1d2831,null)};
 function mesh(g,m,p=V(),parent=root){const o=new T.Mesh(g,m);o.position.copy(p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,p,m=mats.wood,parent=root){return mesh(new T.BoxGeometry(w,h,d),m,p,parent);}
 function pole(a,b,r=.05,m=mats.wood,parent=root){const delta=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,delta.length(),10),m,a.clone().add(b).multiplyScalar(.5),parent);o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return o;}
 function walk(o){o.userData.walkable=true;walkSurfaces.push(o);return o;}
 function obstacle(o,pad=0){o.updateWorldMatrix(true,true);const b=new T.Box3().setFromObject(o);collisionBoxes.push({id:o.name||'wall',minX:b.min.x-pad,maxX:b.max.x+pad,minZ:b.min.z-pad,maxZ:b.max.z+pad,object:o});return o;}
 function roof(x,y,z,w,d,h=.88,parent=root){const created=[];
  for(const side of[-1,1]){const vs=[],uv=[],ix=[],nx=Math.max(12,Math.ceil(w*3)),nz=12;
   const at=(a,b)=>{const u=b/nz,edge=Math.pow(Math.abs(a/nx-.5)*2,7)*u*.19;return V(x+(a/nx-.5)*(w+.7),y+h-u*(h+.32)+u*u*.34+edge,z+side*u*(d/2+.45));};
   for(let a=0;a<=nx;a++)for(let b=0;b<=nz;b++){vs.push(...at(a,b));uv.push(a/nx,b/nz);}
   for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){const n=a*(nz+1)+b;side===1?ix.push(n,n+1,n+nz+1,n+1,n+nz+2,n+nz+1):ix.push(n,n+nz+1,n+1,n+1,n+nz+1,n+nz+2);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();created.push(mesh(g,mats.tile,V(),parent));
   for(let a=0;a<=nx;a+=2){const ps=[];for(let b=0;b<=nz;b++)ps.push(at(a,b));created.push(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(ps),12,.024,4,false),mats.tile,V(),parent));}
   created.push(pole(at(0,nz),at(nx,nz),.045,mats.wood,parent));for(let a=0;a<nx;a+=2)created.push(mesh(new T.CylinderGeometry(.063,.063,.10,7).rotateX(Math.PI/2),mats.tile,at(a,nz),parent));
  }created.push(box(w+.78,.12,.15,V(x,y+h+.05,z),mats.tile,parent));return created;
 }
 function lantern(x,y,z){const g=new T.Group();g.name='檐下小纸灯 · 克制暖光';g.position.set(x,y,z);root.add(g);const paper=box(.28,.43,.28,V(),material(0xe1c998,null,{emissive:0xffd09a,emissiveIntensity:.36}),g);for(const a of[-1,1])for(const b of[-1,1])pole(V(a*.146,-.23,b*.146),V(a*.146,.23,b*.146),.015,mats.wood,g);for(const yy of[-.23,-.10,.10,.23])box(.30,.014,.30,V(0,yy,0),mats.wood,g);pole(V(0,.24,0),V(0,.48,0),.011,mats.wood,g);const light=new T.PointLight(0xffd5a3,.55,5,2);light.position.copy(g.position);root.add(light);return{group:g,paper,light};}
 function framedWindow(parent,x,y,z,w,h){for(const xx of[-1,1])box(.10,h,.12,V(x+xx*w/2,y,z),mats.wood,parent);for(const yy of[-1,1])box(w,.10,.12,V(x,y+yy*h/2,z),mats.wood,parent);for(let xx=-w/2+.17;xx<w/2;xx+=.22)box(.018,h,.03,V(x+xx,y,z),mats.wood,parent);for(let yy=-h/2+.22;yy<h/2;yy+=.28)box(w,.018,.03,V(x,y+yy,z),mats.wood,parent);}
 function doorLeaf(parent,width,height){const panel=box(width,height,.09,V(width/2,height/2,0),mats.wood,parent);for(let i=1;i<5;i++)box(.018,height-.14,.019,V(i*width/5,height/2,.054),mats.dark,parent);for(const yy of[.16,.48,height-.18])box(width-.1,.055,.028,V(width/2,yy,.075),mats.wood,parent);return panel;}
 function bench(x,z,rotation=0){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rotation;root.add(g);box(1.8,.10,.42,V(0,.48,0),mats.wood,g);for(const xx of[-.65,.65])box(.12,.44,.31,V(xx,.22,0),mats.wood,g);obstacle(g);return g;}
 function wall(x,z,w,d=.23,h=2.85){const o=box(w,h,d,V(x,h/2,z),mats.wall);obstacle(o);const cap=new T.Group();cap.position.set(x,0,z);root.add(cap);if(d>w){cap.rotation.y=Math.PI/2;roof(0,h,0,d,w,.27,cap);}else roof(0,h,0,w,d,.27,cap);return o;}
 // Ground continues far beyond the enclosure. No island, slab or backdrop edge
 // becomes visible when the camera comes close to the tiled courtyard.
 const terrain=mesh(new T.PlaneGeometry(250,250).rotateX(-Math.PI/2),material(0x314352,'floor',{roughness:1}),V(3,-.18,3));terrain.castShadow=false;
 // One continuous outdoor slab. The previous courtyard, friend-room,
 // east-gallery and exit slabs overlapped at y=0 and competed in the depth
 // buffer whenever the camera moved. Navigation still uses its real regions.
 const courtyard=walk(box(30,.14,30,V(3,-.07,6),mats.floor));courtyard.name='连续青石庭地 · 友舍与廊道共用一块实地';
 const friendFloor=courtyard;mats.floor.map.repeat.set(14,14);
 // The same physical study and scroll desk from the previous courtyard; walls
 // now have a real door gap, so entering never relies on walking through walls.
 const study=new T.Group();study.name='解衣欲睡 · 书斋';root.add(study);
 const studyFloor=walk(box(12.8,.20,3.65,V(-.45,.10,-2.825),mats.stone,study));studyFloor.name='书斋实地 .20';
 const rearWall=box(12.8,3.12,.20,V(-.45,1.76,-4.55),mats.wall,study);obstacle(rearWall);const leftWall=box(.22,3.12,3.6,V(-6.86,1.76,-2.75),mats.wall,study);obstacle(leftWall);const rightWall=box(.22,3.12,3.6,V(5.96,1.76,-2.75),mats.wall,study);obstacle(rightWall);
 cutawayObjects.push(...roof(-.45,3.43,-2.75,13.3,3.9,1.0,study));
 const studyFront=new T.Group();studyFront.name='书斋正墙 · 为月窗和右门留孔';root.add(studyFront);
 for(const [x,w,h,y]of[[-5.5,2.55,3.12,1.76],[-1.17,.34,3.12,1.76],[3.725,3.85,3.12,1.76],[-2.75,2.85,.56,.48],[-2.75,2.85,.46,3.13]]){const o=box(w,h,.20,V(x,y,-1),mats.wall,studyFront);obstacle(o);cutawayObjects.push(o);}
 for(const x of[-6.55,-4.15,-1.35,1.8,5.65]){const p=pole(V(x,.2,-.92),V(x,3.43,-.92),.082);obstacle(p);cutawayObjects.push(p);box(.29,.10,.29,V(x,.25,-.92),mats.stone);}
 for(const x of[-1,1.8])box(.11,3.05,.18,V(x,1.73,-1),mats.wood);box(2.9,.14,.18,V(.40,3.25,-1));
 const threshold=walk(box(2.72,.10,.55,V(.40,.05,-.75),mats.stone));threshold.name='宽书斋门槛 · 单阶真实相连';
 const exitMoon=mesh(new T.PlaneGeometry(2.6,1.2).rotateX(-Math.PI/2),new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{amount:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float amount;void main(){vec2 q=(p-.5)*2.;float soft=exp(-q.x*q.x*2.7-q.y*q.y*5.);gl_FragColor=vec4(.70,.81,.92,soft*amount*.22);}',fog:false}),V(.4,.112,-.65));exitMoon.name='月色照清楚的出屋门槛';exitMoon.castShadow=false;
 const windowShutters=[];for(const side of[-1,1]){const g=new T.Group();g.position.set(-2.75+side*1.34,.78,-.91);g.name='月入户 · '+(side<0?'左窗扇':'右窗扇');root.add(g);const center=-side*.65;framedWindow(g,center,1.06,0,1.27,2.10);box(1.24,.22,.055,V(center,.12,0),mats.wood,g);windowShutters.push({g,side});}
 const windowLatch=box(.13,.21,.075,V(-1.21,1.07,.09),mats.wood,windowShutters[1].g);windowLatch.name='月窗木闩 · 毛笔落点';
 const desk=box(1.80,.13,.8,V(-2.70,.89,-2.15));desk.name='记承天寺夜游书案';for(const x of[-3.4,-2])for(const z of[-2.45,-1.85])box(.085,.81,.085,V(x,.43,z));obstacle(desk,.07);const deskPaper=box(1.25,.022,.5,V(-2.75,.97,-2.13),mats.paper);deskPaper.name='案上实体卷轴原纸';
 box(.17,.03,.15,V(-1.99,.98,-2.19),mats.dark);const brush=pole(V(-2.10,.993,-1.95),V(-1.77,.993,-2.16),.012,mats.wood);brush.name='书案上的笔';const foldedRobe=box(.75,.04,.45,V(-5.1,.48,-3.55),material(0x354354,'wood'));foldedRobe.name='欲睡时叠下的衣';box(1.5,.15,.7,V(-5.1,.34,-3.6),mats.wood);
 const studyLantern=lantern(-5.6,2.55,-3.4);studyLantern.light.intensity=.62;
 // The long western wall, eastern house and covered walkway create enclosing
 // architectural space. Plant roots are in earthen borders outside the route.
 wall(-7.02,3.1,.28,15.4);wall(12.8,3.2,.27,15.5);wall(2.85,-5.2,20,.24,2.5);
 const westGallery=new T.Group();westGallery.name='西廊 · 竹柏借影';root.add(westGallery);roof(-5.75,3.10,4.4,2.1,10.5,.65,westGallery);for(const z of[.1,3.5,6.9,9.4]){const p=pole(V(-4.65,0,z),V(-4.65,3.1,z),.079);obstacle(p);box(.28,.11,.28,V(-4.65,.055,z),mats.stone);}
 // Paired posts frame the borrowed-view axis. A centre post at x=9.6
 // previously crossed both circular apertures and occupied Huaimin's foot.
 const eastGallery=new T.Group();eastGallery.name='承天寺寻友廊';root.add(eastGallery);roof(9.55,3.08,3.15,6.2,3.8,.70,eastGallery);for(const x of[6.55,8.1,11.2,12.5])for(const z of[1.25,4.98]){const p=pole(V(x,0,z),V(x,3.1,z),.088);p.name='分立圆窗两侧的承檐廊柱';obstacle(p);}
 const friendWall=new T.Group();friendWall.name='怀民寝舍 · 门缝透暖光';root.add(friendWall);
 const friendRear=box(6.25,3.08,.22,V(9.4,1.54,-2.0),mats.wall,friendWall);obstacle(friendRear);roof(9.4,3.13,-.55,6.7,3.9,.90,friendWall);
 // The east-house front and its inner gallery wall are built below with real
 // circular openings. No solid wall may remain behind a borrowed-view frame.
 for(const [z,d]of[[-.4,3.25],[4.15,2.30]]){const o=box(.22,3.06,d,V(6.3,1.53,z),mats.wall,friendWall);obstacle(o);}
 box(.24,.16,1.83,V(6.3,3.0,2.1),mats.wood);const gateLeaves=[];for(const side of[-1,1]){const g=new T.Group();g.position.set(6.3,0,2.1+side*.85);g.rotation.y=side<0?-Math.PI/2:Math.PI/2;g.name='怀民房门 · '+(side<0?'前扇':'后扇');root.add(g);doorLeaf(g,.85,2.85);gateLeaves.push({g,side,closedAngle:g.rotation.y});}
 const doorLatch=box(.13,.24,.08,V(6.17,1.25,2.1),mats.wood);doorLatch.name='寻友门枢 · 毛笔落点';
 const friendLantern=lantern(11.50,2.16,.10);friendLantern.light.intensity=.78;bench(11.75,3.8,Math.PI/2);bench(-5.72,6.2,Math.PI/2);
 const rearFraming=addBamboo(root,{count:19,bounds:{minX:-11,maxX:15,minZ:-10,maxZ:-6.2},height:[7,10.6],seed:1183});plantGroups.push(rearFraming);
 const bamboo=addBamboo(root,{count:4,bounds:{minX:-5.3,maxX:-4.3,minZ:8.15,maxZ:10.35},height:[4.8,6.8],seed:1083});bamboo.name='庭中竹 · 真模型投月影';plantGroups.push(bamboo);
 const cypress=addTree(root,{position:[-5.8,-.02,8.40],height:6.4,width:.62,seed:1311,tint:0x7b8d99});cypress.name='庭中柏意象 · 松柏类常青剪影';plantGroups.push(cypress);
 const farCypress=addTree(root,{count:4,bounds:{minX:-12,maxX:17,minZ:-17,maxZ:-10},height:[10,14],seed:1916,tint:0x8399ad});plantGroups.push(farCypress);
 // A deliberately oversized moon beyond the roofs turns the final court
 // into a poetic space. It stays behind the architecture and is never a UI disc.
 const moonMaterial=new T.ShaderMaterial({fog:false,toneMapped:false,vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
 varying vec2 p;
 float mh(vec2 a){return fract(sin(dot(a,vec2(127.1,311.7)))*43758.5453);}
 float mn(vec2 a){vec2 i=floor(a),f=fract(a);f=f*f*(3.-2.*f);return mix(mix(mh(i),mh(i+vec2(1.,0.)),f.x),mix(mh(i+vec2(0.,1.)),mh(i+vec2(1.)),f.x),f.y);}
 void main(){vec2 q=p-.5;float edge=sqrt(max(0.,1.-dot(q*2.,q*2.)));float maria=mn(p*9.)*.6+mn(p*19.)*.25+mn(p*42.)*.15;vec3 pearl=mix(vec3(.66,.73,.89),vec3(.93,.93,.85),.62+maria*.32);gl_FragColor=vec4(pearl*(.84+edge*.16),1.);}
 `});
 const moon=new T.Mesh(new T.CircleGeometry(2.15,96),moonMaterial);moon.position.set(-2.5,7.4,-12);moon.name='檐外一轮清月 · 诗意尺度';moon.raycast=()=>{};scene.add(moon);
 const moonBloom=new T.Mesh(new T.CircleGeometry(6.4,64),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{color:{value:new T.Color(0xa8b9e7)}},vertexShader:'varying vec2 p;void main(){p=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform vec3 color;void main(){float r=length(p)*2.;float glow=exp(-r*r*9.)*.105;gl_FragColor=vec4(color,glow);}',toneMapped:false}));moonBloom.position.copy(moon.position).add(V(0,0,-.025));moonBloom.raycast=()=>{};moonBloom.name='远处淡月晕 · 仅在月旁';scene.add(moonBloom);
 // Moonlight illuminates real stone via lights and roughness. No bright oval
 // surface or opaque ground wash is left below the two travelers.
 const courtBounce=new T.PointLight(0xbfd4ee,.30,18,2);courtBounce.position.set(1.4,4.1,5.4);scene.add(courtBounce);
 const pathMoon=mesh(new T.PlaneGeometry(3.6,2.4).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xc2d9eb,transparent:true,opacity:0,depthWrite:false,toneMapped:false}),V(-2.15,.208,-2.1));pathMoon.name='月色入户 · 窗格投影之下';pathMoon.castShadow=false;
 // Original non-repeating alpha shadows replace the repeated canvas leaves.
 const moonShadows=createChengtianMoonShadows(root),inkShadow=moonShadows.mesh;
 // Flowing world-space haze envelopes walls and eaves without covering the
 // moonlit route or using the previous flat white fog strips.
 const haze=createChengtianNightHaze({THREE:T,root}),mist=haze.meshes;
 const moonGallery=createChengtianMoonGallery({THREE:T,root,materials:mats});collisionBoxes.push(...moonGallery.collisionBoxes);
 // Real floor regions and swept body collision, shared by keyboard and click.
 const regions=[{id:'study',minX:-6.70,maxX:5.80,minZ:-4.44,maxZ:-1,y:.20},{id:'threshold',minX:-.96,maxX:1.76,minZ:-1.025,maxZ:-.475,y:.10},{id:'court',minX:-6.45,maxX:6.20,minZ:-.55,maxZ:10.3,y:0},{id:'friend',minX:6.15,maxX:12.50,minZ:-1.85,maxZ:4.88,y:0},{id:'east',minX:6.15,maxX:12.3,minZ:4.80,maxZ:9.8,y:0},{id:'exit',minX:-1.5,maxX:1.5,minZ:9.3,maxZ:11.25,y:0}];
 const bodyRadius=.20,samples=[[0,0],[bodyRadius,0],[-bodyRadius,0],[0,bodyRadius],[0,-bodyRadius],[.141,.141],[-.141,.141],[.141,-.141],[-.141,-.141]],bounds={minX:-6.65,maxX:12.52,minZ:-4.44,maxZ:11.25};
 const inside=(p,b,epsilon=0)=>p.x>=b.minX-epsilon&&p.x<=b.maxX+epsilon&&p.z>=b.minZ-epsilon&&p.z<=b.maxZ+epsilon;
 function heightAt(x,z){const p={x,z};if(inside(p,regions[0],1e-7))return .20;if(inside(p,regions[1],1e-7))return .10;return 0;}
 function walkable(p,clearance=0){const scale=1+clearance/bodyRadius;for(const[dx,dz]of samples){const q={x:p.x+dx*scale,z:p.z+dz*scale};if(!regions.some(b=>inside(q,b)))return false;if(collisionBoxes.some(b=>inside(q,b)))return false;if((levels.get('friend-door')||0)<.985&&q.x>6.08&&q.x<6.53&&q.z>1.15&&q.z<3.08)return false;}return true;}
 function canMove(from,to,clearance=0){if(!from?.isVector3||!to?.isVector3)return false;clearance=typeof clearance==='number'&&Number.isFinite(clearance)?Math.max(0,clearance):0;const distance=Math.hypot(to.x-from.x,to.z-from.z),n=Math.max(1,Math.ceil(distance/.055));let previousY=heightAt(from.x,from.z);for(let i=1;i<=n;i++){const p=from.clone().lerp(to,i/n);if(!walkable(p,clearance))return false;const y=heightAt(p.x,p.z);if(Math.abs(y-previousY)>.215)return false;previousY=y;}return true;}
 function routeTo(goal,from){const target=goal.clone();target.y=heightAt(target.x,target.z);if(!walkable(target)||!walkable(from))return[];if(canMove(from,target))return[target];const step=.20,key=(x,z)=>x+','+z,start={x:Math.round(from.x/step),z:Math.round(from.z/step),g:0,parent:null},open=[start],best=new Map(),closed=new Set();start.f=from.distanceTo(target)/step;let found=null,tries=0;
  while(open.length&&tries++<9000){open.sort((a,b)=>a.f-b.f);const n=open.shift(),k=key(n.x,n.z);if(closed.has(k))continue;closed.add(k);const p=n.parent?V(n.x*step,heightAt(n.x*step,n.z*step),n.z*step):from.clone();if(p.distanceTo(target)<step*1.05&&canMove(p,target)){found=n;break;}for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,q=V(x*step,heightAt(x*step,z*step),z*step);if(q.x<bounds.minX||q.x>bounds.maxX||q.z<bounds.minZ||q.z>bounds.maxZ||!canMove(p,q,.04))continue;const k2=key(x,z),g=n.g+Math.hypot(dx,dz);if(closed.has(k2)||g>=(best.get(k2)??Infinity))continue;best.set(k2,g);open.push({x,z,g,f:g+q.distanceTo(target)/step,parent:n});}}
  if(!found)return[];const points=[];for(let n=found;n?.parent;n=n.parent)points.unshift(V(n.x*step,heightAt(n.x*step,n.z*step),n.z*step));points.push(target);const result=[];let p=from,index=0;while(index<points.length){let next=index;for(let i=index+1;i<points.length;i++){if(!canMove(p,points[i],i===points.length-1?0:.04))break;next=i;}result.push(points[next]);p=points[next];index=next+1;}return result;
 }
 const studyReaderFoot=[-2.75,.20,-1.45],cameraZones=[{id:'study',position:[2.15,2.70,-4.05],lookAt:[-2.40,1.12,-1.85],fov:46,test:p=>p.z<-.72&&p.x<5.75},{id:'seek',position:[12.7,5.1,12.4],lookAt:[4.7,1.25,2.9],fov:44,test:p=>p.x>4.4&&p.z<5},{id:'court',position:[6.8,3.8,17.0],lookAt:[1.6,1.65,4.5],fov:43,test:()=>true}];
 function updateNightView(player){viewPlayer=player?.clone?.()||null;const inStudy=!!player&&cameraZones[0].test(player);for(const m of cutawayMaterials)m.opacity=inStudy?.10:1;}
 function setNightEffect(id,value){const p=T.MathUtils.clamp(Number(value)||0,0,1);targetLevels.set(id,p);return p;}
 function nightProgress(id){return levels.get(id)||0;}
 function setCompanionDestination(p){companionDestination=p?.isVector3?p.clone():Array.isArray(p)?V(...p):null;companionRoute=companion&&companionDestination?routeTo(companionDestination,companion.root.position):[];return companionRoute.length>0;}
 function updateCompanion(dt){companionMoving=false;if(!companion)return;if(companionRoute.length&&dt>0){const goal=companionRoute[0],d=goal.clone().sub(companion.root.position);d.y=0;if(d.length()<=.035)companionRoute.shift();else{const step=Math.min(d.length(),dt*.83),next=companion.root.position.clone().add(d.normalize().multiplyScalar(step));if(canMove(companion.root.position,next)){companion.root.position.copy(next);companion.root.position.y=heightAt(next.x,next.z);companion.root.rotation.y=Math.atan2(-d.x,-d.z);companionMoving=true;}}}companion.animate(sceneTime,companionMoving?1:0,0,1,false);}
 const nightObjects={study,windowShutters,windowLatch,gateLeaves,doorLatch,moonLight,moon,moonBloom,courtBounce,exitMoon,threshold,inkShadow,moonShadows,haze,moonGallery,pathMoon,desk,deskPaper,bamboo,cypress,companion:null,lanterns:[studyLantern,friendLantern],mist,courtyard,studyFloor,friendFloor,nightFootprints:{window:studyReaderFoot,friend:[5.5,0,2.1],court:[1.7,0,6.4],secondShadow:[3.8,0,4.8]}};
 for(const o of cutawayObjects){if(!o.isMesh)continue;const copy=o.material.clone();copy.transparent=true;copy.depthWrite=false;o.material=copy;cutawayMaterials.add(copy);}
 const gateLight=new T.PointLight(0xd5e7f7,0,4.5);gateLight.position.set(0,1,10);scene.add(gateLight);
 function reset(){levels.clear();targetLevels.clear();clock.last=null;sceneTime=0;viewPlayer=null;companionDestination=null;companionRoute=[];companionMoving=false;for(const {g}of windowShutters)g.rotation.y=0;for(const{g,closedAngle}of gateLeaves)g.rotation.y=closedAngle;pathMoon.material.opacity=0;exitMoon.material.uniforms.amount.value=0;moonShadows.reset();moonGallery.reset();haze.reset();moonLight.intensity=2.55;courtBounce.intensity=.30;for(const m of cutawayMaterials)m.opacity=1;if(companion){companion.root.position.set(9.80,0,1.10);companion.root.rotation.y=0;companion.animate(0,0,0,1,false);}}
 function update(t,response=0,frameDt){const dt=Number.isFinite(frameDt)?T.MathUtils.clamp(frameDt,0,.06):clock.last===null?0:T.MathUtils.clamp(t-clock.last,0,.06);clock.last=t;if(!(dt>0))return;sceneTime+=dt;for(const id of['moon-window','friend-door','court-moon']){let p=T.MathUtils.damp(levels.get(id)||0,targetLevels.get(id)||0,id==='court-moon'?1.1:2.8,dt);if(Math.abs(p-(targetLevels.get(id)||0))<.001)p=targetLevels.get(id)||0;levels.set(id,p);}const w=nightProgress('moon-window'),door=nightProgress('friend-door'),court=nightProgress('court-moon');for(const{g,side}of windowShutters)g.rotation.y=side*w*1.28;for(const{g,side,closedAngle}of gateLeaves)g.rotation.y=closedAngle+side*door*1.30;pathMoon.material.opacity=w*.13;exitMoon.material.uniforms.amount.value=w;moonShadows.update(sceneTime,court);moonLight.intensity=2.55+court*.30;courtBounce.intensity=.30+court*.55;haze.update(sceneTime,dt);friendLantern.light.intensity=.78+.28*moonGallery.stats.reveal;updateCompanion(dt);}
 const stage={scene,root,update,reset,targets:[],interact:()=>false,spawn:[-1.4,.20,-3.25],bounds,heightAt,walkable,canMove,routeTo,walkSurfaces,navigationWaypointRadius:.035,gateLight,exit:{position:[0,0,9.6],label:'与怀民缓步归去'},cameraZones,enterCamera:camera=>{camera.up.set(0,1,0);camera.position.fromArray(cameraZones[0].position);camera.lookAt(V(...cameraZones[0].lookAt));camera.fov=cameraZones[0].fov;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);},nightCameraZones:cameraZones,nightExitCamera:{id:'departure',position:[3.2,3.1,-4.15],lookAt:[-.15,1.05,-.35],fov:49},nightObjects,setNightEffect,nightProgress,updateNightView,updateGardenView:updateNightView,setCompanionDestination,updateCompanion,studyReaderFoot,gardenStudy:{desk,deskPaper,readerFoot:studyReaderFoot,doorFoot:[.4,.20,-1.2],roomBounds:{minX:-6.65,maxX:5.75,minZ:-4.44,maxZ:-1.12},doorBounds:{minX:-1,maxX:1.8,z:-1},cutawayObjects},nightInkSockets:[{id:'moon-window',inkFace:windowLatch,position:[0,0,.046],width:.54,height:.60},{id:'friend-door',inkFace:doorLatch,position:[-.052,0,0],rotation:[0,-Math.PI/2,0],width:.56,height:.63}],nightNavigation:{regions,collisionBoxes,bodyRadius,walkable,canMove,routeTo},nightSceneMetadata:{sourcePeriod:'元丰六年（1083）· 黄州',setting:'以《记承天寺夜游》为依据的原创诗意建筑空间；非史实复原。',plantNote:'柏意象使用松柏类常青本地植物模型。',noPond:true,noFruit:true,noBridge:true,foregroundFog:false,spatialHaze:true,originalShadowTexture:true,groundFog:false,groundGlowOverlay:false,poeticMoon:true,continuousOutdoorFloor:true}};
 Object.defineProperty(stage,'nightSceneStats',{get:()=>({time:sceneTime,levels:Object.fromEntries(levels),companionReady:!!companion,companionMoving,companionPosition:companion?.root.position.toArray()||null,plantGroups:plantGroups.length,plantsLoaded:plantGroups.every(g=>g.userData.loaded),walkSurfaces:walkSurfaces.length,collisionBoxes:collisionBoxes.length,foregroundFog:false,spatialHaze:true,hazeTime:haze.stats.simulationTime,hazeFlow:haze.stats.flowDistance,shadowArtworkLoaded:moonShadows.stats.loaded,groundFog:false,groundGlowOverlay:false,poeticMoon:true,continuousOutdoorFloor:true,realDryCourtyard:true})});
 stage.ready=Promise.all([moonShadows.ready,moonGallery.ready,...plantGroups.map(g=>g.userData.ready),createTraveler().then(actor=>{companion=actor;actor.root.name='张怀民 · 同游实体人物';actor.root.position.set(9.80,0,1.10);actor.root.rotation.y=0;actor.body.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.color?.lerp(new T.Color(0x6682a1),.16);m.roughness=.96;}if(/brush|pen/i.test(o.name))o.visible=false;});const penTip=actor.body.getObjectByName('BrushTip');if(penTip)penTip.visible=false;root.add(actor.root);nightObjects.companion=actor;})]).then(()=>{root.updateMatrixWorld(true);reset();return stage;});
 return stage;
}
