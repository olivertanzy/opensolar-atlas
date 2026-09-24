const fs=require('node:fs');
const path=require('node:path');
function createModel(id,{root=path.resolve(__dirname,'..')}={}){
 if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id||'')||id.length>60||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(id))throw new Error('Use a lowercase module ID such as my-structure (maximum 60 characters).');
 const parent=path.join(root,'src/modules'),destination=path.join(parent,id);
 fs.mkdirSync(parent,{recursive:true});
 // Non-recursive mkdir rejects an existing module. Never overwrite contributions.
 fs.mkdirSync(destination);
 for(const file of ['module.js','ModelView.vue','scene.js','README.md']){
  const source=fs.readFileSync(path.join(root,'templates/structure',file),'utf8');
  fs.writeFileSync(path.join(destination,file),source.replaceAll('__MODEL_ID__',id),{flag:'wx'});
 }
 return destination;
}
if(require.main===module){
 try{
  const id=process.argv[2];if(process.argv.length!==3)throw new Error('Usage: npm run create:model -- my-structure');
  console.log(`Created ${createModel(id)}\n\nAdd to src/modules/registry.js:\nimport newModel from './${id}/module.js';\n// Inside modelModules:\n[newModel.id]:newModel,\n\nThen open ?model=${id}. See docs/ADDING_A_MODEL.md.`);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={createModel};
