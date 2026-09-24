import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchLayer } from '../src/modules/human-anatomy/batch-layer.js';
import { fetchLayer } from '../src/modules/human-anatomy/load-layer.js';

test('layer batching keeps one draw mesh and preserves original transformed part bounds and picking',()=>{
 const source=new THREE.Group();
 for(let i=0;i<4;i++){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.2,.3));mesh.position.set(i*.3,0,0);mesh.userData.partId=`part-${i}`;source.add(mesh);
 }
 const batch=batchLayer(source,new THREE.MeshLambertMaterial());
 assert.equal(batch.mesh.geometry.groups.length,0,'No per-part draw groups');assert.equal(batch.parts.size,4);
 const part=batch.parts.get('part-2');assert(Math.abs(part.bounds.min.x-.55)<1e-6);
 const ray=new THREE.Raycaster(new THREE.Vector3(.6,0,2),new THREE.Vector3(0,0,-1));
 assert.equal(ray.intersectObjects(batch.pickMeshes,false)[0].object.userData.partId,'part-2');
 batch.showOnly('part-2');assert.equal(batch.mesh.geometry.drawRange.count,36);
 batch.showOnly(null);assert.equal(batch.mesh.geometry.drawRange.count,144);
 batch.dispose();source.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});

test('HTML fallback is identified as a stale model URL, transient server failure retries once',async()=>{
 const original=globalThis.fetch;let attempts=0;
 try{
  globalThis.fetch=async()=>new Response('<!doctype html>',{status:200});
  await assert.rejects(fetchLayer('/old.glb'),e=>e.code==='outdated');
  const bytes=new ArrayBuffer(12);new DataView(bytes).setUint32(0,0x46546c67,true);
  globalThis.fetch=async()=>++attempts===1?new Response('',{status:503}):new Response(bytes);
  assert.equal((await fetchLayer('/nerves.glb')).byteLength,12);assert.equal(attempts,2);
 }finally{globalThis.fetch=original;}
});
