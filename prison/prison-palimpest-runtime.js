import * as T from '../vendor/three.module.js';
import {buildPrisonPalimpsestScene} from './prison-palimpest-scene.js';
import {createPrisonPalimpsestInteraction} from './prison-palimpest-interaction.js';
import {decoratePrisonPerspective} from './prison-perspective-scene.js';
import {createPrisonPerspectiveInteraction} from './prison-perspective-interaction.js';

export const PRISON_OUTRO_POEM=Object.freeze({title:'狱中寄子由二首·其二',author:'苏轼',lines:Object.freeze(['柏台霜气夜凄凄，','风动琅珰月向低。','梦绕云山心似鹿，','魂飞汤火命如鸡。']),source:'Existing prison chapter: 原文与参考视频对应.txt and original/borrowed-view-experience.js'});
export const PRISON_OUTRO_TIMING=Object.freeze({ending:1.8,poem:10.8,poemFadeIn:1.8,fading:3.8});
const V=a=>new T.Vector3(...a),ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};

export async function createPrisonPalimpsestDemo({canvas,ui={},renderer,traveler,audio=null,onNextScene=null,onRestart=null,exitTo='../PoemRiver_ThreeJS/utai/?chapter=4',building:providedBuilding=null,camera:suppliedCamera=null,bindControls=true}){
 const building=providedBuilding||buildPrisonPalimpsestScene();await building.ready;
 const initialExposure=renderer?.toneMappingExposure,initialVolume=typeof audio?.volume==='number'?audio.volume:null;
 if(renderer&&typeof initialExposure==='number')renderer.toneMappingExposure=1.03;
 let disposed=false,runId=0,runAbort=new AbortController(),transferFired=false,outroFade=0;
 const listeners=[],listen=(node,event,fn)=>{if(bindControls&&node?.addEventListener){node.addEventListener(event,fn);listeners.push([node,event,fn]);}};
 if(ui.poemTitle)ui.poemTitle.textContent=`${PRISON_OUTRO_POEM.author} · ${PRISON_OUTRO_POEM.title}`;
 if(ui.poemLines)ui.poemLines.textContent=PRISON_OUTRO_POEM.lines.join('\n');

 if(!traveler?.root)throw Error('原狱中的人物未载入。');
 building.scene.add(traveler.root);traveler.root.position.fromArray(building.actorStart);traveler.root.rotation.y=.15;
 const camera=suppliedCamera||new T.PerspectiveCamera(42,1,.03,220),look=V(building.shots.intro.look),errors=[],optics=decoratePrisonPerspective(building);
 // A silhouette can overlap a guide corner; it is not a masonry barrier.
 // Real walls, columns and closed leaves remain in the optical occlusion test.
 optics.ignoreMeshes=[traveler.root];
 let mode='ready',time=0,age=0,paused=false,owner=null,transition=null,pendingId=null,route=[],walkThen=null,followCamera=false,helpUntil=0,currentStage='window',keyDirection=0;
 const wash=createPrisonPalimpsestInteraction({sceneStage:building,camera,order:['corridor'],resetScene:false,onChange:e=>{
  if(['contact-rejected','wash-cancelled','wash-released'].includes(e.reason)&&ui.notice)ui.notice.textContent=e.stats.hint;
 }});
 const perspective=createPrisonPerspectiveInteraction({building,optics,camera});
 const current=()=>currentStage==='corridor'?wash:perspective;
 const interaction={
  pointerDown:(p,view)=>{perspective.resize(view);return current().pointerDown(p,view);},pointerMove:p=>current().pointerMove(p),pointerUp:p=>current().pointerUp(p),pointerCancel:()=>current().pointerCancel(),
  setEnabled:value=>{perspective.setEnabled(value&&currentStage!=='corridor');wash.setEnabled(value&&currentStage==='corridor');},
  setPaused:value=>{perspective.setPaused(value);wash.setPaused(value);},
  reset:()=>{perspective.reset();wash.reset();building.reset();optics.reset();},
  getGuide:()=>currentStage==='corridor'?wash.getGuide():null,
  takeCompleted:()=>perspective.takeCompleted()||wash.takeCompleted(),
  get gestureActive(){return !!(perspective.stats.gestureActive||wash.gestureActive);},
  get enabled(){return current().stats.enabled&&!paused;},
  get stats(){const p=perspective.stats,w=wash.stats,completed=building.stats.completed;return {...(currentStage==='corridor'?w:p),nextId:['window','gate','corridor'].find(id=>!completed.includes(id))||null,completed,gestureActive:this.gestureActive,readyToWalk:completed.length===3&&['window','gate','corridor'].every(building.readiness),kind:currentStage==='corridor'?'architectural-wash':'perspective-alignment',perspective:p,wash:w};}
 };
 function put(s){camera.position.fromArray(s.eye);look.fromArray(s.look);camera.fov=s.fov||42;camera.lookAt(look);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 function blend(a,b,u){camera.position.copy(V(a.eye).lerp(V(b.eye),u));look.copy(V(a.look).lerp(V(b.look),u));camera.fov=T.MathUtils.lerp(a.fov||42,b.fov||42,u);camera.lookAt(look);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 function changeShot(name,seconds=2.4,then=null,path=null){interaction.setEnabled(false);const points=path?.length?[camera.position.toArray(),...path.filter((p,i)=>i||V(p).distanceTo(camera.position)>.001)].map(V):null,lengths=points?.slice(1).map((p,i)=>p.distanceTo(points[i])),length=lengths?.reduce((a,b)=>a+b,0);transition={from:{eye:camera.position.toArray(),look:look.toArray(),fov:camera.fov},to:typeof name==='string'?building.shots[name]:name,age:0,seconds,then,points,lengths,length};}
 function pathEye(current,u){if(!current.points?.length)return null;let distance=current.length*u;for(let i=0;i<current.lengths.length;i++){const segment=current.lengths[i];if(distance<=segment||i===current.lengths.length-1)return current.points[i].clone().lerp(current.points[i+1],segment>1e-9?T.MathUtils.clamp(distance/segment,0,1):1);distance-=segment;}return current.points.at(-1).clone();}
 function walk(points,then,follow=false){route=points.map(V);walkThen=then;followCamera=follow;interaction.setEnabled(false);}
 function followingShot(){const p=traveler.root.position;return {eye:[Math.max(-5.9,p.x-4.2),4.4,p.z+6.1],look:[p.x-.6,1.6,p.z-.7],fov:45};}
 function clearCapture(){const id=owner;owner=null;canvas.classList.remove('inking');if(id!==null&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);}
 function ndc(e){const r=canvas.getBoundingClientRect();return new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);}
 const pointerDown=e=>{if(mode!=='puzzle'||paused||transition||route.length||pendingId||owner!==null||e.button!==0)return;
  if(interaction.pointerDown(ndc(e),{width:canvas.clientWidth,height:canvas.clientHeight})){owner=e.pointerId;canvas.focus?.({preventScroll:true});canvas.setPointerCapture?.(owner);canvas.classList.add('inking');e.preventDefault?.();return true;}return false;
 };
 const pointerMove=e=>{if(owner===e.pointerId&&!paused)interaction.pointerMove(ndc(e));};
 const pointerUp=e=>{if(owner!==e.pointerId)return;interaction.pointerMove(ndc(e));interaction.pointerUp(ndc(e));clearCapture();};
 const pointerCancel=e=>{if(e&&owner!==e.pointerId)return;interaction.pointerCancel();clearCapture();};
 const lostPointerCapture=e=>{if(owner!==e.pointerId)return;if(interaction.gestureActive)interaction.pointerCancel();clearCapture();};
 function start(){if(mode!=='ready')return;paused=false;interaction.setPaused(false);if(ui.pause)ui.pause.textContent='暂歇';mode='intro';age=0;ui.opening?.classList.add('hidden');audio?.play?.()?.catch?.(()=>{});}
 function restart(){if(disposed)return;runAbort.abort();runAbort=new AbortController();runId++;transferFired=false;outroFade=0;if(initialVolume!==null)audio.volume=initialVolume;interaction.reset();clearCapture();currentStage='window';perspective.setStage('window');traveler.root.position.fromArray(building.actorStart);traveler.root.rotation.y=.15;traveler.animate(0,0,0,1,false,0,1);time=age=0;mode='ready';paused=false;transition=pendingId=null;route=[];walkThen=null;followCamera=false;helpUntil=0;keyDirection=0;put(building.shots.intro);ui.opening?.classList.remove('hidden');ui.ending?.classList.remove('shown');if(ui.notice)ui.notice.textContent='';if(ui.pause)ui.pause.textContent='暂歇';audio?.pause?.();sync();onRestart?.({runId,signal:runAbort.signal});}
 function setPaused(value){paused=!!value;interaction.setPaused(paused);keyDirection=0;if(paused)clearCapture();if(ui.pause)ui.pause.textContent=paused?'继续':'暂歇';if(paused)audio?.pause?.();else if(mode!=='ready')audio?.play?.()?.catch?.(()=>{});}
 listen(ui.start,'click',start);listen(ui.restart,'click',restart);listen(ui.pause,'click',()=>setPaused(!paused));
 listen(ui.hint,'click',()=>{helpUntil=time+5;if(ui.notice)ui.notice.textContent=currentStage==='corridor'?wash.stats.hint:optics.puzzles[currentStage].hint;});
 listen(ui.sound,'click',()=>{if(!audio)return;audio.muted=!audio.muted;ui.sound.textContent=audio.muted?'听琴':'琴声';if(!audio.muted&&mode!=='ready'&&!paused)audio.play()?.catch?.(()=>{});});
 // The old end card never returns; the poem yields to the next chapter automatically.
 const keyDown=e=>{if(!['ArrowLeft','ArrowRight','a','d','A','D'].includes(e.key))return;e.preventDefault();if(mode==='puzzle'&&currentStage!=='corridor'&&interaction.enabled&&!transition&&!pendingId&&!route.length)keyDirection=['ArrowLeft','a','A'].includes(e.key)?-1:1;};
 const keyUp=e=>{if(['ArrowLeft','ArrowRight','a','d','A','D'].includes(e.key)){keyDirection=0;e.preventDefault();}};
 const blur=()=>{keyDirection=0;interaction.pointerCancel();clearCapture();};
 const handlers={onpointerdown:pointerDown,onpointermove:pointerMove,onpointerup:pointerUp,onpointercancel:pointerCancel,onlostpointercapture:lostPointerCapture,onkeydown:keyDown,onkeyup:keyUp,onblur:blur},previousHandlers=Object.fromEntries(Object.keys(handlers).map(key=>[key,canvas[key]]));
 if(bindControls)Object.assign(canvas,handlers);
 function setKeyDirection(direction){if(mode!=='puzzle'||currentStage==='corridor'||!interaction.enabled||transition||pendingId||route.length){keyDirection=0;return false;}keyDirection=Math.sign(Number(direction)||0);return true;}
 function cancelInput(){keyDirection=0;interaction.pointerCancel();clearCapture();}
 let target=null,screen=null,screenCamera=null,screenMaterial=null;
 if(renderer?.setRenderTarget){
  target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});
  screenMaterial=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:target.texture},pixel:{value:new T.Vector2(1,1)},amount:{value:.18},fade:{value:0}},vertexShader:'varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
   varying vec2 uvScreen;uniform sampler2D source;uniform vec2 pixel;uniform float amount,fade;
   void main(){vec2 uv=uvScreen;float edge=smoothstep(.27,.67,length((uv-.5)*vec2(.92,1.)));vec2 d=pixel*edge*amount*3.;vec3 c=texture2D(source,uv).rgb*.52;c+=texture2D(source,uv+d).rgb*.12;c+=texture2D(source,uv-d).rgb*.12;c+=texture2D(source,uv+d*vec2(1.,-1.)).rgb*.12;c+=texture2D(source,uv-d*vec2(1.,-1.)).rgb*.12;c=vec3(.04)+c*.96;c=(c-.10)*.9+.10;gl_FragColor=vec4(c*(1.-edge*.08)*(1.-fade),1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }
  `});screen=new T.Scene();screenCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);screen.add(new T.Mesh(new T.PlaneGeometry(2,2),screenMaterial));
 }
 function resize(){if(owner!==null){interaction.pointerCancel();clearCapture();}keyDirection=0;const r=canvas.getBoundingClientRect();perspective.resize({width:r.width,height:r.height});camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();renderer?.setSize?.(r.width,r.height,false);if(target){const ratio=renderer.getPixelRatio?.()||1;target.setSize(Math.round(r.width*ratio),Math.round(r.height*ratio));screenMaterial.uniforms.pixel.value.set(1/(r.width*ratio),1/(r.height*ratio));}}
 function sync(){const s=interaction.stats;
  const caption=mode==='ready'?'墙还在那里，心可以先松开。':mode==='intro'?'这一夜，窗外仍有月。':mode==='reveal'?'重重窗格，究竟遮住了月，还是遮住了看法？':mode==='exit'?'月光入窗，重门成隙。沿回廊走到门槛，让这一夜落在纸上。':['ending','poem','fading','transferred'].includes(mode)?'':pendingId?(pendingId==='window'?'月色明亮起来。它越过窗棂，照亮了通向铁门的窄路。':pendingId==='gate'?'前后的铁栏重合了。两扇铁门一同让开，门隙透进月光。':'斗笠的墨影缓缓退淡，廊墙已经让出一人宽的路。'):transition||route.length?'沿着刚刚透进来的月色，去看下一处建筑。':(currentStage==='corridor'?s.hint:optics.puzzles[currentStage].hint);
  if(ui.caption)ui.caption.textContent=caption;
  if(ui.progress)ui.progress.textContent=mode==='puzzle'?`${s.completed.length} / 3 · ${currentStage==='corridor'?'拂墨出困':optics.puzzles[currentStage].title}`:['ending','poem','fading','transferred'].includes(mode)?'':'狱中一夜';
  if(ui.subtitle)ui.subtitle.textContent=mode==='puzzle'&&!transition&&!route.length&&!pendingId?(currentStage==='corridor'?'沿墙上的斗笠墨影轻扫，松笔 · 最后一笔之后，人物会走向廊内门槛':currentStage==='window'?'按住画面左右拖动 · 月圆最亮时松手稍候 · 也可用 ← →':'按住画面左右拖动 · 铁栏重合、门隙最亮时松手稍候'):(['ending','poem','fading','transferred'].includes(mode)?'':'原狱建筑 · 视点成隙');
  if(ui.ending)ui.ending.classList.remove('shown');
  const poemVisible=mode==='poem'||mode==='fading',poemOpacity=mode==='poem'?ease(age/PRISON_OUTRO_TIMING.poemFadeIn):mode==='fading'?1-outroFade:0;
  if(ui.outro){ui.outro.style.opacity=String(poemOpacity);ui.outro.style.visibility=poemVisible?'visible':'hidden';ui.outro.setAttribute('aria-hidden',String(!poemVisible));}
  if(ui.fade){ui.fade.style.opacity=String(outroFade);ui.fade.style.visibility=outroFade>0?'visible':'hidden';}
  if(ui.notice&&['ending','poem','fading','transferred'].includes(mode))ui.notice.textContent='';
  if(initialVolume!==null)audio.volume=initialVolume*(1-outroFade);

  const g=interaction.getGuide(),show=mode==='puzzle'&&!transition&&!route.length&&!pendingId&&time<helpUntil&&g?.visible;
  if(ui.guide){ui.guide.style.opacity=show?'1':'0';if(show){const r=canvas.getBoundingClientRect(),point=p=>`${(p.x+1)*r.width/2},${(1-p.y)*r.height/2}`;ui.guide.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);ui.guidePath?.setAttribute('d',`M ${point(g.start)} L ${point(g.end)}`);}}
  Object.assign(canvas.dataset,{mode,currentStage,paused:String(paused),gestureActive:String(s.gestureActive),state:JSON.stringify(s),scene:JSON.stringify(building.stats),optics:JSON.stringify(optics.stats),perspective:JSON.stringify(perspective.stats),camera:JSON.stringify({position:camera.position.toArray(),look:look.toArray(),fov:camera.fov}),poet:JSON.stringify(traveler.root.position.toArray()),guide:JSON.stringify(g),errors:JSON.stringify(errors),transition:String(!!transition),walking:String(!!route.length),pending:pendingId||'',outro:JSON.stringify({phase:mode,age,fade:outroFade,poemOpacity,transferFired,runId,poem:PRISON_OUTRO_POEM,timing:PRISON_OUTRO_TIMING})});
 }
 function routeSeconds(points){let last=traveler.root.position,metres=0;for(const p of points){const next=V(p);metres+=last.distanceTo(next);last=next;}return metres/1.18+points.length*.05;}
 function enterPuzzle(id,seconds){currentStage=id;if(id!=='corridor')perspective.setStage(id);const shot=id==='corridor'?building.shots.corridor:perspective.shot;changeShot(shot,seconds,()=>{put(shot);interaction.setEnabled(true);},id==='corridor'?null:optics.puzzles[id].entryPath);}
 function approach(name,points,minimum){const next=()=>{followCamera=false;enterPuzzle(name,minimum);},begin=()=>walk(points,next,true);changeShot(followingShot(),1.8,begin);}
 function nextAfter(id){
  if(id==='window')approach('gate',building.gateApproachPath||[[3.55,.02,.8]],2.6);
  else if(id==='gate')approach('corridor',building.corridorApproachPath||[[4.15,.02,1.45]],2.5);
  else {mode='exit';age=0;const finish=()=>{if(!transition&&!route.length){mode='ending';age=0;}};changeShot('exit',Math.max(3,routeSeconds(building.exitPath)),finish,building.exitCameraPath);walk(building.exitPath,finish);}
 }
 function transfer(){if(transferFired||disposed||runAbort.signal.aborted)return;transferFired=true;mode='transferred';age=0;outroFade=1;interaction.setEnabled(false);audio?.pause?.();sync();
  const transferredRun=runId,signal=runAbort.signal,payload={chapter:3,nextChapter:4,poem:PRISON_OUTRO_POEM,runId:transferredRun,signal,isCurrent:()=>!disposed&&!signal.aborted&&runId===transferredRun&&mode==='transferred'};
  try{if(typeof onNextScene==='function'){const result=onNextScene(payload);result?.catch?.(e=>{if(!payload.signal.aborted)errors.push(String(e?.stack||e));});}
   else if(exitTo){window.location.assign(exitTo);}}
  catch(e){errors.push(String(e?.stack||e));sync();}
 }
 function step(dt){dt=disposed||paused||mode==='ready'||mode==='transferred'?0:T.MathUtils.clamp(dt,0,.05);if(!Number.isFinite(dt)||dt<=0){sync();return;}time+=dt;age+=dt;
  if(mode==='ending'&&age>=PRISON_OUTRO_TIMING.ending){mode='poem';age=0;}
  else if(mode==='poem'&&age>=PRISON_OUTRO_TIMING.poem){mode='fading';age=0;}
  else if(mode==='fading'){outroFade=ease(age/PRISON_OUTRO_TIMING.fading);if(age>=PRISON_OUTRO_TIMING.fading){transfer();return;}}

  if(mode==='intro'&&age>=3){mode='reveal';age=0;changeShot('overview',5.2,()=>{mode='puzzle';age=0;enterPuzzle('window',3.4);});}
  if(transition&&!interaction.gestureActive){const current=transition;current.age+=dt;const u=ease(current.age/current.seconds);blend(current.from,current.to,u);const eye=pathEye(current,u);if(eye){camera.position.copy(eye);camera.lookAt(look);camera.updateMatrixWorld(true);}if(current.age>=current.seconds){transition=null;current.then?.();}}
  if(mode==='puzzle'&&!transition&&!pendingId&&!route.length&&currentStage!=='corridor'){if(keyDirection)perspective.key(keyDirection*dt*2);put(perspective.shot);}
  building.update(time,mode==='ready'?0:dt);optics.update(dt);perspective.update(time,dt);wash.update(time,dt,{paused:paused||mode==='ready'});
  const event=interaction.takeCompleted();if(event){pendingId=event;interaction.setEnabled(false);clearCapture();keyDirection=0;if(ui.notice)ui.notice.textContent='';}
  if(pendingId&&building.readiness(pendingId)){const id=pendingId;pendingId=null;nextAfter(id);}
  let moving=false;
  if(route.length&&dt){const delta=route[0].clone().sub(traveler.root.position),distance=delta.length(),amount=Math.min(distance,1.18*dt);if(distance<.018){traveler.root.position.copy(route.shift());if(!route.length){const then=walkThen;walkThen=null;then?.();}}else {traveler.root.position.addScaledVector(delta,amount/distance);traveler.root.rotation.y=Math.atan2(delta.x,delta.z)+Math.PI;moving=true;}}
  if(followCamera&&route.length)put(followingShot());
  if(mode==='exit'&&transition?.points){const u=ease(transition.age/transition.seconds),following=traveler.root.position.clone().add(V([0,1.0,0]));look.copy(following).lerp(V(transition.to.look),T.MathUtils.smoothstep(u,.88,1));camera.lookAt(look);camera.updateMatrixWorld(true);}
  traveler.root.visible=true;traveler.animate(time,moving?1:0,interaction.gestureActive?.48:0,1,false,0,1);building.scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);sync();
 }
 function render(){if(!renderer||disposed)return;if(target){screenMaterial.uniforms.amount.value=mode==='reveal'?.8:.3;screenMaterial.uniforms.fade.value=ui.fade?0:outroFade;renderer.setRenderTarget(target);renderer.render(building.scene,camera);renderer.setRenderTarget(null);renderer.render(screen,screenCamera);}else renderer.render(building.scene,camera);}
 function dispose(){if(disposed)return;runAbort.abort();disposed=true;interaction.setEnabled(false);interaction.setPaused(true);clearCapture();for(const [node,event,fn]of listeners)node.removeEventListener?.(event,fn);if(bindControls)for(const [key,handler]of Object.entries(handlers))if(canvas[key]===handler)canvas[key]=previousHandlers[key]||null;if(renderer&&typeof initialExposure==='number')renderer.toneMappingExposure=initialExposure;if(initialVolume!==null)audio.volume=initialVolume;audio?.pause?.();target?.dispose?.();screenMaterial?.dispose?.();}
 perspective.setStage('window');put(building.shots.intro);interaction.setEnabled(false);resize();step(0);
 return {building,optics,perspective,wash,stage:building.stage,interaction,camera,traveler,start,restart,setPaused,dispose,pointerDown,pointerMove,pointerUp,pointerCancel,setKeyDirection,cancelInput,resize,step,render,errors,get stats(){return {mode,currentStage,time,age,paused,transition:!!transition,pendingId,walking:route.length>0,ownerPointerId:owner,outro:{phase:mode,age,fade:outroFade,transferFired,runId,timing:PRISON_OUTRO_TIMING,poem:PRISON_OUTRO_POEM},interaction:interaction.stats};}};
}
