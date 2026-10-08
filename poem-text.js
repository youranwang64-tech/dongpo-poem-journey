import * as T from './vendor/three.module.js';
import {makeBrushTimeline,makeBrushPigment,sampleBrushPen} from './brush-glyph.js';
import {buildKeywordEmphasis} from './poem-keyword.js';

const GLYPH=192,cache=new Map(),TRAIL=14,WRITE_RATE=1.5;
const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
function glyph(char){
 if(cache.has(char))return cache.get(char);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=GLYPH;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.fillStyle='#fff';ctx.font='156px Poem';ctx.textAlign='left';ctx.textBaseline='alphabetic';
 const metrics=ctx.measureText?.(char),ascent=metrics?.actualBoundingBoxAscent,descent=metrics?.actualBoundingBoxDescent,left=metrics?.actualBoundingBoxLeft,right=metrics?.actualBoundingBoxRight;
 if([ascent,descent,left,right].every(Number.isFinite))ctx.fillText(char,(GLYPH-left-right)*.5+left,(GLYPH-ascent-descent)*.5+ascent);else{ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(char,96,98);}
 const rgba=ctx.getImageData(0,0,GLYPH,GLYPH).data,alpha=new Uint8Array(GLYPH*GLYPH);for(let n=0;n<alpha.length;n++)alpha[n]=rgba[n*4+3];
 const result={alpha,soft:makeBrushPigment(alpha,GLYPH,GLYPH),...makeBrushTimeline(alpha,GLYPH,GLYPH)};cache.set(char,result);return result;
}

export function poemEnvelope(age,writingDuration,hold){
 const fadeStart=writingDuration+hold,end=fadeStart+2.8;
 return {opacity:1-T.MathUtils.smoothstep(age,fadeStart,end),dissolve:T.MathUtils.smoothstep(age,fadeStart,end),strength:T.MathUtils.smoothstep(age,0,.65)*(1-T.MathUtils.smoothstep(age,fadeStart+.15,end))};
}

export function poemTextLayout(columnLengths,aspect,{left=false,center=false}={}){
 const charH=.178,charW=charH/Math.max(.5,aspect),maxRows=Math.max(1,...columnLengths),count=columnLengths.length;
 const top=center?maxRows*charH*.5:Math.min(.73,.14+maxRows*charH*.5);
 // The centre pair occupies one fifth of a wide frame. On a narrow frame,
 // retain enough space between the original glyphs rather than overlapping.
 const span=Math.max(.40,charW*count+.06*Math.max(0,count-1)),pitch=count>1?(span-charW)/(count-1):0;
 const columnXs=columnLengths.map((_,j)=>center?(count-1)*pitch*.5-j*pitch:left?-.82+j*(charW+.033):.82-j*(charW+.033));
 return {charH,charW,top,columnXs,centered:center,width:count?Math.max(...columnXs)-Math.min(...columnXs)+charW:0,height:maxRows*charH};
}

