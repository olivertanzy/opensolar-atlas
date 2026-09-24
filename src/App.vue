<script setup>
import { computed, ref, shallowRef, watch, onBeforeUnmount, onErrorCaptured, nextTick } from 'vue';
import { modelModules, resolveModule, moduleText, routeFromSearch } from './modules/registry.js';
import { locale, locales, languageNames, t, setLocale } from './i18n/index.js';
import ModelLibrary from './components/ModelLibrary.vue';
import ContributorGuide from './components/ContributorGuide.vue';

const route=ref(routeFromSearch(location.search)),currentView=shallowRef(null),loading=ref(false),failed=ref(false);
const currentModule=computed(()=>route.value.page==='model'?resolveModule(route.value.id):null);
let request=0;
function readLocation(){
 const language=new URLSearchParams(location.search).get('lang');if(locales.includes(language))setLocale(language);
 route.value=routeFromSearch(location.search);
}
function href(page,id){
 const url=new URL(location.href);url.search='';url.searchParams.set('lang',locale.value);
 if(page==='model')url.searchParams.set('model',id);else url.searchParams.set('view',page);
 return url.pathname+url.search;
}
function follow(event){
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();history.pushState(null,'',event.currentTarget.href);readLocation();
 nextTick(()=>document.querySelector('.shell-page h1, .workbench-toolbar h1')?.focus());
}
async function loadModel(){
 const token=++request;currentView.value=null;failed.value=false;loading.value=false;
 if(!currentModule.value)return;
 loading.value=true;
 try{const module=await currentModule.value.loadView();if(token===request)currentView.value=module.default;}
 catch{if(token===request)failed.value=true;}
 finally{if(token===request)loading.value=false;}
}
watch(()=>[route.value.page,route.value.id],loadModel,{immediate:true});
setLocale(locale.value);
watch([locale,()=>route.value.page,()=>route.value.id],()=>{
 document.title=`OpenSolar Atlas · ${currentModule.value?moduleText(currentModule.value,'name',locale.value):t(route.value.page==='guide'?'guideNav':'library')}`;
},{immediate:true});
onErrorCaptured(()=>{failed.value=true;currentView.value=null;loading.value=false;return false;});
window.addEventListener('popstate',readLocation);
onBeforeUnmount(()=>{request++;window.removeEventListener('popstate',readLocation);});
</script>
<template>
 <div class="atlas-shell">
  <header class="shell-header">
   <a class="shell-brand" :href="href('library')" @click="follow" aria-label="OpenSolar Atlas"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 2 13 7.5v13L16 30 3 22.5v-13Z M3 9.5l13 8 13-8 M16 17.5V30 M9.5 6l13 8v12" /></svg><span>OpenSolar <b>Atlas</b><small>{{ t('architectureLabel') }}</small></span></a>
   <nav class="shell-nav" :aria-label="t('library')"><a id="libraryLink" :href="href('library')" :aria-current="route.page==='library'?'page':undefined" @click="follow">{{ t('library') }}</a><a id="guideLink" :href="href('guide')" :aria-current="route.page==='guide'?'page':undefined" @click="follow">{{ t('guideNav') }}</a></nav>
   <select id="language" :aria-label="t('language')" :value="locale" @change="setLocale($event.target.value)"><option v-for="(code,index) in locales" :key="code" :value="code" :lang="code">{{ languageNames[index] }}</option></select>
  </header>
  <div class="shell-content">
   <ModelLibrary v-if="route.page==='library'" :modules="Object.values(modelModules)" :href="href" @navigate="follow" />
   <ContributorGuide v-else-if="route.page==='guide'" />
   <div v-else-if="!currentModule||failed" class="shell-state" role="alert"><span class="shell-kicker">OPENSOLAR ATLAS</span><h1>{{ t(failed?'moduleFailed':'moduleUnavailable') }}</h1><button v-if="failed" @click="loadModel">{{ t('retry') }}</button><a :href="href('library')" @click="follow">{{ t('backLibrary') }} →</a></div>
   <div v-else-if="loading" class="shell-state" role="status"><span class="loading-orbit" aria-hidden="true"></span><p>{{ t('shellLoading') }}</p><a :href="href('library')" @click="follow">{{ t('backLibrary') }}</a></div>
   <component :is="currentView" v-else-if="currentView" :key="route.id" />
  </div>
 </div>
</template>
