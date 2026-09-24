// Deliberate allowlist: publish runtime files and provenance, never the workspace.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
const files=['index.html','style.css','viewer.js','data.js','LICENSE','THIRD_PARTY.md','README.md','README.zh-CN.md','vendor/three.min.js','vendor/THREE-LICENSE.txt','data/catalog.json','data/asset-manifest.json'];
for(const name of files){const target=path.join(out,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,name),target);}
fs.cpSync(path.join(root,'data/horizons'),path.join(out,'data/horizons'),{recursive:true});
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Static site ready in dist/');
