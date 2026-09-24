import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { meridians,acupoints,meridianSources } from '../src/modules/human-anatomy/meridians.js';
const root=new URL('../src/modules/human-anatomy/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root));
const catalog=JSON.parse(read('assets/catalog.json'));
const provenance=JSON.parse(read('assets/provenance.json'));
const ids=new Set(catalog.map(p=>`${p.layer}:${p.id}`));

test('anatomy GLBs match source hashes, catalog, finite metric bounds and valid mesh indices',()=>{
 assert.equal(ids.size,catalog.length);
 for(const [file,hash] of Object.entries(provenance.outputs)){
  const bytes=read('assets/'+file);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash,file);
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
  const bin=bytes.subarray(28+jsonLength);const layer=file.replace('.glb','');
  assert.equal(doc.nodes.length,catalog.filter(p=>p.layer===layer).length);
  assert(!doc.images&&!doc.extensionsRequired,'No remote textures or decoders');
  for(const node of doc.nodes){
   const record=catalog.find(p=>p.id===node.name&&p.layer===layer);assert(record);assert.match(record.sourceSha256,/^[a-f0-9]{64}$/);
   const primitive=doc.meshes[node.mesh].primitives[0],pos=doc.accessors[primitive.attributes.POSITION],ind=doc.accessors[primitive.indices];
   const posView=doc.bufferViews[pos.bufferView],indView=doc.bufferViews[ind.bufferView];
   assert.equal(pos.componentType,5126);assert.equal(ind.componentType,5125);assert.equal(ind.count,record.triangles*3);
   const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
   for(let i=0;i<pos.count*3;i++){const value=bin.readFloatLE(posView.byteOffset+i*4),axis=i%3;assert(Number.isFinite(value));min[axis]=Math.min(min[axis],value);max[axis]=Math.max(max[axis],value);}
   for(let axis=0;axis<3;axis++){assert(Math.abs(min[axis]-record.bounds[0][axis])<1e-6);assert(Math.abs(max[axis]-record.bounds[1][axis])<1e-6);}
   for(let i=0;i<ind.count;i++)assert(bin.readUInt32LE(indView.byteOffset+i*4)<pos.count);
  }
 }
 const femur=catalog.find(p=>p.fma==='FMA24475');
 assert(femur.bounds[0][0]>0,'Anatomical left remains positive X');
 assert(Math.abs(femur.bounds[1][1]-femur.bounds[0][1]-.466183)<.0001,'Source mm must convert uniformly to metres');
 assert(catalog.filter(p=>p.layer==='nerves').every(p=>p.bounds[0][1]>1.3),'Neural source is head-only, never claim a whole-body neural tree');
});

test('every included mesh follows official source element membership, no synthetic missing anatomy',()=>{
 const memberships=new Map();
 for(const line of read('sources/isa_element_parts.txt').toString().trim().split(/\r?\n/).slice(1)){
  const [fma,,id]=line.split('\t');if(!memberships.has(fma))memberships.set(fma,new Set());memberships.get(fma).add(id);
 }
 const roots={skeleton:['FMA5018','FMA12516','FMA7591'],arteries:['FMA50720'],veins:['FMA50723'],nerves:['FMA55676','FMA65132','FMA45638'],surface:['FMA7163']};
 for(const [layer,parents] of Object.entries(roots)){
  const expected=new Set(parents.flatMap(id=>[...memberships.get(id)]));
  assert.deepEqual(new Set(catalog.filter(p=>p.layer===layer).map(p=>p.id)),expected);
 }
});

test('meridians are explicitly separate approximate diagrams with identifiable sources',()=>{
 assert.equal(meridians.length,14);assert.equal(acupoints.length,4);
 assert.equal(new Set([...meridians,...acupoints].map(p=>p.id)).size,18);
 for(const row of [...meridians,...acupoints]){
  assert(row.schematic);assert.equal(row.layer,'meridians');assert.equal(row.names.length,5);
  for(const position of row.points||[row.position])assert(position.length===3&&position.every(Number.isFinite));
  assert(!ids.has(row.id));
 }
 for(const url of Object.values(meridianSources))assert(url.startsWith('https://'));
});

test('female sample uses independent licensed HRA geometry with bounded simplification and partial coverage',()=>{
 const rows=JSON.parse(read('assets/female/catalog.json')),source=JSON.parse(read('assets/female/provenance.json'));
 assert.equal(source.license,'CC-BY-4.0');assert.deepEqual(source.translationMetres,[0,.8,.12]);
 assert.equal(new Set(rows.map(p=>p.id)).size,rows.length);
 for(const [key,record] of Object.entries(source.outputs)){
  const bytes=read(`assets/female/${key}.glb`);assert.equal(bytes.length,record.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.sha256);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
  assert.equal(doc.nodes.length,record.parts);assert(!doc.images&&!doc.extensionsRequired);
  for(const n of doc.nodes){
   const row=rows.find(r=>r.id===n.name);assert.equal(row.layer,key);assert.equal(row.sourceSha256,source.sha256);
   assert(row.simplificationErrorMetres<=.000501);
   const p=doc.meshes[n.mesh].primitives[0],pos=doc.accessors[p.attributes.POSITION],idx=doc.accessors[p.indices];
   const pv=doc.bufferViews[pos.bufferView],iv=doc.bufferViews[idx.bufferView];
   const bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
   for(let i=0;i<pos.count*3;i++){const v=bin.readFloatLE(pv.byteOffset+i*4);assert(Number.isFinite(v));bounds[0][i%3]=Math.min(bounds[0][i%3],v);bounds[1][i%3]=Math.max(bounds[1][i%3],v);}
   assert.deepEqual(bounds,row.bounds);
   for(let i=0;i<idx.count;i++)assert(bin.readUInt32LE(iv.byteOffset+i*4)<pos.count);
  }
 }
 assert(rows.some(r=>r.sourceName.includes('ilium_compact_bone')),'Female pelvis is sourced, not a male morph');
 assert(rows.some(r=>r.layer==='nerves'&&r.bounds[0][1]<1.3),'Female sample includes spinal structures');
 assert(!rows.some(r=>/skull|humerus|rib_/i.test(r.sourceName)),'Do not claim missing skeleton coverage');
});
