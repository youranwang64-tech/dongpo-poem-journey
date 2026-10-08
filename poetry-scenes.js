import * as T from './vendor/three.module.js';
import {createAtmosphere} from './atmosphere.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const clamp=T.MathUtils.clamp;
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function canvasTexture(canvas){const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
function fontReady(){return document.fonts?.load('72px Poem')||Promise.resolve();}
function paperTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),r=rng(182);ctx.fillStyle='#e8e5dd';ctx.fillRect(0,0,512,512);
 for(let i=0;i<18500;i++){ctx.fillStyle=r()>.5?'rgba(91,86,76,.020)':'rgba(252,250,243,.08)';ctx.fillRect(r()*512,r()*512,.3+r()*.8,1+r()*5);}
 for(let i=0;i<35;i++){const x=r()*512,y=r()*512,rad=30+r()*160,g=ctx.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,'rgba(127,120,108,.014)');g.addColorStop(1,'rgba(127,120,108,0)');ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);}
 const t=canvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;return t;
}
function dustField(scene,{seed=12,count=140,color=0xddd5b9,opacity=.2,bounds=[22,12,40],height=-2}={}){
 const r=rng(seed),p=[],a=[];for(let i=0;i<count;i++){p.push((r()-.5)*bounds[0],height+r()*bounds[1],(r()-.5)*bounds[2]);a.push(r()*6.28,r()*.7+.3);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('drift',new T.Float32BufferAttribute(a,2));
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},opacity:{value:opacity},tint:{value:new T.Color(color)}},vertexShader:'attribute vec2 drift;uniform float time,opacity;varying float alpha;void main(){vec3 p=position;p.x+=sin(time*.08+drift.x)*.22;p.y+=sin(time*.10+drift.x)*.13;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(24./max(1.,-mv.z),.8,2.1);alpha=opacity*(.35+drift.y*.65);}',fragmentShader:'uniform vec3 tint;varying float alpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(tint,alpha*(1.-d*d));}'});const o=new T.Points(g,m);scene.add(o);return {update:t=>m.uniforms.time.value=t,node:o};
}
function glyphTexture(text,size=96){const c=document.createElement('canvas');c.width=Math.max(128,text.length*size);c.height=128;const x=c.getContext('2d');x.fillStyle='#fff';x.font=`${size-10}px Poem,serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,c.width/2,67);return {canvas:c,texture:canvasTexture(c)};}
function particleWord(scene,text,position,{width=4,color=0xc8d0c3}={}){
 const {canvas}=glyphTexture(text),ctx=canvas.getContext('2d'),im=ctx.getImageData(0,0,canvas.width,canvas.height).data,p=[],seeds=[],r=rng(text.charCodeAt(0));
 for(let y=0;y<canvas.height;y+=2)for(let x=0;x<canvas.width;x+=2)if(im[(y*canvas.width+x)*4+3]>140){p.push((x/canvas.width-.5)*width,(.5-y/canvas.height)*width*canvas.height/canvas.width,0);seeds.push(r(),r(),r());}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('seed',new T.Float32BufferAttribute(seeds,3));const m=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},form:{value:0},opacity:{value:0},color:{value:new T.Color(color)}},vertexShader:'attribute vec3 seed;uniform float time,form,opacity;varying float a;void main(){vec3 p=position;p+=vec3(sin(seed.x*32.+time*.22),cos(seed.y*24.+time*.16),sin(seed.z*35.))*(1.-form)*1.2;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(63./max(1.,-mv.z),1.,2.4);a=opacity*(.65+seed.y*.35);}',fragmentShader:'uniform vec3 color;varying float a;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(color,a*(1.-d*.5));}'});const o=new T.Points(g,m);o.position.fromArray(position);o.frustumCulled=false;scene.add(o);return {object:o,update:(t,form,opacity)=>{m.uniforms.time.value=t;m.uniforms.form.value=form;m.uniforms.opacity.value=opacity;}};
}

let lycheeMaps;
function lycheeTextures(){
 if(lycheeMaps)return lycheeMaps;const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d'),r=rng(847),rows=26,cols=28,cellW=c.width/cols,cellH=c.height/rows;ctx.fillStyle='#972e2a';ctx.fillRect(0,0,c.width,c.height);
 for(let y=-1;y<=rows;y++)for(let x=-1;x<=cols;x++){
  const xx=(x+(y%2)*.5)*cellW+(r()-.5)*7,yy=y*cellH+(r()-.5)*7,rad=cellW*(.43+r()*.12),h=2+r()*8,s=57+r()*17,l=31+r()*13,g=ctx.createRadialGradient(xx-rad*.25,yy-rad*.32,rad*.05,xx,yy,rad);
  g.addColorStop(0,`hsl(${h},${s-3}%,${l+16}%)`);g.addColorStop(.42,`hsl(${h},${s}%,${l+5}%)`);g.addColorStop(.82,`hsl(${h},${s}%,${l}%)`);g.addColorStop(1,`hsl(${h},${s-7}%,${l-9}%)`);ctx.fillStyle=g;ctx.beginPath();for(let k=0;k<6;k++){const a=k/6*Math.PI*2,rr=rad*(.88+r()*.17);if(k)ctx.lineTo(xx+Math.cos(a)*rr,yy+Math.sin(a)*rr);else ctx.moveTo(xx+Math.cos(a)*rr,yy+Math.sin(a)*rr);}ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(245,186,139,.16)';ctx.beginPath();ctx.ellipse(xx-rad*.18,yy-rad*.21,rad*.21,rad*.10,-.5,0,Math.PI*2);ctx.fill();
 }
 for(let i=0;i<80;i++){const xx=r()*1024,yy=r()*1024,rad=22+r()*85,g=ctx.createRadialGradient(xx,yy,0,xx,yy,rad);g.addColorStop(0,r()>.45?'rgba(174,161,102,.06)':'rgba(112,25,33,.09)');g.addColorStop(1,'rgba(142,95,63,0)');ctx.fillStyle=g;ctx.fillRect(xx-rad,yy-rad,rad*2,rad*2);}
 const bump=document.createElement('canvas');bump.width=bump.height=1024;const bc=bump.getContext('2d');bc.drawImage(c,0,0);lycheeMaps={map:canvasTexture(c),bump:canvasTexture(bump)};return lycheeMaps;
}
function lycheeShell(){const g=new T.SphereGeometry(1,40,28),p=g.attributes.position;for(let i=0;i<p.count;i++){const v=V().fromBufferAttribute(p,i),n=v.clone().normalize();const ridges=(Math.sin(n.x*37.+n.z*11.)*Math.sin(n.y*34.+n.x*9.)+Math.cos(n.z*31.-n.y*13.)*.35)*.010;const natural=Math.sin(n.y*4.1+n.z*3.)*.018+Math.sin(n.x*5.2-n.z*2.)*.012;v.multiplyScalar(1+ridges+natural);v.y*=1.12;v.x*=1.025;p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();return g;}

export function buildLycheeVignette(){
 const scene=new T.Scene();scene.background=new T.Color(0xeeeae2);scene.fog=new T.FogExp2(scene.background,.018);scene.userData.saturation=.9;const r=rng(718),maps=lycheeTextures(),shellMaterial=new T.MeshStandardMaterial({map:maps.map,bumpMap:maps.bump,bumpScale:.055,roughness:.82,color:0xfffaf5});
 scene.add(new T.HemisphereLight(0xfffaf0,0x75413a,.86));const key=new T.DirectionalLight(0xfff5e7,2.65);key.position.set(-9,12,13);scene.add(key);const rim=new T.DirectionalLight(0xe5ede6,.90);rim.position.set(10,5,-10);scene.add(rim);
 const count=300,shells=new T.InstancedMesh(lycheeShell(),shellMaterial,count),stems=new T.InstancedMesh(new T.CylinderGeometry(.045,.08,.23,7),new T.MeshStandardMaterial({color:0x635442,roughness:1}),count),o=new T.Object3D(),data=[],pointer=new T.Vector2(),pointerTarget=new T.Vector2();shells.castShadow=false;shells.receiveShadow=false;stems.castShadow=false;shells.instanceMatrix.setUsage(T.DynamicDrawUsage);stems.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(shells,stems);
 for(let i=0;i<count;i++){const front=i<18,scale=front?.64+r()*.40:.25+r()*.39,x=(r()-.5)*(front?13:23),y=(r()-.5)*11.5,z=front?-2+r()*8:-19+r()*20,at=i<12?i*.10:.5+(i-12)/288*11.5+r()*1.0;data.push({x,y,z,scale,at,phase:r()*6.28,ax:r()*6.28,az:r()*6.28,spin:(r()-.5)*.34});shells.setColorAt(i,new T.Color().setHSL(.006+r()*.012,.25+r()*.14,.79+r()*.09));}
 for(const fruit of data){const margin=(18-fruit.z)*Math.tan(43*Math.PI/360)*(16/9)*.70-fruit.scale*1.25;fruit.x=clamp(fruit.x,-margin,margin);}
 const paper=new T.Mesh(new T.PlaneGeometry(90,65),new T.MeshBasicMaterial({map:paperTexture(),color:0xfffdf8,fog:false}));paper.position.set(0,0,-32);scene.add(paper);const dust=dustField(scene,{seed:98,count:90,color:0x9d9689,opacity:.11,bounds:[24,16,25],height:-7});
 const result={scene,cinematic:true,paper:true,duration:16,counter:0,counterMax:300,camera:{position:[0,0,18],lookAt:[0,0,-2],fov:43},verseEvents:[{at:.8,text:'罗浮山下四时春'},{at:4.2,text:'卢橘杨梅次第新',left:true},{at:8.0,text:'日啖荔枝三百颗'},{at:11.8,text:'不辞长作岭南人',left:true}],ready:Promise.resolve(),setPointer:(x,y)=>pointerTarget.set(clamp(x,-1,1),clamp(y,-1,1)),update,reset:()=>{pointer.set(0,0);pointerTarget.set(0,0);update(0);}};
 function update(time,response=0){const t=Math.max(0,time);pointer.lerp(pointerTarget,.03);let shown=0;for(let i=0;i<count;i++){const a=data[i],age=t-a.at,form=smooth(0,2.8,age),depthFactor=(a.z+20)/26;if(age<0){o.scale.setScalar(.0001);o.position.set(a.x,20,a.z);}else{shown++;o.position.set(a.x+Math.sin(age*.17+a.phase)*.18+pointer.x*depthFactor*.24,a.y+(1-form)*11+Math.sin(age*.24+a.phase)*.09-pointer.y*depthFactor*.15,a.z+Math.sin(age*.13+a.phase)*.16);o.scale.setScalar(a.scale);}
  o.rotation.set(a.ax+Math.max(0,age)*a.spin,a.phase+Math.max(0,age)*.06,a.az+Math.max(0,age)*a.spin*.6);o.updateMatrix();shells.setMatrixAt(i,o.matrix);const cap=V(0,1.14,0).applyQuaternion(o.quaternion).multiplyScalar(a.scale);o.position.add(cap);o.scale.setScalar(age<0?.0001:a.scale);o.updateMatrix();stems.setMatrixAt(i,o.matrix);
 }shells.instanceMatrix.needsUpdate=true;stems.instanceMatrix.needsUpdate=true;dust.update(t);result.counter=shown;}
 update(0);return result;
}

function moonTexture(){const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d'),r=rng(548);ctx.fillStyle='#e4e3d9';ctx.fillRect(0,0,c.width,c.height);for(let i=0;i<150;i++){const x=r()*1024,y=r()*512,rad=5+r()*90,g=ctx.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,`rgba(85,101,102,${.02+r()*.15})`);g.addColorStop(.7,'rgba(108,118,110,.025)');g.addColorStop(1,'rgba(128,139,125,0)');ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);}for(let i=0;i<240;i++){const x=r()*1024,y=r()*512,rad=2+r()*17;ctx.strokeStyle=`rgba(107,116,104,${.035+r()*.08})`;ctx.lineWidth=.6+rad*.07;ctx.beginPath();ctx.ellipse(x,y,rad,rad*.75,r()*6.28,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(237,238,210,.14)';ctx.beginPath();ctx.ellipse(x-rad*.1,y-rad*.13,rad*.94,rad*.7,0,.2,2.6);ctx.stroke();}return canvasTexture(c);}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),g=x.createRadialGradient(128,128,15,128,128,128);g.addColorStop(0,'rgba(220,226,207,.13)');g.addColorStop(.40,'rgba(184,203,194,.06)');g.addColorStop(1,'rgba(148,180,173,0)');x.fillStyle=g;x.fillRect(0,0,256,256);return canvasTexture(c);}
function cloudTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d'),im=ctx.createImageData(512,192),fract=x=>x-Math.floor(x),hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),u=fract(x),v=fract(y),a=u*u*(3-2*u),b=v*v*(3-2*v),m=(x,y,t)=>x+(y-x)*t;return m(m(hash(ix,iy),hash(ix+1,iy),a),m(hash(ix,iy+1),hash(ix+1,iy+1),a),b);};
 for(let y=0;y<192;y++)for(let x=0;x<512;x++){const u=x/512,v=y/192,low=noise(u*5.2+3.1,v*3.1+4.3),fold=noise(u*10.3+6,v*5.4+9),detail=noise(u*22.1+8,v*13.2+7),density=low*.62+fold*.28+detail*.10,center=.48+(noise(u*4.2+19,2.2)-.5)*.27,band=Math.exp(-Math.pow((v-center)*4.1,2)),edge=Math.pow(Math.sin(u*Math.PI),.8),alpha=smooth(.28,.77,density)*band*edge*.41,i=(y*512+x)*4,lum=33+low*19+(1-v)*8;im.data[i]=lum*.88;im.data[i+1]=lum*1.05;im.data[i+2]=lum*1.08;im.data[i+3]=alpha*255;}ctx.putImageData(im,0,0);return canvasTexture(c);
}

export function buildMoonVignette(){
 const scene=new T.Scene(),r=rng(190);scene.background=new T.Color(0x13252b);scene.fog=new T.FogExp2(scene.background,.009);scene.userData.saturation=.44;const moonPosition=V(4.0,13.5,-62);
 const sky=new T.Mesh(new T.SphereGeometry(180,48,32),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color(0x091720)},mid:{value:new T.Color(0x203941)},horizon:{value:new T.Color(0x516965)}},vertexShader:'varying vec3 wp;void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}',fragmentShader:'varying vec3 wp;uniform vec3 top,mid,horizon;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}void main(){vec3 d=normalize(wp-cameraPosition);float y=d.y,vertical=smoothstep(.015,.22,y),haze=exp(-pow((y+.012)/.056,2.));vec3 col=mix(mid,top,vertical);col=mix(col,horizon,haze*.82);float folds=noise(vec2(d.x*4.3+12.,d.y*8.7+4.))* .65+noise(vec2(d.x*11.2+5.,d.y*17.1+2.))*.35;col*=.92+folds*.11;gl_FragColor=vec4(col,1.);}'}));sky.renderOrder=-10;scene.add(sky);

 const moon=new T.Mesh(new T.SphereGeometry(3.2,64,48),new T.MeshBasicMaterial({map:moonTexture(),color:0xfff6e1,fog:false}));moon.position.copy(moonPosition);moon.rotation.y=.7;scene.add(moon);const halo=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),color:0xd9e4d5,transparent:true,opacity:.55,depthWrite:false,fog:false}));halo.position.copy(moonPosition).add(V(0,0,-.2));halo.scale.set(19,19,1);scene.add(halo);
 const cloudMap=cloudTexture(),clouds=[];for(let i=0;i<14;i++){const lower=i<5,far=i<10,o=new T.Sprite(new T.SpriteMaterial({map:cloudMap,color:lower?0xabc0b9:0x9fb5b4,transparent:true,opacity:lower?.38:.30,depthWrite:false,fog:false}));const x=lower?-42+i*21:i<10?-43+(i-5)*22:-34+(i-10)*23,y=lower?5.3+r()*2.7:12+r()*12,z=far?-73-r()*22:-47-r()*10;o.position.set(x,y,z);o.scale.set(lower?40+r()*23:34+r()*27,lower?3.1+r()*3.2:5+r()*5.5,1);scene.add(o);clouds.push({o,x:o.position.x,z:o.position.z,phase:r()*6.28});}

 const oceanMaterial=new T.ShaderMaterial({uniforms:{time:{value:0},moon:{value:moonPosition}},vertexShader:`uniform float time;varying vec3 wp,nw;void main(){vec3 p=position;float a=p.x*.23+p.z*.17+time*.31,b=p.x*-.31+p.z*.42-time*.26,c=p.x*.69-p.z*.28+time*.19;p.y+=.065*sin(a)+.041*sin(b)+.021*sin(c);nw=normalize(vec3(-.01495*cos(a)+.01271*cos(b)-.01449*cos(c),1.,-.01105*cos(a)-.01722*cos(b)+.00588*cos(c)));wp=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,fragmentShader:`uniform float time;uniform vec3 moon;varying vec3 wp,nw;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}void main(){vec2 p=wp.xz,adv=vec2(time*.045,-time*.061),rot=mat2(.87,-.493,.493,.87)*p;float n=noise(p*vec2(1.65,6.4)+adv),crossing=noise(rot*vec2(2.25,7.3)-adv*.65),wide=noise(p*.18+adv*.09);float gradX=noise((p+vec2(.06,0.))*vec2(1.65,6.4)+adv)-n,gradZ=noise((p+vec2(0.,.06))*vec2(1.65,6.4)+adv)-n;vec3 normal=normalize(nw+vec3(-gradX*.12,0.,-gradZ*.055)),view=normalize(cameraPosition-wp),halfV=normalize(view+normalize(moon-wp));float fresnel=pow(1.-max(dot(normal,view),0.),3.3),spec=pow(max(dot(normal,halfV),0.),95.);float pathX=cameraPosition.x+(moon.x-cameraPosition.x)*(cameraPosition.z-wp.z)/(cameraPosition.z-moon.z),waterDepth=max(0.,cameraPosition.z-wp.z),width=.32+waterDepth*.017,bend=(noise(p*.29+adv*.08)-.5)*(.45+waterDepth*.004);float glint=smoothstep(.66,.93,n)*smoothstep(.43,.89,crossing),reflection=exp(-pow((wp.x-pathX+bend)/width,2.))*glint;vec3 col=mix(vec3(.011,.024,.028),vec3(.047,.078,.081),fresnel);col+=vec3(.47,.55,.50)*(spec*glint*.085+reflection*.28);col+=pow(n*crossing,10.)*.007;float mist=1.-exp(-length(p-cameraPosition.xz)*.011);col=mix(col,vec3(.061,.097,.094),mist*.67);col*=.97+wide*.05;gl_FragColor=vec4(col,1.);}`});const ocean=new T.Mesh(new T.PlaneGeometry(450,450,220,220).rotateX(-Math.PI/2),oceanMaterial);ocean.position.z=-100;scene.add(ocean);

 const atmosphere=createAtmosphere(scene,{seed:315,color:0x8caaa0,mistOpacity:.15,mistCount:10,mistBounds:{minX:-36,maxX:36,minZ:-85,maxZ:-25},dust:0,countRain:0});const dust=dustField(scene,{seed:72,count:50,color:0xbccbbd,opacity:.13,bounds:[50,18,60],height:2});let placeWords=[];
 const ready=fontReady().then(()=>{placeWords=[particleWord(scene,'黄州',[-6,2.4,-21],{width:3.9,color:0xe0e5da}),particleWord(scene,'惠州',[0,2.8,-25],{width:4.1,color:0xe0e5da}),particleWord(scene,'儋州',[6.3,2.4,-22],{width:3.9,color:0xe0e5da})];});
 function update(time,response=0){const t=Math.max(0,time);oceanMaterial.uniforms.time.value=t;for(const c of clouds)c.o.position.x=c.x+Math.sin(t*.015+c.phase)*2.8;atmosphere.update(t);dust.update(t);for(let i=0;i<placeWords.length;i++){const at=7.1+i*2.25,form=smooth(at,at+1.1,t),opacity=smooth(at,at+.8,t)*(1-smooth(14.2,15.0,t));placeWords[i].update(t,form,opacity*.82);}}
 return {scene,cinematic:true,duration:15,camera:{position:[0,4.4,17],lookAt:[0,3.2,-40],fov:43},verseEvents:[{at:.8,text:'心似已灰之木',left:true},{at:4.1,text:'身如不系之舟'},{at:7.5,text:'问汝平生功业',left:true},{at:11.4,text:'黄州惠州儋州'}],ready,update,reset:()=>update(0)};
}

