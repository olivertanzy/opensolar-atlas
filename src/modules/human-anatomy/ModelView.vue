<script setup>
import { computed,ref,reactive,onMounted,onBeforeUnmount,watch } from 'vue';
import ModelWorkbench from '@/components/ModelWorkbench.vue';
import { locale } from '@/i18n/index.js';
import { moduleText } from '@/modules/registry.js';
import model from './module.js';
import { createScene } from './scene.js';
import { samples } from './samples.js';
import { text,localized,layerColors } from './i18n.js';
import { meridians,acupoints,meridianSources } from './meridians.js';
import { sectionLayers } from './interaction.js';

const sample=ref('male'),cutaway=ref(false),cutOffset=ref(0),reasons=reactive({}),interaction=ref('orbit');
let savedLayers;
const title=computed(()=>moduleText(model,'name',locale.value));
const host=ref(null),catalogOpen=ref(false),detailsOpen=ref(false),failed=ref(false);
const query=ref(''),filter=ref('all'),limit=ref(50),selected=ref(null),isolated=ref(false);
const layers=['skeleton','arteries','veins','nerves','meridians','surface'];
const enabled=reactive(Object.fromEntries(layers.map(key=>[key,key==='skeleton'])));
const opacity=reactive(Object.fromEntries(layers.map(key=>[key,key==='surface'?.12:1])));
const states=reactive({});
const parts=computed(()=>[...samples[sample.value].catalog.filter(p=>p.layer!=='surface').map(p=>({...p,key:`${p.layer}:${p.id}`})),...(sample.value==='male'?[...meridians,...acupoints].map(p=>({...p,key:p.id})):[])]);
const byId=computed(()=>new Map(parts.value.map(p=>[p.key,p])));
const counts=computed(()=>Object.fromEntries(layers.map(key=>[key,parts.value.filter(p=>p.layer===key).length])));
const name=part=>part.names?`${part.code} · ${localized(part.names)}`:part.name==='-'?part.sourceName:part.name;
const results=computed(()=>{
 const needle=query.value.trim().toLowerCase();
 return parts.value.filter(p=>enabled[p.layer]&&(filter.value==='all'||filter.value===p.layer)&&(!needle||[p.name,p.sourceName,p.fma,p.ontology,p.id,p.code,...(p.names||[])].join(' ').toLowerCase().includes(needle)));
});
const busy=computed(()=>layers.some(k=>enabled[k]&&states[k]==='loading'));
const enabledCount=computed(()=>layers.filter(k=>enabled[k]&&k!=='surface').length);
const selectedNote=computed(()=>selected.value?.schematic?'meridianLimit':selected.value?.layer==='nerves'?'neuralLimit':selected.value?.layer==='skeleton'?'skeletonInfo':'vascularInfo');
const extent=computed(()=>selected.value?.bounds?.[1].map((n,i)=>((n-selected.value.bounds[0][i])*1000).toFixed(1)).join(' × '));
let driver;
function pick(id,focus=false){
 const part=byId.value.get(id);if(!part)return;
 selected.value=part;isolated.value=false;driver?.isolate(false);driver?.select(part.key);if(focus)driver?.focus(part.key);
 catalogOpen.value=false;detailsOpen.value=true;
}
function clear(){selected.value=null;isolated.value=false;driver?.select(null);}
function reset(side=1){if(cutaway.value)toggleCutaway();isolated.value=false;driver?.reset(side);}
function toggleCutaway(){
 cutaway.value=!cutaway.value;clear();cutOffset.value=0;
 if(cutaway.value){savedLayers={...enabled};Object.assign(enabled,sectionLayers(enabled));}
 else if(savedLayers)Object.assign(enabled,savedLayers);
 driver?.section(cutaway.value,0);if(cutaway.value)driver?.head();
}
function reloadPage(){window.location.reload();}
function toggleIsolation(){isolated.value=!isolated.value;driver?.isolate(isolated.value);}
function initialize(){
 driver?.dispose();driver=undefined;failed.value=false;clear();for(const key of layers)delete states[key];
 try{
  driver=createScene(host.value,{sample:samples[sample.value],onSelect:pick,onState:(key,state,reason)=>{states[key]=state;reasons[key]=reason;},onFailure:()=>{failed.value=true;}});
  driver.interaction(interaction.value);
  for(const key of layers)driver.setLayer(key,enabled[key],opacity[key]);
 }catch{failed.value=true;}
}
watch([enabled,opacity],()=>{
 for(const key of layers)driver?.setLayer(key,enabled[key],opacity[key]);
 if(selected.value&&!enabled[selected.value.layer])clear();
 if(filter.value!=='all'&&!enabled[filter.value])filter.value='all';
},{deep:true});
watch(sample,()=>{cutaway.value=false;cutOffset.value=0;savedLayers=null;query.value='';filter.value='all';for(const k of layers)enabled[k]=k==='skeleton'||(sample.value==='female'&&k==='surface');initialize();});
watch(cutOffset,value=>driver?.section(cutaway.value,value));
watch(interaction,value=>driver?.interaction(value));
watch([query,filter],()=>{limit.value=50;});
onMounted(initialize);
onBeforeUnmount(()=>driver?.dispose());
</script>
<template>
 <ModelWorkbench class="anatomy-workbench" :title="title" :catalog-label="text('layers')" :details-label="text('details')" v-model:catalog-open="catalogOpen" v-model:details-open="detailsOpen">
  <template #toolbar>
   <button data-anatomy-action="front" @click="reset(1)">{{ text('front') }}</button>
   <button data-anatomy-action="back" @click="reset(-1)">{{ text('back') }}</button>
   <button data-anatomy-action="reset" @click="reset()">↺ {{ text('reset') }}</button>
   <button data-anatomy-action="head" @click="driver?.head()">{{ text('head') }}</button>
   <div class="workbench-segment" :aria-label="text('interaction')"><button data-anatomy-action="orbit" :aria-pressed="interaction==='orbit'" @click="interaction='orbit'">{{ text('orbit') }}</button><button data-anatomy-action="pan" :aria-pressed="interaction==='pan'" @click="interaction='pan'">{{ text('pan') }}</button></div>
  </template>
  <template #catalog>
   <label class="anatomy-search-label" for="anatomySample">{{ text('sample') }}</label>
   <select id="anatomySample" v-model="sample" class="anatomy-filter"><option value="male">{{ text('male') }}</option><option value="female">{{ text('female') }}</option></select>
   <p class="anatomy-caution">{{ text(sample==='female'?'femaleLimit':'limitation') }}</p>
   <button data-anatomy-action="cutaway" :aria-pressed="cutaway" @click="toggleCutaway">{{ text(cutaway?'closeSection':'openSection') }}</button>
   <div v-if="cutaway" class="anatomy-section"><label for="anatomyCut">{{ text('sectionPosition') }} · {{ Math.round(cutOffset*1000) }} mm</label><input id="anatomyCut" v-model.number="cutOffset" type="range" min="-0.1" max="0.1" step="0.002"><p>{{ text('sectionLimit') }}</p></div>
   <div class="anatomy-heading">{{ text('layers') }} <span>{{ layers.length.toString().padStart(2,'0') }}</span></div>
   <div class="anatomy-layers">
    <div v-for="key in layers" :key="key" class="anatomy-layer" :class="{active:enabled[key]}" :style="{'--layer-color':layerColors[key]}">
     <label class="anatomy-toggle"><input v-model="enabled[key]" type="checkbox" :data-layer="key" :disabled="sample==='female'&&key==='meridians'"><i></i><span>{{ text(key) }}</span><small v-if="counts[key]">{{ counts[key] }}</small></label>
     <p v-if="sample==='female'&&['skeleton','arteries','veins','nerves'].includes(key)" class="anatomy-coverage" :data-coverage="key">{{ text(key==='skeleton'?'femaleBones':key==='nerves'?'femaleNeural':'femaleVessels') }}</p>
     <div v-if="enabled[key]" class="anatomy-adjust"><label :for="`opacity-${key}`">{{ text('opacity') }}</label><input :id="`opacity-${key}`" v-model.number="opacity[key]" type="range" min="0.05" max="1" step="0.05"><span>{{ Math.round(opacity[key]*100) }}%</span></div>
     <p v-if="enabled[key]&&states[key]==='loading'" class="anatomy-layer-state" role="status">{{ text('loading') }}</p>
     <p v-if="enabled[key]&&states[key]==='failure'" class="anatomy-layer-state anatomy-error" role="alert">{{ text(reasons[key]==='outdated'?'outdated':'failure') }} <button v-if="reasons[key]==='outdated'" @click="reloadPage">{{ text('reload') }}</button><button v-else @click="driver?.retry(key)">{{ text('retry') }}</button></p>
    </div>
   </div>
   <p v-if="enabled.nerves" class="anatomy-caution">{{ text(sample==='female'?'femaleNeural':'neuralLimit') }}</p>
   <p v-if="sample==='female'" class="anatomy-caution">{{ text('femaleMeridians') }}</p>
   <p v-if="enabled.meridians" class="anatomy-caution">{{ text('schematic') }} · {{ text('magnified') }}</p>
   <label class="anatomy-search-label" for="anatomySearch">{{ text('sourceName') }}</label>
   <input id="anatomySearch" v-model="query" type="search" :placeholder="text('search')">
   <select v-model="filter" class="anatomy-filter" :aria-label="text('layers')"><option value="all">{{ text('all') }}</option><option v-for="key in layers.filter(k=>enabled[k]&&k!=='surface')" :key="key" :value="key">{{ text(key) }}</option></select>
   <div class="anatomy-result-count">{{ results.length }} {{ text('parts') }}</div>
   <div class="anatomy-parts">
    <button v-for="part in results.slice(0,limit)" :key="part.key" :data-part="part.key" :aria-current="selected?.key===part.key" :disabled="states[part.layer]!=='ready'" @click="pick(part.key,true)"><i :style="{background:layerColors[part.layer]}"></i><span>{{ name(part) }}<small>{{ part.fma||part.ontology||(part.schematic?text('schematic'):part.id) }}</small></span><b>↗</b></button>
    <p v-if="!results.length" class="anatomy-note">{{ text('noResults') }}</p>
   </div>
   <button v-if="results.length>limit" class="anatomy-more" @click="limit+=50">{{ text('more') }}</button>
  </template>
  <template #stage>
   <div ref="host" class="anatomy-canvas" :data-state="failed?'failure':busy?'loading':'ready'" :aria-label="title"></div>
   <div class="anatomy-stage-top"><span class="anatomy-tag">BODY ATLAS / 01</span><span>{{ text(sample) }} · 1 unit = 1 m</span></div>
   <div class="anatomy-gesture">{{ text(interaction==='pan'?'panHint':'orbitHint') }}</div>
   <div v-if="failed" class="anatomy-load" role="alert">{{ text('renderFailure') }}<button @click="initialize">{{ text('retry') }}</button></div>
   <div v-else-if="busy" class="anatomy-loading" role="status">◌ {{ text('loading') }}</div>
   <div v-else-if="!enabledCount" class="anatomy-load">{{ text('noLayers') }}</div>
   <div class="anatomy-stage-bottom"><span>{{ enabled.meridians?text('schematic'):text('reference') }}</span><strong>{{ selected?name(selected):text('introduction') }}</strong><small>{{ enabled.meridians?text('magnified'):text('educational') }}</small></div>
  </template>
  <template #details>
   <div class="anatomy-details">
    <template v-if="selected">
     <div class="anatomy-eyebrow" :style="{color:layerColors[selected.layer]}">{{ text(selected.layer) }}</div>
     <h2>{{ name(selected) }}</h2><p v-if="!selected.schematic" class="anatomy-note">{{ text('sourceName') }}</p>
     <div class="anatomy-actions"><button @click="driver?.focus(selected.key)">{{ text('focus') }}</button><button :aria-pressed="isolated" @click="toggleIsolation">{{ text(isolated?'restore':'isolate') }}</button><button @click="clear">{{ text('clear') }}</button></div>
     <dl v-if="!selected.schematic" class="anatomy-facts"><dt>{{ sample==='female'?'HRA / UBERON':'BodyParts3D / FMA' }}</dt><dd>{{ selected.id }} / {{ selected.fma||selected.ontology||'—' }}</dd><dt>{{ text('bounds') }}</dt><dd>{{ extent }} mm</dd></dl>
     <p v-if="selected.parentLabel" class="anatomy-caution">{{ text('parentLabel') }}</p>
     <p class="anatomy-note">{{ text(sample==='female'&&!selected.schematic?'femaleLimit':selectedNote) }}</p>
    </template>
    <template v-else><div class="anatomy-eyebrow">BODY / SYSTEMS</div><h2>{{ text('introduction') }}</h2><p class="anatomy-note">{{ text('intro') }}</p></template>
    <section class="anatomy-evidence"><h3>{{ text('overview') }}</h3><p>{{ text(sample==='female'?'femaleLimit':'limitation') }}</p><p v-if="sample==='male'">{{ text('skeletonInfo') }}</p><p>{{ text('vascularInfo') }}</p><p>{{ text(sample==='female'?'femaleNeural':'neuralLimit') }}</p><p>{{ text('visualKey') }}</p></section>
    <section v-if="enabled.meridians" class="anatomy-evidence anatomy-traditional"><h3>{{ text('schematic') }}</h3><p>{{ text('meridianLimit') }}</p><div class="anatomy-points"><button v-for="point in acupoints" :key="point.id" @click="pick(point.id,true)">{{ name(point) }}</button></div><a :href="meridianSources.courses" target="_blank" rel="noopener">广东省中医药局 · 十二经脉循行图解 ↗</a><a :href="meridianSources.midlines" target="_blank" rel="noopener">重庆潼南区卫生健康委 · 奇经八脉 ↗</a><a :href="meridianSources.names" target="_blank" rel="noopener">WHO · Standard acupuncture nomenclature ↗</a><a :href="meridianSources.points" target="_blank" rel="noopener">海阳市凤城街道卫生院 · 穴位位置 ↗</a></section>
    <section v-if="sample==='female'" class="anatomy-evidence"><h3>{{ text('sources') }}</h3><a href="https://doi.org/10.48539/HBM637.DWBM.744" target="_blank" rel="noopener">HRA / HuBMAP · Female v1.10 ↗</a><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0 ↗</a><p class="anatomy-credit">Browne, Kristen, and Heidi Schlehlein. 2026. 3D Reference Organ Set for Female, v1.10. Surfaces simplified; assembly translated in metres.</p></section>
    <section v-else class="anatomy-evidence"><h3>{{ text('sources') }}</h3><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noopener">BodyParts3D v4.0 · 20130619 ↗</a><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noopener">{{ text('license') }} · CC BY 4.0 ↗</a><p class="anatomy-credit">BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International</p></section>
   </div>
  </template>
  <template #status><span>{{ text('hint') }}</span><span>{{ text('educational') }}</span></template>
 </ModelWorkbench>
