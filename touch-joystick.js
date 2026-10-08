// Touch movement uses its own pointer, never keyboard events or canvas gestures.
export function joystickAxes(dx,dy,radius,deadZone=.13){
 if(!Number.isFinite(dx+dy+radius)||radius<=0)return {x:0,y:0};
 const length=Math.hypot(dx,dy)/radius;
 if(length<=deadZone)return {x:0,y:0};
 const strength=Math.min(1,(length-deadZone)/(1-deadZone));
 return {x:dx/Math.hypot(dx,dy)*strength,y:-dy/Math.hypot(dx,dy)*strength};
}
export function mergeMovementInput(keyX,keyY,touch){
 const x=keyX+(touch?.x||0),y=keyY+(touch?.y||0),length=Math.hypot(x,y);
 return length>1?{x:x/length,y:y/length}:{x,y};
}
export function touchInstruction(text){
 return String(text||'').replaceAll('WASD / 左键','摇杆 / 点地面').replaceAll('WASD','摇杆')
  .replaceAll('鼠标左键','画面').replaceAll('鼠标','画面').replaceAll('左键','画面')
  .replaceAll('E 查看写法','点“提笔·提示”看写法').replaceAll('E 查看提示','点“提笔·提示”')
  .replaceAll('E 提笔开窗','点“提笔·提示”开窗').replaceAll('E 轻扫','点“提笔·提示”')
  .replaceAll('E 提笔','点“提笔·提示”').replaceAll('H 净画面','点“净画面”')
  .replaceAll('H 显示场景信息','点“显示界面”').replaceAll('H 场景信息','点“净画面”')
  .replaceAll('← →','摇杆左右').replaceAll('← / →','摇杆左右').replace(/\bE\b/g,'“提笔·提示”');
}
export function createTouchControls({root,pad,thumb,action,clean,restore,onStart=()=>true,onAction=()=>{},onClean=()=>{},onAvailability=()=>{},host=window,doc=document}){
 const query=host.matchMedia('(any-pointer: coarse)'),state={x:0,y:0},listeners=[];
 let pointer=null,available=false,enabled=false,actionEnabled=false,cleanEnabled=false;
 const listen=(node,name,handler,options)=>{node.addEventListener(name,handler,options);listeners.push(()=>node.removeEventListener(name,handler,options));};
 const contain=e=>{e.preventDefault();e.stopPropagation();};
 function reset(){
  const id=pointer;pointer=null;state.x=state.y=0;thumb.style.transform='translate(0px, 0px)';pad.classList.remove('engaged');
  if(id!==null&&pad.hasPointerCapture?.(id))pad.releasePointerCapture(id);
 }
 function read(e){
  const rect=pad.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)*.34,dx=e.clientX-rect.left-rect.width/2,dy=e.clientY-rect.top-rect.height/2;
  Object.assign(state,joystickAxes(dx,dy,radius));
  const distance=Math.hypot(dx,dy),scale=distance>radius?radius/distance:1;
  thumb.style.transform=`translate(${dx*scale}px, ${dy*scale}px)`;
 }
 listen(pad,'pointerdown',e=>{
  contain(e);if(!available||!enabled||pointer!==null||e.button!==0||onStart()===false)return;
  pointer=e.pointerId;pad.setPointerCapture?.(pointer);pad.classList.add('engaged');read(e);
 });
 listen(pad,'pointermove',e=>{contain(e);if(e.pointerId===pointer&&enabled)read(e);});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])listen(pad,name,e=>{contain(e);if(e.pointerId===pointer)reset();});
 for(const button of [action,clean,restore]){
  listen(button,'pointerdown',e=>{e.stopPropagation();});
  listen(button,'pointerup',e=>{e.stopPropagation();});
 }
 listen(action,'click',e=>{contain(e);if(available&&actionEnabled)onAction();});
 listen(clean,'click',e=>{contain(e);if(available&&cleanEnabled)onClean();});
 listen(restore,'click',e=>{contain(e);if(available)onClean();});
 listen(host,'blur',reset);listen(host,'resize',reset);listen(doc,'visibilitychange',()=>{if(doc.hidden)reset();});
 function detect(){
  // Coarse-only hardware gets controls immediately; hybrid laptops also qualify.
  available=query.matches||Number(host.navigator?.maxTouchPoints)>0;
  if(!available)reset();doc.body.classList.toggle('touch-controls',available);onAvailability(available);
 }
 if(query.addEventListener)listen(query,'change',detect);else{query.addListener(detect);listeners.push(()=>query.removeListener(detect));}
 detect();
 return {
  get available(){return available;},get axes(){return state;},get pointer(){return pointer;},reset,
  update({visible,movement,brush,cleanView,cleanAllowed}){
   const next=available&&!!visible&&!cleanView;
   enabled=next&&!!movement;actionEnabled=next&&!!brush;cleanEnabled=next&&!!cleanAllowed;
   if(!enabled)reset();root.hidden=!next;pad.hidden=!movement;pad.setAttribute('aria-disabled',String(!enabled));
   action.hidden=!brush;action.disabled=!actionEnabled;clean.hidden=!cleanAllowed;clean.disabled=!cleanEnabled;
   restore.hidden=!(available&&cleanView);
  },
  destroy(){reset();listeners.splice(0).forEach(remove=>remove());root.hidden=restore.hidden=true;doc.body.classList.remove('touch-controls');}
 };
}
