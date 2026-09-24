// Offline derivative of the licensed HRA female assembly, preserving world metres.
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { MeshoptSimplifier } from 'meshoptimizer';
const root=new URL('../src/modules/human-anatomy/',import.meta.url);
const input=fs.readFileSync(process.argv[2]||new URL('../test-results/anatomy-download/3d-vh-f-united.glb',import.meta.url));
if(input.readUInt32LE(8)!==input.length)throw Error('Incomplete source GLB');
const jsonLength=input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,20+jsonLength));
const bin=input.subarray(28+jsonLength),sha=crypto.createHash('sha256').update(input).digest('hex');
if(sha!=='95f0c3d2f918582608692ca1139e8bdb18c147a16470e9ee9af8b276bd77c422')throw Error('Source hash changed; review metadata and licensing before updating');
const nodes=doc.nodes,world=[],parents=[];
function visit(i,parent=new THREE.Matrix4(),path=[]){const n=nodes[i],m=n.matrix?new THREE.Matrix4().fromArray(n.matrix):new THREE.Matrix4().compose(new THREE.Vector3().fromArray(n.translation||[0,0,0]),new THREE.Quaternion().fromArray(n.rotation||[0,0,0,1]),new THREE.Vector3().fromArray(n.scale||[1,1,1]));world[i]=parent.clone().multiply(m);parents[i]=path;for(const child of n.children||[])visit(child,world[i],[...path,i]);}
for(const i of doc.scenes[doc.scene||0].nodes)visit(i);
function read(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],size=a.type==='VEC3'?3:1;const Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[a.componentType];if(!Type||a.sparse)throw Error('Unsupported accessor');const out=new Type(a.count*size),stride=v.byteStride||size*Type.BYTES_PER_ELEMENT,start=(v.byteOffset||0)+(a.byteOffset||0);for(let i=0;i<a.count;i++)out.set(new Type(bin.buffer,bin.byteOffset+start+i*stride,size),i*size);return out;}
const membership=(i,ancestor)=>i===ancestor||parents[i].includes(ancestor);
function layer(i){if(i===6)return 'surface';if(membership(i,78)||membership(i,85)||membership(i,373))return 'nerves';if(membership(i,1003)||[1111,1127,1128,1129,1141,1157,1158,1159].includes(i))return 'skeleton';if(membership(i,733)){const names=[...parents[i],i].map(j=>nodes[j].name).join(' ');if(/arter(y|ies)/i.test(names))return 'arteries';if(/vein/i.test(names))return 'veins';}return null;}
await MeshoptSimplifier.ready;
const catalog=[],outputs={};const output=new URL('assets/female/',root);fs.mkdirSync(output,{recursive:true});
for(const key of ['skeleton','arteries','veins','nerves','surface']){
 const chunks=[],g={asset:{version:'2.0',generator:'OpenSolar Atlas build-anatomy-female.mjs',copyright:'Browne, Kristen, and Heidi Schlehlein. 2026. 3D Reference Organ Set for Female, v1.10. CC BY 4.0. https://doi.org/10.48539/HBM637.DWBM.744'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],accessors:[],bufferViews:[],buffers:[]};let length=0;
 function attribute(array,type,componentType,bounds){const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);g.bufferViews.push({buffer:0,byteOffset:length,byteLength:bytes.length});chunks.push(bytes);length+=bytes.length;const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}g.accessors.push({bufferView:g.bufferViews.length-1,componentType,count:array.length/(type==='VEC3'?3:1),type,...(bounds?{min:bounds[0],max:bounds[1]}:{})});return g.accessors.length-1;}
 for(let i=0;i<nodes.length;i++){
  const n=nodes[i];if(n.mesh===undefined||layer(i)!==key)continue;
  for(const [pIndex,p] of doc.meshes[n.mesh].primitives.entries()){
   if(p.mode!==undefined&&p.mode!==4)throw Error('Non-triangle source');
   let positions=read(p.attributes.POSITION);const attr=new THREE.BufferAttribute(positions,3);attr.applyMatrix4(world[i]);
   // Translation only; no sex morphing, relative sizes and registration retained.
   for(let v=0;v<attr.count;v++){attr.setY(v,attr.getY(v)+.8);attr.setZ(v,attr.getZ(v)+.12);}
   const indices=p.indices===undefined?Uint32Array.from({length:attr.count},(_,j)=>j):new Uint32Array(read(p.indices));
   // Remove exactly coincident export vertices before simplification. UV seams
   // are unused in these untextured surfaces; no coordinate rounding is applied.
   const unique=[],lookup=new Map(),weld=new Uint32Array(attr.count);
   for(let v=0;v<attr.count;v++){const xyz=Array.from(positions.subarray(v*3,v*3+3)),key=xyz.join(',');if(!lookup.has(key)){lookup.set(key,unique.length/3);unique.push(...xyz);}weld[v]=lookup.get(key);}
   for(let j=0;j<indices.length;j++)indices[j]=weld[indices[j]];
   positions=new Float32Array(unique);
   const target=key==='surface'?45000:Math.min(indices.length,15000);
   const [simplified,error]=MeshoptSimplifier.simplify(indices,positions,3,target,.0005,['ErrorAbsolute']);
   const [remap,count]=MeshoptSimplifier.compactMesh(simplified),compact=new Float32Array(count*3);
   for(let v=0;v<remap.length;v++)if(remap[v]!==0xffffffff)compact.set(positions.subarray(v*3,v*3+3),remap[v]*3);
   const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(compact,3));geo.computeBoundingBox();const bounds=[geo.boundingBox.min.toArray(),geo.boundingBox.max.toArray()];geo.dispose();
   const id=`HRA${i}${pIndex?`-${pIndex}`:''}`,record={id,name:n.extras?.label||n.name,ontology:n.extras?.ontologyid||'',layer:key,bounds,triangles:simplified.length/3,sourceNode:i,sourceName:n.name,sourceSha256:sha,simplificationErrorMetres:error};catalog.push(record);
   const pos=attribute(compact,'VEC3',5126,bounds),idx=attribute(simplified,'SCALAR',5125);
   g.scenes[0].nodes.push(g.nodes.length);g.nodes.push({name:id,mesh:g.meshes.length,extras:{partId:id}});g.meshes.push({primitives:[{attributes:{POSITION:pos},indices:idx}]});
  }
 }
 g.buffers=[{byteLength:length}];const body=Buffer.concat(chunks);let json=Buffer.from(JSON.stringify(g));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+body.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(body.length);bh.writeUInt32LE(0x004e4942,4);const file=Buffer.concat([header,json,bh,body]);fs.writeFileSync(new URL(`${key}.glb`,output),file);outputs[key]={bytes:file.length,sha256:crypto.createHash('sha256').update(file).digest('hex'),parts:g.nodes.length};console.log(key,outputs[key]);
}
fs.writeFileSync(new URL('catalog.json',output),JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(new URL('provenance.json',output),JSON.stringify({source:'https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.10/assets/3d-vh-f-united.glb',doi:'https://doi.org/10.48539/HBM637.DWBM.744',license:'CC-BY-4.0',sha256:sha,translationMetres:[0,.8,.12],simplifier:'meshoptimizer 1.2.0',maximumSimplifierErrorMetres:.0005,outputs},null,2)+'\n');
