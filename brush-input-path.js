// Pointer events arrive at different rates. Reconstruct the actual segment
// between events instead of rejecting a fast mouse movement as missing ink.
export function appendBrushPoint(path,uv,{spacing=.018,minimum=.002}={}){
 if(!path?.length||!Array.isArray(uv)||!uv.every(Number.isFinite))return false;
 const next=uv.map(v=>Math.max(0,Math.min(1,v))),last=path.at(-1),distance=Math.hypot(next[0]-last[0],next[1]-last[1]);
 if(distance<minimum)return false;
 const count=Math.max(1,Math.ceil(distance/spacing));
 for(let i=1;i<=count;i++)path.push([last[0]+(next[0]-last[0])*i/count,last[1]+(next[1]-last[1])*i/count]);
 return true;
}
