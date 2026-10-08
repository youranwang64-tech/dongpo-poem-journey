import * as T from './vendor/three.module.js';
import {loadTextureWithRetry,assetWarning} from './reliable-assets.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),textureCache=new Map();
const RIVER=new URL('./assets/textures/dongpo-river-village-panorama-v1.png',import.meta.url).href;
const CITY=new URL('./assets/textures/dongpo-city-rooftops-panorama-v1.png',import.meta.url).href;
const supported=new Set([0,1,3,4,5,7]);
const cityChapters=new Set([0,1,7]);
const vertexShader=`
varying vec2 panoramaSurface;
varying vec3 panoramaWorld;
varying float panoramaDepth;
void main(){
 panoramaSurface=uv;
 vec4 world=modelMatrix*vec4(position,1.);
 panoramaWorld=world.xyz;
 vec4 view=viewMatrix*world;
 panoramaDepth=max(0.,-view.z);
 gl_Position=projectionMatrix*view;
}`;
const fragmentShader=`
uniform sampler2D panoramaMap;
uniform vec4 panoramaUv;
uniform vec3 panoramaFogColor;
uniform float panoramaOpacity,panoramaFogDensity,panoramaFogScale,panoramaFloor;
varying vec2 panoramaSurface;
varying vec3 panoramaWorld;
varying float panoramaDepth;
void main(){
 vec2 p=panoramaSurface;
 // All four painted borders disappear into the same mist as the real space.
 float edge=smoothstep(0.,.085,p.x)*smoothstep(0.,.085,1.-p.x);
 edge*=smoothstep(0.,.115,p.y)*smoothstep(0.,.13,1.-p.y);
 edge*=smoothstep(panoramaFloor-2.,panoramaFloor+1.,panoramaWorld.y);
 float alpha=panoramaOpacity*edge;
 if(alpha<.001)discard;
 vec3 source=texture2D(panoramaMap,panoramaUv.xy+p*panoramaUv.zw).rgb;
 float value=dot(source,vec3(.2126,.7152,.0722));
 float ink=clamp((.78-value)/.68,0.,1.);
 // Retain the actual fine brushwork without inserting a white paper rectangle
 // into a grey-green scene. The paper itself borrows the local mist colour.
 vec3 painted=mix(panoramaFogColor*1.16,panoramaFogColor*.25,ink);
 painted*=mix(vec3(1.),source/max(value,.04),.055);
 float mist=1.-exp(-panoramaFogDensity*panoramaFogDensity*panoramaDepth*panoramaDepth*panoramaFogScale);
 painted=mix(painted,panoramaFogColor,min(.80,mist));
 gl_FragColor=vec4(painted,alpha);
 #include <colorspace_fragment>
}`;

function loadPanorama(url){
 if(textureCache.has(url))return textureCache.get(url);
 const promise=loadTextureWithRetry(T,url).then(texture=>{texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=4;texture.needsUpdate=true;return texture;});
 textureCache.set(url,promise);promise.catch(()=>{if(textureCache.get(url)===promise)textureCache.delete(url);});return promise;
}

