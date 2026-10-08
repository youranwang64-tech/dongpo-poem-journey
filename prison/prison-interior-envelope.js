import * as T from '../vendor/three.module.js';

/** Local, neutral pigment textures. Broad worn plaster, fine paper fibres and
 * dark grain have different value ranges; no shared chapter material is tinted. */
export function createPrisonArtMaterials(){
 const random=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function texture(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const cx=canvas.getContext('2d'),r=random(kind==='plaster'?23071:23093);
  cx.fillStyle=kind==='plaster'?'#b7b5ae':'#a8a7a1';cx.fillRect(0,0,512,512);
  if(kind==='plaster'){
   for(let i=0;i<92;i++){const x=r()*512,y=r()*512,size=18+r()*126,g=cx.createRadialGradient(x,y,0,x,y,size);g.addColorStop(0,`rgba(30,32,35,${.04+r()*.14})`);g.addColorStop(1,'rgba(30,32,35,0)');cx.fillStyle=g;cx.fillRect(x-size,y-size,size*2,size*2);}
   const foot=cx.createLinearGradient(0,130,0,512);foot.addColorStop(0,'rgba(21,25,29,0)');foot.addColorStop(.66,'rgba(21,25,29,.06)');foot.addColorStop(1,'rgba(21,25,29,.44)');cx.fillStyle=foot;cx.fillRect(0,0,512,512);
   for(let i=0;i<55;i++){const x=r()*512;cx.fillStyle=`rgba(24,27,30,${.025+r()*.06})`;cx.fillRect(x,300+r()*170,1+r()*12,30+r()*200);}
  }else{
   for(let i=0;i<8;i++){const x=i*64;cx.fillStyle='rgba(18,21,25,.25)';cx.fillRect(x,0,1.3,512);cx.fillStyle='rgba(237,231,216,.11)';cx.fillRect(x+1.3,0,.8,512);}
  }
  for(let i=0;i<10500;i++){const n=kind==='plaster'?55+r()*176:35+r()*178;cx.fillStyle=`rgba(${n},${n},${n},${.016+r()*.065})`;cx.fillRect(r()*512,r()*512,kind==='plaster'?.5+r()*3:.4+r()*.9,kind==='plaster'?.3+r()*1.4:6+r()*38);}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;map.userData.prisonPigment={kind,neutral:true,broadStains:kind==='plaster',fibres:true};return map;
 }
 const plasterMap=texture('plaster'),woodMap=texture('wood');
 const make=(role,color,map=null,roughness=.97)=>{const m=new T.MeshStandardMaterial({color,map,bumpMap:map,bumpScale:role==='plaster'?.025:.009,roughness});m.userData.prisonTonalRole=role;return m;};
 const plaster=make('plaster',0x9b9d9b,plasterMap),timber=make('timber',0x606469,woodMap),beam=make('beam',0x20262b,woodMap),iron=make('iron',0x161b20,null,.76),floor=make('floor',0x515962,woodMap),stone=make('stone',0x737a7f,plasterMap);
 iron.metalness=.28;return {plaster,timber,beam,iron,floor,stone,plasterMap,woodMap};
}

/** An opaque, room-sized enclosure above the existing cell. The old high
 * window remains a real hole in its masonry; the observation camera, route
 * and last threshold are all below the ceiling, never outside the building. */
