import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export const LYCHEE_FINALE=Object.freeze({pushSeconds:1.4,redSeconds:.9,pullbackSeconds:2.4,fullRedSeconds:.8,oceanHoldSeconds:.8,growthSeconds:6.0,growthScale:3.00,oceanDistance:.66,boomAt:10.1,burstSeconds:3,poemDelay:.35,duration:null,minDuration:13.1,paintFov:42,roll:.018});

function includeSphere(box,point,radius){box.expandByPoint(point.clone().addScalar(radius));box.expandByPoint(point.clone().addScalar(-radius));}
function includePlayer(box,player){for(const x of [-.65,.65])for(const y of [-.2,2.3])for(const z of [-.45,.45])box.expandByPoint(player.clone().add(V(x,y,z)));}
function fit(box,centre,direction,aspect,fov,minDistance=0,roll=0){
 const d=direction.clone().normalize(),right=V(0,1,0).cross(d).normalize(),up=d.clone().cross(right).normalize(),tan=Math.tan(fov*Math.PI/360);let distance=minDistance;
 // Rotated right/up axes include the small authored roll in the fit as well.
 right.applyAxisAngle(d,roll);up.applyAxisAngle(d,roll);
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const offset=V(x,y,z).sub(centre),depth=offset.dot(d);
  distance=Math.max(distance,depth+Math.abs(offset.dot(right))/(tan*aspect),depth+Math.abs(offset.dot(up))/tan);
 }
 const camera=new T.PerspectiveCamera(fov,aspect,.1,900);camera.position.copy(centre).addScaledVector(d,distance*1.045+.45);camera.lookAt(centre);if(roll)camera.rotateZ(roll);camera.updateMatrixWorld();
 return {position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov,aspect,lookAt:centre.toArray(),roll,box:{min:box.min.toArray(),max:box.max.toArray()}};
}
export function lycheePaintPose({aspect,hero,heroRadius,player}){
 const look=hero.clone().add(V((player.x-hero.x)*.13,-1.45,.6)),base=hero.clone().add(V(4.4,.75,8.1)),direction=base.clone().sub(look),box=new T.Box3();
 includeSphere(box,hero,heroRadius);includePlayer(box,player);box.expandByScalar(.10);
 return fit(box,look,direction,aspect,LYCHEE_FINALE.paintFov,direction.length(),LYCHEE_FINALE.roll);
}
export function lycheeOverviewPose({aspect,fov=42,fruits,hero,heroRadius,player,maxGrowthScale=LYCHEE_FINALE.growthScale}){
 const view=fruits[0]?.finaleCameraView;
 if(view){
  const actor=V(...view.actor),direction=V(...view.direction),right=V(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right).normalize(),tan=Math.tan(fov*Math.PI/360),sources=fruits.map(f=>({point:V(...f.finalePosition),radius:(f.finaleBaseRadius??f.radius)*maxGrowthScale}));sources.push({point:hero.clone(),radius:heroRadius*maxGrowthScale});
  let distance=view.distance;const box=new T.Box3();
  for(const source of sources)includeSphere(box,source.point,source.radius);
  // Close fruit intentionally pass beyond the frame. Fitting every outer fruit
  // on a narrow screen shrank the entire sea into a distant rectangular patch.
  // Keep the actor and painted hero readable; let the surrounding sea crop.
  const heroDelta=hero.clone().sub(actor),heroDepth=heroDelta.dot(direction),heroX=Math.abs(heroDelta.dot(right)),grownHeroRadius=heroRadius*maxGrowthScale;
  distance=Math.max(distance,heroDepth+(heroX+grownHeroRadius*Math.sqrt(1+tan*tan*aspect*aspect))/(tan*aspect*.985));
  includePlayer(box,player);for(const x of [-.65,.65])for(const y of [-.2,2.3])for(const z of [-.45,.45]){const delta=player.clone().add(V(x,y,z)).sub(actor),depth=delta.dot(direction),a=Math.abs(delta.dot(right)),b=delta.dot(up);distance=Math.max(distance,depth+a/(tan*aspect*.985),(b+tan*.985*depth)/(tan*(.985-view.actorY)),(tan*.985*depth-b)/(tan*(.985+view.actorY)));}
  const position=actor.clone().addScaledVector(direction,distance).addScaledVector(up,-view.actorY*distance*tan),look=position.clone().addScaledVector(direction,-distance),camera=new T.PerspectiveCamera(fov,aspect,.1,900);camera.position.copy(position);camera.lookAt(look);camera.updateMatrixWorld();
  return {position,quaternion:camera.quaternion.clone(),fov,aspect,lookAt:look.toArray(),roll:0,box:{min:box.min.toArray(),max:box.max.toArray()},fit:'lychee-ocean',maxGrowthScale,direction:direction.toArray(),distanceRatio:distance/view.distance,layout:'clustered-perspective-sea',actorBand:[-.98,-.75]};
 }
 const box=new T.Box3(),sources=fruits.map(f=>({point:f.finalePosition?V(...f.finalePosition):V(f.landX??f.x,f.landY??f.y,f.landZ??f.z),radius:(f.finaleBaseRadius??f.radius)*maxGrowthScale}));sources.push({point:hero.clone(),radius:heroRadius*maxGrowthScale});
 for(const source of sources)includeSphere(box,source.point,source.radius);includePlayer(box,player);box.expandByScalar(.65);
 const centre=box.getCenter(V()),direction=V(.85,.65,-1).normalize(),right=V(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right).normalize(),tan=Math.tan(fov*Math.PI/360)*.94,tanX=tan*aspect;let distance=0;
 // Fit the actual spheres, rather than empty corners of a long bounding box.
 // The radius term is the exact support of the sphere against each frustum plane.
 for(const source of sources){const offset=source.point.clone().sub(centre),depth=offset.dot(direction);distance=Math.max(distance,depth+(Math.abs(offset.dot(right))+source.radius*Math.sqrt(1+tanX*tanX))/tanX,depth+(Math.abs(offset.dot(up))+source.radius*Math.sqrt(1+tan*tan))/tan);}
 for(const x of [-.65,.65])for(const y of [-.2,2.3])for(const z of [-.45,.45]){const offset=player.clone().add(V(x,y,z)).sub(centre),depth=offset.dot(direction);distance=Math.max(distance,depth+Math.abs(offset.dot(right))/tanX,depth+Math.abs(offset.dot(up))/tan);}
 const camera=new T.PerspectiveCamera(fov,aspect,.1,900);camera.position.copy(centre).addScaledVector(direction,(distance+.25)*LYCHEE_FINALE.oceanDistance);camera.lookAt(centre);camera.updateMatrixWorld();
 // Bring the sea close, then centre its actual projected envelope. The camera
 // moves in its image plane; every historical fruit keeps its real world centre.
 const projected=measureLycheeOcean(camera,sources.map(s=>({position:s.point.toArray(),radius:s.radius})),{columns:1,rows:1}),depths=sources.map(s=>-s.point.clone().applyMatrix4(camera.matrixWorldInverse).z).sort((a,b)=>a-b),medianDepth=depths[Math.floor(depths.length*.5)],actualTan=Math.tan(fov*Math.PI/360);
 const pan=right.clone().multiplyScalar((projected.footprint[0]+projected.footprint[2])*.5*medianDepth*actualTan*aspect).addScaledVector(up,(projected.footprint[1]+projected.footprint[3])*.5*medianDepth*actualTan);centre.add(pan);camera.position.add(pan);camera.updateMatrixWorld();
 // Fruit edges may cross the frame slightly. Their centres and the complete
 // standing actor remain readable, including narrow or resized viewports.
 let minimumDistance=0;const includeCentre=point=>{const offset=point.clone().sub(centre),depth=offset.dot(direction);minimumDistance=Math.max(minimumDistance,depth+Math.abs(offset.dot(right))/(actualTan*aspect*.975),depth+Math.abs(offset.dot(up))/(actualTan*.975));};
 for(const source of sources)includeCentre(source.point);for(const x of [-.65,.65])for(const y of [-.2,2.3])for(const z of [-.45,.45])includeCentre(player.clone().add(V(x,y,z)));
 const currentDistance=camera.position.clone().sub(centre).dot(direction);if(minimumDistance+.08>currentDistance)camera.position.copy(centre).addScaledVector(direction,minimumDistance+.08);camera.updateMatrixWorld();
 return {position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov,aspect,lookAt:centre.toArray(),roll:0,box:{min:box.min.toArray(),max:box.max.toArray()},fit:'lychee-ocean',maxGrowthScale,direction:direction.toArray(),distanceRatio:camera.position.clone().sub(centre).length()/(distance+.25)};
}

