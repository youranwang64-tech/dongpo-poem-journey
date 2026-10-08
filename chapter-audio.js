const musicUrl=file=>new URL('assets/music/'+file,import.meta.url).href;
export const MUSIC_TRACKS=Object.freeze({
 'morning-qin':Object.freeze({file:'morning-qin.mp3',sourceTrack:5,gain:.92}),
 'hollow-bamboo':Object.freeze({file:'hollow-bamboo.mp3',sourceTrack:1,gain:.92}),
 'oriental-shadow':Object.freeze({file:'oriental-shadow.mp3',sourceTrack:3,gain:.88}),
 'quiet-road':Object.freeze({file:'quiet-road.mp3',sourceTrack:10,gain:.92}),
 'mountain-echoes':Object.freeze({file:'mountain-echoes.mp3',sourceTrack:6,gain:1}),
 'paper-lanterns':Object.freeze({file:'paper-lanterns.mp3',sourceTrack:2,gain:.86}),
 'bamboo-grove':Object.freeze({file:'bamboo-grove.mp3',sourceTrack:7,gain:.96})
});

// One continuing musical phrase can connect adjacent spaces. Emotional changes
// within the moonlit chapter use the same controller and no extra sound layers.
export const CHAPTER_MUSIC=Object.freeze([
 'morning-qin','oriental-shadow','quiet-road','morning-qin',
 'hollow-bamboo','hollow-bamboo','mountain-echoes','paper-lanterns',
 'bamboo-grove','quiet-road','morning-qin','hollow-bamboo','morning-qin'
]);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** Two streaming elements, with user-gesture unlock and interruption-safe fades.
 * Audio failures are diagnostics only: the story never waits on sound. */
