import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
export const LYCHEE_BURST=Object.freeze({ordinaryParticles:112,heroParticles:640,count:34128,duration:3,pulseSeconds:.15,releaseSeconds:2.1,impulseGain:2.8,minPointPixels:2.8,maxPointPixels:14,perspectiveScale:2400,particleFogAttenuation:.08,minSpeed:9,maxSpeed:18,drag:2.1,pulseOpacity:.64,inkOpacity:.074});

/** All 300 fruit release together. Every grain belongs to its displayed sphere. */
export function createLycheeFinaleBurst(scene){
 const count=LYCHEE_BURST.count,positions=new Float32Array(count*3),directions=new Float32Array(count*3),origins=new Float32Array(count*3),offsets=new Float32Array(count*3),sizes=new Float32Array(count),seeds=new Float32Array(count),kinds=new Float32Array(count);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('burstOrigin',new T.BufferAttribute(origins,3));geometry.setAttribute('burstOffset',new T.BufferAttribute(offsets,3));geometry.setAttribute('burstSize',new T.BufferAttribute(sizes,1));geometry.setAttribute('burstSeed',new T.BufferAttribute(seeds,1));geometry.setAttribute('burstKind',new T.BufferAttribute(kinds,1));
 const uniforms={opacity:{value:0},age:{value:0},fogDensity:{value:.012}},material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms,
  vertexShader:`attribute float burstSize,burstSeed,burstKind;varying float seed,kind,viewDepth;void main(){seed=burstSeed;kind=burstKind;vec4 mv=modelViewMatrix*vec4(position,1.);viewDepth=max(0.,-mv.z);gl_Position=projectionMatrix*mv;float lo=kind>1.5?4.8:kind>.5?3.4:2.8;float hi=kind>1.5?14.:kind>.5?10.2:8.2;gl_PointSize=clamp(burstSize*2400./max(1.,-mv.z),lo,hi);}`,
  fragmentShader:`uniform float opacity,age,fogDensity;varying float seed,kind,viewDepth;void main(){vec2 q=(gl_PointCoord-.5)*2.;float angle=seed*6.2831853+age*(seed-.5)*4.;mat2 spin=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));q=spin*q;float shape=kind>1.5?max(q.y*.95,max(abs(q.x)*1.22-q.y*.53,-q.y*1.15)):kind>.5?max(abs(q.x)*2.8,abs(q.y)*.92):length(q*vec2(1.,.88));if(shape>1.)discard;float tooth=.83+.17*sin(q.x*31.+seed*47.)*sin(q.y*23.+seed*19.);vec3 red=mix(vec3(.24,.012,.015),vec3(.63,.070,.040),seed);if(kind>1.5)red*=.82;float fog=exp(-${LYCHEE_BURST.particleFogAttenuation}*fogDensity*fogDensity*viewDepth*viewDepth);gl_FragColor=vec4(red,opacity*pow(max(0.,1.-shape),.33)*tooth*fog);}`});
 const points=new T.Points(geometry,material);points.name='三百荔枝炸散的红墨细粒';points.frustumCulled=false;points.visible=false;scene.add(points);
 const pulseUniforms={opacity:{value:0},age:{value:0}},pulseMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:pulseUniforms,
  vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 p;uniform float opacity,age;void main(){vec2 q=(p-.5)*2.;float edge=max(0.,1.-dot(q,q));float grain=.68+.32*sin(p.x*47.+sin(p.y*29.)*2.);float torn=smoothstep(age*2.8-.12,age*2.8+.14,grain);gl_FragColor=vec4(.58,.036,.026,pow(edge,.75)*grain*torn*opacity);}'});
 const pulse=new T.InstancedMesh(new T.PlaneGeometry(1,1),pulseMaterial,300);pulse.name='三百荔枝同步红墨脉冲';pulse.frustumCulled=false;pulse.visible=false;scene.add(pulse);
 const inkUniforms={opacity:{value:0}},inkMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:inkUniforms,vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float opacity;void main(){vec2 q=(p-.5)*2.;float edge=max(0.,1.-dot(q,q));float broken=.65+.35*sin(p.x*38.+sin(p.y*23.)*2.);gl_FragColor=vec4(.59,.16,.11,edge*edge*broken*opacity);}'}),inkGeometry=new T.PlaneGeometry(1,1),ink=[];
 for(let i=0;i<3;i++){const o=new T.Mesh(inkGeometry,inkMaterial);o.name='淡红墨晕';o.visible=false;o.renderOrder=1;scene.add(o);ink.push(o);}
 let initialized=false,framedSources=0,sourcePositions=[],sourceRadii=[],currentAge=0,kindCounts=[0,0,0],peakSpeed=0,minSpeed=Infinity,allocationRange=[0,0];
 const matrix=new T.Matrix4(),scale=V(),centre=V(),local=V(),radial=V(),shell=V();
 function start(fruits,hero,camera,heroRadius=.63){
  let seed=48017,index=0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  framedSources=0;sourcePositions=[];sourceRadii=[];kindCounts=[0,0,0];peakSpeed=0;minSpeed=Infinity;currentAge=0;
  centre.set(0,0,0);for(const f of fruits)centre.add(V(f.x,f.y,f.z));centre.add(hero).divideScalar(300);
  // Use more of the fixed grain budget for large close fruit. Giving a 300px
  // foreground fruit the same 112 grains as a 25px far fruit made hollow dots
  // where a continuous red sea should break apart.
  const forward=camera.getWorldDirection(V()),weights=fruits.map(f=>{const depth=Math.max(.5,V(f.x,f.y,f.z).sub(camera.position).dot(forward));return Math.pow(f.radius/depth,2);}),sum=weights.reduce((a,b)=>a+b,0),minimum=24,remaining=count-LYCHEE_BURST.heroParticles-fruits.length*minimum;
  const allocations=weights.map((w,i)=>{const exact=w/sum*remaining;return {index:i,count:minimum+Math.floor(exact),remainder:exact%1};});
  let unassigned=count-LYCHEE_BURST.heroParticles-allocations.reduce((a,b)=>a+b.count,0);
  for(const a of allocations.slice().sort((a,b)=>b.remainder-a.remainder||a.index-b.index)){if(unassigned--<=0)break;a.count++;}
  allocationRange=[Math.min(...allocations.map(a=>a.count)),Math.max(...allocations.map(a=>a.count))];
  const emit=(origin,n,radius,sourceIndex)=>{
   const screen=origin.clone().project(camera);if(sourceIndex<299&&Math.abs(screen.x)<1&&Math.abs(screen.y)<1&&screen.z>-1&&screen.z<1)framedSources++;
   sourcePositions.push({index:sourceIndex,position:origin.toArray(),radius,particles:n,firstParticle:index});sourceRadii.push(radius);
   radial.copy(origin).sub(centre).normalize();
   for(let k=0;k<n;k++,index++){
    const azimuth=random()*Math.PI*2,y=random()*2-1,r=Math.sqrt(1-y*y),speed=LYCHEE_BURST.minSpeed+random()*(LYCHEE_BURST.maxSpeed-LYCHEE_BURST.minSpeed),j=index*3;
    shell.set(Math.cos(azimuth)*r,y,Math.sin(azimuth)*r).multiplyScalar(radius*(.48+.49*Math.cbrt(random())));
    local.copy(shell).normalize().multiplyScalar(.72).addScaledVector(radial,.46).normalize().multiplyScalar(speed);
    origins[j]=origin.x;origins[j+1]=origin.y;origins[j+2]=origin.z;
    offsets[j]=shell.x;offsets[j+1]=shell.y;offsets[j+2]=shell.z;
    positions[j]=origin.x+shell.x;positions[j+1]=origin.y+shell.y;positions[j+2]=origin.z+shell.z;
    directions[j]=local.x;directions[j+1]=local.y;directions[j+2]=local.z;
    const variant=random(),kind=variant<.68?0:variant<.92?1:2;kindCounts[kind]++;
    sizes[index]=(kind===0?.020+Math.pow(random(),1.7)*.042:kind===1?.032+random()*.051:.055+random()*.059)*Math.max(.65,Math.min(2.5,radius*.85));kinds[index]=kind;seeds[index]=random();peakSpeed=Math.max(peakSpeed,speed);minSpeed=Math.min(minSpeed,speed);
   }
  };
  for(let i=0;i<fruits.length;i++){const f=fruits[i];emit(V(f.x,f.y,f.z),allocations[i].count,f.radius,f.index);}
  emit(hero,LYCHEE_BURST.heroParticles,heroRadius,299);
  for(const name of ['position','burstOrigin','burstOffset','burstSize','burstSeed','burstKind'])geometry.attributes[name].needsUpdate=true;
  for(let i=0;i<3;i++){const source=sourcePositions[i===0?299:i===1?Math.floor(fruits.length*.28):Math.floor(fruits.length*.73)];ink[i].position.fromArray(source.position);}
  initialized=true;points.visible=true;pulse.visible=true;ink.forEach(o=>o.visible=true);update(0,camera);
 }
 function update(age,camera){
  if(!initialized)return;currentAge=clamp(age,0,LYCHEE_BURST.duration);
  const t=currentAge,spread=(1-Math.exp(-t*LYCHEE_BURST.drag))*LYCHEE_BURST.impulseGain/LYCHEE_BURST.drag,fade=1-T.MathUtils.smoothstep(t,.22,LYCHEE_BURST.releaseSeconds);
  for(let i=0;i<count;i++){const j=i*3;positions[j]=origins[j]+offsets[j]+directions[j]*spread;positions[j+1]=origins[j+1]+offsets[j+1]+directions[j+1]*spread-t*t*.05;positions[j+2]=origins[j+2]+offsets[j+2]+directions[j+2]*spread;}
  geometry.attributes.position.needsUpdate=true;uniforms.age.value=t;uniforms.fogDensity.value=scene.fog?.density??.012;uniforms.opacity.value=fade;
  const pulseAmount=t<LYCHEE_BURST.pulseSeconds?Math.pow(1-t/LYCHEE_BURST.pulseSeconds,1.3):0;pulseUniforms.opacity.value=pulseAmount*LYCHEE_BURST.pulseOpacity;pulseUniforms.age.value=t;
  if(camera&&t<LYCHEE_BURST.pulseSeconds){for(let i=0;i<300;i++){const source=sourcePositions[i];scale.setScalar(sourceRadii[i]*(2.35+t*20));matrix.compose(V(...source.position),camera.quaternion,scale);pulse.setMatrixAt(i,matrix);}pulse.instanceMatrix.needsUpdate=true;}
  pulse.visible=t<LYCHEE_BURST.pulseSeconds;
  inkUniforms.opacity.value=fade*Math.sin(Math.min(1,t/.20)*Math.PI*.5)*LYCHEE_BURST.inkOpacity;
  ink.forEach((o,i)=>{o.scale.set((i?3.2:2.8)+spread*2.1,(i?1.5:2.0)+spread*.8,1);if(camera)o.quaternion.copy(camera.quaternion);});
  if(t>=LYCHEE_BURST.duration){points.visible=false;pulse.visible=false;ink.forEach(o=>o.visible=false);}
 }
 function reset(){initialized=false;framedSources=0;sourcePositions=[];sourceRadii=[];currentAge=0;kindCounts=[0,0,0];allocationRange=[0,0];peakSpeed=0;minSpeed=Infinity;origins.fill(0);positions.fill(0);offsets.fill(0);directions.fill(0);geometry.attributes.position.needsUpdate=geometry.attributes.burstOrigin.needsUpdate=geometry.attributes.burstOffset.needsUpdate=true;matrix.makeScale(0,0,0);for(let i=0;i<300;i++)pulse.setMatrixAt(i,matrix);pulse.instanceMatrix.needsUpdate=true;points.visible=pulse.visible=false;uniforms.opacity.value=pulseUniforms.opacity.value=inkUniforms.opacity.value=pulseUniforms.age.value=0;ink.forEach(o=>o.visible=false);}
 return {start,update,reset,get count(){return count;},get visible(){return points.visible;},get sources(){return sourcePositions.map(s=>({...s,position:s.position.slice()}));},get stats(){return {framedSources,remappedSources:0,style:'red-ink-grains',burstPhase:!initialized?'idle':currentAge<LYCHEE_BURST.pulseSeconds?'pulse':currentAge<.42?'surge':currentAge<3?'dissolve':'clear',burstDuration:LYCHEE_BURST.duration,redReleaseSeconds:LYCHEE_BURST.releaseSeconds,impulseGain:LYCHEE_BURST.impulseGain,allocation:'projected-area',sourceGrainRange:allocationRange.slice(),initialGrains:'inside-own-grown-sphere',minPointPixels:LYCHEE_BURST.minPointPixels,maxPointPixels:LYCHEE_BURST.maxPointPixels,pointPerspectiveScale:LYCHEE_BURST.perspectiveScale,particleFogAttenuation:LYCHEE_BURST.particleFogAttenuation,inkOpacity:LYCHEE_BURST.inkOpacity,pulseDuration:LYCHEE_BURST.pulseSeconds,pulseOpacity:LYCHEE_BURST.pulseOpacity,pulseVisible:pulse.visible,pulseAmount:pulseUniforms.opacity.value,grainKinds:kindCounts.slice(),minSpeed:Number.isFinite(minSpeed)?minSpeed:0,maxSpeed:peakSpeed,maximumSpread:LYCHEE_BURST.maxSpeed*LYCHEE_BURST.impulseGain/LYCHEE_BURST.drag,drawCalls:5,pointsDrawCalls:1,pulseInstances:300,pulseTriangles:600};}};
}
