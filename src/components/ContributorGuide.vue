<script setup>
import { computed } from 'vue';
import { locale,t } from '../i18n/index.js';
const documentation=computed(()=>locale.value.startsWith('zh')?'./docs/ADDING_A_MODEL.zh-CN.html':'./docs/ADDING_A_MODEL.html');
const steps=['Start','Register','Model','Verify'];
</script>
<template>
 <main class="shell-page guide-page">
  <p class="shell-kicker">VUE 3 / THREE.JS / OPEN SOURCE</p><h1 tabindex="-1">{{ t('guideTitle') }}</h1><p class="shell-intro">{{ t('guideIntro') }}</p>
  <div class="guide-layout"><ol class="guide-steps"><li v-for="(step,index) in steps" :key="step"><span class="step-number">0{{ index+1 }}</span><div><h2>{{ t('guide'+step) }}</h2><p>{{ t('guide'+step+'Text') }}</p><pre v-if="step==='Start'"><code>npm run create:model -- my-structure</code></pre><pre v-if="step==='Register'"><code>src/modules/registry.js

import myStructure from './my-structure/module.js';
// modelModules
[myStructure.id]: myStructure,</code></pre><pre v-if="step==='Verify'"><code>npm test
npm run test:shell
npm run build
npm run test:production</code></pre></div></li></ol>
   <section class="guide-map"><span class="shell-kicker">{{ t('architectureLabel') }}</span><div class="guide-layer">App shell<small>{{ t('library') }} · {{ t('language') }}</small></div><span class="map-connector">↓</span><div class="guide-layer">ModelWorkbench<small>catalog · stage · details · status</small></div><span class="map-connector">↓</span><div class="guide-layer accent">Your module<small>module.js · ModelView.vue · scene.js</small></div><a id="fullGuide" class="primary-link" :href="documentation" target="_blank" rel="noopener">{{ t('fullGuide') }} ↗</a><a href="./docs/ARCHITECTURE.html" target="_blank" rel="noopener">Architecture ↗</a></section>
  </div>
 </main>
</template>
