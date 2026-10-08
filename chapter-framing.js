// Bring the ordinary architectural views slightly closer along their existing
// viewing direction. Independent window, moon and finale shots keep ownership.
export const DEFAULT_SHOT_SCALE=Object.freeze({side:1.10,rear:1.06,rain:1.08});

export function composeDefaultShot(shot,config){
 const scale=DEFAULT_SHOT_SCALE[shot];
 if(!scale||!config?.offset)return config;
 return {...config,offset:config.offset.map(component=>component/scale)};
}
