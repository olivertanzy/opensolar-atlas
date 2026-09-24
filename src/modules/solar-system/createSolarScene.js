import * as THREE from 'three';
import { createEarthLayer } from './createEarthLayer.js';
import { geographicPoint } from './earth-geography.js';
import { createEarthImagery } from './createEarthImagery.js';

// Physical geometry is kept outside Vue reactivity. One scene unit remains one km.
export function createSolarScene({ host, viewport, labelCanvas, data, selectedKey, getName, getPlaceName, onPlaceSelect, onSelect, onState, onError }) {
const bodies=data.bodies,byId=new Map(bodies.map(b=>[b.key,b]));
let selected=byId.get(selectedKey)||byId.get('399'),mode='close',origin=new THREE.Vector3(),distance=35000,azimuth=0,elevation=.35,fill=true,showLabels=true,showMoons=true,clickTargets=[];
let renderer,world,camera,canvasWidth=1,canvasHeight=1,frameHandle,zoomTarget=null,lastFrameTime=0,dirty=true,observer,disposed=false,notice='';
const events=new AbortController(),ownedTextures=new Set();
let earthLayer=null,earthImagery=null,earthOptions={borders:true,cities:true,imagery:true};
const meshes=new Map(),markers=[],textures=new Map(),ringObjects=[],scratch=new THREE.Vector3(),ctx=labelCanvas.getContext('2d');
const radius=b=>b.axesKm?Math.max(...b.axesKm):null;
const norm=v=>Math.hypot(...v);
const difference=(a,b)=>a.map((v,i)=>v-b[i]);
function selectBody(key){const b=byId.get(key);if(!b)return;selected=b;if(b.id!=='399')earthLayer?.select(null);frameBody();onSelect(key);dirty=true;}
const vertexShader=`varying vec2 vUv;varying vec3 vNormal;#include <common>\n#include <logdepthbuf_pars_vertex>\nvoid main(){vUv=uv;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);#include <logdepthbuf_vertex>\n}`.replace(/;#/g,';\n#');
const fragmentShader=`uniform sampler2D surfaceMap;uniform sampler2D missingMap;uniform vec3 sun;uniform vec3 eye;uniform float fill;uniform float emissive;uniform float maskBlack;uniform float placeholder;varying vec2 vUv;varying vec3 vNormal;
#include <common>
#include <logdepthbuf_pars_fragment>
void main(){
#include <logdepthbuf_fragment>
vec3 color=texture2D(surfaceMap,vUv).rgb;
vec3 normal=normalize(vNormal);
float light=1.0;
bool missing=placeholder>0.5||(maskBlack>0.5&&texture2D(missingMap,vUv).r>0.5);
if(missing){
 color=vec3(0.39,0.44,0.49);
 float grid=step(0.97,fract(vUv.x*24.0))+step(0.97,fract(vUv.y*12.0));
 color+=0.035*min(grid,1.0);
}
if(emissive>0.5){light=1.0;}
gl_FragColor=vec4(pow(pow(color,vec3(2.2))*light,vec3(1.0/2.2)),1.0);
}`;
// 网格直接在IAU天体固连坐标系生成：z为北极，经度为右手东经。
function ellipsoidGeometry(b){const axes=b.axesKm,max=Math.max(...axes),a=axes.map(x=>x/max),nx=128,ny=64,positions=[],uv=[],indices=[];let start=(b.textureCenterEast-180)*Math.PI/180;for(let iy=0;iy<=ny;iy++){const latitude=Math.PI/2-iy/ny*Math.PI;for(let ix=0;ix<=nx;ix++){const lon=start+ix/nx*Math.PI*2;const n=[Math.cos(latitude)*Math.cos(lon),Math.cos(latitude)*Math.sin(lon),Math.sin(latitude)];let p;if(b.textureLatitude==='graphic'){let denominator=Math.hypot(...a.map((v,i)=>v*n[i]));p=a.map((v,i)=>v*v*n[i]/denominator)}else{const k=1/Math.hypot(...n.map((v,i)=>v/a[i]));p=n.map(v=>v*k)}positions.push(...p);uv.push(ix/nx,1-iy/ny);if(iy<ny&&ix<nx){let i=iy*(nx+1)+ix,j=i+nx+1;indices.push(i,j,i+1,i+1,j,j+1)}}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();return geo}
function initRenderer(){world=new THREE.Scene();renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,alpha:false});renderer.setClearColor(0x03060b);renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);camera=new THREE.PerspectiveCamera(42,1,.001,1e12);camera.up.set(0,0,1);const white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;ownedTextures.add(white);const loader=new THREE.TextureLoader();Object.entries({...data.textures,...Object.fromEntries(Object.entries(data.missingMasks||{}).map(([id,url])=>[id+'-mask',url]))}).forEach(([id,url])=>{const t=loader.load(url,()=>{dirty=true},undefined,()=>{onError('textureError', id)});t.colorSpace=THREE.NoColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.set(id,t);ownedTextures.add(t)});for(const b of bodies){if(!b.positionKm)continue;markers.push(b);if(!b.axesKm)continue;let material;{const sun=new THREE.Vector3(...b.positionKm).negate().normalize();if(b.rotation){const r=b.rotation;sun.set(r[0][0]*sun.x+r[1][0]*sun.y+r[2][0]*sun.z,r[0][1]*sun.x+r[1][1]*sun.y+r[2][1]*sun.z,r[0][2]*sun.x+r[1][2]*sun.y+r[2][2]*sun.z)}material=new THREE.ShaderMaterial({uniforms:{surfaceMap:{value:textures.get(b.texture)||white},missingMap:{value:textures.get(b.id+'-mask')||white},sun:{value:sun},fill:{value:fill?1:0},eye:{value:new THREE.Vector3(1,0,0)},placeholder:{value:!b.texture&&b.id!=='10'?1:0},emissive:{value:b.id==='10'?1:0},maskBlack:{value:['599','701','702','703','704','705','801'].includes(b.id)?1:0}},vertexShader,fragmentShader})}const mesh=new THREE.Mesh(ellipsoidGeometry(b),material);mesh.scale.setScalar(radius(b));if(b.rotation){const r=b.rotation,m=new THREE.Matrix4().set(r[0][0],r[0][1],r[0][2],0,r[1][0],r[1][1],r[1][2],0,r[2][0],r[2][1],r[2][2],0,0,0,0,1);mesh.quaternion.setFromRotationMatrix(m)}mesh.userData.body=b;world.add(mesh);meshes.set(b.key,mesh)}
 // 主环用真实半径的环面，纹理仅表达科普外观；卡西尼环缝按资料半径留出。
 const sat=meshes.get('699');if(sat){
 const ringMap=loader.load(data.saturnRing,()=>{dirty=true},undefined,()=>onError('textureError','Saturn rings'));ownedTextures.add(ringMap);ringMap.colorSpace=THREE.SRGBColorSpace;
 for(const [inner,outer] of [[66900,74510],[74658,91975],[91975,117507],[122340,136780]]){
 const geo=new THREE.RingGeometry(inner,outer,512);const pos=geo.attributes.position,uv=geo.attributes.uv;
 for(let i=0;i<pos.count;i++)uv.setXY(i,(Math.hypot(pos.getX(i),pos.getY(i))-66900)/(136780-66900),.5);
 const ring=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:ringMap,side:THREE.DoubleSide,transparent:true,depthWrite:false,alphaTest:.01,toneMapped:false}));
 ring.userData.ringBounds=[inner,outer];ring.quaternion.copy(sat.quaternion);world.add(ring);ringObjects.push(ring);
 }}observer=new ResizeObserver(resize);observer.observe(viewport);resize();bindPointer();frameBody();render()}