function inkRidge(scene,{seed,z,width=90,height=6,color=0x7b8176,opacity=.4}){const r=rng(seed),nx=120,nz=8,p=[],uv=[],indices=[],phases=[r()*6.28,r()*6.28,r()*6.28];for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const x=(i/nx-.5)*width,u=j/nz,crest=height*(.35+.22*Math.sin(x*.11+phases[0])+.19*Math.sin(x*.22+phases[1])+.13*Math.cos(x*.42+phases[2]));p.push(x,-1.4+Math.sin(u*Math.PI)*Math.max(.2,crest),z-u*10);uv.push(i/nx,u);}for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const n=i*(nz+1)+j;indices.push(n,n+1,n+nz+1,n+1,n+nz+2,n+nz+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const o=new T.Mesh(g,new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthWrite:false}));scene.add(o);return o;}

export function buildHomeVignette(){
 const scene=new T.Scene();scene.background=new T.Color(0xdcd8c8);scene.fog=new T.FogExp2(scene.background,.027);scene.userData.saturation=.18;const paper=new T.Mesh(new T.PlaneGeometry(150,80),new T.MeshBasicMaterial({map:paperTexture(),color:0xeee8d8,fog:false}));paper.position.set(0,9,-68);scene.add(paper);
 const ridges=[inkRidge(scene,{seed:315,z:-45,height:8,color:0x999c8e,opacity:.26}),inkRidge(scene,{seed:572,z:-31,height:4.7,color:0x818b7d,opacity:.20}),inkRidge(scene,{seed:964,z:-19,height:2.9,color:0x778475,opacity:.12})];
 const water=new T.Mesh(new T.PlaneGeometry(140,160).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xb7beb0,transparent:true,opacity:.13,depthWrite:false}));water.position.set(0,-1.65,-40);scene.add(water);const dust=dustField(scene,{seed:481,count:130,color:0x6e7867,opacity:.14,bounds:[44,17,50],height:-3});
 const atmosphere=createAtmosphere(scene,{seed:222,color:0xc4cdc0,mistOpacity:.12,mistCount:8,mistBounds:{minX:-35,maxX:35,minZ:-45,maxZ:-8},dust:0,countRain:0});
 function update(time,response=0){const t=Math.max(0,time);dust.update(t);atmosphere.update(t);for(let i=0;i<ridges.length;i++)ridges[i].material.opacity=[.26,.20,.12][i]*(.88+Math.sin(t*.055+i)*.08);}
 return {scene,cinematic:true,paper:true,duration:12,camera:{position:[0,3.4,22],lookAt:[0,2.6,-15],fov:38},verseEvents:[{at:1.2,text:'此心安处是吾乡'}],ready:Promise.resolve(),update,reset:()=>update(0)};
}

