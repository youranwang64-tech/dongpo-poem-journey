// Infer brush paths from the actual font mask. Finished letters use the whole
// original mask; particles can never leave holes in the character.
export function makeBrushTimeline(alpha, width, height) {
 const size=96,mask=new Uint8Array(size*size),scaleX=width/size,scaleY=height/size;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let a=0;const x0=Math.floor(x*scaleX),x1=Math.min(width,Math.ceil((x+1)*scaleX)),y0=Math.floor(y*scaleY),y1=Math.min(height,Math.ceil((y+1)*scaleY));
  for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++)a=Math.max(a,alpha[yy*width+xx]);
  if(a>100&&x>0&&y>0&&x<size-1&&y<size-1)mask[y*size+x]=1;
 }
 const skeleton=mask.slice(),at=(x,y)=>skeleton[y*size+x]||0;
 let changed=true,passes=0;
 while(changed&&passes++<96){changed=false;for(let phase=0;phase<2;phase++){
  const remove=[];
  for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
   const id=y*size+x;if(!skeleton[id])continue;
   const p=[at(x,y-1),at(x+1,y-1),at(x+1,y),at(x+1,y+1),at(x,y+1),at(x-1,y+1),at(x-1,y),at(x-1,y-1)];
   const count=p.reduce((a,b)=>a+b,0);if(count<2||count>6)continue;
   let switches=0;for(let k=0;k<8;k++)if(!p[k]&&p[(k+1)%8])switches++;if(switches!==1)continue;
   if(phase===0?(p[0]*p[2]*p[4]||p[2]*p[4]*p[6]):(p[0]*p[2]*p[6]||p[0]*p[4]*p[6]))continue;
   remove.push(id);
  }
  if(remove.length)changed=true;for(const id of remove)skeleton[id]=0;
 }}
 const ids=[];for(let id=0;id<skeleton.length;id++)if(skeleton[id])ids.push(id);
 const neighbors=new Map();for(const id of ids){const x=id%size,y=Math.floor(id/size),list=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  if(!(dx||dy))continue;const n=(y+dy)*size+x+dx;if(!skeleton[n])continue;
  if(dx&&dy&&(skeleton[y*size+x+dx]||skeleton[(y+dy)*size+x]))continue;
  list.push(n);
 }neighbors.set(id,list);}
 const visited=new Set(),paths=[],edge=(a,b)=>Math.min(a,b)*size*size+Math.max(a,b),nodeOrder=id=>Math.floor(Math.floor(id/size)/10)*size+(id%size)+Math.floor(id/size)*.11;
 function trace(a,b){const path=[a,b];visited.add(edge(a,b));let current=b;
  while(path.length<size*size){
   const candidates=neighbors.get(current).filter(n=>!visited.has(edge(current,n)));if(!candidates.length)break;
   const previous=path[Math.max(0,path.length-5)],dx=(current%size)-(previous%size),dy=Math.floor(current/size)-Math.floor(previous/size),length=Math.hypot(dx,dy)||1;
   const direction=n=>{const nx=(n%size)-(current%size),ny=Math.floor(n/size)-Math.floor(current/size);return (dx*nx+dy*ny)/(length*(Math.hypot(nx,ny)||1));};
   candidates.sort((x,y)=>direction(y)-direction(x));const next=candidates[0];
   // Follow the same stroke through a crossing instead of splitting a cross
   // into many tiny paths. A sharp branch is a lift, not a vibrating pen nib.
   if(candidates.length>1&&direction(next)<.08)break;
   visited.add(edge(current,next));path.push(next);current=next;
  }
  const spur=path.length<4&&(neighbors.get(path[0]).length>=3||neighbors.get(path.at(-1)).length>=3);if(!spur)paths.push(path);
 }
 const ordered=ids.slice().sort((a,b)=>nodeOrder(a)-nodeOrder(b));
 for(const id of ordered)if(neighbors.get(id).length===1)for(const n of neighbors.get(id))if(!visited.has(edge(id,n)))trace(id,n);
 for(const id of ordered)for(const n of neighbors.get(id))if(!visited.has(edge(id,n)))trace(id,n);
 for(const id of ordered)if(!neighbors.get(id).length)paths.push([id]);
 const order=p=>{let top=size,left=size;for(const n of p){top=Math.min(top,Math.floor(n/size));left=Math.min(left,n%size);}return Math.floor(top/8)*size+left+top*.11;};
 paths.sort((a,b)=>order(a)-order(b));
 for(const path of paths){const a=path[0],b=path.at(-1),dx=(b%size)-(a%size),dy=Math.floor(b/size)-Math.floor(a/size);if(Math.abs(dx)>Math.abs(dy)?dx<0:dy<0)path.reverse();}
 const weight=p=>Math.max(3,Math.pow(p.length,.75)),totalWeight=paths.reduce((sum,p)=>sum+weight(p),0)||1,lift=Math.min(.010,.10/Math.max(1,paths.length)),travelRange=.90-lift*Math.max(0,paths.length-1);
 const progress=new Float32Array(size*size).fill(1),distance=new Float32Array(size*size).fill(1e9),penPaths=[];let elapsed=0;
 for(const path of paths){const span=travelRange*weight(path)/totalWeight,start=.035+elapsed,end=start+span,points=[];
  for(let j=0;j<path.length;j++){const id=path[j],t=start+(end-start)*(j/Math.max(1,path.length-1));progress[id]=Math.min(progress[id],t);distance[id]=0;
   const x=id%size,y=Math.floor(id/size);let inkWidth=0;
   for(let a=0;a<8;a++){const angle=a*Math.PI/4;let reach=1;for(;reach<6;reach++){const xx=Math.round(x+Math.cos(angle)*reach),yy=Math.round(y+Math.sin(angle)*reach);if(!mask[yy*size+xx])break;}inkWidth+=reach;}
   points.push({x:(x+.5)/size,y:(y+.5)/size,time:t,pressure:Math.min(1,inkWidth/32)});
  }
  // Smooth raster stair steps within this one stroke. The smoothing is
  // forbidden to cross a lift or move the visible nib outside the ink.
  const smoothed=points.map((p,j)=>{let x=0,y=0,pressure=0,sum=0;for(let k=Math.max(0,j-2);k<=Math.min(points.length-1,j+2);k++){const w=3-Math.abs(j-k);x+=points[k].x*w;y+=points[k].y*w;pressure+=points[k].pressure*w;sum+=w;}x/=sum;y/=sum;const px=Math.min(size-1,Math.floor(x*size)),py=Math.min(size-1,Math.floor(y*size));return {...p,x:mask[py*size+px]?x:p.x,y:mask[py*size+px]?y:p.y,pressure:pressure/sum};});
  penPaths.push({start,end,points:smoothed});elapsed+=span+lift;
 }
 function relax(id,n,cost){if(n<0||n>=distance.length)return;const d=distance[n]+cost;if(d<distance[id]){distance[id]=d;progress[id]=progress[n];}}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const id=y*size+x;if(x)relax(id,id-1,1);if(y)relax(id,id-size,1);if(x&&y)relax(id,id-size-1,1.4142);if(x<size-1&&y)relax(id,id-size+1,1.4142);}
 for(let y=size-1;y>=0;y--)for(let x=size-1;x>=0;x--){const id=y*size+x;if(x<size-1)relax(id,id+1,1);if(y<size-1)relax(id,id+size,1);if(x<size-1&&y<size-1)relax(id,id+size+1,1.4142);if(x&&y<size-1)relax(id,id+size-1,1.4142);}
 const timeline=new Float32Array(width*height);let inkPixels=0,coveredPixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const id=y*width+x,nearest=Math.min(size-1,Math.floor(y/scaleY))*size+Math.min(size-1,Math.floor(x/scaleX));timeline[id]=distance[nearest]<1e8?progress[nearest]:.5;if(alpha[id]>0){inkPixels++;if(Number.isFinite(timeline[id])&&timeline[id]<1)coveredPixels++;}}
 return {timeline,penPaths,strokeCount:paths.filter(p=>p.length>=3).length,inkPixels,coveredPixels,continuousStrokes:penPaths.length,skeletonSize:size};
}

