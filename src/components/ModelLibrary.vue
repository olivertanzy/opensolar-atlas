<script setup>
import { computed, ref } from 'vue';
import { locale, t } from '../i18n/index.js';
import { moduleText } from '../modules/registry.js';
const props=defineProps({modules:Array,href:Function});
defineEmits(['navigate']);
const query=ref(''),category=ref('');
const categories=computed(()=>[...new Set(props.modules.map(model=>model.category.en))]);
const visible=computed(()=>props.modules.filter(model=>(!category.value||model.category.en===category.value)&&[model.id,...Object.values(model.name),...Object.values(model.category)].join(' ').toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())));
const text=(model,field)=>moduleText(model,field,locale.value);
</script>
<template>
 <main class="shell-page library-page">
  <div class="library-heading"><div><p class="shell-kicker">{{ t('libraryEyebrow') }}</p><h1 tabindex="-1">{{ t('libraryTitle') }}</h1><p class="shell-intro">{{ t('libraryIntro') }}</p></div><span class="library-index" aria-hidden="true">3D<span>ATLAS / 01</span></span></div>
  <div class="library-filter"><h2>{{ t('availableModels') }} <span>{{ modules.length.toString().padStart(2,'0') }}</span></h2><div><input id="modelSearch" v-model="query" type="search" :placeholder="t('searchModels')" :aria-label="t('searchModels')"><select id="modelCategory" v-model="category" :aria-label="t('allSubjects')"><option value="">{{ t('allSubjects') }}</option><option v-for="item in categories" :key="item" :value="item">{{ text(modules.find(model=>model.category.en===item),'category') }}</option></select></div></div>
  <div class="model-grid">
   <article v-for="model in visible" :key="model.id" class="model-card" :data-model="model.id">
    <div class="model-art" aria-hidden="true"><img v-if="model.cover" :src="model.cover" alt="" loading="lazy"><svg v-else viewBox="0 0 560 260"><g stroke="#80cabf" fill="none" stroke-width="2"><path d="m280 30 90 50v100l-90 50-90-50V80Z M190 80l90 50 90-50 M280 130v100"/></g></svg><span>{{ text(model,'category') }}</span><small>{{ t('sourceBacked') }}</small></div>
    <div class="model-card-body"><div class="model-card-heading"><h3>{{ text(model,'name') }}</h3><span>v{{ model.version }}</span></div><p>{{ text(model,'description') }}</p><dl><div><dt>{{ t('moduleUnit') }}</dt><dd>{{ model.unit }}</dd></div><div><dt>{{ t('sourceBacked') }}</dt><dd>{{ model.credit }}</dd></div></dl><a class="primary-link" :href="href('model',model.id)" @click="$emit('navigate',$event)">{{ t('openModel') }} <span>↗</span></a></div>
   </article>
   <div v-if="!visible.length" class="library-empty" role="status"><p>{{ t('noModels') }}</p><button @click="query='';category=''">{{ t('clearSearch') }}</button></div>
   <article class="contribute-card"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="m50 12 34 20v39L50 91 16 71V32Z M16 32l34 20 34-20 M50 52v39"/><path d="M39 31h22M50 20v22"/></svg><span class="shell-kicker">{{ t('templateBadge') }}</span><h3>{{ t('nextSubject') }}</h3><p>{{ t('nextSubjectText') }}</p><a :href="href('guide')" @click="$emit('navigate',$event)">{{ t('contribute') }} <span>→</span></a></article>
  </div>
  <p class="library-footnote">{{ t('frameworkNote') }}</p>
 </main>
</template>