export function buildPrisonInteriorEnvelope({scene,stage,movingWall,materials}){
 const root=new T.Group();root.name='心牢室内顶棚与封闭回廊';scene.add(root);
 const bounds={min:[-7.25,-.06,-3.30],max:[12.45,6.38,14.15]};
 const art=materials||createPrisonArtMaterials(),plaster=art.plaster,wood=art.beam,beam=art.beam,thresholdMaterial=art.stone;
 const ceilingMeshes=[],wallMeshes=[],beamMeshes=[],thresholdMeshes=[];
 function box(name,w,h,d,position,material,list){const o=new T.Mesh(new T.BoxGeometry(w,h,d),material);o.name=name;o.position.fromArray(position);o.castShadow=o.receiveShadow=true;o.userData.prisonInterior=true;o.userData.preserveOpaque=true;root.add(o);list.push(o);return o;}
 // The slab and sparse rafters supply real surfaces for upward camera rays.
 // It is high enough for the full-body observation views, not a hidden roof
 // or a transparent cap that permits outdoor trees to show through.
 box('封闭室内木顶棚',20.30,.24,17.90,[2.60,6.50,5.425],wood,ceilingMeshes);
 for(const z of [-1.8,1.7,5.2,8.7,12.2])box('顶棚承托木梁',19.85,.18,.20,[2.60,6.25,z],beam,beamMeshes);
 for(const x of [-4.8,.7,6.2,11.7])box('顶棚纵向细椽',.095,.12,17.55,[x,6.29,5.425],beam,beamMeshes);
 box('室内左侧通高墙',.30,6.44,17.9,[-7.4,3.16,5.425],plaster,wallMeshes);
 box('室内右侧回廊通高墙',.30,6.44,17.9,[12.6,3.16,5.425],plaster,wallMeshes);
 box('室内镜后通高墙',20.3,6.44,.30,[2.60,3.16,14.3],plaster,wallMeshes);
 // Four masonry pieces retain the original 2.4 × 1.7 m window aperture.
 // A full solid rear board would silently break the moon parallax puzzle.
 box('高窗左侧通高墙',3.25,6.44,.30,[-5.825,3.16,-3.45],plaster,wallMeshes);
 box('高窗右侧通高墙',14.55,6.44,.30,[5.475,3.16,-3.45],plaster,wallMeshes);
 box('高窗下实墙',2.4,2.31,.30,[-3,1.095,-3.45],plaster,wallMeshes);
 box('高窗上封顶墙',2.4,2.43,.30,[-3,5.165,-3.45],plaster,wallMeshes);
 const crown=box('随廊墙退让的室内墙顶',.28,2.08,5,[movingWall.position.x,5.34,-.4],plaster,wallMeshes),wallX=movingWall.position.x;
 // A genuine doorway at the end of the inner return passage gives the final
 // walk an architectural destination before the poem; it has no input target.
 for(const z of [1.05,4.30])box('回廊尽头木门柱',.19,3.64,.19,[7.60,1.78,z],beam,thresholdMeshes);
 box('回廊尽头木门楣',.23,.22,3.46,[7.60,3.70,2.675],wood,thresholdMeshes);
 box('廊内最后的石门槛',.30,.055,3.46,[7.60,-.02,2.675],thresholdMaterial,thresholdMeshes);
 const hiddenExterior=[];scene.traverse(o=>{if(o.isGroup&&Array.isArray(o.userData.placements)){o.visible=false;hiddenExterior.push(o);}});
 const thresholdLight=new T.PointLight(0xb5c8da,.90,5.0,1.4);thresholdLight.position.set(8.45,2.25,2.7);thresholdLight.castShadow=false;root.add(thresholdLight);
 function update(){crown.position.x=wallX+(movingWall.position.x-wallX);for(const o of hiddenExterior)o.visible=false;}
 const api={root,bounds,ceilingMeshes,wallMeshes,beamMeshes,thresholdMeshes,hiddenExterior,update};
 Object.defineProperty(api,'stats',{get:()=>({bounds:{min:[...bounds.min],max:[...bounds.max]},ceilingUnderside:6.38,ceilingMeshes:ceilingMeshes.length,wallMeshes:wallMeshes.length,beamMeshes:beamMeshes.length,opaque:[...ceilingMeshes,...wallMeshes,...beamMeshes,...thresholdMeshes].every(o=>o.material.opacity===1&&!o.material.transparent&&o.material.depthWrite),windowAperture:{min:[-4.2,2.25,-3.60],max:[-1.8,3.95,-3.30]},finalThreshold:[7.6,.02,2.675],externalPlantsHidden:hiddenExterior.length,visibleExternalPlants:hiddenExterior.filter(o=>o.visible).length,movingWallCrownX:crown.position.x,ceilingTransparency:0,groundMistPuddles:0,indoorRoute:true})});
 update();return api;
}