// A lifted brush never interpolates across separate strokes. That avoids the
// dotted diagonal lines which otherwise join unrelated parts of a character.
export function sampleBrushPen(penPaths, progress){
 const path=penPaths.find(p=>progress>=p.start&&progress<=p.end);if(!path?.points.length)return null;
 const points=path.points,u=(progress-path.start)/Math.max(.00001,path.end-path.start)*(points.length-1),i=Math.min(points.length-1,Math.floor(u)),a=points[i],b=points[Math.min(points.length-1,i+1)],t=u-i;
 const edge=Math.min(1,(progress-path.start)/.012,(path.end-progress)/.016);
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,pressure:a.pressure+(b.pressure-a.pressure)*t,contact:Math.max(0,edge)};
}

// Keep the final font mask intact. A separate damp halo carries the spreading
// pigment at the fresh stroke and during the final dissolve.
export function makeBrushPigment(alpha,width,height){
 const kernel=[1,4,6,4,1],tmp=new Float32Array(alpha.length),soft=new Uint8Array(alpha.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){let sum=0;for(let k=-2;k<=2;k++)sum+=alpha[y*width+Math.max(0,Math.min(width-1,x+k*2))]*kernel[k+2];tmp[y*width+x]=sum/16;}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){let sum=0;for(let k=-2;k<=2;k++)sum+=tmp[Math.max(0,Math.min(height-1,y+k*2))*width+x]*kernel[k+2];soft[y*width+x]=Math.round(sum/16);}
 return soft;
}