/** Coarse projected silhouettes measure readable gaps; this is not a GPU pixel count. */
export function measureLycheeOcean(camera,sources,{columns=96,rows=54}={}){
 const coverage=new Float32Array(columns*rows),right=V(1,0,0).applyQuaternion(camera.quaternion),up=V(0,1,0).applyQuaternion(camera.quaternion);let visible=0,centres=0,partialEdges=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,areaSum=0;const diameters=[];
 for(const source of sources){const c=Array.isArray(source.position)?V(...source.position):source.point.clone(),p=c.clone().project(camera),radius=source.radius,rx=Math.abs(c.clone().addScaledVector(right,radius).project(camera).x-p.x),ry=Math.abs(c.clone().addScaledVector(up,radius).project(camera).y-p.y);if(p.z<=-1||p.z>=1||p.x+rx<-1||p.x-rx>1||p.y+ry<-1||p.y-ry>1)continue;
  visible++;if(Math.abs(p.x)<1&&Math.abs(p.y)<1)centres++;if(Math.abs(p.x)+rx>1||Math.abs(p.y)+ry>1)partialEdges++;minX=Math.min(minX,p.x-rx);maxX=Math.max(maxX,p.x+rx);minY=Math.min(minY,p.y-ry);maxY=Math.max(maxY,p.y+ry);areaSum+=Math.PI*rx*ry/4;diameters.push(ry*720);
  if(columns===1&&rows===1)continue;const left=Math.max(0,Math.floor((p.x-rx+1)*columns/2)),rightCell=Math.min(columns-1,Math.ceil((p.x+rx+1)*columns/2)),low=Math.max(0,Math.floor((p.y-ry+1)*rows/2)),high=Math.min(rows-1,Math.ceil((p.y+ry+1)*rows/2));
  for(let y=low;y<=high;y++)for(let x=left;x<=rightCell;x++)if(((2*(x+.5)/columns-1-p.x)/rx)**2+((2*(y+.5)/rows-1-p.y)/ry)**2<=1){const i=y*columns+x;coverage[i]=1-(1-coverage[i])*(1-(source.visibility??1));}
 }
 if(!visible)return {visible:0,centres:0,partialEdges:0,projectedCoverage:0,inkCoverage:0,frameGaps:1,fieldGaps:1,footprint:[0,0,0,0],medianDiameterPixels720:0};
 const occupied=Array.from(coverage).filter(v=>v>.03).length/coverage.length,ink=coverage.reduce((a,b)=>a+b,0)/coverage.length,boxArea=Math.max(0,Math.min(1,maxX)-Math.max(-1,minX))*Math.max(0,Math.min(1,maxY)-Math.max(-1,minY))/4;diameters.sort((a,b)=>a-b);
 return {visible,centres,partialEdges,projectedCoverage:occupied,inkCoverage:ink,frameGaps:1-occupied,fieldGaps:boxArea?1-occupied/boxArea:1,footprint:[minX,minY,maxX,maxY],areaSum,medianDiameterPixels720:diameters[Math.floor(diameters.length*.5)],diameterPixels720:{p10:diameters[Math.floor(diameters.length*.1)],p90:diameters[Math.floor(diameters.length*.9)],largest:diameters.at(-1),over180:diameters.filter(d=>d>180).length},raster:[columns,rows]};
}
