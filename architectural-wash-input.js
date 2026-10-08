import * as T from './vendor/three.module.js';
import {appendBrushPoint} from './brush-input-path.js';
const clamp=T.MathUtils.clamp;

// A wash belongs to a real timber panel. The player can brush across it in
// either direction; a mathematical centre line is not the interaction.
export function createArchitecturalWashInput(template,{width,height,minTravel=.34,minSpan=.28}={}){
 const samples=[template[0]];for(let i=1;i<template.length;i++){const a=template[i-1],b=template[i],count=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])*52));for(let j=1;j<=count;j++)samples.push([T.MathUtils.lerp(a[0],b[0],j/count),T.MathUtils.lerp(a[1],b[1],j/count)]);}const paths=[],templates=[samples];let current=null,ready=false,baseMotion=0,motionSeconds=0,lastMoveAge=99;
 const metric=(a,b)=>Math.hypot((a[0]-b[0])*width,(a[1]-b[1])*height);
 function values(){const points=paths.flat();let travel=0,span=0;for(const p of paths)for(let i=1;i<p.length;i++)travel+=metric(p[i-1],p[i]);for(let direction=0;direction<8;direction++){const angle=direction*Math.PI/8,dx=Math.cos(angle)*width,dy=Math.sin(angle)*height;let min=Infinity,max=-Infinity;for(const p of points){const projection=p[0]*dx+p[1]*dy;min=Math.min(min,projection);max=Math.max(max,projection);}if(points.length)span=Math.max(span,max-min);}const coverage=clamp(Math.min(travel/minTravel,span/minSpan),0,1);return {coverage,accuracy:points.length?1:0,travel,span,samples:Math.max(0,points.length-paths.length),endpoints:span>=minSpan};}
 function begin(uv){if(current||ready)return false;current=[[clamp(uv[0],0,1),clamp(uv[1],0,1)]];paths.push(current);baseMotion=motionSeconds;lastMoveAge=99;return true;}
 function move(uv){if(!current||!appendBrushPoint(current,uv))return false;lastMoveAge=0;return true;}
 function end(){if(!current)return false;const submitted=current;current=null;if(submitted.length<2)paths.splice(paths.indexOf(submitted),1);const v=values();ready=v.travel>=minTravel&&v.span>=minSpan;return ready;}
 function cancel(){if(current){paths.splice(paths.indexOf(current),1);current=null;motionSeconds=baseMotion;}lastMoveAge=99;}
 function update(dt){if(dt>0){lastMoveAge+=dt;if(current&&lastMoveAge<.13)motionSeconds+=dt;}return ready;}
 function reset(){paths.length=0;current=null;ready=false;motionSeconds=baseMotion=0;lastMoveAge=99;}
 return {begin,move,end,cancel,update,reset,setViewSize(){},templates,strokes:[template],paths,recognized:new Set(),get current(){return current;},get active(){return !!current;},get ready(){return ready;},get waiting(){return false;},get progress(){return ready?1:Math.min(.99,values().coverage);},get stats(){return {...values(),motionSeconds,activeSeconds:motionSeconds,restSeconds:0,waitSeconds:0,ready,waiting:false,active:!!current,freePanelWash:true};}};
}
