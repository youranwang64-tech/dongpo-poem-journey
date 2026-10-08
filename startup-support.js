let ready=false,installed=false,contextLost=false,recoveryTimer=null,slowTimer=null,fontPromise=null;
const warnings=[];
const $=id=>document.getElementById(id);
export function isConstrainedDevice(){
 return (globalThis.navigator?.maxTouchPoints>0&&globalThis.matchMedia?.('(pointer: coarse)').matches)||
  (Number.isFinite(navigator.deviceMemory)&&navigator.deviceMemory<=4);
}
function recoveryPanel(message,error=null){
 const panel=$('error');if(!panel)return;
 panel.replaceChildren();panel.hidden=false;panel.setAttribute('role','alert');
 const prose=document.createElement('p');prose.textContent=message;panel.append(prose);
 if(error){const detail=document.createElement('small');detail.textContent=error?.message||String(error);detail.style.cssText='display:block;overflow-wrap:anywhere;opacity:.7';panel.append(detail);}
 const retry=document.createElement('button');retry.textContent='重新展开';retry.style.marginTop='18px';retry.onclick=()=>location.reload();panel.append(retry);
}
export function reportStartupError(error){
 console.error('Dongpo game',error);
 if(contextLost)return;
 recoveryPanel(ready?'画面暂时中断了，可以重新展开。':'诗境暂时未能展开，请检查网络后重试。',error);
 document.body.dataset.loading=ready?'interrupted':'failed';
}
export function installStartupRecovery(){
 if(installed)return;installed=true;
 addEventListener('error',event=>{if(event.error||event.message)reportStartupError(event.error||event.message);});
 addEventListener('unhandledrejection',event=>reportStartupError(event.reason));
 addEventListener('dongpo:asset-warning',event=>warnings.push(event.detail));
 const style=document.createElement('style');style.textContent='#error{inset:auto;left:50%;top:50%;transform:translate(-50%,-50%);width:min(90vw,520px);max-height:80vh;overflow:auto;background:#101513f5;color:#e6e4d6;border:1px solid #9a9d8955;box-shadow:0 12px 80px #0008;padding:24px;font-size:16px;line-height:1.8}';document.head.append(style);
 slowTimer=setTimeout(()=>{if(!ready&&$('begin')?.disabled)$('begin').textContent='正在加载画境，请稍候…';},18000);
}
export async function loadPoemFont(){
 if(fontPromise)return fontPromise;
 fontPromise=waitForPoemFont();return fontPromise;
}
async function waitForPoemFont(){
 const fonts=document.fonts;if(!fonts?.load)return;
 let timer;
 try{await Promise.race([fonts.load('80px Poem'),new Promise(resolve=>{timer=setTimeout(resolve,12000);})]);}
 catch(error){console.warn('诗文字体暂时未载入，使用系统字体继续。',error);}
 finally{clearTimeout(timer);}
}
export function createCompatibleRenderer(T,canvas,width,height){
 const constrained=isConstrainedDevice();
 const renderer=new T.WebGLRenderer({canvas,antialias:!constrained,powerPreference:constrained?'default':'high-performance',preserveDrawingBuffer:false});
 const pixelRatio=()=>Math.min(globalThis.devicePixelRatio||1,constrained?1:1.5);
 renderer.setPixelRatio(pixelRatio());renderer.setSize(width,height,false);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
 renderer.userData={...renderer.userData,constrainedDevice:constrained};
 document.body.dataset.renderQuality=constrained?'mobile':'standard';
 canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();contextLost=true;document.body.dataset.contextLost='true';
  recoveryPanel('画面正在恢复，请稍候。');
  clearTimeout(recoveryTimer);recoveryTimer=setTimeout(()=>{if(contextLost)recoveryPanel('当前设备的画面资源暂时不足，请重新展开。');},10000);
 });
 canvas.addEventListener('webglcontextrestored',()=>{
  contextLost=false;document.body.dataset.contextLost='false';clearTimeout(recoveryTimer);
  renderer.setPixelRatio(pixelRatio());$('error').hidden=true;
 });
 return renderer;
}
export function applyRenderBudget(renderer,stages){
 if(!renderer.userData.constrainedDevice)return;
 for(const stage of stages)stage.scene.traverse(node=>{if(node.isLight&&node.castShadow&&node.shadow){
  node.shadow.mapSize.x=Math.min(node.shadow.mapSize.x,1024);
  node.shadow.mapSize.y=Math.min(node.shadow.mapSize.y,1024);
 }});
}
export function markStartupReady(){ready=true;clearTimeout(slowTimer);document.body.dataset.loading='ready';}
export function canRenderFrame(){return !contextLost;}
export function getStartupStatus(){return {ready,contextLost,constrained:isConstrainedDevice(),warnings:[...warnings]};}
