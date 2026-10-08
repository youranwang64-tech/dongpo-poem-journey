// Short transitions follow a completed action. They add context without adding
// another room to clear. Images are the project's original panorama assets.
export const NARRATIVE_CUTS={
 '0:1':{image:'assets/textures/dongpo-city-rooftops-panorama-v1.png',tone:'ink',beats:[
  {seconds:3.8,date:'1079 · 湖州',title:'一封谢表',text:'表文送出去了。几句话被指为讥讽朝廷，旧诗也被翻了出来。'},
  {seconds:4.4,date:'同年 · 汴京',title:'诗文入案',text:'写诗的人被押往御史台。刚安顿好的生活，到这里突然断了。'}]},
 '2:3':{image:'assets/textures/dongpo-river-village-panorama-v1.png',tone:'dawn',beats:[
  {seconds:4.2,date:'1079年末',title:'性命保住了',text:'苏轼获释。代价是贬往黄州，不得签署公事。'},
  {seconds:4.2,date:'1080—1082 · 黄州',title:'日子要重新过',text:'后来，他开垦东坡，筑起雪堂。先有一处能挡雨的地方，再把笔拿起来。'}]},
 '8:9':{image:'assets/textures/dongpo-river-village-panorama-v1.png',tone:'sea',beats:[
  {seconds:4.8,date:'惠州 · 《纵笔》',title:'仍有片刻快活',text:'报道先生春睡美，\n道人轻打五更钟。',poem:true},
  {seconds:6.0,date:'宋人诗话记闻',title:'连安稳，也被看见',text:'《艇斋诗话》记载，章惇读到“春睡”诗，认为他在惠州仍过得安稳，于是再贬。',note:'这是诗话记闻；再贬不能只归因于一句诗。'},
  {seconds:5.4,date:'1097 · 再贬儋州',title:'这一次，要越过海',text:'他已年过六十。去处又远了一程，远到海那边。'}]}
};
export function createNarrativeCut(){
 const root=document.createElement('section');root.id='narrative-cut';root.hidden=true;root.setAttribute('aria-label','剧情过场');
 root.innerHTML='<img alt=""/><div class="cut-wash"></div><div class="cut-passage"><small></small><h2></h2><p></p><em></em></div><span class="cut-continue">剧情过场 · 自动继续</span>';
 document.body.append(root);const image=root.querySelector('img'),date=root.querySelector('small'),title=root.querySelector('h2'),text=root.querySelector('p'),note=root.querySelector('em');let active=null,shown=-1;
 function clear(){active=null;shown=-1;root.hidden=true;}
 function begin(from,to){const spec=NARRATIVE_CUTS[from+':'+to];if(!spec){clear();return null;}active=spec;shown=-1;image.src=spec.image;root.dataset.tone=spec.tone;root.hidden=false;const duration=spec.beats.reduce((sum,b)=>sum+b.seconds,0)+1.2;update(0);return {duration,switchAt:duration-.4};}
 function update(age){if(!active)return;const total=active.beats.reduce((sum,b)=>sum+b.seconds,0);let start=0,index=active.beats.length-1;for(let i=0;i<active.beats.length;i++){if(age<start+active.beats[i].seconds){index=i;break;}start+=active.beats[i].seconds;}
  const beat=active.beats[index];if(shown!==index){shown=index;date.textContent=beat.date;title.textContent=beat.title;text.textContent=beat.text;note.textContent=beat.note||'';root.dataset.poem=String(!!beat.poem);}
  const beatStart=active.beats.slice(0,index).reduce((sum,b)=>sum+b.seconds,0),within=age-beatStart;root.style.opacity=String(Math.min(1,Math.max(0,age/.55),Math.max(0,(total+1.2-age)/.65)));root.style.setProperty('--cut-progress',String(Math.min(1,age/(total+1.2))));root.style.setProperty('--passage-opacity',String(Math.min(1,Math.max(0,within/.5))));
 }
 return {begin,update,clear,get stats(){return active?{active:true,beat:shown+1,title:title.textContent,text:text.textContent}:null;}};
}
