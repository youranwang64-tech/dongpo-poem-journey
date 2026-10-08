import * as T from './vendor/three.module.js';

/** Original alpha artwork: asymmetric bamboo and cypress moon shadows.
 * The single non-tiled projection preserves the paving between branches. */
export function createChengtianMoonShadows(root){
 const material=new T.MeshBasicMaterial({color:0x152332,transparent:true,opacity:.14,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});
 const mesh=new T.Mesh(new T.PlaneGeometry(10.8,7.2).rotateX(-Math.PI/2),material);
 mesh.position.set(1.4,.012,6.15);mesh.rotation.y=-.12;mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.name='竹柏交横月影 · 原创疏影投影';mesh.raycast=()=>{};root.add(mesh);
 const stats={asset:'assets/textures/chengtian-bamboo-cypress-shadow-v1.png',loaded:false,repeating:false,alphaPreserved:true};
 // Await the real artwork before entering, just as we await plant models.
 const ready=new T.TextureLoader().loadAsync(new URL('./assets/textures/chengtian-bamboo-cypress-shadow-v1.png',import.meta.url).href).then(map=>{
  map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.ClampToEdgeWrapping;map.anisotropy=4;
  material.map=map;material.needsUpdate=true;stats.loaded=true;stats.width=map.image.width;stats.height=map.image.height;
 });
 function update(t,clarity=0){
  material.opacity=.14+T.MathUtils.clamp(clarity,0,1)*.38;
  // Slow sub-leaf motion, anchored to the trees; never tiled scrolling.
  mesh.rotation.y=-.12+Math.sin(t*.17)*.006;
  mesh.position.x=1.4+Math.sin(t*.13)*.025;
 }
 function reset(){update(0,0);}
 return {mesh,ready,stats,update,reset};
}
