const translated=value=>Object.fromEntries(['en','zh-CN','zh-TW','ja','ko'].map(locale=>[locale,value]));
export default {
 id:'__MODEL_ID__',version:'0.1.0',unit:'m',
 // Replace these titles and descriptions with reviewed translations before publishing.
 name:translated('__MODEL_ID__'),
 category:translated('Developer example'),
 description:translated('A one-metre geometric cube for integration testing. Not an anatomical or scientific reconstruction.'),
 credit:'Procedural geometry · MIT · no external assets',
 loadView:()=>import('./ModelView.vue'),
};