// Visual-only pressure profile. The recognizer still receives untouched UV
// samples; smoothing this ribbon cannot affect input thresholds or templates.
export function makeInkRibbon(points,size=512,width=12){
 if(points.length<2)return [];
 const source=points.map(([u,v])=>({x:u*size,y:v*size})),lengths=[0];for(let i=1;i<source.length;i++)lengths.push(lengths.at(-1)+Math.hypot(source[i].x-source[i-1].x,source[i].y-source[i-1].y));
 const total=lengths.at(-1);if(total<.01)return [];
 const count=Math.max(2,Math.min(512,Math.ceil(total/Math.max(1.4,width*.15)))),sampled=[];let segment=1;
 for(let i=0;i<=count;i++){const d=total*i/count;while(segment<lengths.length-1&&lengths[segment]<d)segment++;const a=source[segment-1],b=source[segment],t=(d-lengths[segment-1])/Math.max(.001,lengths[segment]-lengths[segment-1]);sampled.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
 const smooth=sampled.map((p,i)=>i===0||i===sampled.length-1?p:{x:(sampled[i-1].x+p.x*2+sampled[i+1].x)*.25,y:(sampled[i-1].y+p.y*2+sampled[i+1].y)*.25});
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 return smooth.map((p,i)=>{const a=smooth[Math.max(0,i-2)],b=smooth[Math.min(smooth.length-1,i+2)],dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1,t=i/(smooth.length-1),rise=.42+.58*ease(t/.09),lift=1-.71*ease((t-.78)/.22),pressure=rise*lift*(.96+.045*Math.sin(t*Math.PI*2));return {...p,nx:-dy/n,ny:dx/n,radius:width*.5*pressure,t,pressure};});
}

export function paintBrushStroke(context,points,{size=512,width=12,color='#efeede',opacity=1}={}){
 const ribbon=makeInkRibbon(points,size,width);if(!ribbon.length||opacity<=0)return;
 const alpha=context.globalAlpha??1;context.save?.();
 function fill(expand,amount,blur){context.globalAlpha=alpha*opacity*amount;context.fillStyle=color;context.shadowColor=color;context.shadowBlur=blur;context.beginPath();ribbon.forEach((p,i)=>{const r=p.radius+expand,x=p.x+p.nx*r,y=p.y+p.ny*r;i?context.lineTo(x,y):context.moveTo(x,y);});for(let i=ribbon.length-1;i>=0;i--){const p=ribbon[i],r=p.radius+expand;context.lineTo(p.x-p.nx*r,p.y-p.ny*r);}context.closePath?.();context.fill();}
 fill(2.2,.095,2.6);fill(0,1,0);context.restore?.();context.globalAlpha=alpha;context.shadowBlur=0;
}

export function paintFormalGlyph(context,word,{size=512,pixels=384,color='#efeede',opacity=1}={}){
 if(!word||opacity<=0)return;const previous=context.globalAlpha??1;context.save?.();context.globalAlpha=previous*opacity;context.fillStyle=color;context.shadowBlur=0;context.font=pixels+'px Poem, serif';context.textAlign='center';context.textBaseline='middle';
 const metrics=context.measureText?.(word),a=metrics?.actualBoundingBoxAscent,d=metrics?.actualBoundingBoxDescent,l=metrics?.actualBoundingBoxLeft,r=metrics?.actualBoundingBoxRight;
 if([a,d,l,r].every(Number.isFinite)){context.textAlign='left';context.textBaseline='alphabetic';context.fillText(word,(size-l-r)*.5+l,(size-a-d)*.5+a);}else context.fillText(word,size*.5,size*.5);
 context.restore?.();context.globalAlpha=previous;
}
