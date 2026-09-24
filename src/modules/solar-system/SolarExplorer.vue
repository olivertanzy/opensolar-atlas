<script setup>
import { computed, ref, shallowRef, reactive, watch, onMounted, onBeforeUnmount } from 'vue';
import SceneViewport from '../../components/SceneViewport.vue';
import ModelWorkbench from '../../components/ModelWorkbench.vue';
import BodyProfile from '../../components/BodyProfile.vue';
import { locale, t, number } from '../../i18n/index.js';
import { nameOf, appearanceKeys, filterBodies } from './presentation.js';
import EarthGeography from './EarthGeography.vue';
import { loadEarthGeography, geographicName } from './earth-geography.js';

const data=window.SOLAR_DATA;
const bodies=data?.bodies||[],byId=new Map(bodies.map(body=>[body.key,body]));
const initial=new URLSearchParams(location.search).get('body');
const selectedKey=ref(byId.has(initial)?initial:'399');
const selected=computed(()=>byId.get(selectedKey.value));
const search=ref(''),tab=ref('systems'),parent=ref('all'),mappedOnly=ref(false),showLabels=ref(true),showMoons=ref(true);
const catalogOpen=ref(false),detailsOpen=ref(false),expanded=ref(false),ready=ref(false),error=ref(data?null:{key:'loadError'});
const scene=ref(null),method=ref(null);
let imageryEnabled=true;
try{imageryEnabled=localStorage.getItem('opensolar.imagery')!=='off';}catch{/* A storage restriction must not prevent viewing. */}
const earthData=shallowRef(null),earthLoading=ref(false),earthError=ref(false),earthOptions=ref({borders:true,cities:true,imagery:imageryEnabled}),earthPlace=shallowRef(null);
watch(()=>earthOptions.value.imagery,value=>{try{localStorage.setItem('opensolar.imagery',value?'on':'off');}catch{/* Keep the in-memory choice. */}});
let earthController;
async function loadEarth(){
 if(earthData.value||earthLoading.value)return;
 earthController=new AbortController();earthLoading.value=true;earthError.value=false;
 try{earthData.value=await loadEarthGeography(earthController.signal);}
 catch(error){if(error.name!=='AbortError')earthError.value=true;}
 finally{earthLoading.value=false;}
}
function focusPlace(place){earthPlace.value=place;scene.value?.focusPlace(place);detailsOpen.value=false;catalogOpen.value=false;}
watch(selectedKey,key=>{if(key==='399')loadEarth();else earthPlace.value=null;},{immediate:true});
const view=reactive({mode:'close',distance:35000,notice:'',zoomMin:0,zoomMax:11,imagery:{status:'idle'}});
const visibleBodies=computed(()=>filterBodies(bodies,{search:search.value,tab:tab.value,parent:parent.value,mappedOnly:mappedOnly.value}));
const parents=bodies.filter(body=>body.kind!=='moon'&&bodies.some(moon=>moon.parent===body.id));
const name=body=>nameOf(body,locale.value);
const distance=value=>value>=data.auKm*.08?`${number(value/data.auKm,5)} AU`:`${number(value,1)} km`;
const systemCenter=computed(()=>byId.get(selected.value?.parent)||selected.value);
const systemCount=computed(()=>bodies.filter(body=>body.parent===systemCenter.value?.id&&body.positionKm).length);
const caption=computed(()=>view.mode==='all'?t('all'):view.mode==='inner'?t('inner'):view.mode==='system'?t('systemName',{name:name(systemCenter.value)}):earthPlace.value&&selectedKey.value==='399'?`${name(selected.value)} · ${geographicName(earthPlace.value,locale.value)}`:name(selected.value));
const layer=computed(()=>view.mode==='system'?t('systemCount',{count:systemCount.value}):view.mode==='all'||view.mode==='inner'?t('trueScale'):selected.value?t(appearanceKeys(selected.value)[0]):'');
const modeLabel=computed(()=>t({close:'closeView',all:'overview',inner:'inner',system:'system'}[view.mode]));
function selectBody(key){selectedKey.value=key;catalogOpen.value=false;}
function reload(){location.reload();}
function status(body){return body.kind!=='moon'?t(body.kind):t(!body.positionKm?'noPosition':!body.axesKm?'marker':!body.texture?'placeholder':'mapped');}
function showSystem(id){tab.value='moons';parent.value=id;search.value='';mappedOnly.value=false;catalogOpen.value=true;detailsOpen.value=false;expanded.value=false;}
function keydown(event){
 if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName)||method.value?.open)return;
 if(event.key==='+')scene.value?.zoomBy(.8);
 if(event.key==='-')scene.value?.zoomBy(1.25);
 if(event.key==='Escape'){catalogOpen.value=false;detailsOpen.value=false;expanded.value=false;}
}
watch(selectedKey,key=>{const url=new URL(location.href);url.searchParams.set('body',key);history.replaceState(null,'',url);});
onMounted(()=>window.addEventListener('keydown',keydown));
onBeforeUnmount(()=>{earthController?.abort();window.removeEventListener('keydown',keydown);});
const sources=[['JPL · Satellite catalogue','https://ssd.jpl.nasa.gov/sats/discovery.html'],['JPL · Physical parameters','https://ssd.jpl.nasa.gov/sats/phys_par/'],['JPL · Horizons','https://ssd-api.jpl.nasa.gov/doc/horizons.html'],['NAIF · PCK','https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc'],['NASA / ESA · Hubble OPAL','https://archive.stsci.edu/hlsp/opal'],['NASA · LRO','https://svs.gsfc.nasa.gov/4720/']];
</script>

