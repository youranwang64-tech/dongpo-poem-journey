const SOURCE=new URL('assets/music/red-cliff-xiao.mp3',import.meta.url).href;

/** A recorded bamboo-xiao phrase, controlled by the game's sound switch. */
export function createRedCliffXiao({audioFactory=src=>new Audio(src)}={}){
 let audio=null,unlocked=false,muted=false,paused=false,hidden=false,requested=false,phrase=false,tail=0,gain=0,pending=false,blocked=false,plays=0,failed=false;
 const held=()=>muted||paused||hidden;
 function make(){if(audio)return audio;try{audio=audioFactory(SOURCE);audio.preload='none';audio.loop=false;audio.volume=0;}catch{failed=true;}return audio;}
 function play(){if(!audio||!unlocked||held()||!phrase||pending||blocked||!audio.paused)return;pending=true;plays++;try{Promise.resolve(audio.play()).then(()=>{pending=false;if(held()||!phrase)audio.pause();},()=>{pending=false;blocked=true;failed=true;audio?.pause();});}catch{pending=false;blocked=true;failed=true;}}
 function unlock(){unlocked=true;blocked=false;failed=false;make();play();}
 function stop(){requested=phrase=false;tail=gain=0;if(audio){audio.pause();audio.volume=0;}}
 function setState(state={}){if(state.muted!==undefined)muted=!!state.muted;if(state.paused!==undefined)paused=!!state.paused;if(state.hidden!==undefined)hidden=!!state.hidden;if(held()&&audio){audio.pause();audio.volume=0;gain=0;}else play();}
 function update(dt,{sounding=false}={}){
  const step=Number.isFinite(dt)?Math.min(.1,Math.max(0,dt)):0;
  if(held()||step===0){if(audio){audio.pause();audio.volume=0;}gain=0;return;}
  if(sounding&&!requested){make();phrase=true;tail=0;gain=0;if(audio){audio.currentTime=0;audio.volume=0;}}
  requested=!!sounding;if(!phrase)return;
  if(!requested)tail+=step;else tail=0;
  const target=tail<3.2?.42:0;gain+=(target-gain)*(1-Math.exp(-step*(target>gain?1.7:2.2)));
  if(audio){audio.volume=gain;play();if(audio.ended||tail>5.2){stop();}}
 }
 return {unlock,update,setState,stop,get stats(){return {source:'xserra / Freesound · xiao-2',recorded:true,created:!!audio,muted:held()||!phrase||gain<.001,playing:!!audio&&!audio.paused,paused,hidden,userMuted:muted,unlocked,blocked,failed,gain,plays,tail,syntheticOscillators:0};}};
}
