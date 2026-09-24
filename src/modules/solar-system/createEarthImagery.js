import * as THREE from 'three';
import { geographicPoint, geographicCoordinates } from './earth-geography.js';
import { tileBounds, tileAt, tileLevel, tileKey, tileURL } from './earth-tiles.js';

const MAX_CACHE=48,MAX_VIEW=32,CONCURRENT=4;
export function createEarthImagery(earth,invalidate){
 const axes=earth.userData.body.axesKm,radius=Math.max(...axes),group=new THREE.Group();
 group.name='earth-imagery';earth.add(group);
 const cache=new Map(),pending=new Map(),failed=new Map();
 let desired=[],queue=[],active=false,disposed=false,timer,signature='',level=0,displayLevel=null,clock=0;
 let state={status:'idle',loaded:0,total:0,level:0};

 function geometry(tile){
  const {west,east,north,south,span}=tileBounds(tile.level,tile.x,tile.y);
  const nx=Math.max(2,Math.ceil((east-west)/.75)),ny=Math.max(2,Math.ceil((north-south)/.75));
  const positions=[],uv=[],indices=[];
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
   const lon=west+(east-west)*x/nx,lat=north-(north-south)*y/ny;
   positions.push(...geographicPoint([lon,lat],axes,.4).map(value=>value/radius));
   uv.push((lon-west)/span,1-(north-lat)/span);
   if(y<ny&&x<nx){const i=y*(nx+1)+x,j=i+nx+1;indices.push(i,j,i+1,i+1,j,j+1);}
  }
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));result.setIndex(indices);result.computeBoundingSphere();return result;
 }
 function disposeEntry(entry){group.remove(entry.mesh);entry.mesh.geometry.dispose();entry.mesh.material.dispose();entry.texture.dispose();entry.bitmap.close();}
 function evict(){
  const wanted=new Set(desired.map(tileKey));
  for(const [key,entry] of [...cache].sort((a,b)=>a[1].used-b[1].used)){
   if(cache.size<=MAX_CACHE)break;if(wanted.has(key))continue;disposeEntry(entry);cache.delete(key);
  }
 }
 function status(){
  const loaded=desired.filter(tile=>cache.has(tileKey(tile))).length;
  const errors=desired.filter(tile=>failed.has(tileKey(tile))).length;
  if(loaded===desired.length||displayLevel===null||loaded+errors===desired.length)displayLevel=level;
  for(const entry of cache.values())entry.mesh.visible=entry.level===displayLevel;
  state={status:!active?'off':!desired.length?'idle':loaded===desired.length?'ready':loaded+errors===desired.length?'fallback':'loading',loaded,total:desired.length,level};
  invalidate();
 }
 async function load(tile){
  const key=tileKey(tile),controller=new AbortController();pending.set(key,controller);
  const timeout=setTimeout(()=>controller.abort('timeout'),12000);
  let bitmap;
  try{
   const response=await fetch(tileURL(tile),{signal:controller.signal,mode:'cors',credentials:'omit',cache:'force-cache'});
   if(!response.ok)throw new Error(`NASA GIBS HTTP ${response.status}`);
   bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'none'});
   if(disposed||controller.signal.aborted){bitmap.close();return;}
   const texture=new THREE.Texture(bitmap);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.anisotropy=4;
   const mesh=new THREE.Mesh(geometry(tile),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
   group.add(mesh);cache.set(key,{mesh,texture,bitmap,level:tile.level,used:++clock});failed.delete(key);
  }catch(error){
   if(bitmap)bitmap.close();
   if(!disposed&&active&&(!controller.signal.aborted||controller.signal.reason==='timeout')&&desired.some(tile=>tileKey(tile)===key))failed.set(key,Date.now());
   if(!disposed&&active&&(error instanceof TypeError||controller.signal.reason==='timeout')){
    // A network outage should not wait through every queued tile's timeout.
    for(const queued of queue)failed.set(tileKey(queued),Date.now());queue=[];
   }
  }finally{
   clearTimeout(timeout);pending.delete(key);
   if(!disposed){if(active&&!cache.has(key)&&!failed.has(key)&&desired.some(tile=>tileKey(tile)===key)&&!queue.some(tile=>tileKey(tile)===key))queue.push(tile);evict();status();pump();}
  }
 }
 function pump(){
  if(disposed||!active)return;
  while(pending.size<CONCURRENT&&queue.length){const tile=queue.shift(),key=tileKey(tile);if(!cache.has(key)&&!pending.has(key))load(tile);}
 }
 function candidates(camera,width,height,targetLevel){
  const inverse=earth.quaternion.clone().invert(),eye=camera.position.clone().sub(earth.position).applyQuaternion(inverse);
  const found=new Map(),projected=new THREE.Vector3(),direction=new THREE.Vector3();
  const nx=Math.min(24,Math.max(8,Math.ceil(width/80/2)*2)),ny=Math.min(20,Math.max(8,Math.ceil(height/80/2)*2));
  function sample(x,y){
   projected.set(x,y,.5).unproject(camera);direction.copy(projected).sub(camera.position).normalize().applyQuaternion(inverse);
   const start=[eye.x/axes[0],eye.y/axes[1],eye.z/axes[2]],ray=[direction.x/axes[0],direction.y/axes[1],direction.z/axes[2]];
   const a=ray.reduce((s,v)=>s+v*v,0),b=2*ray.reduce((s,v,i)=>s+v*start[i],0),c=start.reduce((s,v)=>s+v*v,0)-1,disc=b*b-4*a*c;
   if(disc<0)return;const t=(-b-Math.sqrt(disc))/(2*a);if(t<=0)return;
   const [lon,lat]=geographicCoordinates([eye.x+direction.x*t,eye.y+direction.y*t,eye.z+direction.z*t],axes);
   const tile=tileAt(targetLevel,lon,lat),key=tileKey(tile),priority=x*x+y*y;
   if(!found.has(key)||priority<found.get(key).priority)found.set(key,{...tile,priority});
  }
  // Center-first priorities make the selected city sharpen before the screen edges.
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)sample(x/nx*2-1,y/ny*2-1);
  return [...found.values()].sort((a,b)=>a.priority-b.priority);
 }
 function prepare(camera,width,height,pixelRatio){
  if(disposed||!active)return;
  level=tileLevel(camera.position.distanceTo(earth.position),radius,height*pixelRatio,camera.fov);
  desired=candidates(camera,width,height,level);
  while(desired.length>MAX_VIEW&&level>0)desired=candidates(camera,width,height,--level);
  const wanted=new Set(desired.map(tileKey));
  for(const [key,controller] of pending)if(!wanted.has(key))controller.abort();
  for(const tile of desired){const key=tileKey(tile);if(cache.has(key))cache.get(key).used=++clock;if(failed.has(key)&&Date.now()-failed.get(key)>60000)failed.delete(key);}
  queue=desired.filter(tile=>!cache.has(tileKey(tile))&&!pending.has(tileKey(tile))&&!failed.has(tileKey(tile)));
  evict();status();pump();
 }
 function update(enabled,camera,width,height,pixelRatio){
  group.visible=enabled;
  if(!enabled){
   if(active){active=false;clearTimeout(timer);signature='';queue=[];for(const controller of pending.values())controller.abort();status();}
   return;
  }
  if(!active)failed.clear();active=true;
  const key=[...camera.position.toArray().map(value=>value.toFixed(2)),...earth.quaternion.toArray(),width,height,pixelRatio].join('/');
  if(key===signature)return;signature=key;
  clearTimeout(timer);const snapshot=camera.clone();snapshot.updateMatrixWorld();
  timer=setTimeout(()=>prepare(snapshot,width,height,pixelRatio),140);
 }
 function dispose(){if(disposed)return;disposed=true;clearTimeout(timer);for(const controller of pending.values())controller.abort();for(const entry of cache.values())disposeEntry(entry);cache.clear();pending.clear();failed.clear();queue=[];desired=[];earth.remove(group);}
 return {update,dispose,get state(){return state;},get diagnostics(){return {...state,cache:cache.size,pending:pending.size,visible:group.visible,keys:[...cache.keys()],disposed};}};
}