function resize(){if(disposed||!renderer||!camera)return;const rect=viewport.getBoundingClientRect();canvasWidth=Math.max(rect.width,1);canvasHeight=Math.max(rect.height,1);renderer.setSize(canvasWidth,canvasHeight);const oldAspect=camera.aspect;camera.aspect=canvasWidth/canvasHeight;if(mode==='close')distance*=Math.max(1,1/camera.aspect)/Math.max(1,1/oldAspect);camera.updateProjectionMatrix();const d=Math.min(devicePixelRatio,2);labelCanvas.width=canvasWidth*d;labelCanvas.height=canvasHeight*d;ctx.setTransform(d,0,0,d,0,0);dirty=true}
function setOrigin(pos){origin.set(...pos);for(const [key,m]of meshes){const p=m.userData.body.positionKm;m.position.set(p[0]-origin.x,p[1]-origin.y,p[2]-origin.z)}const sat=byId.get('699');if(sat?.positionKm)ringObjects.forEach(r=>r.position.set(sat.positionKm[0]-origin.x,sat.positionKm[1]-origin.y,sat.positionKm[2]-origin.z));dirty=true}
function resetAngles(){if(mode==='close'&&selected.id==='699'&&selected.rotation){const r=selected.rotation,c=Math.cos(.43),z=Math.sin(.43);const v=new THREE.Vector3(r[0][0]*c+r[0][2]*z,r[1][0]*c+r[1][2]*z,r[2][0]*c+r[2][2]*z);azimuth=Math.atan2(v.y,v.x);elevation=Math.asin(v.z);dirty=true;return}if(mode==='close'&&selected.positionKm&&selected.id!=='10'){const s=new THREE.Vector3(...selected.positionKm).negate().normalize();azimuth=Math.atan2(s.y,s.x);elevation=Math.asin(s.z)+.28}else{azimuth=-Math.PI/2;elevation=1.03}elevation=Math.max(-1.50,Math.min(1.50,elevation));dirty=true}

