const clamp=t=>Math.max(0,Math.min(1,t));

// Integrate a smooth velocity ramp, then coast before gently coming to rest.
// Both velocity and acceleration vanish at each endpoint. The long middle
// avoids the sharp mid-animation rush of a single quintic ease over the field.
export function lycheeUnfoldAmount(value){
 const t=clamp(value),ramp=.22,speed=1/(1-ramp);
 const end=u=>speed*ramp*(u*u*u-.5*u*u*u*u);
 if(t<ramp)return end(t/ramp);
 if(t>1-ramp)return 1-end((1-t)/ramp);
 return speed*(t-ramp*.5);
}

export function lycheeDelayedAmount(value,delay=0){
 return lycheeUnfoldAmount(clamp((value-delay)/(1-delay)));
}
