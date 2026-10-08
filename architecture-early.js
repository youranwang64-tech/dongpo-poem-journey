import * as T from './vendor/three.module.js';
import {createAtmosphere} from './atmosphere.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);

/**
 * Working openings in the first three architectural spaces.
 * Task positions intentionally match the existing story path.
 */
export function buildEarlyArchitecture(index,{scene,root,box,rod,roof,materials,mat}){
 if(index<0||index>2)throw new RangeError('Early architecture supports chapters 0, 1 and 2.');
 const building=new T.Group();building.name='Working windows and passage doors';root.add(building);
 const actions=new Set(),channels=new Map(),motion=[],lamps=[];
 let lastTime=null;
 const inkMetal=mat(0x35443f,{roughness:.74,metalness:.2});
 const warmPaper=mat(0xafa58a,{roughness:.92});
 const ready=id=>(channels.get(id)?.value||0)>.72;
 const progress=id=>channels.get(id)?.value||0;
 function addBox(w,h,d,p,m=materials.wood,parent=building){return box(w,h,d,p,m,parent);}
 function addRod(a,b,r=.04,m=materials.wood,parent=building){return rod(a,b,r,m,parent);}
 function mesh(geometry,material,p,parent=building){const o=new T.Mesh(geometry,material);o.position.copy(p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}

 function leaf(parent,width,height,sign,style){
  const cx=sign*width*.5;
  if(style==='bars'){
   for(const x of [0,sign*width])addBox(.055,height,.09,V(x,height*.5,0),inkMetal,parent);
   for(const y of [.10,height*.45,height-.10])addBox(width,.06,.09,V(cx,y,0),inkMetal,parent);
   for(let i=1;i<Math.ceil(width/.18);i++)addRod(V(sign*i*.18,.06,0),V(sign*i*.18,height-.06,0),.022,inkMetal,parent);
   addBox(.14,.14,.11,V(sign*(width-.14),height*.48,.06),materials.wood,parent);
  }else{
   for(const x of [0,sign*width])addBox(.075,height,.10,V(x,height*.5,0),materials.wood,parent);
   for(const y of [.08,height*.25,height-.07])addBox(width,.07,.10,V(cx,y,0),materials.wood,parent);
   addBox(width-.09,height*.23,.055,V(cx,height*.125,0),materials.wood,parent);
   if(style==='paper')addBox(width-.13,height*.67,.025,V(cx,height*.61,-.024),warmPaper,parent);
   for(let x=.15;x<width-.08;x+=.19)addBox(.024,height*.70,.040,V(sign*x,height*.615,.035),materials.wood,parent);
   for(let y=height*.31;y<height-.06;y+=.24)addBox(width-.09,.024,.041,V(cx,y,.036),materials.wood,parent);
   const ring=mesh(new T.TorusGeometry(.048,.010,5,16),inkMetal,V(sign*(width-.14),height*.47,.08),parent);ring.rotation.x=.05;
  }
 }
 function pair({x,z,y=0,width,height,rotation=0,style='lattice',frame=true,open=1.36}){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;building.add(g);
  if(frame){for(const side of [-1,1]){addBox(.15,height+.16,.19,V(side*(width/2+.025),(height+.16)/2,0),materials.wood,g);addBox(.28,.12,.28,V(side*(width/2+.025),.04,0),materials.stone,g);}addBox(width+.23,.14,.19,V(0,height+.05,0),materials.wood,g);}
  const leaves=[];for(const side of [-1,1]){const hinge=new T.Group();hinge.position.x=side*width/2;g.add(hinge);leaf(hinge,width/2,height,-side,style);for(const yy of [height*.22,height*.76])addRod(V(0,yy-.08,0),V(0,yy+.08,0),.035,inkMetal,hinge);leaves.push({hinge,side});}
  return {group:g,set:value=>{for(const {hinge,side}of leaves)hinge.rotation.y=side*value*open;}};
 }
 function lightThrough(id,from,to,color,intensity=40){
  const l=new T.SpotLight(color,0,13,.34,.48,1.8);l.position.fromArray(from);l.target.position.fromArray(to);l.castShadow=true;l.shadow.mapSize.set(512,512);l.shadow.bias=-.0001;l.shadow.normalBias=.012;scene.add(l,l.target);lamps.push({id,light:l,intensity});return l;
 }
 function planeBacking(x,y,z,width,height,color){const o=mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({color,fog:true}),V(x,y,z));o.castShadow=false;return o;}
 function threshold(x,z,width,rotation=0){const o=addBox(width,.05,.31,V(x,-.006,z),materials.stone);o.rotation.y=rotation;return o;}
 let targets,shafts;
 if(index===0){
  // The first opening lights the writing bay and folds away the screen across the gallery.
  const window=pair({x:-4,z:-.92,y:.80,width:2.65,height:2.18,style:'paper',open:1.17});
  planeBacking(-4,1.9,-1.05,2.62,2.15,0x9d9f87);
  addBox(2.98,.78,.17,V(-4,.39,-1.06),materials.wall);
  addBox(2.98,.32,.17,V(-4,3.18,-1.06),materials.wall);
  const inner=pair({x:-.45,z:1,width:3.10,height:2.96,rotation:Math.PI/2});
  const exit=pair({x:9.1,z:1,width:3.10,height:3.05,rotation:Math.PI/2,frame:false});
  threshold(-.45,1,3.10,Math.PI/2);threshold(9.1,1,3.10,Math.PI/2);
  motion.push(()=>{window.set(progress('lantern'));inner.set(progress('lantern'));exit.set(progress('paper'));});
  lightThrough('lantern',[-4,2.85,-1.14],[2,.78,1],0xe9dcc0,49);
  shafts=[{id:'window-open',from:[-4,2.85,-.79],to:[2,.10,1],radius:1.15,color:0xc8d5c3,strength:0}];
  targets=[
   {id:'lantern',position:[-4,0,1],label:'廊窗',hint:'走到廊窗前，借笔风推开双扇窗，让光照到书案。',verse:'',requires:[]},
   {id:'paper',position:[2,0,1],label:'书案上的谢表',hint:'格屏已经让开。走到光下的书案，写完谢表。',verse:'知其愚不适时，难以追陪新进',requires:['lantern'],source:'https://zh.wikisource.org/zh-hans/東坡全集_(四庫全書本)/卷067'}
  ];
 }else if(index===1){
  // These openings face into the two existing colonnades. The central gate remains in scenes.js.
  for(const [id,x,z]of [['seal-left',-3.65,0],['seal-right',3.65,-2]]){
   const door=pair({x,z,width:2.75,height:3.05,rotation:Math.PI/2,open:1.42});threshold(x,z,2.75,Math.PI/2);motion.push(()=>door.set(progress(id)));
   addBox(.91,.075,12.4,V(Math.sign(x)*4.15,-.018,-1.1),materials.stone);
   const start=-7.35,end=5.35,leftEnd=z-1.50,rightStart=z+1.50;
   for(const [a,b]of [[start,leftEnd],[rightStart,end]]){const length=b-a,center=(a+b)/2;addBox(.13,1.04,length,V(x,.52,center),materials.wall);addBox(.11,.10,length,V(x,1.09,center),materials.wood);for(let zz=a+.35;zz<b-.15;zz+=.62)addBox(.055,1.8,.055,V(x,2.02,zz),materials.wood);addBox(.13,.11,length,V(x,2.95,center),materials.wood);}
   lightThrough(id,[Math.sign(x)*4.7,2.8,z],[Math.sign(x)*1.5,.2,z-.5],0xb8d0c9,25);
  }
  shafts=[{id:'left-open',from:[-4.7,2.7,0],to:[-1.4,.12,-.6],radius:1.0,color:0xb4cdc5,strength:0},{id:'right-open',from:[4.7,2.7,-2],to:[1.4,.12,-2.5],radius:1.0,color:0xb4cdc5,strength:0}];
  targets=[
   {id:'seal-left',position:[-2.8,0,0],label:'左廊封门',kind:'spatial-gesture',hint:'门后有光。以一字【开】，让光穿过左廊的格门。',verse:'',requires:[]},
   {id:'seal-right',position:[2.8,0,-2],label:'右廊封门',kind:'spatial-gesture',hint:'再借一字【开】，让右廊的格门也透进光。',verse:'',requires:[]},
   {id:'gate',position:[0,0,-6],label:'御史台正门',hint:'两边的格门已开。走到正门下，沿廊进入下一重院落。',verse:'',kind:'walk',requires:['seal-left','seal-right']}
  ];
 }else{
  // The high window keeps its iron bars: only the outer shutters swing away.
  const window=pair({x:-3,z:-2.39,y:2.25,width:2.4,height:1.7,style:'paper',open:1.38});
  planeBacking(-3,3.1,-3.66,2.38,1.68,0x8eaea8);
  for(let x=-4.08;x<=-1.92;x+=.24)addRod(V(x,2.27,-2.50),V(x,3.93,-2.50),.020,inkMetal);
  for(const yy of [2.3,3.9])addBox(2.44,.08,.10,V(-3,yy,-2.50),inkMetal);
  const exit=pair({x:5.15,z:.8,width:2.70,height:3.12,rotation:Math.PI/2,style:'bars',frame:false,open:1.42});threshold(5.15,.8,2.70,Math.PI/2);
  motion.push(()=>{window.set(progress('window'));exit.set(progress('letter'));});
  lightThrough('window',[-3,3.2,-3.55],[1,.82,0],0xb7dbd8,55);
  shafts=[{id:'window-open',from:[-3,3.18,-2.35],to:[1,.05,.25],radius:.91,color:0xb2ceca,strength:0}];
  targets=[
   {id:'window',position:[-3,0,.8],label:'高窗的木扇',hint:'从窗下引一阵风。木扇开了，月光会穿过铁栅落到案上。',verse:'',requires:[]},
   {id:'letter',position:[1,0,.8],label:'窗光下的信',hint:'走到照亮的书案，把信写完。门外随后传来开锁的声音。',verse:'柏台霜气夜凄凄',requires:['window']}
  ];
 }
 for(const t of targets)channels.set(t.id,{value:0,age:0,target:0});
 const atmosphere=createAtmosphere(scene,{seed:924+index,color:0xb2c4b9,mistCount:0,countRain:0,dust:45,mistBounds:index===2?{minX:-4,maxX:3,minZ:-2,maxZ:1}:{minX:-5,maxX:5,minZ:-2,maxZ:2},shafts});
 function apply(){for(const f of motion)f();for(const {id,light,intensity}of lamps)light.intensity=intensity*progress(id);if(index===1){atmosphere.setLight('left-open',progress('seal-left')*2.6);atmosphere.setLight('right-open',progress('seal-right')*2.6);}else atmosphere.setLight('window-open',progress(index===0?'lantern':'window')*3.3);}
 function interact(id){const t=targets.find(t=>t.id===id);if(!t||actions.has(id)||t.requires.some(r=>!actions.has(r)))return false;if(t.requires.some(r=>!ready(r)))return false;actions.add(id);const c=channels.get(id);c.target=1;c.age=c.value>=.999?2:0;return true;}
 function previewAction(id,value){if(index!==1||!['seal-left','seal-right'].includes(id)||!channels.has(id))return false;const c=channels.get(id);c.value=T.MathUtils.clamp(value,0,1);apply();return true;}
 function update(t,dt){const step=Number.isFinite(dt)?Math.min(.08,Math.max(0,dt)):lastTime===null?0:Math.min(.08,Math.max(0,t-lastTime));lastTime=t;for(const c of channels.values())if(c.target){c.age=Math.min(2,c.age+step);c.value=T.MathUtils.smoothstep(c.age/2,0,1);}apply();atmosphere.update(t);}
 function reset(){actions.clear();lastTime=null;for(const c of channels.values()){c.value=0;c.age=0;c.target=0;}apply();}
 function crosses(a,b,plane){return (a<plane&&b>=plane)||(a>plane&&b<=plane);}
 function clearWidth(width,angle){return Math.max(.12,width*.5*(1-Math.cos(angle))-.18);}
 function canMove(from,to,done){
  if(index===0){if(to.x>-.68&&!ready('lantern'))return false;if(to.x>8.83&&!ready('paper'))return false;for(const [id,x]of [['lantern',-.45],['paper',9.1]])if(crosses(from.x,to.x,x)&&Math.abs(to.z-1)>clearWidth(3.10,progress(id)*1.36))return false;return true;}
  if(index===1){for(const [id,x,z]of [['seal-left',-3.65,0],['seal-right',3.65,-2]])if(crosses(from.x,to.x,x)){if(!ready(id)||Math.abs(to.z-z)>clearWidth(2.75,progress(id)*1.42))return false;}if(to.z<-8.10&&!ready('gate'))return false;return true;}
  if(to.x>4.87&&!ready('letter'))return false;if(crosses(from.x,to.x,5.15)&&Math.abs(to.z-.8)>clearWidth(2.70,progress('letter')*1.42))return false;return true;
 }
 reset();
 return {targets,interact,previewAction,update,reset,canMove,progress,group:building,atmosphere,get hint(){if(index===0)return ready('paper')?'格门已开，沿东廊走出去。':ready('lantern')?'光已经落到书案上了。':'先开窗，再入书案。';if(index===1)return ready('seal-left')&&ready('seal-right')?'走到正门下，进入下一重院落。':'以一字【开】，让左右格门后的光透进庭院。';return ready('letter')?'门锁开了，沿狱廊向右走。':ready('window')?'月光已经照亮了信纸。':'借窗中的月光写信。';}};
}