function frameBody(){
 zoomTarget=null;mode='close';const b=selected;
 if(!b.positionKm){const p=byId.get(b.parent);setOrigin(p?.positionKm||[0,0,0]);distance=p?.positionKm?(radius(p)||1000)*12:data.auKm*5;notice='missingPosition';}
 else {setOrigin(b.positionKm);distance=b.axesKm?radius(b)*(b.id==='699'?9:4.4)*Math.max(1,1/camera.aspect):2000;
 notice=b.id==='699'?'ringNotice':['799','899'].includes(b.id)?'illustrationNotice':!b.axesKm?'missingSize':!b.texture&&b.id!=='10'?'placeholderNotice':b.id==='599'?'historicalNotice':'';}
 resetAngles();clampDistance();dirty=true;
}
function frameWide(inner=false){zoomTarget=null;mode=inner?'inner':'all';setOrigin([0,0,0]);distance=data.auKm*(inner?5.5:105);azimuth=-Math.PI/2;elevation=1.22;notice='wideNotice';dirty=true;}
function frameSystem(){
 const center=selected.parent?byId.get(selected.parent):selected,children=bodies.filter(b=>b.parent===center.id&&b.positionKm);
 if(!center.positionKm||!children.length){notice='noSystem';dirty=true;return;}
 zoomTarget=null;mode='system';setOrigin(center.positionKm);distance=Math.max((radius(center)||0)*5,Math.max(...children.map(b=>norm(difference(b.positionKm,center.positionKm))))*3.2);azimuth=-Math.PI/2;elevation=1.2;notice='systemNotice';dirty=true;
}
function clampDistance(){const same=selected.positionKm&&origin.distanceTo(new THREE.Vector3(...selected.positionKm))<.1;const min=same&&selected.axesKm?radius(selected)*1.06:1;distance=Math.max(min,Math.min(1e11,distance));}
function zoomBy(factor){const same=selected.positionKm&&origin.distanceTo(new THREE.Vector3(...selected.positionKm))<.1;const surface=same&&selected.axesKm?radius(selected):0,current=zoomTarget??distance;zoomTarget=Math.max(surface?surface*1.06:1,Math.min(1e11,surface+(current-surface)*factor));dirty=true;}
function setEarthData(geography){
 earthLayer?.dispose();earthLayer=null;
 const earth=meshes.get('399');if(!earth||!geography)return;
 earthLayer=createEarthLayer(earth,geography,getPlaceName);earthLayer.setOptions(earthOptions);dirty=true;
}
function focusEarthPlace(place){
 const earth=meshes.get('399');if(!earth||!earthLayer||!place)return;
 if(selected.id!=='399'){selected=byId.get('399');onSelect('399');}
 mode='close';zoomTarget=null;setOrigin(selected.positionKm);
 const direction=new THREE.Vector3(...geographicPoint(place.coordinates,selected.axesKm)).normalize().applyQuaternion(earth.quaternion);
 azimuth=Math.atan2(direction.y,direction.x);elevation=Math.asin(direction.z);
 distance=radius(selected)*(place.kind==='country'?2.25:1.16)*Math.max(1,1/camera.aspect);
 notice='earthMapNotice';earthLayer.select(place);dirty=true;
}
function rotateByPixels(dx,dy){
 // Convert screen pixels to surface arc length at the current altitude.
 // The overview retains its existing orbit speed; close-ups track the pointer.
 const same=selected.positionKm&&origin.distanceTo(new THREE.Vector3(...selected.positionKm))<.1;
 const r=same?radius(selected):null;
 const perPixel=r?Math.min(.006,2*Math.max(0,distance-r)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/(canvasHeight*r)):.006;
 const longitudeScale=r?Math.max(.05,Math.cos(elevation)):1;
 azimuth-=dx*perPixel/longitudeScale;
 elevation=Math.max(-1.53,Math.min(1.53,elevation+dy*perPixel));dirty=true;
}
function bindPointer(){
 const pointers=new Map();let pinch=0,moved=false,start=null;
 labelCanvas.onpointerdown=e=>{
  labelCanvas.setPointerCapture(e.pointerId);
  if(!pointers.size){start=[e.clientX,e.clientY];moved=false;}
  pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pointers.size>1)moved=true;
  if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);}
 };
 labelCanvas.onpointermove=e=>{
  if(!pointers.has(e.pointerId))return;
  const old=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>3)moved=true;
  if(pointers.size===2){
   const p=[...pointers.values()],now=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);
   if(pinch>0&&now>0)zoomBy(pinch/now);pinch=now;
  }else if(pointers.size===1)rotateByPixels(e.clientX-old[0],e.clientY-old[1]);
 };
 labelCanvas.onpointerup=e=>{
  if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
  if(!moved&&!pointers.size){
   const rect=labelCanvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
   const hit=clickTargets.find(h=>x>=h.x-12&&x<=h.x+h.w+8&&Math.abs(y-h.y)<14);
   if(hit){if(hit.place)onPlaceSelect?.(hit.place);else selectBody(hit.key);}
  }
  if(!pointers.size)start=null;pinch=0;
 };
 labelCanvas.onpointercancel=e=>{pointers.delete(e.pointerId);moved=true;if(!pointers.size)start=null;pinch=0;};
 labelCanvas.addEventListener('wheel',e=>{e.preventDefault();zoomBy(Math.exp(Math.max(-.5,Math.min(.5,e.deltaY*.0015))))},{passive:false,signal:events.signal});
}
function isOccluded(point,body){
 const ray=point.clone().sub(camera.position), length=ray.length();ray.divideScalar(length);
 for(const mesh of meshes.values()){
  if(!mesh.visible||mesh.userData.body===body)continue;
  const inverse=mesh.quaternion.clone().invert(), axes=mesh.userData.body.axesKm;
  const start=camera.position.clone().sub(mesh.position).applyQuaternion(inverse), direction=ray.clone().applyQuaternion(inverse);
  start.set(start.x/axes[0],start.y/axes[1],start.z/axes[2]);direction.set(direction.x/axes[0],direction.y/axes[1],direction.z/axes[2]);
  const a=direction.lengthSq(), b=2*start.dot(direction), c=start.lengthSq()-1, discriminant=b*b-4*a*c;
  if(discriminant>0){const near=(-b-Math.sqrt(discriminant))/(2*a);if(near>0&&near<length)return true;}
 }
 return false;
}
function drawLabels(){ctx.clearRect(0,0,canvasWidth,canvasHeight);clickTargets=[];if(!showLabels)return;const placed=[];const sorted=markers.slice().sort((a,b)=>(b.key===selected.key)-(a.key===selected.key)||(a.kind==='moon')-(b.kind==='moon'));const systemId=selected.parent||selected.id;for(const b of sorted){if(!showMoons&&b.kind==='moon'&&b!==selected)continue;if(mode!=='system'&&b.kind==='moon'&&b.parent!==systemId&&b!==selected)continue;if(mode==='system'&&b.kind==='moon'&&b.parent!==systemId)continue;const p=scratch.set(b.positionKm[0]-origin.x,b.positionKm[1]-origin.y,b.positionKm[2]-origin.z);if(isOccluded(p,b))continue;const dist=p.distanceTo(camera.position);const screenRadius=(radius(b)||0)/dist*canvasHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));if(b===selected&&mode==='close'&&screenRadius>35)continue;const projected=p.clone().project(camera);if(projected.z< -1||projected.z>1)continue;const x=(projected.x+1)*canvasWidth/2,y=(1-projected.y)*canvasHeight/2;if(x<8||x>canvasWidth-12||y<120||y>canvasHeight-110)continue;ctx.font='11px Segoe UI, sans-serif';const name=getName(b),tw=ctx.measureText(name).width;ctx.fillStyle=b===selected?'#8be6df':b.kind==='moon'?'#718a9a':'#bfcbd6';ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1;if(!b.axesKm){ctx.beginPath();ctx.moveTo(x,y-3);ctx.lineTo(x+3,y);ctx.lineTo(x,y+3);ctx.lineTo(x-3,y);ctx.closePath();ctx.stroke()}else if(screenRadius<4){ctx.beginPath();ctx.arc(x,y,b.kind==='star'?3:2,0,Math.PI*2);ctx.fill()}if(placed.some(a=>Math.abs(a.y-y)<18&&x<a.x+a.w+10&&x+tw+20>a.x))continue;ctx.font='11px Segoe UI, Microsoft YaHei';ctx.fillText(name,x+8,y+4);placed.push({x,y,w:tw+14});clickTargets.push({x,y,w:tw+14,key:b.key})}}

