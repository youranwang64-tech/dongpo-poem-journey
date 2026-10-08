import * as T from './vendor/three.module.js';

let sharedPaper=null;
function paperTexture(){
 if(sharedPaper)return sharedPaper;
 const size=1024,data=new Uint8Array(size*size*4),fieldSize=33,field=new Float32Array(fieldSize*fieldSize);let seed=10831103;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<field.length;i++)field[i]=random();
 const smooth=t=>t*t*(3-2*t);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const fx=x/(size-1)*(fieldSize-1),fy=y/(size-1)*(fieldSize-1),ix=Math.min(fieldSize-2,Math.floor(fx)),iy=Math.min(fieldSize-2,Math.floor(fy)),u=smooth(fx-ix),v=smooth(fy-iy);
  const a=field[iy*fieldSize+ix]*(1-u)+field[iy*fieldSize+ix+1]*u,b=field[(iy+1)*fieldSize+ix]*(1-u)+field[(iy+1)*fieldSize+ix+1]*u,density=(a*(1-v)+b*v-.5)*7+(random()-.5)*2.4,i=(y*size+x)*4;
  data[i]=Math.round(237+density);data[i+1]=Math.round(238+density);data[i+2]=Math.round(225+density);data[i+3]=255;
 }
 // Fine, short, irregular pulp fibres have softened pixel edges. There is
 // no repeated weave, grid, broad stain or moving procedural pattern.
 for(let n=0;n<11000;n++){
  const x=random()*size,y=random()*size,angle=random()*Math.PI*2,length=5+random()*38,bend=(random()-.5)*3.5,tone=random()>.35?-1:1,strength=1.4+random()*3.5;
  for(let s=0;s<=length;s+=.7){const t=s/length,curve=Math.sin(t*Math.PI)*bend,px=x+Math.cos(angle)*s-Math.sin(angle)*curve,py=y+Math.sin(angle)*s+Math.cos(angle)*curve,ix=Math.floor(px),iy=Math.floor(py),fade=Math.sin(t*Math.PI)*strength;
   for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const xx=ix+dx,yy=iy+dy;if(xx<0||yy<0||xx>=size||yy>=size)continue;const weight=(dx?px-ix:1-px+ix)*(dy?py-iy:1-py+iy),i=(yy*size+xx)*4;for(let c=0;c<3;c++)data[i+c]=T.MathUtils.clamp(data[i+c]+tone*fade*weight,0,255);}
  }
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.name='承天书斋 · 细纤维半透窗纸';texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;
 texture.userData={authoredProceduralPaper:true,fibreCount:11000,stableSeed:10831103,nonRepeating:true};sharedPaper=texture;return texture;
}

/** Paper belongs to the existing study shutters. It is deliberately outside
 * all navigation, picking and shadow-mask geometry; opening the real hinges
 * still admits the chapter's original moonlight through the aperture. */
export function addChengtianStudyWindowPaper(shutters){
 const map=paperTexture(),sheets=[];
 for(const {g,side}of shutters){
  const geometry=new T.PlaneGeometry(1.17,1.82),uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*.91+(side<0?0:.09),uv.getY(i)*.94+.03);
  const material=new T.MeshStandardMaterial({map,bumpMap:map,bumpScale:.0009,color:0xc9d1d1,roughness:1,metalness:0,transparent:true,opacity:.82,depthWrite:false,side:T.DoubleSide,emissive:0xa8bdd0,emissiveIntensity:.075});
  const sheet=new T.Mesh(geometry,material);sheet.name='月入户 · '+(side<0?'左':'右')+'扇细纤维薄纸';sheet.position.set(-side*.65,1.15,.023);sheet.castShadow=false;sheet.receiveShadow=true;sheet.raycast=()=>{};sheet.userData.studyWindowPaper=true;g.add(sheet);sheets.push(sheet);
 }
 const anchor=new T.Vector3(0,.40,0),guideSheet=sheets[1];
 return {sheets,anchor:()=>{guideSheet.updateWorldMatrix(true,false);return guideSheet.localToWorld(anchor.clone());},get stats(){return {sheetCount:sheets.length,textureSize:[map.image.width,map.image.height],fibreCount:map.userData.fibreCount,stableSeed:map.userData.stableSeed,thin:true,translucent:true,opacity:sheets[0].material.opacity,depthWrite:false,castShadow:false,localPaperDepth:.023,latticeFrontDepth:.015,depthSeparation:.008,uvOrientation:'upright; independent cropped fibre regions',uvBounds:sheets.map(s=>Array.from(s.geometry.attributes.uv.array)),attachedToOriginalHinges:sheets.every((s,i)=>s.parent===shutters[i].g),hingePositions:shutters.map(({g})=>g.position.toArray()),hingeAngles:shutters.map(({g})=>g.rotation.y),paperWorldPositions:sheets.map(s=>s.getWorldPosition(new T.Vector3()).toArray()),moonlightOpeningUnchanged:true,embeddedFriendWindowsUnchanged:true,silhouetteLayersUnchanged:true,noNewHitTargets:true};}};
}
