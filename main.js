import * as T from './vendor/three.module.js';
import {createOcclusion} from './occlusion.js';
import {buildLycheeJourney} from './lychee-journey.js';
import {buildReflectionIsland,buildIslandEnding} from './reflection-island.js';
import {buildMountainExperience} from './mountain-experience.js';
import {buildArchitectureGestures} from './architecture-gestures.js';
import {decorateStory} from './story.js';
import {createNarrativeCut} from './narrative-cut.js';
import {buildRedCliffExperience,RED_CLIFF_ACTIONS} from './red-cliff-experience.js';
import {buildHuangzhouDwelling} from './huangzhou-dwelling.js';
import {buildRecallRotatingBridge} from './recall-rotating-bridge-experience.js';
import {createBridgeInkRipple} from './bridge-ink-ripple.js';
import {decorateHuzhouThanksLetter} from './huzhou-thanks-letter.js';
import {decorateGardenStudyReader} from './garden-study-reader.js';
import {buildChengtianPurposeScene} from './chengtian-purpose-scene.js';
import {decorateChengtianPurposeExperience,decorateChengtianPurposeReader} from './chengtian-purpose-experience.js';
import {buildPrisonPerspectiveChapter} from './prison-perspective-chapter.js';
import {decorateDwellingWater} from './environment-water.js';
import {decorateDwellingRepair} from './dwelling-repair.js';
import {decoratePanoramaBackdrop} from './backdrop-panorama.js';
import {decorateChapterClouds} from './chapter-clouds.js';
import {decorateArchitecture} from './architecture-detail.js';
import {decorateArchitectureEnvelope} from './architecture-envelope.js';
import {createChapterAudio} from './chapter-audio.js';
import {createTouchControls,mergeMovementInput,touchInstruction} from './touch-joystick.js';
import {reportStartupError,loadPoemFont,createCompatibleRenderer,applyRenderBudget,markStartupReady,canRenderFrame} from './startup-support.js';
import {createCameraRig} from './camera-rig.js';import {createPoemText} from './poem-text.js';import {buildPrologue} from './poetry-scenes.js';
import {preloadPlants,preloadBroadleaf} from './plants.js';import {createTraveler} from './traveler.js';import {createFilm} from './film.js';import {buildScene} from './scenes.js';
const $=id=>document.getElementById(id),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const report=reportStartupError;
const chapters=[
 {title:'一 · 湖州书声',place:'湖州',year:'1079 · 元丰二年',story:'谢上表呈出。原本写在纸上的话，渐渐成了案中的话。',verse:'诗文入案',axis:'x',spawn:[-7,0,1],target:[2,0,1],hint:'沿着地上的光圈，开廊窗，再到书案前。',shot:'side',background:'《湖州谢上表》为引子；场景为诗意演绎。'},
 {title:'二 · 乌台霜重',place:'汴京 · 御史台',year:'1079 · 元丰二年',story:'诗句被摘取，字字成为追问。乌台的门，在身后合上。',verse:'乌台诗案',axis:'z',spawn:[0,0,7],target:[0,0,-2],hint:'走到左右两处门前，想一想怎样让紧闭的廊门重新通光。',shot:'rear'},
 {title:'三 · 心牢',place:'御史台狱',year:'1079 · 元丰二年',story:'四壁森然，高窗外仍有月色。换个位置，看见重门之间的路。',verse:'柏台霜气夜凄凄',axis:'x',spawn:[-3.4,0,.8],hint:'按住画面左右拖动，让月光越过窗棂。',shot:'cell',background:'保留原狱建筑的诗意演绎，以视点变化表现走出内心困境。'},
 {title:'四 · 东坡初筑',place:'黄州 · 东坡雪堂',year:'1081—1082',story:'贬居黄州之后，他开垦东坡、筑起雪堂。先疏水，再补檐，让日子有个落脚处。',verse:'',axis:'z',spawn:[0,0,7],target:[-1.5,0,1.62],hint:'先看水流去向，用笔为积水疏出一条路；再补檐，走进新居。',shot:'rear'},
 {title:'五 · 沙湖烟雨',place:'黄州 · 沙湖道中',year:'1082 · 元丰五年',story:'道中忽然下起雨。经过乌台之后，他学着在风雨里慢慢走。',verse:'一蓑烟雨任平生',axis:'x',spawn:[-6,0,1],target:[2,0,1],hint:'沿竹径向右走，停在雨中，轻轻挥一笔。',shot:'rain',vertical:true},
 {title:'六 · 赤壁月夜',place:'黄州 · 赤壁',year:'1082 · 元丰五年',story:'水月使人快活，箫声又让人发愁。最后，换位置看齐水月，亲自用笔把江面展开。',verse:'江上之清风  山间之明月',axis:'z',spawn:[0,0,6],target:[0,0,-2.5],hint:'走到临江窗前，用毛笔在窗闩上落一点墨，松笔迎进江月。',shot:'cliff'},
 {title:'七 · 庐山两面',place:'庐山 · 西林寺外',year:'1084 · 元丰七年',story:'离开黄州后，途经庐山。点开窗，看一眼山，再沿折廊换个位置。',verse:'横看成岭',axis:'z',spawn:[0,0,-12],target:[0,0,-17],hint:'走到窗前光圈，用毛笔点开窗扇，借窗看山。',shot:'mountain',twoViews:true},
 {title:'八 · 诏命再起',place:'回京 · 再贬惠州',year:'1085—1094',story:'起用的路重新出现。九年之后，风向又变了。',verse:'',axis:'z',spawn:[0,.32,6.80],target:[0,.32,4.72],hint:'走到桥头，按住屏幕落墨。墨波进入浅色水纹带时松笔，转正廊桥；早了或过了，都要重试。入殿读卷后，再接上东廊南行路。',shot:'rear'},
];
const tasks=[
 [{id:'lantern',position:[-4,0,1],label:'廊灯',hint:'沿廊向右走，轻扫廊灯，让灯光照到书案。',verse:'灯下有书'},{id:'paper',position:[2,0,1],label:'诗稿',hint:'走近书案，轻扫散开的纸页。',verse:'诗文入案'}],
 [{id:'seal-left',position:[-2.8,0,0],label:'左廊开门',hint:'走到左门光圈。门挡住了光，试着用笔让它重新通光。',verse:'字字入案',kind:'spatial-gesture'},{id:'seal-right',position:[2.8,0,-2],label:'右廊开门',hint:'走到右门光圈，想一想怎样让这扇门也通向深处。',verse:'乌台霜重',kind:'spatial-gesture'},{id:'gate',position:[0,0,-6],label:'乌台门',hint:'门已打开，向前走到门下。',verse:'乌台诗案'}],
 [{id:'window',position:[-3,0,.8],label:'窗前月光',hint:'在窗前挥笔，让月光落到纸上。',verse:'柏台霜气夜凄凄'},{id:'letter',position:[1,0,.8],label:'未寄的信',hint:'走到书案边，写完这封信。',verse:'夜凄凄'}],
 [{id:'sluice',position:[2.7,0,4.2],label:'写开疏水',hint:'两条渠通向不同地方。看清水路，用笔为积水疏出一条路。',verse:'',kind:'spatial-gesture'},{id:'boat',requires:['sluice'],position:[-1.5,0,1.62],label:'补好屋檐',hint:'走近缺损屋檐，用毛笔接回散落的屋面。',verse:''},{id:'dock',position:[0,0,-1.05],label:'走进新居',hint:'木门打开后，走进屋里。',verse:''}],
 [{id:'wind',position:[-3,0,1],label:'挡路的竹枝',hint:'竹枝挡住了路。走近它，轻扫一笔，借风让路。',verse:'莫听穿林打叶声'},{id:'rain',position:[1,0,1],label:'雨中竹径',hint:'穿过让开的竹枝，在雨里再挥一笔。',verse:'何妨吟啸且徐行'},{id:'path',position:[5,0,1],label:'林间微光',hint:'继续走向右边的微光，写下最后一句。',verse:'一蓑烟雨任平生'}],
 [{id:'moon',position:[-2,0,1],label:'水中月',hint:'走近岸边的月光，轻扫水面。',verse:'山间之明月'},{id:'water',position:[1,0,-3],label:'江上清风',hint:'沿江岸向前，借一阵清风展开江面。',verse:'江上之清风'}],
 [{id:'mountain',position:[0,0,-1],label:'山前石径',hint:'沿石径前行。在山前挥一笔，换个位置看山。',verse:'横看成岭'}],
 [{id:'lantern',position:[-2.55,0,1.05],label:'启诏灯',hint:'走近诏灯，以毛笔打开正殿的门。',verse:''},{id:'gate',position:[7.22,0,1.08],label:'穿过南行门',hint:'灯光转冷后，走过右侧打开的门。',verse:''}]
];

chapters[8]={title:'九 · 食荔枝',place:'惠州',year:'1094—1096 · 绍圣年间',story:'穿过眼前的荔枝雨，把最后一颗白果涂红。',axis:'z',spawn:[0,-5,14],verse:'日啖荔枝三百颗，不辞长作岭南人',shot:'lychee'};
chapters.push({title:'十 · 平生功业',place:'北归 · 金山',year:'1101',story:'回望来路：黄州，惠州，儋州。',verse:'问汝平生功业，黄州惠州儋州',shot:'island'},
 {title:'尾声 · 此心安处',place:'诗意回望',year:'《定风波·南海归赠王定国侍人寓娘》',story:'试问岭南应不好，却道：此心安处是吾乡。',verse:'此心安处是吾乡',shot:'home'},
 {title:'外篇 · 承天夜游',place:'黄州 · 承天寺',year:'1083 · 元丰六年',story:'月色入户，欣然起行。寻怀民，过廊门，一同走进竹柏影下。',verse:'庭下如积水空明',axis:'z',spawn:[-1.4,.20,-3.25],shot:'garden',background:'依《记承天寺夜游》作诗意建筑演绎，非承天寺史实复原。'},
 {title:'彩蛋 · 一纸盛名',place:'苏轼',year:'1037—1101',story:'回望山、江与湖，让活字再次聚成诗。',verse:'名动天下',shot:'prologue'});
