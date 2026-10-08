// A brief network interruption should not permanently reject the whole game.
// Abort timed-out transfers before retrying, rather than downloading duplicates.
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function assetWarning(label,error){
 console.warn(label,error);
 globalThis.dispatchEvent?.(new CustomEvent('dongpo:asset-warning',{detail:{label,message:error?.message||String(error)}}));
}
export async function fetchAsset(url,{kind='arrayBuffer',timeoutMs=120000,attempts=3}={}){
 let last;
 for(let attempt=0;attempt<attempts;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetch(url,{signal:controller.signal});
   if(!response.ok){const error=new Error(`资源读取失败 (${response.status})：${String(url).split('/').at(-1)}`);error.status=response.status;throw error;}
   return await response[kind]();
  }catch(error){
   last=error;
   // A missing file needs a real fix; retries only help temporary failures.
   if(error.status>=400&&error.status<500&&![408,429].includes(error.status))break;
   if(attempt+1<attempts)await wait(600*(attempt+1));
  }finally{clearTimeout(timer);}
 }
 throw last;
}
export async function loadGLBWithRetry(loader,url){
 const absolute=new URL(url,globalThis.document?.baseURI||import.meta.url).href;
 const data=await fetchAsset(absolute);
 return loader.parseAsync(data,new URL('.',absolute).href);
}
export async function loadTextureWithRetry(T,url,options={}){
 const blob=await fetchAsset(url,{kind:'blob',...options}),objectURL=URL.createObjectURL(blob);
 try{return await new T.TextureLoader().loadAsync(objectURL);}
 finally{URL.revokeObjectURL(objectURL);}
}
