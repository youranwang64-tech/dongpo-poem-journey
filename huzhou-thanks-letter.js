import * as T from './vendor/three.module.js';
const SOURCE='https://zh.wikisource.org/zh-hans/湖州謝上表';
const TEXT=`臣轼言。蒙恩就移前件差遣，已于今月二十日到任上讫者。风俗阜安，在东南号为无事；山水清远，本朝廷所以优贤。顾惟何人，亦与兹选。臣轼。（中谢）

伏念臣性资顽鄙，名迹堙微。议论阔疏，文学浅陋。凡人必有一得，而臣独无寸长。荷先帝之误恩，擢置三馆；蒙陛下之过听，付以两州。非不欲痛自激昂，少酬恩造。而才分所局，有过无功；法令具存，虽勤何补。罪固多矣，臣犹知之。夫何越次之名邦，更许借资而显受。顾惟无状，岂不知恩。

此盖伏遇皇帝陛下，天覆群生，海涵万族。用人不求其备，嘉善而矜不能。知其愚不适时，难以追陪新进；察其老不生事，或能牧养小民。而臣顷在钱塘，乐其风土。鱼鸟之性，既能自得于江湖；吴越之人，亦安臣之教令。敢不奉法勤职，息讼平刑。上以广朝廷之仁，下以慰父老之望。臣无任。`;
export const HUZHOU_THANKS_LETTER=Object.freeze({title:'湖州谢上表',text:TEXT,source:SOURCE,sourceNote:'苏轼原作，见《东坡全集》。据维基文库原文转为简体，标点作阅读整理；「中谢」为原文格式。原页「牧养」另列「收养」异文。'});
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const seedRandom=(seed=0x1fbc)=>()=>{seed=Math.imul(1664525,seed)+1013904223|0;return(seed>>>0)/4294967296;};
function makeManuscript(documentInfo=HUZHOU_THANKS_LETTER,{columnCount=null,footer=''}={}){
 const text=documentInfo.text,title=documentInfo.title;
 const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=2560;const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('谢表纸稿需要可用的画布。');
 const paragraphs=(columnCount?[text]:text.split(/\n\s*\n/)).map(value=>[...value.replace(/\s+/g,'')]),rows=columnCount?Math.ceil(paragraphs[0].length/columnCount):20,columns=paragraphs.reduce((count,chars)=>count+Math.ceil(chars.length/rows),0),cells=[];
 let column=0;for(const chars of paragraphs){for(let i=0;i<chars.length;i++)cells.push({character:chars[i],column:column+Math.floor(i/rows),row:i%rows});column+=Math.ceil(chars.length/rows);}
 const draw=()=>{
  const random=seedRandom();ctx.globalAlpha=1;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#d8ccb0';ctx.fillRect(0,0,canvas.width,canvas.height);
  // Small fibres are baked into the paper. They cannot float off the desk.
  ctx.lineWidth=.8;for(let i=0;i<6200;i++){const x=random()*canvas.width,y=random()*canvas.height;ctx.strokeStyle=i%3?'rgba(81,70,44,.027)':'rgba(255,244,212,.13)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2+random()*9,y+(random()-.5)*2);ctx.stroke();}
  const wash=ctx.createLinearGradient(0,0,0,canvas.height);wash.addColorStop(0,'rgba(115,94,61,.035)');wash.addColorStop(.5,'rgba(255,242,210,.075)');wash.addColorStop(1,'rgba(102,82,46,.055)');ctx.fillStyle=wash;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(91,70,38,.12)';ctx.fillRect(175,95,2,2370);ctx.fillRect(175,95,3745,2);ctx.fillRect(175,2463,3745,2);ctx.fillRect(3918,95,2,2370);
  const left=285,right=3540,top=145,bottom=footer?2265:2415,dx=(right-left)/Math.max(1,columns-1),dy=(bottom-top)/rows;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#202219';ctx.font='88px "Poem", "KaiTi", "STKaiti", serif';
  for(const cell of cells){ctx.globalAlpha='，。；：（）'.includes(cell.character)?.86:.98;ctx.fillText(cell.character,right-cell.column*dx,top+(cell.row+.55)*dy);}
  ctx.globalAlpha=1;ctx.font='106px "Poem", "KaiTi", "STKaiti", serif';for(const[i,c]of[...title].entries())ctx.fillText(c,3760,225+i*140);
  ctx.font='82px "Poem", "KaiTi", "STKaiti", serif';ctx.fillText('苏',3760,1900);ctx.fillText('轼',3760,2010);ctx.fillStyle='rgba(140,49,33,.77)';ctx.fillRect(3713,2160,94,94);ctx.fillStyle='#d8ccb0';ctx.font='58px "Poem", "KaiTi", "STKaiti", serif';ctx.fillText('轼',3760,2208);ctx.globalAlpha=1;
  if(footer){ctx.fillStyle='#605a48';ctx.textAlign='center';ctx.font='52px "Poem", "KaiTi", "STKaiti", serif';ctx.fillText(footer,canvas.width/2,2380);}
  texture.needsUpdate=true;for(const copy of copies)copy.needsUpdate=true;
 };
 const texture=new T.CanvasTexture(canvas),copies=[];texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=12;draw();return {canvas,texture,draw,copies,cells,rows,columns,characterCount:cells.length};
}

/** Add readable historic manuscript to the existing Huzhou writing desk.
 * Reading UI and completing the paper task remain the caller's responsibility. */
export function decorateWorldManuscriptReader(stage,config={}){
 const info=config.document||HUZHOU_THANKS_LETTER,key=config.metadataKey||'huzhouThanksLetter',huzhou=!config.document;
 if(stage[key])return stage;
 if(!stage?.root?.isObject3D||huzhou&&!stage.targets?.some(t=>t.id==='paper'))throw new TypeError('卷轴阅读器需要真实书案场景。');
 const paperPosition=config.paperPosition||[2,.9708,1],readingPosition=config.readingPosition||[2,1.025,1],paperSize=config.paperSize||[1.205,.500];
 const oldUpdate=stage.update?.bind(stage),oldReset=stage.reset?.bind(stage),paperTrails=[];
 const readTask=task=>task.id==='paper'?{...task,kind:'walk',radius:1.1,requires:['lantern'],label:'案上谢表',hint:'走到书案边，读一读《湖州谢上表》。',verse:''}:task;
 if(huzhou){stage.targets=stage.targets.map(readTask);if(stage.architecture?.targets)stage.architecture.targets=stage.architecture.targets.map(readTask);
 stage.root.traverse(object=>{const p=object.position;if(object.isPoints&&object.parent===stage.root&&object.geometry?.attributes?.position?.count===220&&Math.abs(p.x-2)<.001&&Math.abs(p.y-1.1)<.001&&Math.abs(p.z-1)<.001)paperTrails.push(object);});}
 const manuscript=makeManuscript(info,config),material=new T.MeshStandardMaterial({map:manuscript.texture,color:0xffffff,roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const paper=new T.Mesh(new T.PlaneGeometry(...paperSize).rotateX(-Math.PI/2),material);paper.name=info.title+' · 案上真实原文';paper.position.fromArray(paperPosition);paper.receiveShadow=true;paper.castShadow=false;stage.root.add(paper);
 const [width,depth]=config.readingSize||[2.3,1.45],openSeconds=.85,scroll=new T.Group();scroll.name=info.title+' · 展卷阅读';scroll.position.fromArray(readingPosition);stage.root.add(scroll);
 const scrollTexture=manuscript.texture.clone();scrollTexture.needsUpdate=true;manuscript.copies.push(scrollTexture);
 const scrollMaterial=material.clone();scrollMaterial.map=scrollTexture;scrollMaterial.side=T.DoubleSide;
 const sheetGeometry=new T.PlaneGeometry(width,depth,32,20).rotateX(-Math.PI/2),positions=sheetGeometry.attributes.position;
 for(let i=0;i<positions.count;i++){const edge=Math.max(0,(Math.abs(positions.getX(i))-width*.42)/(width*.08));positions.setY(i,edge*edge*.013);}positions.needsUpdate=true;sheetGeometry.computeVertexNormals();
 const readingPaper=new T.Mesh(sheetGeometry,scrollMaterial);readingPaper.name=info.title+' · 完整原文卷纸';readingPaper.receiveShadow=true;scroll.add(readingPaper);
 const paperRollMaterial=new T.MeshStandardMaterial({color:0xcab995,roughness:.91}),wood=new T.MeshStandardMaterial({color:0x493523,roughness:.73}),capMaterial=new T.MeshStandardMaterial({color:0x675139,roughness:.70});
 const rollers=[];
 function cylinder(parent,radius,length,mat,name,z=0){const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,length,28),mat);mesh.name=name;mesh.rotation.x=Math.PI/2;mesh.position.z=z;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 for(const side of [-1,1]){const roller=new T.Group();roller.name=side<0?'左纸卷与轴头':'右纸卷与轴头';scroll.add(roller);cylinder(roller,.043,depth+.018,paperRollMaterial,'真实纸卷');cylinder(roller,.021,depth+.18,wood,'卷轴木芯');for(const sign of [-1,1]){cylinder(roller,.047,.09,wood,'卷轴端头',sign*(depth/2+.066));cylinder(roller,.054,.018,capMaterial,'轴头收口',sign*(depth/2+.118));}rollers.push({side,group:roller});}
 const readingLight=new T.PointLight(0xffead0,0,4.5,2);readingLight.position.set(0,1.35,0);scroll.add(readingLight);
 let reading=false,openness=0,lastTime=null;
 function syncScroll(){const eased=T.MathUtils.smootherstep(openness,0,1),spread=.16+.84*eased;scroll.visible=reading||openness>0;paper.visible=!scroll.visible;scroll.position.y=readingPosition[1]+.025*eased;readingPaper.scale.x=spread;scrollTexture.repeat.x=spread;scrollTexture.offset.x=(1-spread)/2;readingLight.intensity=2.3*eased;for(const {side,group}of rollers){group.position.set(side*(width*spread/2+.015),.029,0);group.rotation.z=-side*(1-eased)*.04;}}
 function beginThanksLetterReading(){reading=true;syncScroll();return true;}
 function endThanksLetterReading(){reading=false;syncScroll();return true;}
 function updateThanksLetterReading(dt){if(!Number.isFinite(dt)||dt<=0)return;const step=Math.min(.06,dt)/openSeconds;openness=T.MathUtils.clamp(openness+(reading?step:-step),0,1);syncScroll();}
 function getThanksLetterCamera(aspect=16/9,zoom=1){aspect=Number.isFinite(aspect)&&aspect>0?T.MathUtils.clamp(aspect,.3,5):16/9;zoom=T.MathUtils.clamp(Number.isFinite(zoom)?zoom:1,1,2.4);stage.root.updateWorldMatrix(true,false);const aim=V(readingPosition[0],readingPosition[1]+.025,readingPosition[2]),target=stage.root.localToWorld(aim.clone()),distance=2.1/zoom,fit=Math.max(depth+.30,(width+.22)/aspect)*1.13,fov=T.MathUtils.radToDeg(2*Math.atan(fit/(2*2.1))),position=stage.root.localToWorld(aim.add(V(0,distance,0))),up=V(0,0,-1).transformDirection(stage.root.matrixWorld);return {position:position.toArray(),target:target.toArray(),up:up.toArray(),fov,zoom,bounds:{width,depth},zoomRange:[1,2.4]};}
 function hidePaperTrail(){for(const trail of paperTrails)trail.visible=false;}
 function update(time,...args){const supplied=args[1],dt=Number.isFinite(supplied)?supplied:lastTime===null?0:Math.max(0,Math.min(.06,time-lastTime));lastTime=time;const value=oldUpdate?.(time,...args);updateThanksLetterReading(dt);hidePaperTrail();return value;}
 function reset(...args){const value=oldReset?.(...args);reading=false;openness=0;lastTime=null;syncScroll();hidePaperTrail();return value;}
 const readCamera=getThanksLetterCamera();
 const fontReady=globalThis.document?.fonts?.load?document.fonts.load('88px "Poem"',info.text).then(()=>manuscript.draw()).catch(()=>{}):Promise.resolve();
 stage.ready=Promise.all([stage.ready||Promise.resolve(),fontReady]);
 Object.assign(stage,{update,reset,beginThanksLetterReading,endThanksLetterReading,updateThanksLetterReading,getThanksLetter:()=>({...info}),getThanksLetterCamera});
 stage[key]={paper,scroll,readingGroup:scroll,readingPaper,rollers,readingLight,texture:manuscript.texture,scrollTexture,canvas:manuscript.canvas,paperTrails,readCamera,characterCount:manuscript.characterCount,cells:manuscript.cells,draw:manuscript.draw,get reading(){return reading;},get openness(){return openness;},get stats(){return {title:info.title,characterCount:manuscript.characterCount,paperPosition:paper.getWorldPosition(V()).toArray(),paperSize:[...paperSize],reading,openness,readingPosition:scroll.getWorldPosition(V()).toArray(),readingSize:[width,depth],columns:manuscript.columns,rows:manuscript.rows,canvasSize:[manuscript.canvas.width,manuscript.canvas.height],removedPaperTrails:paperTrails.length,source:info.source};}};
 syncScroll();hidePaperTrail();return stage;
}
export function decorateHuzhouThanksLetter(stage){return decorateWorldManuscriptReader(stage);}
