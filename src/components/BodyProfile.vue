<script setup>
import { computed } from 'vue';
import { locale, locales, t, number } from '../i18n/index.js';
import { nameOf, appearanceKeys } from '../modules/solar-system/presentation.js';
import { profiles } from '../modules/solar-system/profiles.js';
import discovery from '../../data/discovery-records.json';
import physical from '../../data/physical-records.json';

const props=defineProps({body:{type:Object,required:true},data:{type:Object,required:true}});
defineEmits(['select','moons']);
const name=body=>nameOf(body,locale.value);
const parent=computed(()=>props.data.bodies.find(body=>body.key===props.body.parent));
const children=computed(()=>props.data.bodies.filter(body=>body.parent===props.body.id));
const featured=computed(()=>children.value.filter(body=>body.texture||body.radiusKm>500).slice(0,8));
const profile=computed(()=>profiles[props.body.key]);
const record=computed(()=>discovery.records[props.body.key]);
const parameters=computed(()=>physical.records[props.body.key]);
const appearance=computed(()=>appearanceKeys(props.body));
const geometryKey=computed(()=>!props.body.axesKm?'missingSize':props.body.id==='10'?'nominalInfo':props.body.shape==='mean-radius-sphere'?'sphereInfo':'ellipsoidInfo');
const distance=value=>value>=props.data.auKm*.08?`${number(value/props.data.auKm,5)} AU`:`${number(value,3)} km`;
const metricRows=computed(()=>{
 const b=props.body,p=parent.value;
 return [
  ['kind',t(b.kind)],['parent',p?name(p):b.kind==='star'?'—':name(props.data.bodies[0])],
  ['axes',b.axesKm?b.axesKm.map(value=>number(value,4)).join(' / ')+' km':t('noSize')],
  ['radius',b.radiusKm?number(b.radiusKm,4)+(b.radiusSigmaKm?' ± '+number(b.radiusSigmaKm,4):'')+' km':parameters.value?.values.find(field=>field.key==='radius')?.value?parameters.value.values.find(field=>field.key==='radius').value+' km':t('unknown')],
  ['sunDistance',b.positionKm?distance(Math.hypot(...b.positionKm)):t('noPosition')],
  ...(p?[['parentDistance',p.positionKm&&b.positionKm?distance(Math.hypot(...b.positionKm.map((value,index)=>value-p.positionKm[index]))):t('noPosition')]]:[]),
  ['speed',b.velocityKmS?number(Math.hypot(...b.velocityKmS),5)+' km/s':t('unknown')],
  ['id',b.id||t('unknown')],['attitude',b.rotation?'SPICE IAU / PCK':t('unknown')],
 ];
});
const discoveryRows=computed(()=>{
 const r=record.value;
 if(!r)return props.body.id==='301'?[['discovered',t('prehistoric')]]:[];
 return [['officialName',r.officialName||r.designation],['designation',r.designation||t('noDesignation')],['discovered',r.year],['discoverers',r.discoverers||t('unknown')],['references',r.references||t('unknown')]];
});
</script>
<template>
 <article id="bodyDetails" :data-body="body.key">
  <div class="english" lang="en">{{ body.name }}</div><h1>{{ name(body) }}</h1>
  <span class="data-badge" :class="{warn:!body.texture}">{{ t(appearance[0]) }}</span>
  <section class="profile-intro"><h2 class="note-title">{{ t('overviewTitle') }}</h2>
   <p class="note profile-description">{{ profile?profile.text[locales.indexOf(locale)]:t('catalogIntro',{name:name(body),parent:name(parent)}) }}</p>
   <p v-if="!profile" class="note">{{ t('limitedNarrative') }}</p>
   <a v-if="profile" class="source-link" :href="profile.source" target="_blank" rel="noopener">NASA · {{ t('officialArticle') }}</a>
   <a v-else class="source-link" :href="body.catalogSource" target="_blank" rel="noopener">{{ t('catalogSource') }}</a>
   <p class="source-date">{{ t('editorial') }}<br>{{ t('checked',{date:profile?.checked||discovery.snapshot}) }}</p>
  </section>
  <section v-if="discoveryRows.length"><h2 class="note-title">{{ t('discovery') }}</h2><dl class="metrics discovery-metrics"><div v-for="[key,value] in discoveryRows" :key="key" class="metric"><dt>{{ t(key) }}</dt><dd>{{ value }}</dd></div></dl><a class="source-link" :href="record?.source||body.catalogSource" target="_blank" rel="noopener">JPL · {{ t('catalogSource') }}</a></section>
  <h2 class="note-title">{{ t('facts') }}</h2><dl class="metrics"><div v-for="[key,value] in metricRows" :key="key" class="metric"><dt>{{ t(key) }}</dt><dd>{{ value }}</dd></div></dl>
  <p class="note">{{ t('speedNote') }}</p>
  <section v-if="parameters"><h2 class="note-title">{{ t('officialParameters') }}</h2><dl class="metrics physical-metrics"><div v-for="field in parameters.values" :key="field.key" class="metric"><dt>{{ t(field.key) }}</dt><dd>{{ field.value===null?t('unknown'):field.value }}<template v-if="field.value!==null"> {{ field.unit }}</template></dd></div></dl><p class="note">{{ t('parameterNote') }}</p><a class="source-link" :href="parameters.source" target="_blank" rel="noopener">{{ t('physicalSource') }}</a></section>
  <a v-if="body.shapeSource" class="source-link" :href="body.shapeSource" target="_blank" rel="noopener">{{ t('shapeSource') }}</a><a v-if="body.radiusSource" class="source-link" :href="body.radiusSource" target="_blank" rel="noopener">{{ t('radiusSource') }}</a>
  <h2 class="note-title">{{ t('appearance') }}</h2><p class="note">{{ t(appearance[1]) }}</p><a v-if="body.textureSource" class="source-link" :href="body.textureSource" target="_blank" rel="noopener">{{ t('mapSource') }}</a>
  <a v-if="['699','799','899'].includes(body.id)" class="source-link" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">Solar System Scope / INOVE · CC BY 4.0 ↗</a>
  <template v-if="body.referenceImage"><img class="reference-image" :src="body.referenceImage" :alt="t('reference')"><p class="note">{{ t('reference') }}</p></template>
  <h2 class="note-title">{{ t('geometry') }}</h2><p class="note">{{ t(geometryKey) }}</p><p v-if="!body.rotation" class="note">{{ t('noRotation') }}</p>
  <template v-if="body.id==='699'"><p class="note">{{ t('ringInfo') }}</p><a class="source-link" href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html" target="_blank" rel="noopener">{{ t('ringSource') }}</a></template>
  <h2 class="note-title">{{ t('coordinates') }}</h2><div class="coordinates">{{ body.positionKm?body.positionKm.map((value,index)=>'XYZ'[index]+'  '+number(value,3)).join('\n'):t('missingPosition') }}</div><a v-if="body.ephemerisSource" class="source-link" :href="body.ephemerisSource" target="_blank" rel="noopener">{{ t('rawSource') }}</a>
  <h2 class="note-title">{{ t('coverage') }}</h2><ul class="profile-facts"><li>{{ t('coveragePosition',{epoch:'2026-09-24 00:00 TDB',status:t(body.positionKm?'available':'notAvailable')}) }}</li><li>{{ t('coverageSize',{status:t(body.axesKm?'available':'notAvailable')}) }}</li><li>{{ t('coverageMap',{status:t(appearance[0])}) }}</li></ul>
  <template v-if="children.length"><h2 class="note-title">{{ t('children',{count:children.length}) }}</h2><div class="child-links"><button v-for="child in featured" :key="child.key" :data-child="child.key" @click="$emit('select',child.key)">{{ name(child) }}</button></div><button id="listSystemMoons" class="more-moons" @click="$emit('moons',body.id)">{{ t('listChildren') }}</button></template>
  <details :key="body.key" class="original-notes"><summary>{{ t('original') }}</summary><div lang="zh-CN"><p v-for="(text,index) in [body.appearance,body.observation,body.registration,body.geometryNote].filter(Boolean)" :key="index" class="note">{{ text }}</p></div></details>
 </article>
</template>