function curvedPanel(radius,height,span,bottom){
 const columns=112,rows=10,positions=[],uv=[],indices=[];
 for(let x=0;x<=columns;x++)for(let y=0;y<=rows;y++){
  const u=x/columns,v=y/rows,angle=(u-.5)*span;
  positions.push(Math.sin(angle)*radius,bottom+v*height,-Math.cos(angle)*radius);uv.push(u,v);
 }
 for(let x=0;x<columns;x++)for(let y=0;y<rows;y++){
  const a=x*(rows+1)+y,b=a+rows+1;indices.push(a,a+1,b,a+1,b+1,b);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.panorama={radius,height,span,bottom,columns,rows,fixedWorld:true};return geometry;
}

function fogState(stage){
 const fog=stage.scene.fog,color=fog?.color||stage.scene.background?.isColor&&stage.scene.background||new T.Color(0x6d7a70);
 // A linear scene fog is sampled at the panorama's distance using an equivalent
 // density, so both architectural chapters and the original ink stages agree.
 const density=fog?.isFogExp2?fog.density:fog?.isFog?1.25/Math.max(30,fog.far-fog.near):.02;
 return {color,density};
}

/** Fixed curved matte paintings outside the playable world; never billboards. */
export function decoratePanoramaBackdrop(stage,index){
 if(!stage?.scene)throw new TypeError('远景画卷需要篇章场景。');
 if(stage.panoramaBackdropDecorated)return stage;
 stage.panoramaBackdropDecorated=true;
 if(!supported.has(index)){
  stage.backdropStats={enabled:false,index,reason:'chapter-keeps-its-own-space',meshes:0,drawCalls:0,loaded:false,fixedWorld:true};
  stage.updateBackdrop=()=>{};return stage;
 }
 const city=cityChapters.has(index),b=stage.bounds||{minX:-10,maxX:10,minZ:-8,maxZ:8},spawn=stage.spawn||[0,0,0],floor=spawn[1]||0;
 const centre=V((b.minX+b.maxX)/2,0,(b.minZ+b.maxZ)/2),span=T.MathUtils.degToRad(248),halfRoute=Math.hypot((b.maxX-b.minX)/2,(b.maxZ-b.minZ)/2),radius=Math.max(58,halfRoute+45),url=city?CITY:RIVER;
 const group=new T.Group();group.name=`篇章${index+1}_连续${city?'宋城瓦屋':'江岸村落'}画境`;group.position.copy(centre);group.userData.panoramaBackdrop=true;group.visible=false;stage.scene.add(group);
 const fog=fogState(stage),layers=[],nearHeight=city?23.5:22;
 const specs=[
  {id:'far',radius:radius+25,height:30,bottom:floor+2.4,uv:city?[.045,.40,.91,.52]:[.015,.48,.965,.47],opacity:city?.42:.36,fogScale:.18},
  {id:'near',radius,height:nearHeight,bottom:floor-4.2,uv:city?[.035,0,.93,.66]:[index===3?.04:.015,0,index===3?.94:.97,.66],opacity:index===4?.77:index===5?.79:.93,fogScale:.095}
 ];
 for(const spec of specs){
  const uniforms={panoramaMap:{value:null},panoramaUv:{value:new T.Vector4(...spec.uv)},panoramaFogColor:{value:fog.color.clone()},panoramaOpacity:{value:spec.opacity},panoramaFogDensity:{value:fog.density},panoramaFogScale:{value:spec.fogScale},panoramaFloor:{value:floor}};
  const material=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:false,fog:false});
  const mesh=new T.Mesh(curvedPanel(spec.radius,spec.height,span,spec.bottom),material);mesh.name=`${city?'宋城':'水乡'}远景_${spec.id==='near'?'檐后连续近层':'山雾远层'}`;mesh.renderOrder=spec.id==='far'?-12:-11;mesh.castShadow=false;mesh.receiveShadow=false;mesh.userData.panoramaBackdrop=true;mesh.userData.fixedWorld=true;group.add(mesh);layers.push({mesh,uniforms,spec});
 }
 let loaded=false,error=null,texture=null;
 const previousReady=stage.ready;
 // A distant matte painting is decoration, not a prerequisite for walking.
 // Let the playable architecture open while slow mobile transfers finish.
 stage.ready=Promise.resolve(previousReady);
 stage.backdropReady=loadPanorama(url).then(map=>{texture=map;for(const layer of layers)layer.uniforms.panoramaMap.value=map;loaded=true;group.visible=true;return stage;}).catch(reason=>{error=reason.message;group.visible=false;assetWarning('远景画卷暂时未载入',reason);return stage;});
 stage.panoramaBackdrop={group,layers,get texture(){return texture;}};
 stage.updateBackdrop=()=>{const state=fogState(stage);for(const layer of layers){layer.uniforms.panoramaFogColor.value.copy(state.color);layer.uniforms.panoramaFogDensity.value=state.density;}};
 Object.defineProperty(stage,'backdropStats',{configurable:true,get(){return {enabled:true,index,kind:city?'city-rooftops':'river-village',loaded,error,texture:url.split('/').at(-1),width:texture?.image?.width||0,height:texture?.image?.height||0,meshes:layers.length,drawCalls:layers.length,triangles:layers.reduce((sum,layer)=>sum+layer.mesh.geometry.index.count/3,0),fixedWorld:true,billboard:false,centre:centre.toArray(),spanDegrees:248,nearRadius:radius,minRouteClearance:radius-halfRoute,uvCrop:specs[1].uv.slice(),bottom:specs[1].bottom,top:specs[1].bottom+nearHeight,fogDensity:layers[0].uniforms.panoramaFogDensity.value,textureUploadsPerFrame:0};}});
 return stage;
}