export function buildPrologue(){
 const scene=new T.Scene(),ivory=new T.Color(0xded9c8),ink=new T.Color(0x192720);
 scene.background=ivory.clone();scene.fog=new T.FogExp2(scene.background,.016);scene.userData.saturation=.25;
 const ambient=new T.HemisphereLight(0xe5e4d2,0x697c6b,.93),key=new T.DirectionalLight(0xffefd0,2.45),rim=new T.DirectionalLight(0xb9cabe,.75);
 key.position.set(-11,18,11);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-18,right:18,top:24,bottom:-18,near:.5,far:70});key.shadow.normalBias=.03;key.shadow.bias=-.0003;rim.position.set(9,8,-15);scene.add(ambient,key,rim);
 const bodyMat=new T.MeshStandardMaterial({map:paperTexture(),color:0x435749,roughness:.90}),capMat=new T.MeshStandardMaterial({color:0x506657,roughness:.82});
 const floor=new T.Mesh(new T.PlaneGeometry(140,140).rotateX(-Math.PI/2),new T.MeshStandardMaterial({map:paperTexture(),color:0xc2c2ad,roughness:1}));floor.position.y=-.10;floor.receiveShadow=true;scene.add(floor);
 const dust=dustField(scene,{seed:620,count:110,color:0xb7b5a0,opacity:.12,bounds:[27,8,32],height:1}),o=new T.Object3D(),cols=14,tileData=[];
 const raycaster=new T.Raycaster(),pickObjects=[],selectors=[],readPoems=new Set(),formedPoems=new Set(),events=[],formSeconds=1.65,fullExperienceSeconds=18;
 let tiles=null,caps=null,glyphs=null,lastTime=0,lastResponse=0,catalog=[],eventFor=null,selected=null,selectionAt=0,selectionToken=0,awaitingRead=false,selectedTiles=[],selectionFrom=[],previousHit=-1,pressActive=false,eventIssued=false,closingAt=null,inkParticles=null;
 const cameraSpec={position:[0,12.5,18],lookAt:[0,0,-2],fov:43},result={scene,cinematic:true,interactive:true,camera:cameraSpec,ready:null,update,reset,pointerDown,pointerMove,pointerUp,takePoemEvent,confirmPoemRead,typesetRows:[],typesetText:'',sourcePoems:[],
  get paper(){return closingAt===null||lastTime-closingAt<6.4;},
  get duration(){return closingAt===null?12:closingAt+12;},
  get verseEvents(){return closingAt===null?[]:[{at:closingAt+.5,text:'名动天下'},{at:closingAt+4.5,text:'千载诗心'},{at:closingAt+8.8,text:'东坡行记',left:true}];},
  get canContinue(){return closingAt!==null&&lastTime-closingAt>=12;},get finished(){return result.canContinue;},get gestureActive(){return pressActive;},
  get hint(){return closingAt!==null?'行旅已尽，诗仍在山川之间。':selected?'字版已排成《'+selected.title+'》。也可以点另一片字版，换一首诗。':'点击一块字版，看附近的活字排成苏轼的诗。左边是山，中间是春江，右边是西湖。';},
  get prologueStats(){return {ready:!!tiles,phase:closingAt!==null?'closing':!selected?'choosing':lastTime-selectionAt<formSeconds?'forming':'reading',selected:selected?.id||null,title:selected?.title||'',selectionAge:selected?Math.max(0,lastTime-selectionAt):0,selectionToken,awaitingRead,formSeconds,fullExperienceSeconds,formed:[...formedPoems],read:[...readPoems],selectedTiles:selectedTiles.slice(),closingAge:closingAt===null?0:Math.max(0,lastTime-closingAt),canContinue:result.canContinue,finished:result.finished,blocks:tileData.length,eventsPending:events.length};},
  getPoemChoices(camera){return selectors.map(s=>{const p=s.position.clone().project(camera);return {id:s.userData.poemId,title:s.userData.title,x:p.x,y:p.y,visible:Math.abs(p.x)<.99&&Math.abs(p.y)<.99&&p.z>-1&&p.z<1};});}
 };

 // A single ordered passage runs across the rows; blank final type slots are not invented verse.
 const passages=[
  ['题西林壁','横看成岭侧成峰，远近高低各不同。','不识庐山真面目，只缘身在此山中。'],
  ['定风波·莫听穿林打叶声','莫听穿林打叶声，何妨吟啸且徐行。','回首向来萧瑟处，归去，也无风雨也无晴。'],
  ['念奴娇·赤壁怀古','大江东去，浪淘尽，千古风流人物。','人间如梦，一尊还酹江月。'],
  ['惠州一绝','罗浮山下四时春，卢橘杨梅次第新。','日啖荔枝三百颗，不辞长作岭南人。'],
  ['自题金山画像','心似已灰之木，身如不系之舟。','问汝平生功业，黄州惠州儋州。'],
  ['定风波·南海归赠王定国侍人寓娘','常羡人间琢玉郎，天应乞与点酥娘。','试问岭南应不好，却道：此心安处是吾乡。']
 ];
 result.ready=Promise.all([fontReady(),import('./prologue-poems.js'),fetch(new URL('./原文与参考视频对应.txt',import.meta.url)).then(response=>{if(!response.ok)throw new Error('彩蛋诗文读取失败');return response.text();})]).then(([,library,source])=>{
  catalog=library.PROLOGUE_POEMS;eventFor=library.prologuePoemEvent;
  const background=passages.filter(([title])=>title!=='题西林壁').map(([title,start,end])=>{const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0)throw new Error(`彩蛋原文缺少《${title}》`);return {title,text:(source.slice(a,b+end.length).match(/[\u4e00-\u9fff]/g)||[]).join('')};});
  const poems=[...catalog.map(p=>({title:p.title,text:p.lines.join('')})),...background];
  const text=poems.map(p=>p.text).join(''),rows=Math.ceil(text.length/cols),count=rows*cols,chars=Array.from(new Set(text)),atlasSize=16,cellSize=128;
  result.typesetText=text;result.sourcePoems=poems;result.typesetRows=Array.from({length:rows},(_,row)=>text.slice(row*cols,(row+1)*cols).padEnd(cols,' '));
  const canvas=document.createElement('canvas');canvas.width=canvas.height=atlasSize*cellSize;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.font='98px Poem,serif';ctx.textAlign='center';ctx.textBaseline='middle';
  chars.forEach((ch,i)=>ctx.fillText(ch,(i%atlasSize+.5)*cellSize,(Math.floor(i/atlasSize)+.5)*cellSize+5));
  const atlas=canvasTexture(canvas);atlas.generateMipmaps=true;atlas.minFilter=T.LinearMipmapLinearFilter;atlas.magFilter=T.LinearFilter;
  // Slightly bevelled wood gives each type a lit edge and a substantial vertical side.
  const shape=new T.Shape();shape.moveTo(-.47,-.49);shape.lineTo(.47,-.49);shape.lineTo(.47,.49);shape.lineTo(-.47,.49);shape.closePath();
  const bodyGeometry=new T.ExtrudeGeometry(shape,{depth:.68,steps:1,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:1}).rotateX(-Math.PI/2);
  tiles=new T.InstancedMesh(bodyGeometry,bodyMat,count);tiles.name='prologue-type-blocks';tiles.castShadow=true;tiles.receiveShadow=true;
  caps=new T.InstancedMesh(new T.BoxGeometry(.965,.055,1.005),capMat,count);caps.name='prologue-type-caps';caps.castShadow=true;caps.receiveShadow=true;
  const glyphGeometry=new T.PlaneGeometry(.82,.84).rotateX(-Math.PI/2),cell=new Float32Array(count*2),selection=new Float32Array(count),glyphIndex=new Map(chars.map((ch,i)=>[ch,i]));
  for(let i=0;i<count;i++){const n=glyphIndex.get(text[i]);cell[i*2]=n===undefined?-1:n%atlasSize;cell[i*2+1]=n===undefined?-1:atlasSize-1-Math.floor(n/atlasSize);}
  glyphGeometry.setAttribute('atlasCell',new T.InstancedBufferAttribute(cell,2));
  glyphGeometry.setAttribute('selectedType',new T.InstancedBufferAttribute(selection,1));
  const glyphMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{atlas:{value:atlas},tint:{value:new T.Color(0xf0eada)},opacity:{value:.96}},vertexShader:`attribute vec2 atlasCell;attribute float selectedType;varying vec2 glyphUV;varying float hasGlyph;varying float chosen;void main(){glyphUV=(uv+atlasCell)/16.;hasGlyph=step(0.,atlasCell.x);chosen=selectedType;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D atlas;uniform vec3 tint;uniform float opacity;varying vec2 glyphUV;varying float hasGlyph;varying float chosen;void main(){float a=texture2D(atlas,glyphUV).a*opacity*hasGlyph*mix(.64,1.,chosen);if(a<.045)discard;gl_FragColor=vec4(mix(tint,vec3(.995,.966,.866),chosen),a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  glyphs=new T.InstancedMesh(glyphGeometry,glyphMaterial,count);glyphs.name='prologue-printed-verses';glyphs.renderOrder=2;
  for(const mesh of [tiles,caps,glyphs]){mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;scene.add(mesh);}
  for(let i=0;i<count;i++){const row=Math.floor(i/cols),col=i%cols;tileData.push({row,col,x:(col-(cols-1)/2)*1.13,z:8.0-row*1.16,char:text[i]||' ',atlas:glyphIndex.get(text[i]),poemId:catalog[Math.min(2,Math.floor(col/cols*3))].id});}
  pickObjects.push(tiles,caps);
  const inkGeometry=new T.BufferGeometry(),inkOrigins=new Float32Array(28*18*3),inkSeeds=new Float32Array(28*18*3),rr=rng(7391);for(let i=0;i<inkSeeds.length;i++)inkSeeds[i]=rr();
  inkGeometry.setAttribute('position',new T.Float32BufferAttribute(inkOrigins,3));inkGeometry.setAttribute('seed',new T.Float32BufferAttribute(inkSeeds,3));
  const inkMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{age:{value:9}},vertexShader:'attribute vec3 seed;uniform float age;varying float a;void main(){float born=seed.z*.55;float d=max(0.,age-born);vec3 p=position+vec3((seed.x-.5)*d*.58,d*(.7+seed.y)*.72,(seed.z-.5)*d*.3);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(38./max(1.,-mv.z),.9,2.8);a=smoothstep(born,born+.12,age)*(1.-smoothstep(1.2,2.5,d))*.38;}',fragmentShader:'varying float a;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.11,.16,.12,a*(1.-d*d));}'});
  inkParticles=new T.Points(inkGeometry,inkMaterial);inkParticles.name='选诗活字升起的墨粒';inkParticles.frustumCulled=false;inkParticles.visible=false;scene.add(inkParticles);
  catalog.forEach((poem,index)=>{const c=document.createElement('canvas');c.width=768;c.height=160;const x=c.getContext('2d');x.fillStyle='rgba(231,226,207,.94)';x.fillRect(0,0,c.width,c.height);x.strokeStyle='rgba(88,104,83,.40)';x.lineWidth=2;x.strokeRect(8,8,c.width-16,c.height-16);x.fillStyle='#344737';x.font='43px Poem,serif';x.textAlign='center';x.textBaseline='middle';x.fillText(poem.title,384,67);x.font='27px Poem,serif';x.fillText('点字版 · '+poem.word,384,119);const label=new T.Sprite(new T.SpriteMaterial({map:canvasTexture(c),transparent:true,depthTest:true,depthWrite:false}));label.name='可选择的原诗：'+poem.title;label.position.set((index-1)*5.25,1.35,9.6);label.scale.set(4.8,1.0,1);label.userData.poemId=poem.id;label.userData.title=poem.title;scene.add(label);selectors.push(label);pickObjects.push(label);});
  result.userData={atlasIndex:glyphIndex};
  update(lastTime,lastResponse);return result;
 });

 function pick(ndc,camera){if(!tiles||!camera||closingAt!==null)return null;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(ndc,camera);const hit=raycaster.intersectObjects(pickObjects,false)[0];if(!hit)return null;const index=hit.instanceId;if(index!==undefined)return {index,id:selected&&selectedTiles.includes(index)?selected.id:tileData[index]?.poemId};const id=hit.object.userData.poemId;return id?{index:tileData.findIndex(t=>t.poemId===id),id}:null;}
 function select(hit){if(!hit?.id||hit.index<0)return false;if(selected?.id===hit.id)return true;selected=catalog.find(p=>p.id===hit.id);if(!selected)return false;selectionAt=lastTime;selectionToken++;awaitingRead=false;eventIssued=false;events.length=0;
  // Neighbouring blocks physically leave their old cells and gather into a four-line forme.
  const centre=tileData[hit.index],rank=tileData.map((a,index)=>({index,d:Math.hypot((a.x-centre.x)*.87,a.z-centre.z)})).sort((a,b)=>a.d-b.d);
  selectedTiles=rank.slice(0,28).map(a=>a.index).sort((a,b)=>a-b);const matrix=new T.Matrix4();selectionFrom=selectedTiles.map(index=>{tiles.getMatrixAt(index,matrix);return V().setFromMatrixPosition(matrix);});
  const cells=glyphs.geometry.attributes.atlasCell,chosen=glyphs.geometry.attributes.selectedType,letters=selected.lines.join(''),atlas=result.userData.atlasIndex;
  for(let i=0;i<tileData.length;i++){const n=tileData[i].atlas;cells.setXY(i,n===undefined?-1:n%16,n===undefined?-1:15-Math.floor(n/16));chosen.setX(i,0);}
  selectedTiles.forEach((index,slot)=>{const n=atlas.get(letters[slot]);cells.setXY(index,n%16,15-Math.floor(n/16));chosen.setX(index,1);const x=(slot%7-3)*1.04,z=1.0+Math.floor(slot/7)*1.10;for(let j=0;j<18;j++){const k=(slot*18+j)*3;inkParticles.geometry.attributes.position.array[k]=x+(j%6/6-.4)*.82;inkParticles.geometry.attributes.position.array[k+1]=4.48;inkParticles.geometry.attributes.position.array[k+2]=z+(Math.floor(j/6)/3-.4)*.82;}});
  cells.needsUpdate=chosen.needsUpdate=inkParticles.geometry.attributes.position.needsUpdate=true;inkParticles.visible=true;update(lastTime,lastResponse);return true;
 }
 function pointerDown(ndc,camera){const hit=pick(ndc,camera);if(!hit)return false;pressActive=true;previousHit=hit.index;return select(hit);}
 function pointerMove(ndc,camera){if(!pressActive)return false;const hit=pick(ndc,camera);if(!hit)return true;if(hit.index!==previousHit){previousHit=hit.index;select(hit);}return true;}
 function pointerUp(){const captured=pressActive;pressActive=false;previousHit=-1;return captured;}
 function takePoemEvent(){const e=events.shift()||null;if(e&&e.token===selectionToken)awaitingRead=true;return e;}
 function confirmPoemRead(id,token=selectionToken){if(!selected||selected.id!==id||token!==selectionToken||closingAt!==null||lastTime-selectionAt<formSeconds+1)return false;readPoems.add(id);awaitingRead=false;return true;}
 function reset(){lastTime=lastResponse=selectionAt=0;closingAt=null;selected=null;selectionToken++;awaitingRead=false;selectedTiles=[];selectionFrom=[];previousHit=-1;pressActive=false;eventIssued=false;readPoems.clear();formedPoems.clear();events.length=0;if(glyphs){const cells=glyphs.geometry.attributes.atlasCell,chosen=glyphs.geometry.attributes.selectedType;tileData.forEach((a,i)=>{cells.setXY(i,a.atlas===undefined?-1:a.atlas%16,a.atlas===undefined?-1:15-Math.floor(a.atlas/16));chosen.setX(i,0);});cells.needsUpdate=chosen.needsUpdate=true;}if(inkParticles)inkParticles.visible=false;update(0);}

 function update(time,response=0){
  const t=Math.max(0,time),delta=Math.max(0,t-lastTime);lastTime=t;lastResponse=response;
  if(selected&&closingAt===null){const age=t-selectionAt;if(age>=formSeconds&&!eventIssued){formedPoems.add(selected.id);events.push({...eventFor(selected),at:t,token:selectionToken});eventIssued=true;}if(age>=fullExperienceSeconds&&!awaitingRead)readPoems.add(selected.id);if(delta>0&&!awaitingRead&&(readPoems.size>=2||age>=fullExperienceSeconds)){closingAt=t;pointerUp();events.length=0;}}
  const closing=closingAt===null?0:Math.max(0,t-closingAt),dark=smooth(3.8,8.2,closing);scene.background.copy(ivory).lerp(ink,dark);scene.fog.color.copy(scene.background);
  key.intensity=2.45-dark*1.20;ambient.intensity=.93-dark*.22;rim.intensity=.75-dark*.13;bodyMat.color.set(0x435749).lerp(new T.Color(0x344b40),dark);capMat.color.set(0x506657).lerp(new T.Color(0x3b5546),dark);floor.material.color.set(0xc2c2ad).lerp(new T.Color(0x263c2c),dark);
  if(tiles){
   const motion=1-smooth(4.0,9.0,closing)*.78,selectedLookup=new Map(selectedTiles.map((index,slot)=>[index,slot]));
   for(let i=0;i<tileData.length;i++){
    const a=tileData[i],front=Math.sin(a.row*.45-t*1.13),diagonal=Math.sin(a.col*.39+a.row*.15-t*.70),distance=Math.hypot((a.col-6.5)*.92,(a.row-10.5)*.73),ripple=Math.exp(-distance*distance/31)*(Math.sin(distance*.83-t*1.55)+1)*.25;
    const lift=.07+motion*(.55*(front+1)+.27*(diagonal+1)+ripple+clamp(response,0,1)*.12*Math.exp(-distance*distance/35)),slot=selectedLookup.get(i);
    if(slot!==undefined&&selected){const age=Math.max(0,t-selectionAt),q=T.MathUtils.smootherstep((age-slot*.012)/(formSeconds-.32),0,1),target=V((slot%7-3)*1.04,3.75,1.0+Math.floor(slot/7)*1.10);o.position.copy(selectionFrom[slot]).lerp(target,q);}else o.position.set(a.x,lift,a.z);
    o.rotation.set(0,0,0);o.scale.setScalar(1);o.updateMatrix();tiles.setMatrixAt(i,o.matrix);
    o.position.y+=.697;o.updateMatrix();caps.setMatrixAt(i,o.matrix);
    o.position.y+=.034;o.updateMatrix();glyphs.setMatrixAt(i,o.matrix);
   }
   tiles.instanceMatrix.needsUpdate=true;caps.instanceMatrix.needsUpdate=true;glyphs.instanceMatrix.needsUpdate=true;glyphs.material.uniforms.tint.value.set(0xf0eada).lerp(new T.Color(0xbccbb8),dark*.65);glyphs.material.uniforms.opacity.value=.96-dark*.16;
  }
  if(inkParticles){const age=selected?Math.max(0,t-selectionAt):9;inkParticles.material.uniforms.age.value=age;inkParticles.visible=!!selected&&age<3.4&&closingAt===null;}
  for(const s of selectors){s.visible=closingAt===null;s.material.opacity=selected?.id===s.userData.poemId?1:.84;}
  dust.update(t);
 }
 update(0);return result;
}
