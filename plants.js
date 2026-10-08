import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// Local CC0 botanical meshes. Sources and the canopy rendering treatment are recorded in assets/plants/LICENSE.txt.
const loader=new GLTFLoader(),cache=new Map();
const canopyMaps=new WeakMap();
function canopyMap(original,cutoff){
 if(canopyMaps.has(original))return canopyMaps.get(original);
 const image=original.image,base=document.createElement('canvas');base.width=image.width;base.height=image.height;
 const context=base.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);const pixels=context.getImageData(0,0,base.width,base.height).data;
 const edge=cutoff*255;let covered=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>=edge)covered++;
 const coverage=covered/(base.width*base.height),mips=[base],profile=[coverage];
 for(let level=1,w=Math.max(1,base.width>>1),h=Math.max(1,base.height>>1);;level++,w=Math.max(1,w>>1),h=Math.max(1,h>>1)){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const cx=canvas.getContext('2d',{willReadFrequently:true});cx.imageSmoothingQuality='high';cx.drawImage(base,0,0,w,h);
  const bitmap=cx.getImageData(0,0,w,h),data=bitmap.data,hist=new Uint32Array(256);for(let i=3;i<data.length;i+=4)hist[data[i]]++;
  // Leaf cutouts must keep their area when filtered. Ordinary mipmaps erase the tiny outer leaves.
  const desired=Math.min(.62,coverage*(1+Math.min(level,5)*.055)),target=desired*w*h;
  let count=0,quantile=255;for(;quantile>0;quantile--){count+=hist[quantile];if(count>=target)break;}
  const scale=Math.min(8,(edge+1)/Math.max(quantile,1));let actual=0;
  for(let i=3;i<data.length;i+=4){data[i]=Math.min(255,Math.round(data[i]*scale));if(data[i]>=edge)actual++;}
  cx.putImageData(bitmap,0,0);mips.push(canvas);profile.push(actual/(w*h));if(w===1&&h===1)break;
 }
 const texture=original.clone();texture.image=base;texture.mipmaps=mips;texture.generateMipmaps=false;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=8;texture.userData.canopyCoverage=profile;texture.needsUpdate=true;
 canopyMaps.set(original,texture);return texture;
}
function plantTint(material,tint){
 if(!tint)return material;
 const copy=material.clone();copy.color.multiply(new T.Color(tint));copy.onBeforeCompile=material.onBeforeCompile;copy.customProgramCacheKey=material.customProgramCacheKey;copy.userData.wind=material.userData.wind;return copy;
}
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function load(name){
 if(!cache.has(name))cache.set(name,loader.loadAsync(new URL(`./assets/plants/${name}.glb`,import.meta.url).href).then(g=>{
  g.scene.updateMatrixWorld(true);
  g.scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
   const mats=Array.isArray(o.material)?o.material:[o.material];
   for(const m of mats){const canopy=name==='broadleaf_a'&&/leaf|leave/i.test(m.name);m.roughness=.86;m.metalness=0;m.side=T.DoubleSide;m.transparent=false;m.depthWrite=true;
    if(m.alphaTest>0||/leaf|leave|twig|bamboo/i.test(m.name))m.alphaTest=canopy?.29:.38;
    m.color.multiplyScalar(name==='bamboo'?.71:.82);
    if(m.map)m.map.anisotropy=4;
    if(m.normalScale)m.normalScale.multiplyScalar(.7);
    if(canopy){
     if(m.map)m.map=canopyMap(m.map,m.alphaTest);
     // Bark keeps its real surface detail. Leaves read as shaded branch masses, without glittering vein normals.
     m.normalMap=null;m.roughnessMap=null;m.metalnessMap=null;m.roughness=1;m.envMapIntensity=0;m.alphaToCoverage=true;
     m.color.set(0xbac2b6);
    }
    const wind={value:0};m.userData.wind=wind;
    m.onBeforeCompile=shader=>{shader.uniforms.plantTime=wind;shader.vertexShader='uniform float plantTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float swayWeight = pow(clamp(position.y / 8.0, 0.0, 1.0), 2.0);
      transformed.x += sin(plantTime * 0.63 + position.y * 0.47) * 0.09 * swayWeight;
      transformed.z += sin(plantTime * 0.44 + position.y * 0.61) * 0.035 * swayWeight;`);
     if(canopy)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float leafValue=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
      diffuseColor.rgb=vec3(0.126,0.143,0.131)+(leafValue-0.14)*0.22;`);
    };
    m.customProgramCacheKey=()=>canopy?'cc0-soft-canopy-coverage-3':'cc0-botanical-wind-1';
   }
  });return g.scene;
 }));return cache.get(name);
}
function keepTime(mesh){mesh.onBeforeRender=()=>{for(const m of(Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(m.userData.wind)m.userData.wind.value=performance.now()*.001;};}
function range(value,r,defaultValue){if(Array.isArray(value))return value[0]+r()*(value[1]-value[0]);return value??defaultValue;}
function bounds(o){const b=o.bounds??{};return{minX:b.minX??-15,maxX:b.maxX??15,minZ:b.minZ??-26,maxZ:b.maxZ??-5};}
function placements(options){
 const initialSeed=options.seed??(options.position?Math.round((options.position[0]*127.1+options.position[2]*311.7)*1000):1);
 const r=random(initialSeed),b=bounds(options),count=options.count??1,items=[];
 for(let i=0;i<count;i++){const p=options.position??[b.minX+r()*(b.maxX-b.minX),options.y??0,b.minZ+r()*(b.maxZ-b.minZ)];
  const h=range(options.height,r,8),yaw=options.rotation??r()*Math.PI*2;
  items.push({position:p,height:h,rotation:yaw,variant:Math.floor(r()*3),width:options.width??(.92+r()*.16)});
 }return items;
}

/** Returns immediately. group.userData.ready resolves when the local GLB has populated the group. */
export function addBamboo(parent,options={}){
 const group=new T.Group();group.name='Natural bamboo';parent.add(group);const p=placements({...options,count:options.count??40});group.userData.placements=p;
 group.userData.ready=load('bamboo').then(source=>{
  const dummy=new T.Object3D(),matrix=new T.Matrix4();
  source.traverse(o=>{if(!o.isMesh)return;const m=new T.InstancedMesh(o.geometry,o.material,p.length);m.castShadow=true;m.receiveShadow=true;
   p.forEach((v,i)=>{dummy.position.fromArray(v.position);dummy.rotation.set(0,v.rotation,0);dummy.scale.set(v.height/8*v.width,v.height/8,v.height/8*v.width);dummy.updateMatrix();matrix.multiplyMatrices(dummy.matrix,o.matrixWorld);m.setMatrixAt(i,matrix);});
   m.instanceMatrix.needsUpdate=true;m.computeBoundingBox();m.computeBoundingSphere();keepTime(m);group.add(m);
  });group.userData.loaded=true;return group;
 }).catch(error=>{group.userData.error=error.message;console.error('Bamboo asset',error);return group;});return group;
}

/** Single tree: position, height, rotation. Or a scattered group: count, bounds, seed, height:[min,max]. */
export function addTree(parent,options={}){
 const group=new T.Group();group.name='Natural pine';parent.add(group);const p=placements(options);group.userData.placements=p;
 group.userData.ready=Promise.all(['pine_a','pine_b','pine_c'].map(load)).then(sources=>{
  const dummy=new T.Object3D(),matrix=new T.Matrix4();
  for(let v=0;v<3;v++){const list=p.filter(x=>x.variant===v);if(!list.length)continue;
   sources[v].traverse(o=>{if(!o.isMesh)return;const mat=plantTint(o.material,options.tint);
    const mesh=new T.InstancedMesh(o.geometry,mat,list.length);mesh.castShadow=true;mesh.receiveShadow=true;
    list.forEach((item,i)=>{dummy.position.fromArray(item.position);dummy.rotation.set(0,item.rotation,0);dummy.scale.setScalar(item.height/8);dummy.updateMatrix();matrix.multiplyMatrices(dummy.matrix,o.matrixWorld);mesh.setMatrixAt(i,matrix);});
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();keepTime(mesh);group.add(mesh);
   });
  }group.userData.loaded=true;return group;
 }).catch(error=>{group.userData.error=error.message;console.error('Pine asset',error);return group;});return group;
}

export const preloadPlants=()=>Promise.all(['bamboo','pine_a','pine_b','pine_c'].map(load));

/** A natural broadleaf orchard tree, normalized to 8 m. CC0 tree_small_02 is a poetic silhouette stand-in for lychee. */
export function addBroadleaf(parent,options={}){
 const group=new T.Group();group.name='Natural broadleaf orchard';parent.add(group);const p=placements({...options,height:options.height??5.4});group.userData.placements=p;
 group.userData.ready=load('broadleaf_a').then(source=>{
  const dummy=new T.Object3D(),matrix=new T.Matrix4();
  source.traverse(o=>{if(!o.isMesh)return;const mat=plantTint(o.material,options.tint);
   const mesh=new T.InstancedMesh(o.geometry,mat,p.length);mesh.castShadow=true;mesh.receiveShadow=true;
   p.forEach((v,i)=>{dummy.position.fromArray(v.position);dummy.rotation.set(0,v.rotation,0);dummy.scale.set(v.height/8*(options.width??v.width),v.height/8,v.height/8*(options.width??v.width));dummy.updateMatrix();matrix.multiplyMatrices(dummy.matrix,o.matrixWorld);mesh.setMatrixAt(i,matrix);});
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();keepTime(mesh);group.add(mesh);
  });group.userData.loaded=true;return group;
 }).catch(error=>{group.userData.error=error.message;console.error('Broadleaf asset',error);return group;});return group;
}

export const preloadBroadleaf=()=>load('broadleaf_a');
