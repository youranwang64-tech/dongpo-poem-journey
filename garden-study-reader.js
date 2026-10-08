import * as T from './vendor/three.module.js';
import {decorateWorldManuscriptReader} from './huzhou-thanks-letter.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export const GARDEN_STUDY_DOCUMENT=Object.freeze({
 title:'记承天寺夜游',
 text:'元丰六年十月十二日夜，解衣欲睡，月色入户，欣然起行。念无与为乐者，遂至承天寺寻张怀民。怀民亦未寝，相与步于中庭。\n\n庭下如积水空明，水中藻荇交横，盖竹柏影也。何夜无月？何处无竹柏？但少闲人如吾两人者耳。\n\n黄州团练副使苏某书。',
 source:'https://zh.wikisource.org/zh-hans/東坡志林/卷一#記承天夜遊',
 sourceNote:'苏轼《东坡志林》卷一《记承天夜游》原文，简体标点本；“水中”另有“水上”异文。末尾署款据《永乐大典》补。',
 period:'元丰六年（1083）· 黄州夜游',
 settingNote:'此处庭院为诗意游园空间，并非承天寺史实复原。'
});

/** One real scroll on the existing study desk; the courtyard supplies the
 * door, floor, collision and room camera. This module creates no new house. */
export function decorateGardenStudyReader(stage,{night=false}={}){
 if(stage.gardenStudyReader)return stage;
 if(!stage?.root?.isObject3D||!stage.gardenStudy?.deskPaper)throw new TypeError('庭院阅读器需要可进入的书斋与实体书案。');
 const study=stage.gardenStudy,oldPaper=study.deskPaper,oldPick=stage.pickPointerTarget?.bind(stage),oldDown=stage.pointerDown?.bind(stage),oldInteract=stage.interact?.bind(stage);
 const oldPosition=oldPaper.position.clone(),paperPosition=[oldPosition.x,oldPosition.y+.0008,oldPosition.z];
 oldPaper.removeFromParent();
 const document=night?{...GARDEN_STUDY_DOCUMENT,settingNote:'本章依《记承天寺夜游》作诗意建筑演绎，并非承天寺史实复原。'}:GARDEN_STUDY_DOCUMENT;
 decorateWorldManuscriptReader(stage,{document,metadataKey:'gardenStudyReader',columnCount:8,
  footer:night?'元丰六年（1083）· 黄州夜游　｜　诗意建筑演绎':'元丰六年（1083）· 黄州夜游　｜　诗意庭院，非承天寺复原',paperPosition,
  readingPosition:[oldPosition.x,oldPosition.y+.055,oldPosition.z],paperSize:[1.25,.50],readingSize:[2.3,1.45]});
 const reader=stage.gardenStudyReader,foot=stage.studyReaderFoot||study.readerFoot,task={id:'study',kind:'scroll-read',type:'read',radius:.72,position:[...foot],label:'书斋案上的卷轴',verb:'展开《记承天寺夜游》',hint:night?'月下同游后，回书斋案前读这一夜。按 E 或点案上的卷轴，展开原文；滚轮靠近细读。':'从右侧门口进书斋，走到书案光圈。按 E 或点案上的卷轴，展开原文；滚轮靠近细读。',feedback:night?'收好这一夜。还可以和怀民在庭中看月、沿廊慢行。':'卷轴已读过，可以继续在庭院中走走。',verse:'',requires:night?['court-moon']:[]};
 stage.targets.push(task);
 let opened=false,read=false;const begin=stage.beginThanksLetterReading.bind(stage),reset=stage.reset.bind(stage),raycaster=new T.Raycaster();
 stage.beginThanksLetterReading=()=>{opened=true;return begin();};
 stage.pointerDown=(ndc,camera,player,id)=>id==='study'?false:oldDown?.(ndc,camera,player,id)??false;
 stage.interact=(id,...args)=>{if(id!=='study')return oldInteract?.(id,...args)??false;if(read)return true;if(!opened||reader.reading)return false;if(night&&oldInteract?.(id,...args)===false)return false;read=true;return true;};
 stage.pickPointerTarget=(ndc,camera,player,viewport)=>{
  stage.root.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);raycaster.setFromCamera(ndc,camera);
  const mesh=reader.scroll.visible?reader.readingPaper:reader.paper,hits=raycaster.intersectObject(mesh,false);
  if(hits.length){const near=!player?.isVector3||Math.hypot(player.x-foot[0],player.z-foot[2])<=task.radius,available=!night||!!stage.nightJourneyStats?.courtComplete;return {id:'study',kind:'scroll-read',available,exact:true,near,score:0,hitDistance:hits[0].distance,physicalScroll:true};}
  return oldPick?.(ndc,camera,player,viewport)||null;
 };
 stage.reset=(...args)=>{const value=reset(...args);opened=false;read=false;return value;};
 reader.originalPaper=oldPaper;reader.task=task;reader.period=document.period;reader.settingNote=document.settingNote;
 study.deskPaper=reader.paper;if(stage.gardenObjects)stage.gardenObjects.deskPaper=reader.paper;
 Object.defineProperty(stage,'gardenStudyReaderStats',{get:()=>({...reader.stats,opened,read,night,period:document.period,settingNote:document.settingNote,foot:[...foot],originalPaperRemoved:!oldPaper.parent})});
 return stage;
}
