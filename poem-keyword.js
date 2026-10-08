import * as T from './vendor/three.module.js';

const GLYPH=192;
const WORDS=[
 {word:'名动天下',kind:'fame',peak:1.08,seconds:1.0,travel:[0,0]},
 {word:'乌台诗案',kind:'case',peak:1.15,seconds:1.0,travel:[0,0]},
 {word:'横看成岭',kind:'ridge',peak:1.10,seconds:1.30,travel:[3.2,0]},
 {word:'侧成峰',kind:'peak',peak:1.10,seconds:1.30,travel:[-2.2,.7]},
 {word:'此心安处',kind:'rest',peak:1.07,seconds:2.8,travel:[0,-1.3]},
 {word:'三百颗',kind:'fruit',peak:1.15,seconds:2.1,travel:[0,0]},
 {word:'吾乡',kind:'home',peak:1.10,seconds:3.2,travel:[0,-1.8]}
].sort((a,b)=>b.word.length-a.word.length);
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b),hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
const settings=kind=>WORDS.find(word=>word.kind===kind)||WORDS.find(word=>word.kind==='rest');

// The caption's original glyphs move once, after their brush nib has lifted.
// No enlarged duplicate text, no autonomous timer, and no perpetual shake.
export function keywordMotion(localAge,kind='rest',peak=settings(kind).peak){
 const age=Number.isFinite(localAge)?localAge:-1,config=settings(kind),seconds=config.seconds,active=age>=0&&age<seconds;
 const short=seconds<=1.3,growEnd=kind==='home'?.75:kind==='rest'?.58:short?.23:kind==='place'?.30:.48,returnStart=kind==='home'?1.05:kind==='rest'?.95:short?.39:.72,returnEnd=seconds-(short?.15:.30);
 const pulse=smooth(0,growEnd,age)*(1-smooth(returnStart,returnEnd,age)),impact=['place','case'].includes(kind)?smooth(.15,.25,age)*(1-smooth(.32,kind==='case'?.48:.60,age)):0,shake=kind==='case'?.62:1;
 return {active,phase:age<0?'waiting':age<growEnd?'enlarging':age<returnStart?'accent':age<returnEnd?'returning':age<seconds?'settling':'complete',scale:1+(peak-1)*pulse,translationPixels:config.travel.map(value=>value*pulse),shakePixels:[Math.sin(age*53)*1.05*impact*shake,Math.sin(age*41+1.2)*.45*impact*shake],particleStrength:smooth(.23,.48,age)*(1-smooth(Math.max(.48,seconds-.9),seconds-.12,age))*(kind==='place'?1:kind==='fruit'?.65:.32)};
}

export function keywordLayout(entries,{viewportWidth=1280,viewportHeight=720,peak=1.26}={}){
 const minX=Math.min(...entries.map(e=>e.x-e.w*.5)),maxX=Math.max(...entries.map(e=>e.x+e.w*.5)),minY=Math.min(...entries.map(e=>e.y-e.h*.5)),maxY=Math.max(...entries.map(e=>e.y+e.h*.5));
 const x=(minX+maxX)*.5,y=(minY+maxY)*.5,w=maxX-minX,h=maxY-minY,marginX=4.5*2/Math.max(1,viewportWidth),marginY=2*2/Math.max(1,viewportHeight);
 // Portrait captions already sit close to the paper edge; temper enlargement
 // rather than moving their original layout toward the frame centre.
 const safePeak=Math.max(1,Math.min(peak,(.995-Math.abs(x)-marginX)/(w*.5),(.965-Math.abs(y)-marginY)/(h*.5)));
 return {x,y,w,h,peak:safePeak,peakBounds:{minX:x-w*safePeak*.5,maxX:x+w*safePeak*.5,minY:y-h*safePeak*.5,maxY:y+h*safePeak*.5}};
}

