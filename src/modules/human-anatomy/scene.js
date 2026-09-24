import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { meridians,acupoints } from './meridians.js';
import { batchLayer } from './batch-layer.js';
import { fetchLayer } from './load-layer.js';
import { applyInteractionMode,isSectionedLayer } from './interaction.js';
const colors={skeleton:'#ded6bf',arteries:'#e85d69',veins:'#4c9add',nerves:'#ecc56f',surface:'#78a9ad'};
function release(root){const geometries=new Set(),materials=new Set();root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat())if(m)materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}

// One metre per unit. No Three.js objects enter Vue's reactive graph.
export function createScene(host,{sample,onSelect=()=>{},onState=()=>{},onFailure=()=>{}}={}){
 let renderer,controls,observer,frame=0,disposed=false,lost=false,selected=null,isolated=false,down=null,frames=0,cut=false;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.002,30),loader=new GLTFLoader();
 const groups=new Map(),batches=new Map(),pending=new Map(),settings=new Map(),failures=new Set();let queue=Promise.resolve();
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(-1,0,0),0);
 const highlight=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshLambertMaterial({color:'#b5f5d2',side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));highlight.visible=false;scene.add(highlight);
 function invalidate(){if(!disposed&&!lost&&!document.hidden&&!frame)frame=requestAnimationFrame(render);}
 function render(){frame=0;if(disposed||lost||document.hidden)return;controls.update();renderer.render(scene,camera);const d=renderer.domElement.dataset;d.frames=String(++frames);d.drawCalls=String(renderer.info.render.calls);d.geometries=String(renderer.info.memory.geometries);d.target=controls.target.toArray().join(',');d.camera=camera.position.toArray().join(',');}
 function update(){
  if(!renderer||disposed)return;
  for(const [key,group] of groups){
   const state=settings.get(key)||{visible:false,opacity:1};group.visible=state.visible;
   const batch=batches.get(key);if(batch)batch.showOnly(isolated&&key!=='surface'?selected:null);
   group.traverse(object=>{if(!object.isMesh)return;if(!batch)object.visible=!isolated||object.userData.partId===selected;const m=object.material;m.opacity=state.opacity;m.transparent=state.opacity<1;m.depthWrite=state.opacity===1;m.clippingPlanes=cut&&isSectionedLayer(key)?[plane]:[];});
  }
  highlight.visible=false;
  for(const [key,batch] of batches){const part=batch.parts.get(selected);if(part&&groups.get(key).visible){const g=highlight.geometry;g.setAttribute('position',batch.mesh.geometry.attributes.position);g.setAttribute('normal',batch.mesh.geometry.attributes.normal);g.setIndex(batch.mesh.geometry.index);g.setDrawRange(part.start,part.count);highlight.geometry=g;highlight.frustumCulled=false;highlight.material.clippingPlanes=cut&&isSectionedLayer(key)?[plane]:[];highlight.visible=true;break;}}
  const d=renderer.domElement.dataset;d.visibleLayers=[...groups.keys()].filter(k=>groups.get(k).visible).join(',');d.selected=selected||'';d.cutaway=String(cut);d.clippedLayers=cut?[...groups.keys()].filter(k=>groups.get(k).visible&&isSectionedLayer(k)).join(','):'';invalidate();
 }
 function createMeridians(){
  const group=new THREE.Group();
  for(const row of meridians)for(const sign of row.bilateral?[-1,1]:[1]){const points=row.points.map(([x,y,z])=>new THREE.Vector3(sign*x,y,z));const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,'centripetal'),points.length*8,.0018,5,false),new THREE.MeshBasicMaterial({color:row.color}));mesh.userData.partId=row.id;group.add(mesh);}
  for(const point of acupoints)for(const sign of point.bilateral?[-1,1]:[1]){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.006,12,8),new THREE.MeshBasicMaterial({color:'#fff2bd'}));mesh.position.set(point.position[0]*sign,point.position[1],point.position[2]);mesh.userData.partId=point.id;group.add(mesh);}
  scene.add(group);groups.set('meridians',group);onState('meridians','ready');update();
 }
 function ensureLayer(key){
  if(disposed||groups.has(key)||pending.has(key)||failures.has(key))return;
  if(key==='meridians'){createMeridians();return;}
  const controller=new AbortController();pending.set(key,controller);onState(key,'loading');
  // Serialize parsing and upload to avoid simultaneous allocation spikes.
  queue=queue.then(async()=>{
   let source;
   try{
    if(disposed||controller.signal.aborted)return;
    const bytes=await fetchLayer(sample.urls[key],controller.signal);
    if(disposed||controller.signal.aborted)return;
    source=(await loader.parseAsync(bytes,'')).scene;
    if(disposed||controller.signal.aborted)return;
    source.traverse(o=>{if(o.isMesh)o.userData.partId=`${key}:${o.userData.partId||o.name}`;});
    const material=new THREE.MeshLambertMaterial({color:colors[key],side:THREE.DoubleSide,forceSinglePass:true});
    const batch=batchLayer(source,material);batches.set(key,batch);groups.set(key,batch.mesh);scene.add(batch.mesh);onState(key,'ready');update();
   }catch(error){if(!disposed&&!controller.signal.aborted){failures.add(key);onState(key,'failure',error.code||'decode');}}
   finally{release(source);if(pending.get(key)===controller)pending.delete(key);}
  });
 }
 function setLayer(key,visible,opacity=1){
  const prior=settings.get(key);if(prior?.visible===visible&&prior?.opacity===opacity)return;
  settings.set(key,{visible,opacity});
  if(!visible&&pending.has(key)){pending.get(key).abort();pending.delete(key);onState(key,'off');}
  update();if(visible)ensureLayer(key);
 }
 function fit(box,side=1){const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),vertical=THREE.MathUtils.degToRad(camera.fov/2),horizontal=Math.atan(Math.tan(vertical)*camera.aspect);const distance=Math.max(size.y/(2*Math.tan(vertical)),size.x/(2*Math.tan(horizontal)),.07)*1.16+size.z/2;controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(0,0,side*distance));controls.update();invalidate();}
 function reset(side=1){isolated=false;update();fit(new THREE.Box3(new THREE.Vector3(-.49,-.08,-.15),new THREE.Vector3(.49,1.67,.27)),side);}
 function focus(id){const box=new THREE.Box3();for(const batch of batches.values()){const part=batch.parts.get(id);if(part)box.union(part.bounds);}groups.get('meridians')?.traverse(o=>{if(o.isMesh&&o.userData.partId===id)box.expandByObject(o);});if(!box.isEmpty())fit(box);}
 function select(id){selected=id;if(!id)isolated=false;update();}
 function head(){fit(new THREE.Box3(new THREE.Vector3(-.12,1.35,-.03),new THREE.Vector3(.12,1.68,.25)));if(cut){const distance=camera.position.distanceTo(controls.target);camera.position.copy(controls.target).add(new THREE.Vector3(distance,0,.08));controls.update();invalidate();}}
 function pick(event){
  if(!down||down.moved||event.button!==0){down=null;return;}down=null;
  const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const pickable=[];for(const [key,group] of groups)if(group.visible&&key!=='surface'){const batch=batches.get(key);if(batch){for(const p of batch.pickMeshes)if(!isolated||p.userData.partId===selected)pickable.push(p);}else group.traverse(m=>{if(m.isMesh&&m.visible)pickable.push(m);});}
  const hit=raycaster.intersectObjects(pickable,false).find(h=>!cut||!isSectionedLayer(h.object.userData.partId.split(':')[0])||plane.distanceToPoint(h.point)>=0);if(hit)onSelect(hit.object.userData.partId);
 }
 const pointerDown=e=>{down=e.isPrimary?{x:e.clientX,y:e.clientY,moved:false}:null;};
 const pointerMove=e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;};
 const cancel=()=>{down=null;};const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else invalidate();};
 const contextLost=e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;if(!disposed)onFailure();};
 const dispose=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();document.removeEventListener('visibilitychange',visibility);pending.forEach(c=>c.abort());pending.clear();highlight.geometry.dispose();highlight.material.dispose();for(const b of batches.values())b.dispose();release(groups.get('meridians'));batches.clear();groups.clear();if(renderer){const c=renderer.domElement;c.removeEventListener('pointerdown',pointerDown);c.removeEventListener('pointermove',pointerMove);c.removeEventListener('pointerup',pick);c.removeEventListener('pointercancel',cancel);c.removeEventListener('webglcontextlost',contextLost);renderer.dispose();renderer.forceContextLoss();c.remove();}};
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.localClippingEnabled=true;host.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight('#effaff','#4c657a',1.8));const light=new THREE.DirectionalLight('#fff0d8',2);light.position.set(-2,3,4);scene.add(light);const rim=new THREE.DirectionalLight('#76cde0',1);rim.position.set(2,2,-3);scene.add(rim);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.025;controls.maxDistance=8;controls.zoomSpeed=.65;controls.panSpeed=1;applyInteractionMode(controls,'orbit');controls.zoomToCursor=true;controls.addEventListener('change',invalidate);
  const canvas=renderer.domElement;canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pick);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('webglcontextlost',contextLost);document.addEventListener('visibilitychange',visibility);
  function resize(){const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();invalidate();}
  observer=new ResizeObserver(resize);observer.observe(host);resize();reset();
  return {reset,setLayer,select,focus,head,dispose,interaction:mode=>{applyInteractionMode(controls,mode);renderer.domElement.style.cursor=mode==='pan'?'move':'grab';},retry:key=>{failures.delete(key);ensureLayer(key);},isolate:value=>{isolated=value;update();},section:(active,offset=0)=>{cut=active;plane.constant=offset;update();}};
 }catch(error){dispose();throw error;}
}
