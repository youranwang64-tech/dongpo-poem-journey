import {buildPrisonPalimpsestScene} from './prison/prison-palimpest-scene.js';
import {createPrisonPalimpsestDemo} from './prison/prison-palimpest-runtime.js';

const OUTRO_MODES=new Set(['ending','poem','fading','transferred']);
const textSlot=()=>({textContent:''});

/** The prison shares the main game's renderer, traveler, camera and chapter
 * transition. It owns its own puzzle timing and automatic architectural route.
 * No iframe, page navigation, extra animation loop or native listener is used. */
export function buildPrisonPerspectiveChapter(){
 const building=buildPrisonPalimpsestScene();
 building.scene.userData.filmProfile={shadowFloor:.016,contrast:1.13,vignette:.13};
 const text={caption:textSlot(),subtitle:textSlot(),progress:textSlot(),notice:textSlot()};
 let controller=null,initialising=null,active=false,disposed=false,hostRenderer=null,hostExposure=null,overlays={},lastStoryKey='';
 const state=()=>controller?.stats||{mode:'loading',currentStage:'window',paused:true,interaction:{completed:[],gestureActive:false},outro:{phase:'loading',fade:0}};
 const canInput=()=>active&&!disposed&&controller&&!state().paused;
 function clearOverlays(){
  if(overlays.outro){overlays.outro.style.opacity='0';overlays.outro.style.visibility='hidden';overlays.outro.setAttribute('aria-hidden','true');}
  if(overlays.fade){overlays.fade.style.opacity='0';overlays.fade.style.visibility='hidden';}
 }
 function applyExposure(){if(hostRenderer){hostExposure=hostRenderer.toneMappingExposure;hostRenderer.toneMappingExposure=1.03;}}
 function restoreExposure(){if(hostRenderer&&typeof hostExposure==='number')hostRenderer.toneMappingExposure=hostExposure;hostExposure=null;}
 const facade={
  scene:building.scene,ready:building.ready,spawn:[...building.actorStart],spawnYaw:.15,
  root:building.stage.root,atmosphere:building.stage.atmosphere,
  architectureEnvelope:building.stage.architectureEnvelope,architectureDetail:building.stage.architectureDetail,
  targets:[],exit:null,prisonManaged:true,stageOwnCamera:true,skipViewOcclusion:true,
  fixedCamera:{position:[...building.shots.intro.eye],lookAt:[...building.shots.intro.look],fov:building.shots.intro.fov},
  async initialise({canvas,renderer,traveler,camera,onNextScene,ui={}}={}){
   if(disposed)throw new Error('The prison chapter has already been disposed.');
   if(controller)return facade;
   if(initialising)return initialising;
   if(!canvas?.getBoundingClientRect||!traveler?.root||!camera?.isCamera||typeof onNextScene!=='function')throw new TypeError('The prison chapter requires the main canvas, traveler, camera and next-chapter callback.');
   hostRenderer=renderer||null;overlays={outro:ui.outro,fade:ui.fade};
   initialising=(async()=>{
    controller=await createPrisonPalimpsestDemo({
     canvas,traveler,camera,building,renderer:null,audio:null,bindControls:false,exitTo:null,
     ui:{...ui,...text},onNextScene:payload=>{
      if(!active||disposed||payload.signal.aborted||!payload.isCurrent())return;
      return onNextScene(payload);
     }
    });
    controller.setPaused(true);clearOverlays();return facade;
   })();
   return initialising;
  },
  activate(){
   if(disposed||!controller)throw new Error('Initialise the prison chapter before entering it.');
   if(active)return;
   active=true;applyExposure();controller.setPaused(false);controller.start();
  },
  leave(){
   if(!active)return;
   controller?.cancelInput();controller?.setPaused(true);active=false;clearOverlays();restoreExposure();
  },
  cancelView(){facade.leave();},
  reset(){
   lastStoryKey='';text.notice.textContent='';clearOverlays();
   controller?.restart();if(active){controller.setPaused(false);controller.start();}
  },
  setPaused(value){if(controller&&controller.stats.paused!==!!value)controller.setPaused(!!value);},
  setKeyDirection(value){return canInput()?controller.setKeyDirection(value):false;},
  handlePointerDown(event){return canInput()?controller.pointerDown(event):false;},
  handlePointerMove(event){if(canInput())controller.pointerMove(event);},
  handlePointerUp(event){if(active&&!disposed)controller?.pointerUp(event);},
  handlePointerCancel(event){if(active&&!disposed)controller?.pointerCancel(event);},
  cancelInput(){controller?.cancelInput();},
  resize(){if(!active)return;controller?.resize();},
  update(_time,_response,dt){if(active&&!disposed)controller?.step(dt);},
  revealPrisonHint(){
   const s=state();if(s.currentStage==='corridor')return controller?.wash.stats.hint||text.caption.textContent;
   return controller?.optics.puzzles[s.currentStage]?.hint||text.caption.textContent;
  },
  getPrisonInstruction(){return text.notice.textContent||text.caption.textContent;},
  getPrisonKeyHint(){return OUTRO_MODES.has(state().mode)?'':text.subtitle.textContent;},
  getPrisonProgress(){return text.progress.textContent;},
  takePrisonStory(){
   const s=state(),key=OUTRO_MODES.has(s.mode)?'outro':s.currentStage;
   if(key===lastStoryKey)return null;lastStoryKey=key;
   return {window:'四壁森然，高窗外仍有一点月色。换个角度，让它越过窗棂，照进这一夜。',gate:'月色照见重重铁门。沿真实的铁栏移步，门隙会在新的看法里变亮。',corridor:'门已让开，廊墙上仍留着一道人影。拂去那道墨影，沿月色走出困局。',outro:'月光仍在窗外。读完这一夜，路将通向黄州。'}[key]||null;
  },
  dispose(){facade.leave();controller?.dispose();disposed=true;},
  get controller(){return controller;},
  get building(){return building;},
  get active(){return active;},
  get gestureActive(){return active&&!!state().interaction.gestureActive;},
  get chapterComplete(){return OUTRO_MODES.has(state().mode);},
  get prisonStats(){return {...state(),active,embedded:true,rendererShared:true,travelerShared:true,scene:building.stats,optics:controller?.optics.stats||null};}
 };
 return facade;
}
