import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// One scene unit = one metre. Replace geometry and camera ranges for your subject.
export function createScene(host){
 let renderer,controls,observer,geometry,material,frame,disposed=false;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.01,100);
 const dispose=()=>{
  if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();
  geometry?.dispose();material?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();
 };
 try{
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setClearColor('#07121c');renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);
  geometry=new THREE.BoxGeometry(1,1,1);material=new THREE.MeshNormalMaterial();
  const cube=new THREE.Mesh(geometry,material);scene.add(cube);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=1.1;controls.maxDistance=12;
  function reset(){camera.position.set(2,1.4,2);controls.target.set(0,0,0);controls.update();}
  function resize(){const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}
  observer=new ResizeObserver(resize);observer.observe(host);resize();reset();
  function render(){if(disposed)return;frame=requestAnimationFrame(render);controls.update();renderer.render(scene,camera);}
  render();
  return {reset,setVisible:value=>{cube.visible=value;},dispose};
 }catch(error){dispose();throw error;}
}