<template>
 <ModelWorkbench :title="t('title')" :catalog-label="t('catalog')" :details-label="t('details')" v-model:catalog-open="catalogOpen" v-model:details-open="detailsOpen" :expanded="expanded" :stage-class="selectedKey==='399'&&earthPlace&&view.mode==='close'?'earth-location':''">
 <template #toolbar>
  <div class="epoch"><i></i><span>{{ t('epoch') }}<strong>2026.09.24 · 00:00 TDB</strong></span></div>
  <button id="methodButton" @click="method.showModal()">{{ t('method') }} ↗</button>
 </template>
 <template #catalog>
  <div class="panel-heading"><span>{{ t('catalog') }}</span><span id="bodyCount">{{ visibleBodies.length }} / {{ bodies.length }}</span></div>
  <label class="search"><span aria-hidden="true">⌕</span><input id="search" v-model="search" :placeholder="t('search')" :aria-label="t('search')"></label>
  <div class="list-tabs"><button v-for="key in ['systems','moons']" :key="key" :data-tab="key" :class="{active:tab===key}" :aria-pressed="tab===key" @click="tab=key">{{ t(key) }}</button></div>
  <div id="filters" :class="{show:tab==='moons'}"><select id="parentFilter" v-model="parent" :aria-label="t('allSystems')"><option value="all">{{ t('allSystems') }}</option><option v-for="body in parents" :key="body.key" :value="body.id">{{ t('systemName',{name:name(body)}) }}</option></select><label><input id="mappedOnly" v-model="mappedOnly" type="checkbox">{{ t('mappedOnly') }}</label></div>
  <nav id="bodyList" :aria-label="t('catalog')"><p v-if="!visibleBodies.length" class="empty">{{ t('empty') }}</p><button v-for="body in visibleBodies" :key="body.key" class="body-item" :class="{selected:selectedKey===body.key}" :data-kind="body.kind" :data-id="body.key" :aria-label="name(body)" :aria-current="selectedKey===body.key?'true':undefined" @click="selectBody(body.key)"><span class="body-thumb" :class="{unmapped:!body.texture}" :style="body.texture?{backgroundImage:`url('${data.textures[body.texture]}')`}:{}"></span><span class="body-name"><b>{{ name(body) }}</b><small>{{ name(body)!==body.name?body.name:body.id?`HORIZONS ${body.id}`:body.designation }}</small></span><span class="item-status">{{ status(body) }}</span></button></nav>
  <div class="catalog-foot"><span class="dot"></span>{{ t('snapshot') }}<br><small>{{ t('scope') }}</small></div>
 </template>
 <template #stage>
  <SceneViewport v-if="data" ref="scene" :data="data" :selected="selectedKey" :labels="showLabels" :moons="showMoons" :earth-data="earthData" :earth-options="earthOptions" @place="focusPlace" @select="selectBody" @state="Object.assign(view,$event)" @error="error=$event" @ready="ready=true" />
  <div class="view-head"><span id="viewMode">{{ modeLabel }}</span><span class="scale-badge">{{ t('scale') }}</span></div>
  <div class="view-tools"><button id="overview" :class="{active:view.mode==='all'}" :disabled="!ready" @click="scene.frameWide(false)">{{ t('overview') }}</button><button id="inner" :class="{active:view.mode==='inner'}" :disabled="!ready" @click="scene.frameWide(true)">{{ t('inner') }}</button><button id="system" :class="{active:view.mode==='system'}" :disabled="!ready" @click="scene.frameSystem()">{{ t('system') }}</button><button id="expandView" :aria-pressed="expanded" @click="expanded=!expanded">{{ t(expanded?'collapse':'expand') }}</button><button id="focus" :class="{active:view.mode==='close'}" :disabled="!ready" @click="scene.frameBody()">{{ t('focus') }}</button></div>
  <div id="sceneMessage" role="status">{{ view.notice?t(view.notice):'' }}</div>
  <div class="view-caption"><span id="targetCaption">{{ caption }}</span><small id="layerCaption">{{ layer }}</small></div>
  <div class="zoom-tools"><button id="zoomIn" :aria-label="t('zoomIn')" :disabled="!ready" @click="scene.zoomBy(.65)">＋</button><button id="zoomOut" :aria-label="t('zoomOut')" :disabled="!ready" @click="scene.zoomBy(1.55)">−</button></div>
  <div class="view-bottom"><div><span id="distanceLabel">{{ t('cameraDistance') }}</span><strong id="cameraDistance">{{ data?distance(view.distance):'—' }}</strong></div><label class="zoom-label">{{ t('near') }}<input id="zoom" type="range" :min="view.zoomMin" :max="view.zoomMax" step="0.001" :value="Math.log10(view.distance)" :aria-label="t('cameraDistance')" :disabled="!ready" @input="scene.setZoom(Number($event.target.value))">{{ t('far') }}</label><button id="resetView" :disabled="!ready" @click="scene.resetAngles()">{{ t('reset') }} ↺</button></div>
  <div v-if="!ready&&!error" class="loading-state" role="status">{{ t('loading') }}</div>
  <div v-if="error" id="error" role="alert"><p>{{ t(error.key,{name:error.name}) }}</p><button @click="reload">{{ t('retry') }}</button></div>
 </template>
 <template #details><EarthGeography v-if="selectedKey==='399'" :data="earthData" :loading="earthLoading" :error="earthError" :ready="ready" :options="earthOptions" :selected="earthPlace" :imagery="view.imagery" @focus="focusPlace" @options="earthOptions=$event" @retry="loadEarth" /><BodyProfile v-if="selected" :body="selected" :data="data" @select="selectBody" @moons="showSystem" /></template>
 <template #status><div><span class="live-dot"></span><span id="renderStatus">{{ ready?t('status',{count:data.summary.moons}):t('loading') }}</span></div><div class="switches"><label><input id="showLabels" v-model="showLabels" type="checkbox">{{ t('labels') }}</label><label><input id="showMoons" v-model="showMoons" type="checkbox">{{ t('showMoons') }}</label><span class="lighting-note">{{ t('unlit') }}</span></div><span class="gestures">{{ t('gestures') }}</span></template>
 <template #overlays>
 <dialog id="method" ref="method" aria-labelledby="methodHeading"><div class="modal-head"><span>{{ t('method') }}</span><button id="closeMethod" :aria-label="t('close')" @click="method.close()">×</button></div><div class="method-content"><div class="kicker">OPENSOLAR ATLAS</div><h1 id="methodHeading">{{ t('methodTitle') }}</h1><p>{{ t('methodIntro') }}</p><div v-if="data" id="summary"><div v-for="key in ['moons','positions','sizes','textures']" :key="key"><b>{{ data.summary[key] }}</b><small>{{ t(key) }}</small></div></div><section v-for="key in ['Scale','Maps','Geometry','Scope']" :key="key"><h2>{{ t(`method${key}Title`) }}</h2><p>{{ t(`method${key}`) }}</p></section><div class="source-grid"><a v-for="[label,url] in sources" :key="url" :href="url" target="_blank" rel="noopener">{{ label }} ↗</a></div><p class="credit" lang="en">Hubble OPAL: NASA/ESA HST, PI Simon, GO13937. Archived by STScI, operated by AURA under NASA contract NAS 5-26555. <a href="https://doi.org/10.17909/T9G593" target="_blank" rel="noopener">doi:10.17909/T9G593</a>. Illustrations: Solar System Scope / INOVE, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. <a href="./THIRD_PARTY.md" target="_blank" rel="noopener">Asset credits & modifications</a>.</p></div></dialog>
 </template>
 </ModelWorkbench>
</template>