tasks[1][2].kind='walk';tasks[1][2].hint='门已经打开，走进去。';
tasks[3][1].kind='walk';tasks[3][1].hint='屋檐补好后，走进打开的木门。';
tasks[7][1].kind='walk';tasks[7][1].hint='走过右侧南行门，进入惠州。';
tasks[0][1]={...tasks[0][1],kind:'walk',radius:1.1,requires:['lantern'],label:'案上谢表',hint:'走到书案边，读一读《湖州谢上表》。',verse:''};
tasks[0][0].verse='';tasks[1][0].verse='';tasks[1][1].verse='';
tasks[5]=RED_CLIFF_ACTIONS.map(t=>({...t,position:[...t.position],requires:[...t.requires]}));
const MAIN_COUNT=10,GARDEN=11,PROLOGUE=12,params=new URLSearchParams(location.search),viewHeight=()=>Math.min(innerHeight*.91,innerWidth*.5625);
const renderer=createCompatibleRenderer(T,$('world'),innerWidth,viewHeight());
document.body.dataset.loading='paper';
await loadPoemFont();
document.body.dataset.loading='scenery';
const envelopeStage=(stage,i)=>{if(i!==7)return decorateArchitectureEnvelope(stage,i);stage.architectureEnvelope=stage.architectureEnvelope||stage.spaceCourt?.architectureEnvelope||null;return stage;};
const narrativeCut=createNarrativeCut(),film=createFilm(renderer),poem=createPoemText(renderer),stages=chapters.map((_,i)=>i===2?buildPrisonPerspectiveChapter():decoratePanoramaBackdrop(decorateStory(envelopeStage(decorateArchitecture(i<8?(i===0?decorateHuzhouThanksLetter(buildScene(0)):i===3?decorateDwellingRepair(decorateDwellingWater(buildHuangzhouDwelling())):i===7?buildRecallRotatingBridge():i===5?buildRedCliffExperience(buildScene(i)):i===6?buildMountainExperience(buildScene(i)):buildArchitectureGestures(buildScene(i),i)):i===8?buildLycheeJourney():i===9?buildReflectionIsland():i===10?buildIslandEnding():i===GARDEN?decorateChengtianPurposeReader(decorateChengtianPurposeExperience(buildChengtianPurposeScene())):buildPrologue(),i),i),i),i));
stages.forEach((s,i)=>{if(!s.nightJourney&&!s.prisonManaged)decorateChapterClouds(s,i);});
applyRenderBudget(renderer,stages);
const [traveler]=await Promise.all([createTraveler(),preloadPlants(),preloadBroadleaf(),...stages.map(s=>s.ready||Promise.resolve())]);
document.body.dataset.loading='ready';
let stage=0,started=false,time=0,chapterTime=0,charge=0,holding=false,strokeAge=10,walk=0,response=0,casts=0,mountainRear=false,cut=null,pending=null,paused=false,toastUntil=0,auto=false,walkDestination=null,selected=null,done=new Set(),markers=[],navPath=[],pickingAge=99,ending=false,eventIndex=0,exitAge=0,pointerPainting=false,completedAt=null,storyAt=0,lycheeTurnYaw=null,prologueReading=null,pointerOwner=null,pointerActionId=null,pointerStage=null,ambientWanted=false,brushFocus=null,thanksReading=null;
const camera=new T.PerspectiveCamera(40,innerWidth/viewHeight(),.1,900),rig=createCameraRig(camera),keys=new Set();
const occlusion=createOcclusion(camera);
const bridgeInkRipple=createBridgeInkRipple($('bridge-ink-canvas'));
await stages[2].initialise({canvas:$('world'),renderer,traveler,camera,onNextScene:()=>transition(3,false,true),ui:{outro:$('prison-outro'),poemTitle:$('prison-poem-title'),poemLines:$('prison-poem-lines'),fade:$('prison-fade')}});
stages[2].scene.remove(traveler.root);
const audio=new Audio('assets/river.wav');audio.loop=true;audio.volume=.08;
const chapterAudio=createChapterAudio();
const raycaster=new T.Raycaster(),groundPlane=new T.Plane(V(0,1,0),0),waves=[];
const isPrison=()=>!!stages[stage].prisonManaged,isGarden=()=>stage===GARDEN,isFilm=()=>!!stages[stage].cinematic,isJourney=()=>!!stages[stage].journey,isReflection=()=>!!stages[stage].reflection;
const touchControls=createTouchControls({root:$('mobile-controls'),pad:$('touch-joystick'),thumb:$('joystick-thumb'),action:$('touch-action'),clean:$('touch-clean'),restore:$('touch-restore'),
 onStart(){if(!canTouchMove())return false;clearReview();unlockSound();clearBrushFocus();auto=false;walkDestination=null;navPath=[];return true;},
 onAction:useBrushAction,onClean:toggleClean,
 onAvailability(value){if(value){$('welcome').querySelector('.micro').textContent='左下摇杆移动 · 按住画面落笔\n点“提笔·提示”查看提示 · 点“净画面”观看场景\n走到门下或路的尽头，故事会继续。';$('thanks-reader').querySelector('.scroll-actions > span').textContent='按住卷轴移动视线 · 收卷后继续行旅';}}
});
function controlsActive(){return started&&!paused&&!cut&&!ending&&!thanksReading&&!prologueReading&&!document.hidden&&$('error').hidden&&$('chapters').hidden&&$('literature').hidden;}
function canTouchMove(){
 if(!controlsActive()||document.body.classList.contains('clean')||isFilm()||!traveler.root.visible||holding||pointerPainting||pointerOwner!==null)return false;
 const s=stages[stage];if(isPrison()){const p=s.prisonStats;return p.mode==='puzzle'&&p.currentStage!=='corridor'&&!p.walking&&!p.pendingId&&!p.transition&&p.ownerPointerId===null;}
 return !(isJourney()&&(s.painted||s.movementBlocked))&&!s.gestureActive&&!s.glyphForming&&!(stage===6&&(s.viewing||s.openingId))&&!(isReflection()&&s.sitting)&&strokeAge>=2.6&&pickingAge>=1;
}
function syncTouchControls(){const active=controlsActive();touchControls.update({visible:active,movement:canTouchMove(),brush:active&&!isFilm()&&!isJourney()&&!isReflection()&&!holding&&!pointerPainting&&!stages[stage].gestureActive,cleanView:document.body.classList.contains('clean'),cleanAllowed:active});}
function useBrushAction(){if(!controlsActive())return;unlockSound();touchControls.reset();if(isPrison())toast(stages[stage].revealPrisonHint());else quickBrush();}
function toggleClean(){endPointer();stopPointerWalk();document.body.classList.toggle('clean');syncTouchControls();updateHud();}
function movementInput(){return mergeMovementInput((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),touchControls.axes);}
function touchHud(){if(!touchControls.available)return;for(const id of ['hint','key-hint','gesture-guide','bridge-ink-message'])for(const node of Array.from($(id).childNodes))if(node.nodeType===Node.TEXT_NODE)node.textContent=touchInstruction(node.textContent);$('ink-help').textContent=$('ink-help').textContent.replace(' · E','');}
function currentTasks(){if(isPrison())return [];if(isFilm())return [];if(isJourney()||isReflection()||stage===7)return stages[stage].targets;if(isGarden())return stages[stage].targets;const architecture=stages[stage].architecture?.targets||[],merge=t=>({...stages[stage].targets?.find(x=>x.id===t.id),...t,...architecture.find(x=>x.id===t.id),...stages[stage].targets?.find(x=>x.id===t.id)});if(stage===6&&mountainRear)return [merge({id:'mountain-rear',position:[0,0,-3.8],label:'第二扇观景窗',hint:'走到第二扇窗前，用毛笔点开窗，看同一座山的峰顶。',verse:'侧成峰',kind:'brush-window'})];if(stage===6&&done.has('mountain'))return [{id:'view-turn',position:stages[stage].turnPoint||[0,0,-2.2],radius:.70,label:'廊道转角',hint:'沿亮起的廊道走到转角，去另一扇窗前。',kind:'walk'}];return tasks[stage].map(merge);}
function journeyLookBack(){const s=stages[stage],turn=s.actorTurn;if(!isJourney()||!s.painted||!turn)return null;const start=lycheeTurnYaw??traveler.root.rotation.y,diff=Math.atan2(Math.sin(turn.yawGoal-start),Math.cos(turn.yawGoal-start)),sign=Math.sign(diff)||1;return {...turn,headYaw:Math.abs(turn.headYaw)*sign,shoulderYaw:Math.abs(turn.shoulderYaw)*sign};}
function fruitCount(){return ['fruit-low','fruit-fall','fruit-high'].filter(id=>done.has(id)).length;}
function required(){return isPrison()?3:stage===7?stages[stage].targets.length:isJourney()||isReflection()?1:isGarden()?(stages[stage].requiredIds?.length||3):stage===6?2:(tasks[stage]?.length||0);}
function complete(){return isPrison()?stages[stage].chapterComplete:isFilm()?chapterTime>=stages[stage].duration:isJourney()?stages[stage].painted:isReflection()?stages[stage].sitting:isGarden()?(stages[stage].requiredIds?stages[stage].requiredIds.every(id=>done.has(id)):fruitCount()>=3):done.size>=required();}
function distance(t){return t?Math.hypot(traveler.root.position.x-t.position[0],traveler.root.position.z-t.position[2],isGarden()?traveler.root.position.y-t.position[1]:0):Infinity;}
function nearTask(t){if(!t)return false;if(t.kind==='walk')return distance(t)<Math.max(.60,t.radius||.92);if(isGarden()&&t.kind==='collect')return Math.hypot(traveler.root.position.x-t.position[0],traveler.root.position.z-t.position[2])<1.5&&Math.abs(traveler.root.position.y-t.position[1])<.6;return distance(t)<(t.radius||1.65);}
function eligible(t){if(t.requires?.some(id=>!done.has(id)))return false;if(isGarden())return true;if(stage===1&&t.id==='gate')return done.has('seal-left')&&done.has('seal-right');if(stage===3&&t.id==='dock')return done.has('boat');if(stage===4&&t.id==='rain')return done.has('wind');if(stage===4&&t.id==='path')return done.has('rain');return true;}
function closest(){const s=stages[stage],available=currentTasks().filter(t=>(!done.has(t.id)||isGarden()&&s.canRepeatNightAction?.(t.id))&&eligible(t));if(isGarden()&&s.experienceComplete){const preferred=s.getNextTarget?.();if(preferred&&available.some(t=>t.id===preferred.id))return preferred;}return available.sort((a,b)=>distance(a)-distance(b))[0];}
function rebuildMarkers(){
 for(const m of markers){m.parent?.remove(m);m.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});}markers=[];
 const specs=[...currentTasks()];if(stages[stage].exit)specs.push({...stages[stage].exit,id:'chapter-exit',kind:'exit'});
 for(const t of specs){if(stage===7&&t.id!=='gate'&&t.kind!=='exit')continue;const g=new T.Group();g.position.fromArray(t.position);g.userData.task=t;
  const ring=new T.Mesh(new T.RingGeometry(.50,.58,64),new T.MeshBasicMaterial({color:0xede4bc,transparent:true,opacity:.6,depthWrite:false,toneMapped:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.035;g.add(ring);
  const inner=new T.Mesh(new T.CircleGeometry(.48,48),new T.MeshBasicMaterial({color:0xc7dac4,transparent:true,opacity:.09,depthWrite:false,toneMapped:false}));inner.rotation.x=-Math.PI/2;inner.position.y=.03;g.add(inner);
  const lamp=new T.PointLight(0xe4e1b4,.7,2.6,1.8);lamp.position.y=.28;g.add(lamp);stages[stage].scene.add(g);markers.push(g);
 }
}
function showPoem(text,left=false,red=false,style={}){if(text)poem.show(text,{left,red:!!red&&style.center===true,dark:stages[stage].paper===true,holdSeconds:stage===10?120:7,...style});}
function poemSettled(){return !poem.text||poem.age>=poem.writingDuration+1.5;}
function fixedShot(){camera.aspect=innerWidth/viewHeight();const s=stages[stage];if(isFilm()||s.fixedCamera){const c=s.fixedCamera||s.camera;camera.fov=c.fov||42;camera.position.fromArray(c.position);camera.lookAt(V(...c.lookAt));camera.updateProjectionMatrix();camera.updateMatrixWorld();}else rig.enter(chapters[stage].shot,traveler.root.position.toArray(),(mountainRear?s.followCameraRear:s.followCamera)||{},mountainRear);}
function toast(s){$('toast').textContent=s;$('toast').style.opacity=1;toastUntil=time+3.5;}
function showStory(text,thought=''){if(!text)return;$('story').textContent=text;const voice=$('thought');voice.textContent=thought;voice.hidden=!thought;storyAt=time;$('story-note').classList.remove('quiet');}
function enter(i,alternate=false){if(i===10)i=9;touchControls.reset();closeThanksLetter(false);endPointer();if(!cut?.interlude)narrativeCut.clear();document.body.classList.remove('lychee-finale');document.body.classList.remove('lychee-poem');stages[stage].cancelView?.();stages[stage].scene.remove(traveler.root);poem.clear();stage=i;chapterAudio.enter(i);if(started){const q=new URLSearchParams(location.search);q.set('chapter',String(i+1));if(q.get('review')!=='1')q.delete('hold');history.replaceState(null,'',location.pathname+'?'+q.toString());}eventIndex=0;exitAge=0;completedAt=null;prologueReading=null;lycheeTurnYaw=null;pointerPainting=false;ending=false;$('ending').hidden=true;
 if(!alternate){chapterTime=0;casts=0;response=0;done=new Set();navPath=[];pickingAge=99;charge=0;holding=false;strokeAge=10;mountainRear=false;stages[i].reset?.();if(!isFilm()){traveler.root.position.fromArray(stages[i].spawn||chapters[i].spawn);traveler.root.rotation.y=stages[i].spawnYaw??(chapters[i].axis==='x'?-Math.PI/2:0);}}
 else{mountainRear=true;response=.5;}
 walkDestination=null;selected=null;keys.clear();traveler.root.rotation.x=traveler.root.rotation.z=0;if(!isFilm()||stages[i].showTraveler){stages[i].scene.add(traveler.root);if(stages[i].showTraveler){traveler.root.position.fromArray(stages[i].travelerPosition);traveler.root.rotation.y=stages[i].sitRotation||.95;}}stages[i].setTraveler?.(traveler.root);rebuildMarkers();fixedShot();stages[i].enterCamera?.(camera,traveler.root.position);if(isFilm()||isJourney()||isReflection()||isPrison())occlusion.clear();else occlusion.enter(stages[i].scene,traveler.root);
 stages[i].activate?.();document.body.classList.toggle('prison-chapter',isPrison());document.body.classList.remove('prison-outro-active');
 $('chapter').textContent=chapters[i].title;$('place').textContent=chapters[i].place+' · '+chapters[i].year;showStory(stages[i].narrative?.intro||chapters[i].story);$('progress').textContent=i===PROLOGUE?'彩蛋':isGarden()?'夜游':`${i+1} / ${MAIN_COUNT}`;$('brush').hidden=isFilm();$('story-note').classList.remove('quiet');document.body.classList.toggle('cinematic',isFilm());document.body.classList.toggle('journey',isJourney());document.body.classList.toggle('paper',stages[i].paper===true);updateHud();}
function transition(i,alternate=false,plain=false){if(i===10)i=9;if(cut)return;touchControls.reset();endPointer();if(alternate){holding=false;charge=0;keys.clear();walkDestination=null;navPath=[];pending=null;cut={age:0,i,alternate,switched:true};enter(i,true);$('curtain').style.opacity=0;return;}holding=false;charge=0;keys.clear();walkDestination=null;navPath=[];selected=null;pending=null;const interlude=plain?null:narrativeCut.begin(stage,i);cut={age:0,i,alternate,switched:false,interlude};$('curtain').style.transition='opacity .6s';$('cut-title').textContent=plain?'':alternate?'侧成峰':chapters[i].title.replace(/^.*?·\s*/,'');$('cut-date').textContent=plain?'':alternate?'横看成岭 · 侧成峰':chapters[i].place;$('curtain').style.opacity=interlude?0:1;}
function clearReview(){auto=false;params.delete('hold');params.delete('review');params.delete('testwalk');history.replaceState(null,'',location.pathname+(started?'?chapter='+(stage+1):''));}
function begin(i=0,fromQuery=false){const opening=arguments.length===0;auto=false;if(!fromQuery)clearReview();cut=null;narrativeCut.clear();$('curtain').style.opacity=0;$('curtain').classList.remove('opening-title');started=true;paused=false;$('welcome').hidden=true;$('hud').hidden=false;enter(i);if(opening){cut={age:0,i,switched:true,opening:true};$('curtain').classList.add('opening-title');$('cut-title').textContent='东坡行记';$('cut-date').textContent='苏轼 · 一〇三七 — 一一〇一';$('curtain').style.opacity=1;$('hud').hidden=true;}unlockSound();$('world').focus();}
function openThanksLetter(task){
 if(thanksReading||paused||cut||(stage!==0&&!isGarden())||!nearTask(task)||!eligible(task)||!stages[stage].getThanksLetter)return false;
 endPointer();stopPointerWalk();holding=false;charge=0;pending=null;
 const shot=stages[stage].getThanksLetterCamera(innerWidth/viewHeight(),1);
 thanksReading={task,stage,age:0,position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov,goal:shot,zoom:1,pan:{x:0,z:0},drag:null,actorVisible:traveler.root.visible};paused=true;
 stages[stage].beginThanksLetterReading?.();traveler.root.visible=false;poem.clear();
 $('thanks-reader').hidden=false;document.body.classList.add('thanks-reading');return true;
}
function closeThanksLetter(commit=true){
 if(!thanksReading)return;const read=thanksReading;if(read.drag&&$('world').hasPointerCapture?.(read.drag.id))$('world').releasePointerCapture(read.drag.id);thanksReading=null;stages[read.stage].endThanksLetterReading?.();traveler.root.visible=read.actorVisible;$('thanks-reader').hidden=true;document.body.classList.remove('thanks-reading');paused=false;
 camera.position.copy(read.position);camera.quaternion.copy(read.rotation);camera.fov=read.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 if(commit&&stage===read.stage){if(done.has(read.task.id)&&isGarden()&&stages[stage].canRepeatNightAction?.(read.task.id))stages[stage].onNightReadingClosed?.();else resolve(read.task,true);}$('world').focus();
}
function updateThanksLetter(dt){
 if(!thanksReading)return;const read=thanksReading;dt=Math.min(.05,Math.max(0,dt));read.age+=dt;stages[read.stage].updateThanksLetterReading?.(dt);read.goal=stages[read.stage].getThanksLetterCamera(innerWidth/viewHeight(),read.zoom);const limits=read.goal.bounds||{width:2.3,depth:1.45},crop=1-1/read.zoom;read.pan.x=T.MathUtils.clamp(read.pan.x,-limits.width*.5*crop,limits.width*.5*crop);read.pan.z=T.MathUtils.clamp(read.pan.z,-limits.depth*.5*crop,limits.depth*.5*crop);
 const mix=T.MathUtils.smootherstep(read.age,0,1.2),shift=V(read.pan.x,0,read.pan.z),goal=V(...read.goal.position).add(shift),aim=new T.PerspectiveCamera();aim.up.fromArray(read.goal.up||[0,0,-1]);aim.position.copy(goal);aim.lookAt(V(...read.goal.target).add(shift));camera.aspect=innerWidth/viewHeight();if(read.age<=1.2){camera.position.copy(read.position).lerp(goal,mix);camera.quaternion.copy(read.rotation).slerp(aim.quaternion,mix);camera.fov=T.MathUtils.lerp(read.fov,read.goal.fov,mix);}else{const ease=1-Math.exp(-dt*12);camera.position.lerp(goal,ease);camera.quaternion.slerp(aim.quaternion,ease);camera.fov=T.MathUtils.lerp(camera.fov,read.goal.fov,ease);}camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
function finish(){if(ending)return;touchControls.reset();endPointer();ending=true;paused=true;keys.clear();walkDestination=null;holding=false;charge=0;$('ending').hidden=false;$('hud').hidden=true;}
function playWindowBrush(id){walkDestination=null;navPath=[];keys.clear();holding=false;charge=0;strokeAge=0;traveler.root.rotation.y=id==='mountain'?Math.PI/2:0;}
function beginWindowBrush(task){if(!started||paused||cut||strokeAge<2.6||stage!==6||task?.kind!=='brush-window'||!nearTask(task)||!stages[stage].requestOpen?.(task.id,traveler.root.position))return false;playWindowBrush(task.id);return true;}
function startBrush(){if(!started||paused||cut||strokeAge<2.6||isFilm()||isJourney()||isReflection()||['window-drag','brush-window','spatial-gesture','water-gate'].includes(closest()?.kind))return;walkDestination=null;navPath=[];selected=closest();if(!nearTask(selected)||['collect','walk'].includes(selected?.kind))selected=null;holding=true;}
function release(){if(!holding)return;holding=false;pending={at:time+1.1,task:selected,stage};strokeAge=0;charge=0;selected=null;}
function pickFruit(){const t=closest();if(!started||paused||cut||pickingAge<1||strokeAge<2.6||t?.kind!=='collect'||!nearTask(t))return false;holding=false;charge=0;walkDestination=null;navPath=[];pickingAge=0;pending={at:time+.65,task:t,stage,pick:true};return true;}
function quickBrush(){if(isFilm()||isJourney()||isReflection())return;if(closest()?.kind==='scroll-read'){if(!openThanksLetter(closest()))toast(closest().hint);return;}if(closest()?.kind==='brush-window'){if(!beginWindowBrush(closest()))toast(closest().hint);return;}if(['window-drag','spatial-gesture','water-gate'].includes(closest()?.kind)){const t=closest(),s=stages[stage];if(nearTask(t))s.revealBrushHint?.(t.id);toast(s.getBrushHint?.(t.id)||t.explicitHint||t.hint);return;}if(pickFruit())return;if(closest()?.kind==='walk'){toast(closest().hint);return;}startBrush();if(holding){charge=.58;release();}}
function revealWritingGuide(){
 const s=stages[stage],task=closest();
 if(paused||cut||!nearTask(task)||done.has(task?.id))return;
 const rect=s.getGestureRect?.(camera,task.id);if(rect?.mode!=='write')return;
 stopPointerWalk();unlockSound();s.revealBrushHint?.(task.id);
 toast(s.getBrushHint?.(task.id)||writingHintSentence(rect.word||'开')+'按住左键落笔，写完一笔再松开。');
 updateHud();$('world').focus({preventScroll:true});
}
function writingHintSentence(word){return {风:'借一字【风】，吹散挡在廊前的落叶。',开:'以一字【开】，让光穿过这道门。',林:'借一字【林】，让树影连成树林，露出灯下归路。'}[word]||`借一字【${word}】，为眼前的景物添一条通路。`;}
function renderWritingHint(node,message,word,operation=''){
 const sentence=message?.includes(`【${word}】`)?message:writingHintSentence(word),text=sentence+(operation?'\n'+operation:'');
 if(!node.replaceChildren||!document.createTextNode||!document.createElement){node.textContent=text;return;}
 const token=`【${word}】`,parts=sentence.split(token),content=[];
 parts.forEach((part,i)=>{if(i){const keyword=document.createElement('span');keyword.className='writing-keyword';keyword.textContent=word;content.push(keyword);}if(part)content.push(document.createTextNode(part));});
 if(operation)content.push(document.createTextNode('\n'+operation));node.replaceChildren(...content);
}
function resolve(task,windowFinished=false){if((stage===0&&task?.id==='paper'||isGarden()&&task?.kind==='scroll-read')&&!windowFinished&&(!done.has(task.id)||isGarden()&&stages[stage].canRepeatNightAction?.(task.id))){openThanksLetter(task);return;}if(task?.kind==='paint')return;if(!task){stages[stage].brushWind?.(traveler.root.position.clone());toast(closest()?.hint||'笔风掠过山水。');return;}if(['spatial-gesture','water-gate'].includes(task.kind)&&!windowFinished){toast(task.hint);return;}if(task.kind==='brush-window'&&!windowFinished){beginWindowBrush(task);return;}if(task.id==='view-turn'){if(poemSettled())transition(stage,true);return;}if(done.has(task.id))return;if(stages[stage].interact?.(task.id,casts)===false){toast('先打开通路。');return;}done.add(task.id);casts++;rebuildMarkers();if(isReflection()){eventIndex=0;walkDestination=null;keys.clear();traveler.root.rotation.y=stages[stage].sitRotation||.95;traveler.root.position.fromArray(stages[stage].sitPosition);}response=Math.max(response,isGarden()&&stages[stage].requiredIds?stages[stage].requiredIds.filter(id=>done.has(id)).length/required():isGarden()?fruitCount()/3:done.size/required());const story=stages[stage].narrative?.event(task.id);if(story?.prose)showStory(story.prose,story.thought);if(story?.poem)showPoem(story.poem,stage===4);else if(!stages[stage].narrative&&!isReflection()&&(task.verse||!isGarden()&&complete()))showPoem(isGarden()&&complete()?chapters[stage].verse:task.verse||chapters[stage].verse,stage===4,stage===1);if(isGarden()&&task.kind==='collect')toast(`荔枝 ${fruitCount()} / 3`);else if(task.kind!=='walk')toast(task.feedback||task.label);updateHud();}
function updateTaskGuide(s,guide){
 if(!s.getTaskGuide){guide.classList.toggle('task-callout',false);return;}
 const cue=s.getTaskGuide(camera),q=cue?.anchor,view=$('world').getBoundingClientRect();
 const visible=!!cue?.visible&&!!q&&Number.isFinite(q.x+q.y+q.z)&&q.z>-1&&q.z<1&&Math.abs(q.x)<.96&&Math.abs(q.y)<.94&&!paused&&!cut&&!thanksReading&&!prologueReading&&!document.body.classList.contains('clean');
 guide.classList.toggle('task-callout',visible);guide.hidden=!visible;if(!visible)return;
 guide.textContent=cue.title+'\n'+cue.action;
 const px=view.left+(q.x+1)*view.width/2,py=view.top+(1-q.y)*view.height/2,w=Math.min(208,view.width-32),h=guide.offsetHeight||58,right=px+56+w<view.right-16;
 const left=Math.max(view.left+16,Math.min(view.right-w-16,right?px+56:px-w-56)),top=Math.max(view.top+30,Math.min(view.bottom-h-88,py-h-26)),lx=right?0:w,dx=px-left-lx,dy=py-top-h;
 guide.style.left=left+'px';guide.style.top=top+'px';guide.style.width=w+'px';
 guide.style.setProperty('--guide-leader-left',right?'0px':'100%');guide.style.setProperty('--guide-leader-length',Math.hypot(dx,dy)+'px');guide.style.setProperty('--guide-leader-angle',Math.atan2(dy,dx)+'rad');
 guide.setAttribute('aria-label',cue.title+'：'+cue.action);
}
function updateBridgeInk(s){
 const panel=$('bridge-ink-panel'),state=s.getBridgeInkState?.();
 panel.hidden=!state?.visible||paused||!!cut||!!thanksReading||document.body.classList.contains('clean');
 const view=$('world').getBoundingClientRect(),wave=bridgeInkRipple.update(state,view,!panel.hidden);
 s.scene.userData.bridgeRipple=wave.visible?{origin:[wave.origin.x,1-wave.origin.y],radius:wave.front/view.height,strength:wave.strength}:null;
 if(panel.hidden)return;
 panel.style.left=view.left+'px';panel.style.top=view.top+'px';panel.style.width=view.width+'px';panel.style.height=view.height+'px';
 panel.dataset.phase=state.phase;panel.dataset.bridge=state.id;panel.dataset.overshot=String(!!state.overshot);
 $('bridge-ink-message').textContent=state.message||'按住，让墨波荡开；进入浅色水纹带时松笔';
 panel.setAttribute('aria-label','借墨定桥：'+$('bridge-ink-message').textContent);
}
function updateHud(){const s=stages[stage],task=closest(),near=nearTask(task),exit=s.exit;
 updateBridgeInk(s);
 if(isPrison()){const s=stages[stage];$('hint').textContent=s.getPrisonInstruction();$('key-hint').textContent=s.getPrisonKeyHint();$('progress').textContent=s.getPrisonProgress();$('interaction-count').textContent='';$('brush').hidden=true;$('ink-help').hidden=true;$('gesture-guide').hidden=true;document.body.classList.remove('painting','writing');touchHud();return;}
 let hint=isFilm()?(s.interactive?s.hint:'诗句写完后，故事会自动继续。'):complete()?(isJourney()?'回过身，看三百颗荔枝一起散开。随后故事会继续。':isReflection()?'已坐下。回望来路，读完最后的诗句。':isGarden()?(s.completionHint||'这一夜已写进纸上。还可以和怀民在庭中看月、沿廊慢行。'):exit?.label||'沿着前面的路继续走。'):task?.hint||task?.verb||chapters[stage].hint||'';
 if(!isFilm()&&!isJourney()&&!isReflection()&&!isGarden()&&complete()&&!poemSettled())hint='诗句正在写出。写完后，走过门下便会继续。';
 if(isJourney()){
  const phase=s.outroStats?.phase;
  hint=s.painted?({
   'red-confirm':'最后一颗红了，回身看一眼来路。',
   'pullback':'回头看一眼，一路经过的荔枝都在这里。',
   'swelling':'三百颗慢慢胀开，眼前是一片荔枝海。',
   'ocean':'看一眼这片荔枝海，下一刻一起散开。',
   'overview-hold':'三百颗，都红了。',
   'full-red':'三百颗，都红了。',
   'burst':'三百颗荔枝一起炸开，散作红墨。',
   'clear':'红墨散开，两句诗在眼前写出。读完，故事会继续。'
  }[phase]||'最后一颗荔枝也红了。'):s.paintReady?'按住鼠标左键，把最后一颗白荔枝涂红。':s.movementBlocked?'镜头正在靠近最后一颗白果，稍等一下。':s.arriving?'最后一颗白果就在前面。':'向前走，穿过荔枝雨。最后一颗白果留给你的笔。';
 }
 if(stage===6&&(s.openingId||s.viewing))hint=s.openingId?'窗扇依次打开，山景就在窗后。':'看一眼窗中的山景。';
 if(task?.kind==='spatial-gesture'&&near)hint=stage===5&&s.redCliffStats?.focus?'跟着月光看江面，镜头会回到身边。':s.glyphForming?'墨迹正在改变眼前的空间，稍等一会儿。':s.getGestureRect?.(camera,task.id)?.hint||task.hint;
 $('key-hint').textContent=isJourney()?(s.painted?'自动继续　H 净画面':s.paintReady?'按住鼠标左键涂色　H 净画面':s.movementBlocked?'镜头靠近后涂色　H 净画面':'WASD / 左键行走　H 净画面'):isReflection()?'WASD / 左键走到光圈　H 净画面':task?.kind==='brush-window'?'点窗扇 / E 提笔开窗　H 净画面':task?.kind==='window-drag'?'按住窗扇拖动，松手完成　H 净画面':task?.kind==='walk'||complete()?'WASD / 左键行走　H 净画面':'WASD 行走　E 轻扫　H 净画面';
 if(isFilm()||isReflection()&&s.sitting)$('key-hint').textContent=s.interactive&&s.prologueStats?.phase!=='closing'?'左键点字版 / 按住轻扫换诗　H 场景信息':'自动继续　H 场景信息';if(stage===PROLOGUE)$('place').textContent=s.prologueStats?.phase==='closing'?'彩蛋 · 一纸盛名':s.prologueStats?.title?'苏轼 · 《'+s.prologueStats.title+'》':'山 · 江 · 湖，点字读诗';
 if(stage===6&&(s.openingId||s.viewing))$('key-hint').textContent='看完山景，镜头会回到廊道';
 if(document.body.classList.contains('clean'))$('key-hint').textContent=$('key-hint').textContent.replace('H 净画面','H 显示场景信息');
 if(stage===7&&s.getBorrowedPathHint)hint=s.getBorrowedPathHint();$('hint').textContent=hint;$('interaction-count').textContent=isJourney()&&s.paintReady&&!s.painted?`涂色 ${Math.round(s.coverage*100)}%`:isGarden()?(s.getNightProgress?.()||''):task?.kind==='window-drag'&&s.progress>0?`窗扇 ${Math.round(s.progress*100)}%`:'';
 $('brush').hidden=isFilm()||isJourney()||isReflection()||task?.kind==='window-drag'||(!near&&!holding);
 if(!isFilm()&&task){$('brush').innerHTML=near?(task.kind==='collect'?`摘荔枝<small>E</small>`:task.kind==='walk'?`走进去<small>继续向前</small>`:`${task.label}<small>E 轻扫 / 按住画面落笔</small>`):'提笔<small>E / 按住画面</small>';$('brush').classList.toggle('near',near);if(task.kind==='walk')$('brush').hidden=true;}
 if(task?.kind==='brush-window'&&near)$('brush').innerHTML='点窗借景<small>E</small>';
 if(stage===6&&(s.openingId||s.viewing))$('brush').hidden=true;
 const gesture=task?.kind==='spatial-gesture',guide=$('gesture-guide'),writingHelp=$('ink-help');
 writingHelp.hidden=true;
 if(gesture){$('brush').hidden=true;const rect=s.getGestureRect?.(camera,task.id),writing=rect?.mode==='write',revealed=!writing||rect?.guideVisible!==false;const context=rect?.contextHint||task.hint;if(near&&!s.glyphForming&&!(stage===5&&s.redCliffStats?.focus))$('hint').textContent=context;$('key-hint').textContent=near?(writing?'按住左键落笔　E 查看写法　H 场景信息':rect?.hint||task.hint):'WASD / 左键走到地上光圈　E 查看提示';$('interaction-count').textContent=rect?.showProgress===false||!revealed?'':rect?(writing?`书写 ${Math.round((rect.progress||0)*100)}%`:`${rect.label||task.label} ${Math.round((rect.progress||0)*100)}%`):'';if(stage===3&&(s.waterStats?.draining||s.waterStats?.drained)){$('key-hint').textContent='水正流走，稍等石路露出来　H 场景信息';$('interaction-count').textContent=`排水 ${Math.round((s.waterStats.drainProgress||0)*100)}%`;}}
 if(gesture&&near){
  const rect=s.getGestureRect?.(camera,task.id);
  if(rect?.mode==='write'){
   const word=rect.word||rect.character||(task.id==='wind'?'风':'开'),percent=Math.round((rect.progress||0)*100),revealed=rect.guideVisible!==false;
   writingHelp.hidden=s.glyphForming||paused||cut||done.has(task.id);writingHelp.textContent=revealed?'再看写法 · E':'看写法 · E';
   if(s.glyphForming){
    renderWritingHint($('hint'),word==='风'?'【风】从笔下起，格屏渐开，挡路的落叶正在散去。':word==='林'?'【林】在墙外显现，树影相连，灯下的归路正在亮起。':'【开】字落定，门闸渐开，光与水流正在穿过。',word);
    $('key-hint').textContent='松开鼠标，等环境变化后继续走';
   }else{
    const context=rect.contextHint||task.hint||'';
    renderWritingHint($('hint'),context,word,'按住左键落笔，写完一笔再松开。');
    $('key-hint').textContent=percent>0?`墨迹 ${percent}% · 继续完成这一字　E 查看写法`:'落笔时人物会停住　E 查看写法';
   }
  }
 }
 guide.hidden=!(gesture&&near&&!paused&&!cut)||s.getGestureRect?.(camera,task.id)?.mode==='write'||s.nightJourney||stage===7;if(stage===5&&s.redCliffStats?.focus||stage===3&&(s.waterStats?.draining||s.waterStats?.drained))guide.hidden=true;if(!guide.hidden){const rect=s.getGestureRect?.(camera,task.id),view=$('world').getBoundingClientRect();if(rect){const x=rect.x??rect.centre?.x??rect.center?.x,y=rect.y??rect.centre?.y??rect.center?.y;guide.textContent=s.glyphForming?'字成，空间正在打开…':rect.hint||task.hint;const centreX=view.left+(x+1)*view.width/2,centreY=view.top+(1-y)*view.height/2,edge=(rect.halfWidth||0)*view.width/2,gap=125;const sideX=centreX+edge+gap<innerWidth-125?centreX+edge+gap:centreX-edge-gap;guide.style.left=Math.max(125,Math.min(innerWidth-125,sideX))+'px';guide.style.top=Math.max(view.top+35,Math.min(view.bottom-100,centreY-35))+'px';}else guide.hidden=true;}
 if(task?.kind==='water-gate'){
  $('brush').hidden=true;const water=s.waterStats||{},rect=s.getEnvironmentDragRect?.(camera),view=$('world').getBoundingClientRect();
  $('key-hint').textContent=water.opened?'水正流走，稍等石路露出来　H 场景信息':near?'按住木柄，沿亮弧拖开渠闸　H 场景信息':'WASD / 左键走到渠闸光圈';
  $('interaction-count').textContent=water.opened?`排水 ${Math.round((water.drainProgress||0)*100)}%`:`渠闸 ${Math.round((water.progress||0)*100)}%`;
  if(water.opened)$('hint').textContent='水正顺着渠流走，屋前的石路正在露出来。';
  guide.hidden=!(near&&rect&&!water.opened&&!paused&&!cut);if(!guide.hidden){const q=rect.guideNDC||rect.current||rect.start;guide.textContent='按住木柄，顺着亮弧拖开';guide.style.left=Math.max(120,Math.min(innerWidth-120,view.left+(q.x+1)*view.width/2))+'px';guide.style.top=Math.max(view.top+35,view.top+(1-q.y)*view.height/2-50)+'px';}
 }
 if(stage===7&&task)$('key-hint').textContent=s.getBorrowedPathKeyHint?s.getBorrowedPathKeyHint(task.id):task.id==='turn-near'||task.id==='turn-far'?'按住屏幕落墨　墨波入水纹带时松笔':task.id==='read-decree'?'按住左键横扫殿内高窗　松笔引光':task.kind==='walk'?'WASD / 左键沿廊行走':'按住落墨　松笔定桥';
 if(s.nightJourney){const instruction=s.getNightInstruction?.();if(instruction)$('hint').textContent=instruction;if(task?.kind==='scroll-read')$('key-hint').textContent=s.experienceComplete?'E / 点卷轴重读　WASD / 左键游院':'E / 点卷轴展开原文';else if(gesture)$('key-hint').textContent=task.id==='moon-gallery'?'WASD / 左键挪步看齐双窗　看齐后落墨确认':task.id==='court-moon'?'按住左键轻扫庭中月色，再松手':task.id==='friend-door'&&s.nightJourneyStats?.mood==='departure'?'点击亮起的门槛出屋　也可 WASD 行走':'点击窗扇或房门　长按墨色会更深';}
 if(s.getNightKeyHint){$('hint').textContent=s.getNightInstruction();$('key-hint').textContent=s.getNightKeyHint();$('progress').textContent=s.getNightProgress();}
 updateTaskGuide(s,guide);
 document.body.classList.toggle('painting',isJourney()&&s.paintReady&&!s.painted);
 document.body.classList.toggle('writing',gesture&&near&&!s.glyphForming);
 touchHud();
}
function wave(){const origin=traveler.tip.getWorldPosition(V());origin.y=traveler.root.position.y+.07;const p=[],s=[];for(let i=0;i<340;i++){p.push(0,0,0);s.push(Math.random(),Math.random(),Math.random());}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('seed',new T.Float32BufferAttribute(s,3));const m=new T.ShaderMaterial({uniforms:{age:{value:0},origin:{value:origin}},transparent:true,depthWrite:false,vertexShader:`attribute vec3 seed;uniform float age;uniform vec3 origin;varying float alpha;void main(){float a=seed.x*6.283,r=age*1.8+(seed.y-.5)*.12;vec3 p=origin+vec3(cos(a)*r,.02*sin(seed.z*22.),sin(a)*r);vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(12./-mv.z,.8,2.);alpha=(1.-smoothstep(1.,2.6,age))*.23;}`,fragmentShader:'varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.8,.84,.75,alpha*smoothstep(1.,.1,r));}'});const n=new T.Points(g,m);n.frustumCulled=false;stages[stage].scene.add(n);waves.push({node:n,scene:stages[stage].scene,age:0});}
const pathBounds=[[-10,10,-.4,2.3],[-4.6,4.6,-9,8],[-5.5,5.5,.5,1.1],[-.65,.65,-4,8],[-10,10,-.5,2.5],[-4.8,4,-6,8],[-2,2,-6,8],[-10,10,-.5,2.5]];
function applyRainHit(){if(!isJourney()||paused||cut||stages[stage].painted)return false;const s=stages[stage],hit=s.takeRainHit?.();if(!hit)return false;const push=hit.push;if(!Array.isArray(push)||!Number.isFinite(push[0])||!Number.isFinite(push[2]))return false;const delta=V(push[0],0,push[2]);if(delta.length()>.55)delta.setLength(.55);if(s.flight)s.applyFlightHit?.(hit,traveler.root.position);else traveler.root.position.copy(constrain(traveler.root.position.clone().add(delta)));endPointer();holding=false;charge=0;walk=0;walkDestination=null;navPath=[];toast(stages[stage].flight?'避开前方荔枝，继续向前飞。':'往旁边让一步，避开红色落点');return true;}
function constrain(p){if(isJourney()||isReflection()){const s=stages[stage],b=s.bounds;p.x=T.MathUtils.clamp(p.x,b.minX,b.maxX);p.z=T.MathUtils.clamp(p.z,b.minZ,b.maxZ);if(s.canMove?.(traveler.root.position,p,done)===false)return traveler.root.position.clone();p.y=s.heightAt?.(p.x,p.z)??s.spawn[1];return p;}if(isGarden()){const s=stages[stage],b=s.bounds;p.x=T.MathUtils.clamp(p.x,b.minX,b.maxX);p.z=T.MathUtils.clamp(p.z,b.minZ,b.maxZ);if(!s.canMove(traveler.root.position,p,done))return traveler.root.position.clone();p.y=s.heightAt(p.x,p.z);return p;}const native=[3,5,6,7].includes(stage)?stages[stage].bounds:null,b=native?[native.minX,native.maxX,native.minZ,native.maxZ]:pathBounds[stage];p.x=T.MathUtils.clamp(p.x,b[0],b[1]);p.z=T.MathUtils.clamp(p.z,b[2],b[3]);if(stage===4&&!done.has('wind')&&p.x>-.8)p.x=-.8;if(stage===1&&(!done.has('seal-left')||!done.has('seal-right'))&&p.z<-5.2)p.z=-5.2;if([3,7].includes(stage))p.y=stages[stage].heightAt?.(p.x,p.z)??p.y;if(stages[stage].architecture?.canMove(traveler.root.position,p,done)===false||stages[stage].canMove?.(traveler.root.position,p,done)===false)return traveler.root.position.clone();return p;}
function gardenRoute(goal){const scene=stages[stage],step=.4,key=(x,z)=>x+','+z,start=traveler.root.position.clone(),startX=Math.round(start.x/step),startZ=Math.round(start.z/step),open=[{x:startX,z:startZ,g:0,f:0,parent:null}],best=new Map(),closed=new Set();let found=null,tries=0;while(open.length&&tries++<6000){open.sort((a,b)=>a.f-b.f);const n=open.shift(),k=key(n.x,n.z);if(closed.has(k))continue;closed.add(k);const p=V(n.x*step,scene.heightAt(n.x*step,n.z*step),n.z*step);if(Math.hypot(p.x-goal.x,p.z-goal.z)<step*.9){found=n;break;}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,q=V(x*step,0,z*step);q.y=scene.heightAt(q.x,q.z);if(!scene.canMove(p,q,done))continue;if(dx&&dz&&(!scene.canMove(p,V(x*step,p.y,n.z*step),done)||!scene.canMove(p,V(n.x*step,p.y,z*step),done)))continue;const k2=key(x,z),g=n.g+Math.hypot(dx,dz);if(closed.has(k2)||g>=(best.get(k2)??Infinity))continue;best.set(k2,g);open.push({x,z,g,f:g+Math.hypot(q.x-goal.x,q.z-goal.z)/step,parent:n});}}if(!found)return [];const route=[];for(let n=found;n&&n.parent;n=n.parent)route.unshift(V(n.x*step,scene.heightAt(n.x*step,n.z*step),n.z*step));return route;}
function walkTo(p){if(stages[stage].routeTo){navPath=stages[stage].routeTo(p,traveler.root.position);walkDestination=navPath.shift()||null;}else if(isGarden()){navPath=gardenRoute(p);walkDestination=navPath.shift()||null;if(!walkDestination)toast(stages[stage].getBlockedHint?.()||'通路还未打开，先看看眼前的门窗。');}else walkDestination=constrain(p);}
function chooseWalk(e){if(stages[stage].flight)return;if(isFilm()||cut||paused||isReflection()&&stages[stage].sitting)return;groundPlane.constant=-(stages[stage].spawn?.[1]||0);const r=$('world').getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);let p;if(isGarden()){const hits=raycaster.intersectObjects(stages[stage].walkSurfaces||[],false);if(hits.length)p=hits[0].point.clone();}else{p=V();if(!raycaster.ray.intersectPlane(groundPlane,p))p=null;}if(p){walkTo(p);keys.clear();holding=false;charge=0;}}
function checkExit(dt){if(stage===6&&(stages[stage].viewing||stages[stage].openingId))return;if(isFilm()||cut||pending||strokeAge<2.6)return;for(const t of currentTasks())if(t.kind==='walk'&&t.autoComplete!==false&&!done.has(t.id)&&eligible(t)&&nearTask(t)){resolve(t);break;}if(cut||!complete()||isGarden()||isJourney()||isReflection())return;const exit=stages[stage].exit;if(!exit)return;const c=exit.crossing,reached=c?traveler.root.position[c.axis]*c.direction>=c.value*c.direction:Math.hypot(traveler.root.position.x-exit.position[0],traveler.root.position.z-exit.position[2])<(exit.radius||.8);exitAge=reached?exitAge+dt:0;if(exitAge>.25&&poemSettled())transition(stage+1);}
function updateAuto(){if(isPrison()||!auto||cut||isFilm())return;if(isJourney()){const s=stages[stage];if(s.flight)return;if(s.movementBlocked||s.painted)return;if(!s.paintReady&&!walkDestination)walkTo(V(...s.targets[0].position));return;}if(isReflection()){if(!stages[stage].sitting&&!walkDestination)walkTo(V(...stages[stage].targets[0].position));return;}const t=closest();if(t){if(!nearTask(t)&&strokeAge>=2.6){if(!walkDestination)walkTo(V(...t.position));}else if(['window-drag','spatial-gesture','water-gate'].includes(t.kind)&&nearTask(t))auto=false;else if(t.kind!=='walk'&&strokeAge>2.8&&!pending&&pickingAge>1)quickBrush();}else if(complete()&&strokeAge>3.4){if(params.get('review')==='1'&&params.has('hold'))auto=false;else if(!walkDestination&&stages[stage].exit)walkTo(V(...stages[stage].exit.position));}}
$('begin').onclick=()=>begin();
$('ink-help').onclick=revealWritingGuide;
$('brush').onpointerdown=e=>{e.preventDefault();$('brush').setPointerCapture(e.pointerId);if(closest()?.kind==='brush-window')beginWindowBrush(closest());else if(!pickFruit())startBrush();};$('brush').onpointerup=release;$('brush').onpointercancel=()=>{holding=false;charge=0;};
function screenPoint(position){if(!position)return null;const p=V(...position).project(camera),r=$('world').getBoundingClientRect();return {x:Math.round(r.left+(p.x+1)*r.width/2),y:Math.round(r.top+(1-p.y)*r.height/2)};}
function pointerNdc(e){const r=$('world').getBoundingClientRect();return new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);}
// Reading freezes movement and the scene, while the musical phrase continues.
function soundPaused(){return !started||ending||!$('chapters').hidden||!$('literature').hidden||(paused&&!thanksReading);}
function syncSceneSound(){const state={muted:chapterAudio.stats.muted,paused:soundPaused(),hidden:document.hidden};for(const s of stages)s.setSoundState?.(state);}
function unlockSound(){chapterAudio.update(0,{paused:soundPaused(),hidden:document.hidden});chapterAudio.unlock();syncSceneSound();ambientWanted=true;if(!soundPaused()&&!document.hidden&&audio.paused&&!audio.muted)audio.play().catch(()=>{ambientWanted=false;});}
function stopPointerWalk(){touchControls.reset();keys.clear();walkDestination=null;navPath=[];holding=false;charge=0;}
function clearBrushFocus(){brushFocus=null;document.body.classList.remove('brush-focused');}
function beginBrushFocus(task){
 if(task?.kind!=='spatial-gesture'||!nearTask(task)||!eligible(task)||done.has(task.id)&&!(isGarden()&&stages[stage].canRepeatNightAction?.(task.id)))return;
 stopPointerWalk();
 brushFocus={stage,id:task.id,position:traveler.root.position.clone(),cameraPosition:camera.position.clone(),cameraRotation:camera.quaternion.clone(),fov:camera.fov};
 document.body.classList.add('brush-focused');
}
function keepBrushFocus(){
 if(!brushFocus)return;
 const s=stages[stage],task=currentTasks().find(t=>t.id===brushFocus.id);
 if(brushFocus.stage!==stage||!task||done.has(task.id)&&!(isGarden()&&s.canRepeatNightAction?.(task.id))||!eligible(task)||s.glyphForming||s.viewing||s.redCliffStats?.focus){clearBrushFocus();return;}
 traveler.root.position.copy(brushFocus.position);camera.position.copy(brushFocus.cameraPosition);camera.quaternion.copy(brushFocus.cameraRotation);camera.fov=brushFocus.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
function brushRegionIntent(ndc,viewport){
 const s=stages[stage],candidates=[];
 for(const task of currentTasks()){
  if(task.kind!=='spatial-gesture'||done.has(task.id)&&!(isGarden()&&s.canRepeatNightAction?.(task.id))||!eligible(task)||!nearTask(task))continue;
  const supplied=s.getBrushInteractionRegions?.(camera,task.id),regions=supplied?.length?supplied:[s.getGestureRect?.(camera,task.id)];
  for(const r of regions){
   if(!r||r.visible===false||r.completed||r.locked||r.centre?.z>1||r.centre?.z< -1)continue;
   const x=r.x??r.centre?.x??r.center?.x,y=r.y??r.centre?.y??r.center?.y;
   if(!Number.isFinite(x)||!Number.isFinite(y))continue;
   const dx=Math.abs(ndc.x-x)*viewport.width/2,dy=Math.abs(ndc.y-y)*viewport.height/2,w=(r.halfWidth||0)*viewport.width/2,h=(r.halfHeight||0)*viewport.height/2;
   if(dx<=w+32&&dy<=h+32)candidates.push({id:task.id,subId:r.subId,kind:task.kind,available:r.enabled!==false,exact:false,brushRegion:true,score:Math.hypot(Math.max(0,dx-w),Math.max(0,dy-h))});
  }
 }
 candidates.sort((a,b)=>a.score-b.score);return candidates[0]||null;
}
function pointerBusy(){const s=stages[stage];return pointerOwner!==null||s.gestureActive||s.viewing||s.openingId||(s.movementBlocked&&!(isJourney()&&s.paintReady&&!s.painted))||s.glyphForming;}
function endPointer(e,cancel=e?.type!=='pointerup'){
 if(cancel&&isPrison())stages[stage].cancelInput();
 if(e?.type==='lostpointercapture'&&pointerOwner===null)return;
 if(e?.pointerId!==undefined&&pointerOwner!==null&&e.pointerId!==pointerOwner)return;
 const owner=pointerOwner,ownerStage=pointerStage;
 pointerOwner=null;pointerActionId=null;pointerStage=null;pointerPainting=false;if(cancel)clearBrushFocus();
 if(ownerStage!==null){const s=stages[ownerStage];if(cancel){if(s.pointerCancel)s.pointerCancel();else s.pointerUp?.();}else{if(e&&Number.isFinite(e.clientX+e.clientY))s.pointerMove?.(pointerNdc(e),camera,traveler.root.position);s.pointerUp?.();}}
 if(owner!==null&&$('world').hasPointerCapture?.(owner))$('world').releasePointerCapture(owner);
 if(e?.button===2)release();
}
function consumeBuildingIntent(intent){
 const active=currentTasks().find(t=>t.id===intent.id),known=active||stages[stage].targets?.find(t=>t.id===intent.id);
 stopPointerWalk();
 if(intent.navigationOnly&&active&&eligible(active)){const approach=intent.approachPosition||stages[stage].getTaskApproachPosition?.(active.id,traveler.root.position)||active.position;clearBrushFocus();walkTo(V(...approach));toast(intent.hint||'先从亮起的门口出去，再走近房门。');return;}
 if((done.has(intent.id)||intent.completed)&&!(isGarden()&&stages[stage].canRepeatNightAction?.(intent.id))){toast(stage===7?stages[stage].getBorrowedPathHint():'这里已经完成，沿亮起的光圈继续走。');return;}
 if(!active||!eligible(active)||intent.available===false){toast(known?.requires?.some(id=>!done.has(id))?'先完成前一个光圈处的毛笔操作。':intent.hint||(stage===6?'先沿廊道走到转角，再看另一扇窗。':'先完成亮起光圈处的操作。'));return;}
 if(!nearTask(active)){const approach=intent.approachPosition||stages[stage].getTaskApproachPosition?.(active.id,traveler.root.position)||active.position;walkTo(V(...approach));toast(intent.approachPosition?intent.hint||'先沿亮起的路走近，再落笔。':'先走到'+active.label+'前，再用毛笔操作。');return;}
 if(active.kind==='scroll-read'){openThanksLetter(active);return;}toast(active.hint||'按住鼠标落笔，沿淡墨写一笔后松手。');
}
$('world').onpointerdown=e=>{
 if(thanksReading){unlockSound();if(e.button===0&&thanksReading.age>=1.2){thanksReading.drag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:{...thanksReading.pan}};$('world').setPointerCapture?.(e.pointerId);}e.preventDefault();return;}
 if(!started||paused||cut||pointerOwner!==null)return;
 unlockSound();clearReview();
 if(isPrison()){stages[stage].handlePointerDown(e);return;}
 if(e.button===0){
  if(pointerBusy()){e.preventDefault();return;}
  const s=stages[stage],ndc=pointerNdc(e),viewport=$('world').getBoundingClientRect(),intent=s.pickPointerTarget?.(ndc,camera,viewport)||brushRegionIntent(ndc,viewport),id=intent?.id||closest()?.id;
  const task=currentTasks().find(t=>t.id===id),mayStart=!intent||task&&(!done.has(id)||isGarden()&&s.canRepeatNightAction?.(id))&&eligible(task)&&intent.available!==false&&!intent.navigationOnly;
  if(mayStart&&s.pointerDown?.(ndc,camera,traveler.root.position,id)){
   if(s.getBridgeInkState?.())bridgeInkRipple.anchor((e.clientX-viewport.left)/viewport.width,(e.clientY-viewport.top)/viewport.height);
   pointerPainting=true;pointerOwner=e.pointerId;pointerActionId=id;pointerStage=stage;
   stopPointerWalk();beginBrushFocus(task);
   if(stage===6)playWindowBrush(id);
   if(s.gestureActive){const p=s.getGestureRect?.(camera,id)?.worldPosition;if(p){const dx=p[0]-traveler.root.position.x,dz=p[2]-traveler.root.position.z;if(Math.hypot(dx,dz)>.1)traveler.root.rotation.y=Math.atan2(-dx,-dz);}}
   $('world').setPointerCapture(e.pointerId);e.preventDefault();
  }else if(intent){if(task&&nearTask(task)&&eligible(task)&&intent.available!==false&&!intent.navigationOnly)beginBrushFocus(task);consumeBuildingIntent(intent);e.preventDefault();}
  else{clearBrushFocus();chooseWalk(e);}
 }
 if(e.button===2)startBrush();
};
$('world').onpointermove=e=>{
 if(isPrison()){if(started&&!paused&&!cut)stages[stage].handlePointerMove(e);return;}
 if(thanksReading){const read=thanksReading,d=read.drag;if(d&&d.id===e.pointerId){const rect=$('world').getBoundingClientRect(),bounds=read.goal.bounds||{width:2.3,depth:1.45};read.pan.x=d.pan.x-(e.clientX-d.x)/rect.width*bounds.width/read.zoom;read.pan.z=d.pan.z-(e.clientY-d.y)/rect.height*bounds.depth/read.zoom;}return;}
 if(!started||paused||cut||pointerOwner!==null&&e.pointerId!==pointerOwner)return;
 if(pointerOwner!==null){stages[pointerStage].pointerMove?.(pointerNdc(e),camera,traveler.root.position,pointerActionId);return;}
 if(isJourney()||stage===6)stages[stage].pointerMove?.(pointerNdc(e),camera,traveler.root.position,closest()?.id);
};
$('world').onpointerup=e=>{if(isPrison()){stages[stage].handlePointerUp(e);return;}if(thanksReading){thanksReading.drag=null;if($('world').hasPointerCapture?.(e.pointerId))$('world').releasePointerCapture(e.pointerId);return;}endPointer(e,false);};$('world').onpointercancel=e=>{if(isPrison()){stages[stage].handlePointerCancel(e);return;}if(thanksReading){thanksReading.drag=null;return;}endPointer(e,true);};$('world').onlostpointercapture=e=>{if(isPrison()){stages[stage].handlePointerCancel(e);return;}if(thanksReading){thanksReading.drag=null;return;}endPointer(e,true);};$('world').oncontextmenu=e=>e.preventDefault();
$('world').addEventListener('wheel',e=>{if(!thanksReading)return;e.preventDefault();if(thanksReading.age<1.2)return;thanksReading.zoom=T.MathUtils.clamp(thanksReading.zoom*Math.exp(-e.deltaY*.0015),1,2.4);},{passive:false});
$('thanks-close').onclick=()=>closeThanksLetter(true);
$('music').onclick=()=>{const muted=!chapterAudio.stats.muted;chapterAudio.setMuted(muted);audio.muted=muted;syncSceneSound();$('music').textContent=muted?'音乐 关':'音乐 开';$('music').setAttribute('aria-label',muted?'打开音乐':'关闭音乐');$('music').setAttribute('aria-pressed',String(muted));if(!muted)unlockSound();};
function closePanels(){paused=false;$('chapters').hidden=true;$('literature').hidden=true;keys.clear();$('world').focus();}
$('menu').onclick=()=>{if(cut?.opening){cut=null;$('curtain').style.opacity=0;$('curtain').classList.remove('opening-title');$('hud').hidden=false;}endPointer();paused=true;stopPointerWalk();$('chapters').hidden=false;};$('return').onclick=closePanels;$('restart').onclick=()=>{closePanels();begin();};
$('read').onclick=async()=>{endPointer();paused=true;stopPointerWalk();$('literature').hidden=false;if(!$('original').textContent){const r=await fetch('原文与参考视频对应.txt?v=9434286831692d1f');$('original').textContent=await r.text();}};$('read-close').onclick=closePanels;
$('replay').onclick=()=>begin();$('wander').onclick=()=>begin(GARDEN);$('easter-egg').onclick=()=>begin(PROLOGUE);
chapters.forEach((c,i)=>{if(i===10)return;const b=document.createElement('button');b.innerHTML=c.title+`<small>${c.place}</small>`;b.onclick=()=>{auto=false;clearReview();closePanels();if(!started){started=true;$('welcome').hidden=true;$('hud').hidden=false;}unlockSound();transition(i);};$('chapter-list').append(b);});
addEventListener('keydown',e=>{if(isPrison()){if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(started)unlockSound();if(e.code==='Escape'){$('chapters').hidden&&$('literature').hidden?$('menu').click():closePanels();e.preventDefault();return;}if(e.code==='KeyH'&&!e.repeat)toggleClean();if(e.code==='KeyE'&&!e.repeat)useBrushAction();if(!paused&&!cut&&['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code)){clearReview();keys.add(e.code);}e.preventDefault();return;}if(thanksReading){if(e.code==='Escape')closeThanksLetter(true);e.preventDefault();return;}if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){if(brushFocus||pointerOwner!==null)endPointer();clearBrushFocus();auto=false;walkDestination=null;navPath=[];}if(started)clearReview();keys.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(started)unlockSound();if(e.code==='KeyE')useBrushAction();if(e.code==='KeyH')toggleClean();if(e.code==='Escape'){$('chapters').hidden&&$('literature').hidden?$('menu').click():closePanels();}});
addEventListener('keyup',e=>{keys.delete(e.code);});addEventListener('blur',()=>{touchControls.reset();keys.clear();walkDestination=null;holding=false;charge=0;if(thanksReading?.drag){const id=thanksReading.drag.id;thanksReading.drag=null;if($('world').hasPointerCapture?.(id))$('world').releasePointerCapture(id);}endPointer();});addEventListener('resize',()=>{touchControls.reset();endPointer();renderer.setSize(innerWidth,viewHeight(),false);film.resize();rig.resize(innerWidth/viewHeight());stages[stage].resize?.();});
addEventListener('visibilitychange',()=>{if(document.hidden){endPointer();stopPointerWalk();}});
let last=performance.now(),fpsAge=0,frameCount=0,hudAge=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;syncTouchControls();if(!canRenderFrame())return;syncSceneSound();if(document.hidden){chapterAudio.update(0,{paused:true,hidden:true});audio.pause();return;}
 keepBrushFocus();updateThanksLetter(dt);
 if(!paused){time+=dt;if(!cut)chapterTime+=dt;strokeAge+=dt;pickingAge+=dt;updateAuto();if(cut){cut.age+=dt;if(cut.interlude)narrativeCut.update(cut.age);if(cut.age>(cut.interlude?.switchAt??.7)&&!cut.switched){enter(cut.i,cut.alternate);cut.switched=true;}if(!cut.interlude&&cut.age>(cut.opening?2.9:1.15))$('curtain').style.opacity=0;if(cut.age>(cut.interlude?.duration??(cut.opening?3.6:cut.alternate?2.2:1.9))){if(cut.opening){$('hud').hidden=false;$('curtain').classList.remove('opening-title');}narrativeCut.clear();cut=null;}}
 if(!isPrison()){
  if(isFilm()&&!cut){const s=stages[stage];const events=s.verseEvents||[];if(eventIndex<events.length&&chapterTime>=events[eventIndex].at&&(eventIndex===0||poem.age>=poem.writingDuration+(stage===PROLOGUE?1.2:4))){const e=events[eventIndex++];showPoem(e.text,e.left,e.red);}if(params.get('review')==='1'&&((params.has('hold')&&chapterTime>=s.duration-1.5)||(params.has('at')&&chapterTime>=Number(params.get('at')))))paused=true;if((!s.interactive||s.canContinue)&&chapterTime>s.duration&&eventIndex===events.length&&poem.age>=poem.writingDuration+(stage===PROLOGUE?2:5)){if(stage===PROLOGUE)finish();else if(stage===10)finish();else transition(stage+1);}}
 let moving=false;if(started&&!isFilm()&&!cut&&!holding&&!pointerPainting&&!brushFocus&&!(isJourney()&&(stages[stage].painted||stages[stage].movementBlocked))&&!stages[stage].gestureActive&&!(stage===6&&(stages[stage].viewing||stages[stage].openingId))&&!(isReflection()&&stages[stage].sitting)&&strokeAge>=2.6&&pickingAge>=1){const {x:horizontal,y:forward}=movementInput();if(isJourney()&&stages[stage].flight){const before=traveler.root.position.clone();stages[stage].advanceFlight(dt,{x:horizontal,y:forward},traveler.root.position);moving=traveler.root.position.distanceTo(before)>.001;}else{const right=V().setFromMatrixColumn(camera.matrixWorld,0),ahead=camera.getWorldDirection(V());right.y=0;ahead.y=0;right.normalize();ahead.normalize();let dx=right.x*horizontal+ahead.x*forward,dz=right.z*horizontal+ahead.z*forward;if(walkDestination&&!horizontal&&!forward){dx=walkDestination.x-traveler.root.position.x;dz=walkDestination.z-traveler.root.position.z;if(Math.hypot(dx,dz)<(stages[stage].navigationWaypointRadius??(stages[stage].spaceNavigation?.035:.13))){walkDestination=navPath.shift()||null;dx=dz=0;}}const length=Math.hypot(dx,dz);if(length>.01){dx/=length;dz/=length;const before=traveler.root.position.clone(),p=constrain(before.clone().add(V(dx,0,dz).multiplyScalar(walkDestination&&!horizontal&&!forward?Math.min(length,dt*(isJourney()?(stages[stage].moveSpeed||1.28):1.28)):dt*(isJourney()?(stages[stage].moveSpeed||1.28):1.28)*Math.min(1,length))));traveler.root.position.copy(p);const movement=p.clone().sub(before);moving=movement.length()>.001;if(moving){const angle=Math.atan2(-movement.x,-movement.z),diff=Math.atan2(Math.sin(angle-traveler.root.rotation.y),Math.cos(angle-traveler.root.rotation.y));traveler.root.rotation.y+=diff*(1-Math.exp(-dt*8));}if(!moving&&walkDestination)walkDestination=null;}}}
 if(!isFilm()){walk=stages[stage].flight?0:T.MathUtils.damp(walk,moving?1:0,7,dt);if(holding)charge=Math.min(1,charge+dt*.65);traveler.animate(time,walk,(pointerPainting||stages[stage].gestureActive)?.26:pickingAge<1?Math.sin(pickingAge*Math.PI)*.35:charge,Math.min(1,strokeAge/2.6),isReflection()&&stages[stage].sitting,0,isJourney()&&moving?1.3:1,isJourney()&&stages[stage].flight?(stages[stage].flightPoseAmount||0):0,isJourney()&&stages[stage].flight?(stages[stage].flightSteerX||0):0,journeyLookBack());if(isJourney()&&stages[stage].flight){const flightPose=stages[stage].flightPoseAmount||0;traveler.root.rotation.set(-Math.PI/2*flightPose,0,-(stages[stage].flightSteerX||0)*.12*flightPose);traveler.root.updateMatrixWorld(true);}if(!stages[stage].fixedCamera&&!stages[stage].flight&&!stages[stage].stageOwnCamera&&!brushFocus)rig.update(traveler.root.position,dt);if(pending&&time>=pending.at){const p=pending;pending=null;if(p.stage===stage){if(p.alternate)transition(stage,true);else{if(!p.pick)wave();resolve(p.task);}}}checkExit(dt);}}}
 const s=stages[stage];chapterAudio.update(dt,{paused:soundPaused(),hidden:false,cut:!!cut,chapterMood:s.nightJourneyStats?.mood||s.redCliffStats?.mood||(s.banished?'banished':null),lycheePhase:s.outroStats?.phase||null});if(soundPaused()){if(!audio.paused)audio.pause();}else if(ambientWanted&&audio.paused&&!audio.muted)audio.play().catch(()=>{ambientWanted=false;});if(s.prisonManaged){s.setPaused(!started||paused||!!cut);s.setKeyDirection(movementInput().x);const prose=s.takePrisonStory();if(prose)showStory(prose);document.body.classList.toggle('prison-outro-active',['ending','poem','fading','transferred'].includes(s.prisonStats.mode));}s.updateStory?.(time,traveler.root.position);s.updateGestureView?.(camera,traveler.root.position,closest()?.id);if(isJourney()||isReflection())s.update(time,traveler.root.position,paused||cut?0:dt);else s.update(isFilm()?chapterTime:time,response,paused||cut?0:dt);const storyEvent=s.takeStoryEvent?.();if(storyEvent){const message=s.narrative?.event(storyEvent);if(message?.prose)showStory(message.prose,message.thought);}
 applyRainHit();
 if(isJourney()&&s.painted&&s.actorTurn){lycheeTurnYaw??=traveler.root.rotation.y;const diff=Math.atan2(Math.sin(s.actorTurn.yawGoal-lycheeTurnYaw),Math.cos(s.actorTurn.yawGoal-lycheeTurnYaw));traveler.root.rotation.y=lycheeTurnYaw+diff*s.actorTurn.rootAmount;traveler.root.updateMatrixWorld(true);}
 if(s.stageOwnCamera&&!brushFocus&&!pointerPainting||isJourney()||isGarden()||stage===5||stage===6)s.updateCamera?.(camera,paused||cut?0:dt,traveler.root.position);
 s.updateChapterClouds?.(time,camera,paused?0:dt);s.updateBackdrop?.(time,camera); 
 if(!paused&&!cut){
  if(stage===PROLOGUE&&s.interactive){
   const picked=s.takePoemEvent?.();
   if(picked){prologueReading={event:picked,part:0,confirmed:false};eventIndex=0;showStory('《'+picked.title+'》 · 苏轼');showPoem(picked.parts[0],true);}
   if(prologueReading&&!prologueReading.confirmed&&s.prologueStats?.phase!=='closing'&&poem.written&&poem.age>=poem.writingDuration+2){
    if(prologueReading.part===0){prologueReading.part=1;showPoem(prologueReading.event.parts[1],true);}
    else{prologueReading.confirmed=!!s.confirmPoemRead?.(prologueReading.event.id,prologueReading.event.token);}
   }
  }
  const environmentId=s.takeEnvironmentCompleted?.();if(environmentId){const task=currentTasks().find(t=>t.id===environmentId);if(task)resolve(task,true);}
  if([4,5,6,7,GARDEN].includes(stage)&&s.completedId){const id=s.completedId,t=currentTasks().find(t=>t.id===id);s.acknowledge?.(id);if(t)resolve(t,true);}
  if(isJourney()&&s.painted){
   if(completedAt===null){completedAt=time;document.body.classList.add('lychee-finale');const story=s.narrative?.event('paint');if(story?.prose)showStory(story.prose,story.thought);}
   const outro=s.outroStats;
   // The fruit fills the view and bursts first. The red poem begins only once
   // the particles have cleared, leaving two columns in the middle of the page.
   if(!poem.text&&outro?.phase==='clear'&&outro.poemReady){showPoem(chapters[8].verse,false,true,{center:true});document.body.classList.add('lychee-poem');}
   if(time-completedAt>5.2&&poem.text&&poem.age>=poem.writingDuration+6&&outro?.phase==='clear'&&outro.clearAge>=.7&&outro.poemReady)transition(9);
  }
  if(isReflection()&&s.sitting){const events=s.verseEvents||[];if(eventIndex<events.length&&s.poetryAge>=events[eventIndex].at&&(eventIndex===0||poem.age>=poem.writingDuration+4)){const e=events[eventIndex++];if(e.storyEvent){const story=s.narrative?.event(e.storyEvent);if(story?.prose)showStory(story.prose,story.thought);$('place').textContent='诗意回望 · 《定风波·南海归赠王定国侍人寓娘》';}showPoem(e.text,e.left,e.red,{holdSeconds:e.holdSeconds||7});}if(eventIndex===events.length&&poem.age>=poem.writingDuration+8)finish();}
 }
 if(isFilm()&&s.showTraveler)traveler.animate(time,0,0,1,s.sit);
 const nearest=closest();for(const m of markers){const t=m.userData.task;m.visible=started&&!thanksReading&&(t.kind==='exit'?complete():(!done.has(t.id)||isGarden()&&s.canRepeatNightAction?.(t.id))&&eligible(t))&&(s.shouldShowTaskMarker?.(t)??true);const active=t.kind==='exit'?complete():t.id===nearest?.id;const pulse=.82+Math.sin(time*2)*.18;m.children[0].material.opacity=active?.64*pulse:.20;m.children[1].material.opacity=active?.12*pulse:.035;m.children[2].intensity=active?.85:.25;m.scale.setScalar(1+Math.sin(time*1.5)*.04);}
if(stage===PROLOGUE){poem.setPaper?.(s.paper);document.body.classList.toggle('paper',s.paper);}poem.update(paused||cut?0:dt);
 for(let i=waves.length-1;i>=0;i--){const w=waves[i];w.age+=paused?0:dt;w.node.material.uniforms.age.value=w.age;if(w.age>2.8){w.scene.remove(w.node);w.node.geometry.dispose();w.node.material.dispose();waves.splice(i,1);}}
 if(time>toastUntil)$('toast').style.opacity=0;if(time-storyAt>10)$('story-note').classList.add('quiet');hudAge+=dt;if(hudAge>.25){updateHud();hudAge=0;}$('fruit-counter').hidden=stage!==8;$('fruit-counter').textContent=String(Math.round(s.counter||0));
 if(!isPrison()&&!isFilm()&&!isJourney()&&!isReflection())occlusion.update(traveler.root.position,paused?0:dt);film.render(s.scene,camera,time,0,poem.backdrop);poem.render();frameCount++;fpsAge+=dt;if(fpsAge>1){document.body.dataset.fps=Math.round(frameCount/fpsAge);frameCount=0;fpsAge=0;}
 Object.assign(document.body.dataset,{touchInput:JSON.stringify({available:touchControls.available,x:touchControls.axes.x,y:touchControls.axes.y,pointer:touchControls.pointer,moveEnabled:canTouchMove()}),prison:JSON.stringify(s.prisonStats||null),borrowedView:JSON.stringify(s.borrowedViewStats||null),nightJourney:JSON.stringify(s.nightJourneyStats||null),thanksLetter:JSON.stringify({reading:!!thanksReading,ready:!!s.getThanksLetter,read:done.has('paper')||done.has('study'),title:s.getThanksLetter?.().title||''}),recallSpace:JSON.stringify(s.spaceStats||null),pressureInk:JSON.stringify(s.pressureInkStats||null),bridgeInk:JSON.stringify(s.getBridgeInkState?.()||null),brushFocus:JSON.stringify(brushFocus?{id:brushFocus.id,stage:brushFocus.stage,locked:true}:null),music:JSON.stringify(chapterAudio.stats),architectureEnvelope:JSON.stringify(s.architectureEnvelope||null),architectureDetail:JSON.stringify(s.architectureDetail||null),narrativeCut:JSON.stringify(narrativeCut.stats),redCliff:JSON.stringify(s.redCliffStats||null),prologue:JSON.stringify(s.prologueStats||null),poemChoices:JSON.stringify(s.getPoemChoices?.(camera)||null),poemInk:poem.inkStyle,environmentWater:JSON.stringify(s.waterStats||null),dwellingRepair:JSON.stringify(s.repairStats||null),backdrop:JSON.stringify(s.backdropStats||null),environmentDrag:JSON.stringify(s.getEnvironmentDragRect?.(camera)||null),actorTurn:JSON.stringify(s.actorTurn||null),playerYaw:String(traveler.root.rotation.y),lycheeDodge:JSON.stringify(s.dodgeStats||null),chapterClouds:JSON.stringify(s.cloudStats||null),viewOcclusion:JSON.stringify(s.viewOcclusion||null),lycheeGrove:JSON.stringify(s.groveStats||null),lycheeTree:JSON.stringify(s.treeStats||null),lycheeFlight:JSON.stringify(s.flightStats||null),lycheeOutro:JSON.stringify(s.outroStats||null),lycheePaint:JSON.stringify(s.paintStats||null),scene:String(stage+1),camera:isFilm()?'诗境镜头':'三维缓跟镜头',occluders:String(occlusion.count),fruits:String(fruitCount()),casts:String(casts),playerPosition:traveler.root.position.toArray().map(v=>v.toFixed(3)).join(','),target:closest()?.id||'exit',complete:String(complete()),mode:auto?'自动检查':'交互',cameraPose:camera.position.toArray().concat(camera.quaternion.toArray()).map(v=>v.toFixed(4)).join(','),poem:poem.text,poemSide:poem.side,poemVisible:String(poem.visible),poemWritten:String(poem.written),poemAge:poem.age.toFixed(2),poemBackdrop:JSON.stringify(poem.backdrop||null),poemWriteTime:poem.writingDuration.toFixed(2),story:$('story').textContent,thought:$('thought').textContent,entryGateOpening:String(s.entryGateOpening??''),gestureRect:JSON.stringify(s.gestureScreen||s.getGestureRect?.(camera,closest()?.id)||null),gestureActive:String(s.gestureActive||false),gestureProgress:String(s.gestureProgress||0),glyphForming:String(s.glyphForming||false),lycheeColours:JSON.stringify(s.colourStats||null),lycheePhysics:JSON.stringify(s.physics||null),heroScreen:JSON.stringify(screenPoint(s.heroPosition)),heroRadius:String(s.heroRadius||0),cinematic:String(isFilm()),chapterTime:chapterTime.toFixed(2),ending:String(ending),paintReady:String(s.paintReady||false),paintCoverage:String(s.coverage||0),lychees:String(s.counter||0),sitting:String(s.sitting||false),poetryAge:String(s.poetryAge||0),windowProgress:String(s.progress||0),windowOpening:String(s.openingId||''),windowViewing:String(s.viewing||false),windowFocus:String(s.focusId||''),windowFocusAge:String(s.focusAge||0),windowRect:JSON.stringify(s.activeRect||null),mountainLayers:JSON.stringify(s.mountainLandscape?.layers?.map(layer=>({id:layer.name,independent:!!layer.geometry.userData.independentRange}))||null),mountainTexture:String(!!s.ridgeMesh?.material.map),targetScreen:JSON.stringify(screenPoint(closest()?.position)),exitScreen:JSON.stringify(screenPoint(s.exit?.position))});
}
enter(0);markStartupReady();$('begin').disabled=false;$('begin').textContent='入画';requestAnimationFrame(frame);if(params.has('chapter'))begin(Math.max(0,Math.min(chapters.length-1,Number(params.get('chapter'))-1)),true);if(params.get('testwalk')==='1'){if(!started)begin(0,true);auto=true;}
