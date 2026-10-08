import * as T from './vendor/three.module.js';
/** A head/shoulder lead followed by a planted, 0.9-second body turn. */
export function lycheeActorTurn({active=false,age=0,yawGoal=0,lookBackGoal=null}){
 const t=Math.max(0,age),duration=.9,amount=active?T.MathUtils.smootherstep(t/duration,0,1):0,rootAmount=active?T.MathUtils.smootherstep((t-.18)/.72,0,1):0;
 const head=active?T.MathUtils.smootherstep(t/.36,0,1):0,shoulder=active?T.MathUtils.smootherstep((t-.08)/.45,0,1):0,sign=Math.sign(yawGoal)||1;
 return {active,age:active?t:0,duration,amount,rootAmount,yaw:active?(yawGoal*rootAmount)||0:0,yawGoal:active?yawGoal:0,lookBackGoal:active?lookBackGoal?.slice()||null:null,headYaw:sign*.58*(head-rootAmount)||0,shoulderYaw:sign*.24*(shoulder-rootAmount)||0,settled:active&&t>=duration};
}