</template>
<style scoped>
.anatomy-workbench :deep(#catalog){overflow-y:auto;padding-bottom:45px}
.anatomy-section{font-size:11px;color:#a8c4cb;line-height:1.7;margin:14px 0}.anatomy-section input{display:block;width:100%;accent-color:#83d4c5}.anatomy-section p{font-size:10px}.anatomy-toggle:has(input:disabled){opacity:.5}

.anatomy-workbench :deep(.workbench-tools){gap:8px}
.anatomy-coverage{font-size:10px;line-height:1.7;color:var(--atlas-muted);margin:8px 0 0}
.anatomy-gesture{position:absolute;top:54px;left:24px;font-size:11px;color:#b8ddd6;pointer-events:none;background:#0b1721dd;padding:6px 9px;border:1px solid #2a484d;border-radius:6px}
.anatomy-loading{top:96px!important}
@media(max-width:600px){.anatomy-workbench{--workbench-bar:124px}.anatomy-workbench :deep(.workbench-toolbar){flex-direction:column;align-items:stretch;justify-content:center;gap:8px}.anatomy-workbench :deep(.workbench-tools){display:flex;flex-wrap:wrap;gap:5px}.anatomy-workbench [data-anatomy-action]{font-size:10px;padding:7px 8px;min-height:31px;line-height:1.3}.anatomy-gesture{left:15px;right:15px;font-size:10px}}
.anatomy-canvas{position:absolute;inset:0;touch-action:none;background:radial-gradient(ellipse at 50% 40%,#17313a 0%,#0c1b25 48%,#060f18 100%)}.anatomy-canvas :deep(canvas){display:block;width:100%;height:100%}.anatomy-heading{display:flex;justify-content:space-between;color:#ddeded;font-size:13px;margin:4px 0 16px}.anatomy-heading span{color:#5b8186;font-size:10px;letter-spacing:2px}.anatomy-layers{display:grid;gap:7px}.anatomy-layer{border:1px solid #253b43;border-radius:9px;padding:10px;background:#0a1821}.anatomy-layer.active{border-color:color-mix(in srgb,var(--layer-color) 35%,#24353b);background:#13252d}.anatomy-toggle{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:11px}.anatomy-toggle input{accent-color:var(--layer-color);width:14px;height:14px;margin:0}.anatomy-toggle i{width:5px;height:15px;border-radius:3px;background:var(--layer-color)}.anatomy-toggle span{flex:1;min-width:0}.anatomy-toggle small{font-size:9px;color:#8cabb4}.anatomy-adjust{display:flex;align-items:center;gap:7px;margin-top:10px;font-size:9px;color:#96afb8}.anatomy-adjust input{min-width:0;width:65px;flex:1;padding:0;accent-color:var(--layer-color)}.anatomy-adjust span{width:27px;text-align:right}.anatomy-layer-state{font-size:10px;line-height:1.7;color:#87d5ce;margin:7px 0 0}.anatomy-layer-state button{font-size:10px;padding:3px 6px}.anatomy-error{color:#f5a79a}.anatomy-caution{font-size:10px;line-height:1.8;color:#e9c28b;background:#2e29201c;border-left:2px solid #9e875e;padding:8px 10px}.anatomy-search-label{display:block;font-size:10px;color:#8babb4;margin:20px 0 8px}#anatomySearch{width:100%;font-size:11px;padding:9px}.anatomy-filter{width:100%;margin:8px 0;padding:7px;font-size:10px}.anatomy-result-count{color:#758f9b;font-size:10px;margin:9px 0}.anatomy-parts button{display:flex;align-items:center;gap:9px;width:100%;border:0;border-bottom:1px solid #1d313a;border-radius:0;background:transparent;text-align:left;padding:11px 3px;font-size:11px}.anatomy-parts button:hover,.anatomy-parts button[aria-current=true]{background:#193b41}.anatomy-parts i{width:5px;height:5px;border-radius:50%;flex-shrink:0}.anatomy-parts span{flex:1;overflow-wrap:anywhere}.anatomy-parts small{display:block;font-size:9px;color:#708e9b;margin-top:4px}.anatomy-parts b{color:#638e96}.anatomy-more{width:100%;font-size:11px;margin-top:10px}.anatomy-stage-top{position:absolute;pointer-events:none;top:21px;left:24px;right:24px;display:flex;justify-content:space-between;gap:10px;font-size:10px;color:#6f999f;letter-spacing:1px}.anatomy-tag{color:#93c5c7}.anatomy-loading{position:absolute;top:49px;left:24px;font-size:11px;color:#8adad2;pointer-events:none}.anatomy-load{position:absolute;top:43%;left:12%;right:12%;text-align:center;line-height:1.8;color:#acd4d6;font-size:13px}.anatomy-load button{display:block;margin:12px auto}.anatomy-stage-bottom{position:absolute;bottom:25px;left:24px;right:24px;pointer-events:none;display:grid;gap:9px;text-shadow:0 2px 10px #050f18}.anatomy-stage-bottom>span{color:#77beb9;font-size:10px;letter-spacing:1px}.anatomy-stage-bottom strong{font-size:clamp(18px,2vw,26px);font-weight:400;color:#dcecee;overflow-wrap:anywhere}.anatomy-stage-bottom small{font-size:10px;color:#8dabb4}.anatomy-details h2{font-size:22px;font-weight:400;line-height:1.3;overflow-wrap:anywhere;color:#e1eeee;margin:12px 0}.anatomy-eyebrow{font-size:10px;letter-spacing:2px;color:#79b9b6;margin-top:16px}.anatomy-note,.anatomy-evidence p{font-size:11px;line-height:1.85;color:#96adb9}.anatomy-actions{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0}.anatomy-actions button,.anatomy-points button{font-size:10px;padding:7px 9px}.anatomy-facts{font-size:11px;line-height:1.8;border-top:1px solid #27414a;padding-top:12px}.anatomy-facts dt{font-size:10px;color:#77969e}.anatomy-facts dd{margin:3px 0 13px;color:#c9dddf}.anatomy-evidence{border-top:1px solid #263e47;padding-top:12px;margin-top:18px}.anatomy-evidence h3{font-size:12px;font-weight:500;color:#b9d0d2}.anatomy-evidence a{display:block;font-size:10px;line-height:1.9;margin:7px 0;overflow-wrap:anywhere;color:#7cbebc}.anatomy-credit{font-size:9px!important;color:#6f8f9a!important}.anatomy-points{display:flex;flex-wrap:wrap;gap:5px}.anatomy-traditional h3{color:#dbbf8c}
@media(max-width:600px){.anatomy-stage-top{top:17px;left:15px;right:15px;font-size:8px}.anatomy-stage-bottom{left:16px;bottom:65px;right:100px}.anatomy-stage-bottom strong{font-size:20px}.anatomy-stage-bottom small{font-size:9px}.anatomy-loading{left:15px;font-size:10px}.anatomy-stage-bottom>span{font-size:9px}}
</style>