function render(now=performance.now()){
 if(disposed)return;frameHandle=requestAnimationFrame(render);
 const dt=Math.min(64,Math.max(1,now-lastFrameTime));lastFrameTime=now;
 if(zoomTarget!==null){distance+=(zoomTarget-distance)*(1-Math.exp(-dt/95));clampDistance();if(Math.abs(zoomTarget-distance)<Math.max(.001,distance*.0001)){distance=zoomTarget;clampDistance();zoomTarget=null;}dirty=true;}
 if(!dirty)return;dirty=false;
 camera.position.set(distance*Math.cos(elevation)*Math.cos(azimuth),distance*Math.cos(elevation)*Math.sin(azimuth),distance*Math.sin(elevation));camera.near=Math.max(.0001,distance*1e-7);camera.far=Math.max(distance*5,2e10);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 for(const m of meshes.values()){const b=m.userData.body;if(m.material.uniforms?.eye)m.material.uniforms.eye.value.copy(camera.position).sub(m.position).applyQuaternion(m.quaternion.clone().invert()).normalize();const angle=radius(b)/m.position.distanceTo(camera.position)*canvasHeight;m.visible=angle>.2&&(showMoons||b.kind!=='moon'||b===selected);}
 for(const r of ringObjects)r.visible=meshes.get('699')?.visible??false;
 const earthActive=selected.id==='399'&&mode==='close'&&distance<radius(selected)*12;
 earthLayer?.update(earthActive);
 earthImagery?.update(earthActive&&earthOptions.imagery!==false,camera,canvasWidth,canvasHeight,renderer.getPixelRatio());
 renderer.render(world,camera);drawLabels();
 if(earthActive&&earthLayer)clickTargets.unshift(...earthLayer.draw(ctx,camera,canvasWidth,canvasHeight,distance));
 const near=mode==='close'&&selected.axesKm?radius(selected)*1.06:1;
 onState({mode,distance,notice,imagery:earthImagery?.state||{status:'idle'},zoomMin:Math.log10(near),zoomMax:Math.log10(mode==='close'?Math.max(near*100,distance*1.05):1e11)});
}
function dispose(){
 if(disposed)return;disposed=true;cancelAnimationFrame(frameHandle);observer?.disconnect();events.abort();
 earthLayer?.dispose();earthLayer=null;
 earthImagery?.dispose();earthImagery=null;
 for(const key of ['onpointerdown','onpointermove','onpointerup','onpointercancel'])labelCanvas[key]=null;
 world?.traverse(object=>{object.geometry?.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials)material?.dispose();});
 for(const texture of ownedTextures)texture.dispose();
 renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();meshes.clear();textures.clear();ringObjects.length=0;
}
try{initRenderer();if(meshes.has('399'))earthImagery=createEarthImagery(meshes.get('399'),()=>{dirty=true;});}catch(error){dispose();throw error;}
return {
 selectBody,frameBody,frameWide,frameSystem,zoomBy,resetAngles,resize,dispose,setEarthData,focusEarthPlace,
 setEarthOptions(value){earthOptions={...earthOptions,...value};earthLayer?.setOptions(earthOptions);dirty=true;},
 setZoom(value){zoomTarget=10**value;dirty=true;},
 setLabels(value){showLabels=value;dirty=true;},setMoons(value){showMoons=value;dirty=true;},
 invalidate(){dirty=true;},
 // Diagnostics are instance-owned and never mutate the authoritative data.
 diagnostics:{get selected(){return selected.key;},get origin(){return origin.toArray();},get distance(){return distance;},get disposed(){return disposed;},get earth(){return earthLayer?.diagnostics;},get imagery(){return earthImagery?.diagnostics;},focusEarthPlace,meshes,data,selectBody,frameWide,frameSystem,get camera(){return camera;},get world(){return world;},get renderer(){return renderer;}}
};
}