export function createChapterAudio({audioFactory=src=>new Audio(src),crossfadeSeconds=2,baseVolume=.28}={}){
 const slots=new Map();let index=null,key=null,unlocked=false,muted=false,paused=false,hidden=false,disposed=false,fade=null,duck=1,level=baseVolume,resumeGain=1,autoBlocked=false,mood=null,lycheePhase=null,errors=0,created=0,maxConcurrent=0;
 const suspended=()=>muted||paused||hidden||disposed;
 function halt(slot){try{slot.audio.pause();slot.audio.volume=0;}catch{}slot.playing=false;slot.volume=0;}
 function remove(slot){slots.delete(slot.key);halt(slot);try{slot.audio.removeAttribute?.('src');slot.audio.load?.();}catch{}}
 function safeVolume(slot){const next=!unlocked||suspended()?0:clamp(slot.gain*level*duck*resumeGain*(MUSIC_TRACKS[slot.key]?.gain||1),0,.55);try{slot.audio.volume=next;}catch{}slot.volume=next;}
 function play(slot){
  if(!unlocked||suspended()||slot.playing||slot.pending||slot.failed)return;
  slot.pending=true;
  try{
   const attempt=slot.audio.play();
   Promise.resolve(attempt).then(()=>{
    slot.pending=false;
    if(disposed||slots.get(slot.key)!==slot||suspended()){halt(slot);return;}
    slot.playing=true;safeVolume(slot);
   },error=>{slot.pending=false;slot.playing=false;if(disposed||slots.get(slot.key)!==slot){halt(slot);return;}slot.failed=true;errors++;slot.error=error?.name||'AudioError';if(error?.name==='NotAllowedError')autoBlocked=true;halt(slot);});
  }catch(error){slot.pending=false;slot.failed=true;slot.error=error?.name||'AudioError';errors++;if(error?.name==='NotAllowedError')autoBlocked=true;halt(slot);}
 }
 function make(trackKey){
  const spec=MUSIC_TRACKS[trackKey];if(!spec)return null;
  try{
   const audio=audioFactory(musicUrl(spec.file));audio.loop=true;audio.preload='none';audio.volume=0;
   const slot={key:trackKey,audio,gain:0,volume:0,playing:false,pending:false,failed:false,error:null};
   slots.set(trackKey,slot);created++;maxConcurrent=Math.max(maxConcurrent,slots.size);return slot;
  }catch{errors++;return null;}
 }
 function choose(){
  if(index===5){if(mood==='sorrow')return 'quiet-road';if(mood==='release'||mood==='peace')return 'mountain-echoes';}
  if(index===7&&(mood==='banished'||mood==='downfall'))return 'oriental-shadow';
  return CHAPTER_MUSIC[index]||null;
 }
 function select(next){
  if(disposed||!next||!MUSIC_TRACKS[next]||next===key&&slots.has(next))return;
  key=next;
  if(!slots.has(next)&&slots.size>=2){const victim=[...slots.values()].filter(s=>s.key!==next).sort((a,b)=>a.gain-b.gain)[0];if(victim)remove(victim);}
  const selected=slots.get(next)||make(next);if(!selected)return;
  fade={age:0,from:new Map([...slots.values()].map(s=>[s.key,s.gain]))};
  for(const slot of slots.values()){safeVolume(slot);play(slot);}
 }
 function syncHold(){
  if(suspended()){resumeGain=0;for(const slot of slots.values())halt(slot);return;}
  for(const slot of slots.values()){safeVolume(slot);play(slot);}
 }
 function unlock(){if(disposed)return false;if(autoBlocked||[...slots.values()].some(s=>s.failed))resumeGain=0;unlocked=true;autoBlocked=false;select(choose());for(const slot of slots.values()){slot.failed=false;slot.error=null;}syncHold();return true;}
 function enter(chapterIndex){if(disposed)return false;const next=Number(chapterIndex);if(!Number.isInteger(next)||!CHAPTER_MUSIC[next])return false;index=next;mood=null;lycheePhase=null;select(choose());return true;}
 function update(dt,{paused:nextPaused,hidden:nextHidden,chapterMood,lycheePhase:nextLychee,cut=false}={}){
  if(disposed)return;
  const wasHeld=suspended();if(nextPaused!==undefined)paused=!!nextPaused;if(nextHidden!==undefined)hidden=!!nextHidden;if(chapterMood!==undefined)mood=chapterMood;if(nextLychee!==undefined)lycheePhase=nextLychee;select(choose());
  const held=suspended();if(held!==wasHeld)syncHold();if(held||!unlocked)return;
  const delta=Number.isFinite(dt)?clamp(dt,0,.25):0;
  if(delta>0){
   const desiredDuck=cut?0.68:1;duck+=(desiredDuck-duck)*(1-Math.exp(-delta*3));
   resumeGain+=(1-resumeGain)*(1-Math.exp(-delta*6));
   // The fruit sea swells with the music, without adding a second music track.
   const lift=index===8?(['swelling','ocean'].includes(lycheePhase)?1.42:lycheePhase==='burst'?1.58:lycheePhase==='painting'? .86:1):1;
   level+=(baseVolume*lift-level)*(1-Math.exp(-delta*2.8));
   if(fade){fade.age+=delta;const amount=clamp(fade.age/Math.max(.05,crossfadeSeconds),0,1);for(const slot of slots.values())slot.gain=(fade.from.get(slot.key)||0)*(1-amount)+(slot.key===key?amount:0);if(amount===1){for(const slot of [...slots.values()])if(slot.key!==key)remove(slot);fade=null;}}
  }
  for(const slot of slots.values()){safeVolume(slot);play(slot);}
 }
 function setMuted(value){if(disposed)return;muted=!!value;syncHold();}
 function dispose(){if(disposed)return;disposed=true;for(const slot of [...slots.values()])remove(slot);fade=null;}
 return {unlock,enter,update,setMuted,dispose,get stats(){return {chapter:index,track:key,unlocked,muted,paused,hidden,autoplayBlocked:autoBlocked,crossfadeSeconds,transition:fade?clamp(fade.age/Math.max(.05,crossfadeSeconds),0,1):1,activeSources:slots.size,playingSources:[...slots.values()].filter(s=>s.playing&&!s.audio.paused).length,maxConcurrent,created,errors,lycheePhase,mood,sources:[...slots.values()].map(s=>({track:s.key,gain:s.gain,volume:s.volume,playing:s.playing,failed:s.failed,error:s.error})),disposed};}};
}
