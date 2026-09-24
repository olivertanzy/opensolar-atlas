import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// One rendered mesh per anatomical layer. Part views share the merged buffers
// and are used only for bounds/raycasting, never added to the rendered scene.
export function batchLayer(source,material){
 source.updateMatrixWorld(true);
 const geometries=[],records=[];let offset=0;
 source.traverse(object=>{
  if(!object.isMesh)return;
  const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
  for(const key of Object.keys(geometry.attributes))if(!['position','normal'].includes(key))geometry.deleteAttribute(key);
  if(!geometry.attributes.normal)geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const count=geometry.index?.count||geometry.attributes.position.count;
  records.push({id:object.userData.partId||object.name,bounds:geometry.boundingBox.clone(),start:offset,count});
  offset+=count;geometries.push(geometry);
 });
 const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
 if(!geometry)throw new Error('Incompatible anatomy geometry');
 geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.setDrawRange(0,offset);
 const mesh=new THREE.Mesh(geometry,material),parts=new Map(),pickMeshes=[];
 for(const record of records){
  const view=new THREE.BufferGeometry();
  view.setAttribute('position',geometry.attributes.position);view.setIndex(geometry.index);
  view.setDrawRange(record.start,record.count);view.boundingBox=record.bounds;view.boundingSphere=record.bounds.getBoundingSphere(new THREE.Sphere());
  const picker=new THREE.Mesh(view,material);picker.userData.partId=record.id;
  parts.set(record.id,{...record,picker});pickMeshes.push(picker);
 }
 return {mesh,parts,pickMeshes,
  showOnly(id){const part=parts.get(id);geometry.setDrawRange(part?.start||0,id?(part?.count||0):offset);},
  dispose(){for(const picker of pickMeshes)picker.geometry.dispose();geometry.dispose();material.dispose();parts.clear();pickMeshes.length=0;},
 };
}