export function buildKeywordEmphasis(parent,entries,{pixel=1,viewportWidth=1280,viewportHeight=720,dustColor}={}){
 const effects=[],used=new Set(),text=entries.map(entry=>entry.char).join('');
 for(let index=0;index<entries.length;index++){
  const config=WORDS.find(word=>text.startsWith(word.word,index)&&!Array.from({length:word.word.length},(_,offset)=>index+offset).some(n=>used.has(n)));if(!config)continue;
  const selected=entries.slice(index,index+config.word.length);selected.forEach((entry,offset)=>used.add(index+offset));
  const start=Math.max(...selected.map(entry=>entry.start+entry.length))+.27,layout=keywordLayout(selected,{viewportWidth,viewportHeight,peak:config.peak}),holder=new T.Group();holder.name='原字词组：'+config.word;holder.position.set(layout.x,layout.y,0);holder.userData.poemWord=config.word;parent.add(holder);
  for(const entry of selected){holder.add(entry.node);entry.node.position.set(entry.x-layout.x,entry.y-layout.y,0);entry.node.userData.keyword=config.word;}
  const positions=[],births=[],seeds=[];
  selected.forEach((entry,row)=>{
   const alpha=entry.g.alpha;
   for(let y=0;y<GLYPH;y+=3)for(let x=0;x<GLYPH;x+=3){
    const n=y*GLYPH+x;if(alpha[n]<90)continue;
    const edge=alpha[y*GLYPH+Math.max(0,x-3)]<90||alpha[y*GLYPH+Math.min(GLYPH-1,x+3)]<90||alpha[Math.max(0,y-3)*GLYPH+x]<90||alpha[Math.min(GLYPH-1,y+3)*GLYPH+x]<90;
    const seed=hash(n+row*9397+index*7189);if(!edge||seed>.72)continue;
    positions.push(entry.x-layout.x+(x/GLYPH-.5)*entry.w,entry.y-layout.y+(.5-y/GLYPH)*entry.h,0);births.push(start+.22+seed*.42);seeds.push(hash(n+87),hash(n+679),hash(n+2011));
   }
  });
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('birth',new T.Float32BufferAttribute(births,1));geometry.setAttribute('seed',new T.Float32BufferAttribute(seeds,3));
  const dust=new T.ShaderMaterial({uniforms:{age:{value:0},alpha:{value:0},pixel:{value:pixel},scale:{value:1},color:{value:dustColor.clone()}},transparent:true,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:`
   attribute float birth;attribute vec3 seed;uniform float age,alpha,pixel,scale;varying float opacity;
   void main(){float life=age-birth;float alive=smoothstep(0.,.10,life)*(1.-smoothstep(.65,1.28,life));float travel=max(0.,life);
    vec2 drift=vec2((seed.x-.5)*.036,.013+(seed.y-.5)*.035)*travel;vec2 p=position.xy+drift;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,.02,1.);
    gl_PointSize=(1.1+seed.z*1.15)*pixel*sqrt(scale);opacity=alive*alpha*(.25+seed.z*.24);
   }`,fragmentShader:`varying float opacity;uniform vec3 color;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(color,opacity*smoothstep(1.,.12,r));
    #include <colorspace_fragment>
   }`});
  const particles=new T.Points(geometry,dust);particles.name=config.word+'原字沿散墨';particles.frustumCulled=false;holder.add(particles);effects.push({config,start,layout,holder,selected,particles,motion:keywordMotion(-1,config.kind,layout.peak)});
 }
 let currentAge=0;
 function update(age,opacity=1){
  currentAge=age;
  for(const effect of effects){const motion=keywordMotion(age-effect.start,effect.config.kind,effect.layout.peak),{layout,holder}=effect;effect.motion=motion;
   holder.position.set(layout.x+(motion.translationPixels[0]+motion.shakePixels[0])*2/Math.max(1,viewportWidth),layout.y+(motion.translationPixels[1]+motion.shakePixels[1])*2/Math.max(1,viewportHeight),0);holder.scale.set(motion.scale,motion.scale,1);
   effect.particles.visible=motion.active&&opacity>0;effect.particles.material.uniforms.age.value=age;effect.particles.material.uniforms.alpha.value=opacity*motion.particleStrength;effect.particles.material.uniforms.scale.value=motion.scale;
  }
 }
 return {update,get stats(){return {count:effects.length,age:currentAge,originalGlyphs:entries.length,duplicateGlyphs:0,active:effects.filter(effect=>effect.motion.active).map(effect=>effect.config.word),words:effects.map(effect=>({word:effect.config.word,kind:effect.config.kind,start:effect.start,seconds:effect.config.seconds,particles:effect.particles.geometry.attributes.position.count,phase:effect.motion.phase,scale:effect.motion.scale,translationPixels:effect.motion.translationPixels,shakePixels:effect.motion.shakePixels,position:effect.holder.position.toArray(),anchor:[effect.layout.x,effect.layout.y],peakBounds:effect.layout.peakBounds,glyphIds:effect.selected.map(entry=>entry.letters.uuid)}))};}};
}
