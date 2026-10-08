import * as T from './vendor/three.module.js';

// Normalised, separable Gaussian kernel. The scene is blurred at half resolution,
// then blended only into the caption side; the actor and centre stay sharp.
export const POEM_GAUSSIAN=[.227027027,.194594595,.121621622,.054054054,.016216216];
export function poemBackdropMask(x,side='right',width=.32){
 const distance=side==='left'?x:1-x,u=T.MathUtils.clamp((distance-.025)/(width-.025),0,1);
 return 1-u*u*(3-2*u);
}
export function createFilm(renderer){
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2}),blurX=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false}),blurY=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
 const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const blurUniforms={image:{value:target.texture},direction:{value:new T.Vector2()}};
 const blurMat=new T.ShaderMaterial({uniforms:blurUniforms,depthTest:false,depthWrite:false,toneMapped:false,vertexShader,fragmentShader:`uniform sampler2D image;uniform vec2 direction;varying vec2 vUv;void main(){vec3 col=texture2D(image,vUv).rgb*.227027027;col+=(texture2D(image,vUv+direction).rgb+texture2D(image,vUv-direction).rgb)*.194594595;col+=(texture2D(image,vUv+direction*2.).rgb+texture2D(image,vUv-direction*2.).rgb)*.121621622;col+=(texture2D(image,vUv+direction*3.).rgb+texture2D(image,vUv-direction*3.).rgb)*.054054054;col+=(texture2D(image,vUv+direction*4.).rgb+texture2D(image,vUv-direction*4.).rgb)*.016216216;gl_FragColor=vec4(col,1.);}`});
 const uniforms={image:{value:target.texture},blurred:{value:blurY.texture},resolution:{value:new T.Vector2()},time:{value:0},spring:{value:0},saturation:{value:.17},shadowFloor:{value:0},contrast:{value:1.09},vignette:{value:.17},poemSide:{value:1},poemStrength:{value:0},poemWidth:{value:.32},poemPaper:{value:0},poemTint:{value:new T.Color(0x5b1713)},poemTintStrength:{value:0},inkOrigin:{value:new T.Vector2(.5,.5)},inkRadius:{value:0},inkStrength:{value:0}};
 const mat=new T.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:true,vertexShader,fragmentShader:`
 uniform sampler2D image,blurred;uniform vec2 resolution,inkOrigin;uniform vec3 poemTint;uniform float time,spring,saturation,shadowFloor,contrast,vignette,poemSide,poemStrength,poemWidth,poemPaper,poemTintStrength,inkRadius,inkStrength;varying vec2 vUv;
 float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){float aspect=resolution.x/max(resolution.y,1.);vec2 delta=(vUv-inkOrigin)*vec2(aspect,1.);float distance=length(delta),front=distance-inkRadius;float envelope=exp(-front*front/0.00075);vec2 flow=delta/max(distance,.001);vec2 ripple=flow/vec2(aspect,1.)*sin(front*160.)*envelope*inkStrength;vec2 sampleUv=clamp(vUv+ripple,vec2(.001),vec2(.999));vec3 col=texture2D(image,sampleUv).rgb,soft=texture2D(blurred,sampleUv).rgb;float light=dot(soft,vec3(.2126,.7152,.0722));col+=soft*smoothstep(.72,1.6,light)*.12;
  float sideDistance=mix(vUv.x,1.-vUv.x,poemSide),mask=(1.-smoothstep(.025,poemWidth,sideDistance))*poemStrength;
  col=mix(col,soft,mask*.9);
  vec3 quietDark=soft*.70,quietPaper=mix(soft,vec3(.86,.865,.79),.27);col=mix(col,mix(quietDark,quietPaper,poemPaper),mask*.72);
  col=mix(col,mix(soft*.13,poemTint,.82),mask*.96*poemTintStrength);
  float gray=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(gray),col,saturation);col*=vec3(.975,1.,.997);col=pow(max(col,vec3(0.)),vec3(.97));col=vec3(shadowFloor)+col*(1.-shadowFloor);col=(col-.10)*contrast+.10;float vig=smoothstep(.18,.87,length((vUv-.5)*vec2(1.,.83)));col*=1.-vig*vignette;col+=(hash(gl_FragCoord.xy+fract(time)*100.)-.5)*.003;gl_FragColor=vec4(max(col,0.),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 const scene=new T.Scene(),blurScene=new T.Scene(),camera=new T.Camera();scene.add(new T.Mesh(new T.PlaneGeometry(2,2),mat));blurScene.add(new T.Mesh(new T.PlaneGeometry(2,2),blurMat));
 let backdrop=null;
 function resize(){const s=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(s.x,s.y);blurX.setSize(Math.ceil(s.x/2),Math.ceil(s.y/2));blurY.setSize(Math.ceil(s.x/2),Math.ceil(s.y/2));uniforms.resolution.value.copy(s);}
 function render(world,camera3d,time,spring,poemBackdrop=backdrop){
  uniforms.time.value=time;uniforms.spring.value=spring;uniforms.saturation.value=world.userData.saturation??(.17+spring*.11);
  const ink=world.userData.bridgeRipple;uniforms.inkStrength.value=ink?.strength||0;uniforms.inkRadius.value=ink?.radius||0;if(ink)uniforms.inkOrigin.value.fromArray(ink.origin);
  const profile=world.userData.filmProfile;uniforms.shadowFloor.value=profile?.shadowFloor??0;uniforms.contrast.value=profile?.contrast??1.09;uniforms.vignette.value=profile?.vignette??.17;
  uniforms.poemSide.value=poemBackdrop?.side==='left'?0:1;uniforms.poemStrength.value=T.MathUtils.clamp(poemBackdrop?.strength??0,0,1);uniforms.poemWidth.value=poemBackdrop?.width??.32;uniforms.poemPaper.value=poemBackdrop?.paper?1:0;uniforms.poemTintStrength.value=poemBackdrop?.tint==null?0:1;if(poemBackdrop?.tint!=null)uniforms.poemTint.value.set(poemBackdrop.tint);
  renderer.setRenderTarget(target);renderer.render(world,camera3d);
  blurUniforms.image.value=target.texture;blurUniforms.direction.value.set(2.4/blurX.width,0);renderer.setRenderTarget(blurX);renderer.render(blurScene,camera);
  blurUniforms.image.value=blurX.texture;blurUniforms.direction.value.set(0,2.4/blurY.height);renderer.setRenderTarget(blurY);renderer.render(blurScene,camera);
  renderer.setRenderTarget(null);renderer.render(scene,camera);
 }
 resize();return {render,resize,setPoemBackdrop(value){backdrop=value;}};
}