export function createPoemText(renderer){
 const scene=new T.Scene(),camera=new T.Camera();let group=null,age=99,current='',side='right',writingDuration=0,duration=0,hold=7,paper=false,whiteInk=false,redInk=false,centered=false,washTint=null,columnsCount=1,layout=null,penSegments=[],trail=null,emphasis=null;
 function clear(){current='';penSegments=[];trail=null;emphasis=null;if(group){scene.remove(group);const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const material of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){materials.add(material);for(const name of ['ink','schedule'])if(material.uniforms?.[name]?.value)textures.add(material.uniforms[name].value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group=null;}}
 function show(text,{left=false,red=false,dark=false,white=false,center=false,wash=null,holdSeconds=7,speed=1}={}){
  clear();age=0;current=text;centered=!!center;side=centered?'center':left?'left':'right';paper=dark;whiteInk=white;redInk=!!red;washTint=wash;hold=Math.max(4,holdSeconds);group=new T.Group();scene.add(group);
  const clauses=text.split(/[，。！？\s]+/).filter(Boolean),columns=[];for(const clause of clauses){const chars=Array.from(clause);for(let i=0;i<chars.length;i+=8)columns.push(chars.slice(i,i+8));}
  if(!columns.length){clear();return;}
  const drawn=columns.slice(0,3),aspect=renderer.domElement.clientWidth/renderer.domElement.clientHeight;layout=poemTextLayout(drawn.map(col=>col.length),aspect,{left,center:centered});const {charH,charW,top}=layout;columnsCount=drawn.length;
  const keywordEntries=[];let cursor=.28/WRITE_RATE;const segments=drawn.map(col=>col.map(char=>{const g=glyph(char),length=(1.10+Math.min(.06,g.strokeCount*.005))/(Math.max(.5,speed)*WRITE_RATE),start=cursor;cursor+=length+.025/WRITE_RATE;return {char,g,start,length};}));
  writingDuration=cursor+.10/WRITE_RATE;duration=writingDuration+hold+2.8;
  const inkColor=new T.Color(redInk?0xad3029:whiteInk?0xffffff:dark?0x191c18:0xf8f4e8),dustColor=new T.Color(redInk?0xc74735:whiteInk?0xffffff:dark?0x30332c:0xfff7e4);
  drawn.forEach((col,j)=>{
   const rows=col.length*GLYPH,inkData=new Uint8Array(GLYPH*rows*4),scheduleData=new Uint8Array(GLYPH*rows*4),dustEntries=[];
   const h=col.length*charH,w=charW,x=layout.columnXs[j],y=top-h*.5;
   segments[j].forEach(({char,g,start,length},i)=>{
    penSegments.push({g,start,length,x,y:top-i*charH-charH*.5,w,h:charH});
    const positions=[],births=[],seeds=[];dustEntries.push({positions,births,seeds});
    for(let yy=0;yy<GLYPH;yy++)for(let xx=0;xx<GLYPH;xx++){
     const n=yy*GLYPH+xx,time=start+g.timeline[n]*length,q=Math.round(time/writingDuration*65535),target=((yy+i*GLYPH)*GLYPH+xx)*4;
     scheduleData[target]=q>>8;scheduleData[target+1]=q&255;scheduleData[target+2]=Math.round(hash(n+i*7919+j*1129)*255);scheduleData[target+3]=255;
     inkData[target]=g.alpha[n];inkData[target+1]=g.soft[n];inkData[target+2]=255;inkData[target+3]=255;
     if(xx%5||yy%5||g.alpha[n]<100)continue;
     const edge=g.alpha[yy*GLYPH+Math.max(0,xx-3)]<90||g.alpha[yy*GLYPH+Math.min(GLYPH-1,xx+3)]<90||g.alpha[Math.max(0,yy-3)*GLYPH+xx]<90||g.alpha[Math.min(GLYPH-1,yy+3)*GLYPH+xx]<90;
     const random=hash(n+i*3149+j*9397);if(!edge||random>.22)continue;
     positions.push((xx/GLYPH-.5)*w,(.5-yy/GLYPH)*charH,0);births.push(time);seeds.push(hash(n+3),hash(n+87),hash(n+679));
    }
   });
   const ink=new T.DataTexture(inkData,GLYPH,rows,T.RGBAFormat),schedule=new T.DataTexture(scheduleData,GLYPH,rows,T.RGBAFormat);for(const texture of [ink,schedule]){texture.minFilter=texture.magFilter=T.LinearFilter;texture.flipY=true;texture.needsUpdate=true;}schedule.minFilter=schedule.magFilter=T.NearestFilter;
   const material=new T.ShaderMaterial({uniforms:{ink:{value:ink},schedule:{value:schedule},age:{value:0},writeLength:{value:writingDuration},color:{value:inkColor.clone()},alpha:{value:1},dissolve:{value:0},texel:{value:new T.Vector2(1/GLYPH,1/rows)}},transparent:true,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:'varying vec2 uvInk;void main(){uvInk=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
    uniform sampler2D ink,schedule;uniform vec3 color;uniform float age,writeLength,alpha,dissolve;uniform vec2 texel;varying vec2 uvInk;
    void main(){vec4 mask=texture2D(ink,uvInk),encoded=texture2D(schedule,uvInk);float born=(encoded.r*256.+encoded.g)*255./65535.*writeLength;
     float elapsed=age-born,reveal=smoothstep(-.055,.065,elapsed),wet=1.-smoothstep(.10,.95,elapsed);
     float grain=mix(.978+.022*encoded.b,1.,smoothstep(.28,.75,elapsed));float pigment=mask.r*reveal*grain;
     float freshHalo=mask.g*reveal*wet*.14;
     vec2 drift=vec2(sin(uvInk.y*43.+encoded.b*5.),cos(uvInk.x*31.+encoded.b*4.))*texel*dissolve*5.;
     float diffused=texture2D(ink,uvInk+drift).g;
     float thinning=1.-smoothstep(encoded.b*.28,.80+encoded.b*.16,dissolve);
     float a=(pigment*thinning+freshHalo*(1.-dissolve)+diffused*dissolve*.26)*alpha;
     gl_FragColor=vec4(color,a);
     #include <colorspace_fragment>
    }`});
   const dust=new T.ShaderMaterial({uniforms:{age:{value:0},alpha:{value:1},dissolve:{value:0},pixel:{value:renderer.getPixelRatio()},color:{value:dustColor.clone()}},transparent:true,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:`attribute float birth;attribute vec3 seed;uniform float age,alpha,dissolve,pixel;varying float opacity;
    void main(){float elapsed=age-birth;float arriving=smoothstep(-.06,.04,elapsed)*(1.-smoothstep(.22,.75,elapsed));float quiet=step(.96,seed.z)*smoothstep(.6,1.4,elapsed)*.026;
     vec2 spread=vec2((seed.x-.5)*.031,(seed.y-.5)*.024)*dissolve;vec2 p=position.xy+spread;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,.01,1.);gl_PointSize=(1.1+seed.z*.9+dissolve*.9)*pixel;opacity=alpha*(arriving*.32+quiet+dissolve*.19);}`,fragmentShader:`varying float opacity;uniform vec3 color;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(color,opacity*smoothstep(1.,.15,r));
    #include <colorspace_fragment>
    }`});
   segments[j].forEach(({char,g,start,length},i)=>{
    const node=new T.Group();node.name='原诗字：'+char;node.position.set(x,top-i*charH-charH*.5,0);node.userData.poemGlyph={char,column:j,row:i,index:keywordEntries.length};group.add(node);
    const geometry=new T.PlaneGeometry(w,charH),uv=geometry.attributes.uv;for(let k=0;k<uv.count;k++)uv.setY(k,(col.length-1-i+uv.getY(k))/col.length);uv.needsUpdate=true;
    const letters=new T.Mesh(geometry,material);letters.name='唯一原字：'+char;letters.frustumCulled=false;letters.userData.poemOriginalGlyph=true;node.add(letters);
    const {positions,births,seeds}=dustEntries[i],particles=new T.BufferGeometry();particles.setAttribute('position',new T.Float32BufferAttribute(positions,3));particles.setAttribute('birth',new T.Float32BufferAttribute(births,1));particles.setAttribute('seed',new T.Float32BufferAttribute(seeds,3));
    const points=new T.Points(particles,dust);points.name='原字书写墨粒：'+char;points.frustumCulled=false;node.add(points);
    keywordEntries.push({char,g,start,length,x,y:node.position.y,w,h:charH,column:j,row:i,node,letters});
   });
  });
  emphasis=buildKeywordEmphasis(group,keywordEntries,{left,aspect,pixel:renderer.getPixelRatio(),viewportWidth:renderer.domElement.clientWidth,viewportHeight:renderer.domElement.clientHeight,inkColor,dustColor});
  const penGeometry=new T.BufferGeometry();penGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(TRAIL*3),3));penGeometry.setAttribute('contact',new T.Float32BufferAttribute(new Float32Array(TRAIL),1));penGeometry.setAttribute('pressure',new T.Float32BufferAttribute(new Float32Array(TRAIL),1));
  const penMaterial=new T.ShaderMaterial({uniforms:{pixel:{value:renderer.getPixelRatio()},color:{value:inkColor.clone()},alpha:{value:1},age:{value:0}},transparent:true,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:`attribute float contact,pressure;uniform float pixel,alpha;varying float opacity;void main(){gl_Position=vec4(position.xy,.015,1.);gl_PointSize=(1.6+pressure*2.6)*pixel;opacity=contact*alpha*.24;}`,fragmentShader:`varying float opacity;uniform vec3 color;void main(){vec2 p=(gl_PointCoord-.5)*vec2(1.,.8);float r=length(p)*2.;gl_FragColor=vec4(color,opacity*exp(-r*r*3.2));
   #include <colorspace_fragment>
  }`});trail=new T.Points(penGeometry,penMaterial);trail.frustumCulled=false;group.add(trail);update(0);
 }
 function update(dt){
  age+=Math.max(0,dt);const envelope=poemEnvelope(age,writingDuration,hold);group?.traverse(n=>{const u=n.material?.uniforms;if(u){if(u.age)u.age.value=age;if(u.alpha)u.alpha.value=envelope.opacity;if(u.dissolve)u.dissolve.value=envelope.dissolve;}});
  emphasis?.update(age,envelope.opacity);
  if(trail){const pos=trail.geometry.attributes.position,contact=trail.geometry.attributes.contact,pressure=trail.geometry.attributes.pressure;
   for(let i=0;i<TRAIL;i++){const t=age-i*.012,segment=penSegments.find(s=>t>=s.start&&t<=s.start+s.length),p=segment?sampleBrushPen(segment.g.penPaths,(t-segment.start)/segment.length):null;
    if(p){pos.setXYZ(i,segment.x+(p.x-.5)*segment.w,segment.y+(.5-p.y)*segment.h,.01);contact.setX(i,p.contact*(1-i/TRAIL));pressure.setX(i,p.pressure);}else contact.setX(i,0);
   }pos.needsUpdate=contact.needsUpdate=pressure.needsUpdate=true;
  }
 }
 function render(){if(!group||age>duration)return;const old=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=old;}
 function setPaper(value){const next=!!value;if(paper===next)return;paper=next;group?.traverse(n=>{const color=n.material?.uniforms?.color?.value;if(color){const dusty=!!n.geometry?.attributes.birth;color.set(redInk?(dusty?0xc74735:0xad3029):whiteInk?0xffffff:dusty?(paper?0x30332c:0xfff7e4):(paper?0x191c18:0xf8f4e8));}});}
 return {show,clear,update,render,setPaper,get text(){return current;},get side(){return side;},get inkStyle(){return redInk?'red':whiteInk?'white':paper?'black':'ivory';},get layout(){return layout;},get visible(){return age<duration&&!!group;},get writingDuration(){return writingDuration;},get duration(){return duration;},get written(){return !!group&&age>=writingDuration;},get age(){return age;},get keywordStats(){return emphasis?.stats||{count:0,active:[],words:[]};},get backdrop(){return {side,paper,tint:washTint,width:centered?0:Math.min(.32,.29+(columnsCount-1)*.015),strength:!centered&&group&&age<duration?poemEnvelope(age,writingDuration,hold).strength:0};}};
}

