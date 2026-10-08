const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// The front and the judgment band share one radius. Drawing never decides a hit.
export function bridgeRippleLayout(state,width,height,origin={x:.5,y:.52}){
 const radius=Math.min(width*.23,height*.275),margin=radius*1.22;
 const x=clamp(origin.x*width,Math.min(margin,width/2),Math.max(width-margin,width/2));
 const y=clamp(origin.y*height,Math.min(margin,height/2),Math.max(height-margin,height/2));
 return {x,y,radius,front:Math.max(0,state?.progress||0)*radius,
  inner:radius*(state?.targetMin??.90),outer:radius*(state?.targetMax??1.08)};
}

export function createBridgeInkRipple(canvas){
 const candidate=canvas?.getContext?.('2d'),ctx=candidate?.beginPath?candidate:null;
 let origin={x:.5,y:.52},last=null,painted=false;
 function anchor(x,y){origin={x:clamp(x,0,1),y:clamp(y,0,1)};}
 function reset(){origin={x:.5,y:.52};last=null;painted=false;if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);}
 function contour(x,y,r,age,seed){
  ctx.beginPath();for(let i=0;i<=160;i++){const a=i/160*Math.PI*2,
   ripple=Math.sin(a*5+seed)*.009+Math.sin(a*11-seed*.7)*.004+Math.sin(a*23+age*.35)*.002;
   const rr=r*(1+ripple),px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
   if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }ctx.closePath();
 }
 function ring(x,y,r,width,alpha,light,age,seed,blur){
  if(r<1||alpha<=0)return;ctx.save();ctx.filter='blur('+blur+'px)';
  contour(x,y,r,age,seed);ctx.lineWidth=width;ctx.strokeStyle='rgba('+light+','+light+','+light+','+alpha+')';ctx.stroke();ctx.restore();
 }
 function update(state,view,visible){
  const width=Math.max(1,view.width),height=Math.max(1,view.height),dpr=Math.min(1.5,typeof devicePixelRatio==='number'?devicePixelRatio:1);
  const layout=bridgeRippleLayout(state,width,height,origin),progress=Math.max(0,state?.progress||0),age=state?.heldSeconds||0;
  const active=visible&&state?.phase!=='waiting'&&progress>0;
  const fade=state?.phase==='retry'?clamp(progress/(state.releasedProgress||1),0,1):state?.phase==='aligning'?.56:1;
  last={...layout,visible:!!active,progress,origin:{x:layout.x/width,y:layout.y/height},strength:active?.006*fade:0};
  if(!ctx)return last;
  if(!active&&!painted)return last;
  const pw=Math.round(width*dpr),ph=Math.round(height*dpr);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);painted=!!active;if(!active)return last;
  const {x,y,front,inner,outer,radius}=layout,band=outer-inner,mid=(inner+outer)/2;
  // A pale feathered water mark makes the timing window visible, without a hard rim.
  ring(x,y,mid,band+9,.18*fade,30,age,0,10);
  ring(x,y,mid,Math.max(5,band-6),.32*fade,239,age,0,5);
  // Neutral ink in the trough, light along the crest; the centre stays transparent.
  for(let i=3;i>=0;i--){const r=front-i*radius*.13;if(r<=1)continue;
   const opacity=fade*(i===0?.56:.13*(1-i*.15));
   ring(x,y,r+4,13,opacity*.48,18,age,1.7+i,5);
   ring(x,y,r,5,opacity,225,age,1.7+i,2.8);
   ring(x,y,r-6,9,opacity*.28,45,age,1.7+i,5);
  }
  const drop=ctx.createRadialGradient(x,y,0,x,y,Math.min(36,8+front*.13));
  drop.addColorStop(0,'rgba(19,19,19,'+(.27*fade)+')');drop.addColorStop(.4,'rgba(41,41,41,'+(.13*fade)+')');drop.addColorStop(1,'rgba(41,41,41,0)');
  ctx.fillStyle=drop;ctx.fillRect(x-40,y-40,80,80);return last;
 }
 return {anchor,reset,update,get stats(){return last;}};
}
