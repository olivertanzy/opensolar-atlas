// Compile Vue, then copy only runtime data and provenance (never the workspace).
const fs=require('node:fs');
const path=require('node:path');
const {writeDocumentPages}=require('./document-pages.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
(async()=>{
const {build}=await import('vite');
await build({root,mode:process.env.ATLAS_BUILD_MODE||'production'});
const files=['data.js','LICENSE','THIRD_PARTY.md','README.md','README.zh-CN.md','vendor/THREE-LICENSE.txt','data/catalog.json','data/asset-manifest.json','data/discovery-records.json'];
files.push('data/physical-records.json','vendor/VUE-LICENSE.txt');
files.push('docs/DATA.md','docs/ARCHITECTURE.md','docs/OPEN_SOURCE.md','docs/saturn.png');
files.push('data/earth/countries.json','data/earth/cities.json','data/earth/manifest.json');
files.push('docs/EARTH.md');
files.push('docs/ADDING_A_MODEL.md','docs/ADDING_A_MODEL.zh-CN.md','CONTRIBUTING.md');
files.push('data/earth/imagery-source.json');
for(const name of files){const target=path.join(out,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,name),target);}
writeDocumentPages(root,out);
fs.cpSync(path.join(root,'data/horizons'),path.join(out,'data/horizons'),{recursive:true});
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Static site ready in dist/');
})().catch(error=>{console.error(error);process.exitCode=1;});
