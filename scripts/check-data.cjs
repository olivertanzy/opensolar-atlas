const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),context,{timeout:10000});
const data=context.window.SOLAR_DATA,bodies=data.bodies;
assert.equal(new Set(bodies.map(b=>b.key)).size,bodies.length,'unique identifiers');
assert.equal(data.summary.catalog,bodies.length);
assert.equal(data.summary.moons,bodies.filter(b=>b.kind==='moon').length);
const epochs=new Set();
for(const b of bodies){
 if(b.positionKm){assert(b.positionKm.length===3&&b.positionKm.every(Number.isFinite),b.key);epochs.add(b.jdTdb);assert(fs.existsSync(path.join(root,b.ephemerisSource)),'raw ephemeris: '+b.key);}
 if(b.axesKm)assert(b.axesKm.length===3&&b.axesKm.every(x=>Number.isFinite(x)&&x>0),'axes: '+b.key);
 if(b.texture)assert(data.textures[b.texture]&&b.textureSource,'texture provenance: '+b.key);
 if(b.parent)assert(bodies.some(p=>p.id===b.parent),'parent: '+b.key);
}
assert.equal(epochs.size,1,'one shared epoch');
for(const a of JSON.parse(fs.readFileSync(path.join(root,'data/asset-manifest.json'),'utf8'))){
 assert(!a.file.includes('\\'),'manifest paths must use portable slashes: '+a.file);
 const bytes=fs.readFileSync(path.join(root,a.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256,'asset checksum: '+a.file);assert(a.sourcePage,'source: '+a.file);
}
console.log(`Verified ${bodies.length} bodies, ${data.summary.moons} satellites, one epoch and asset checksums.`);
