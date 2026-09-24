<script setup>
import { onMounted,onBeforeUnmount } from 'vue';
import { t } from '../i18n/index.js';
defineProps({title:String,catalogLabel:String,detailsLabel:String,catalogOpen:Boolean,detailsOpen:Boolean,expanded:Boolean,stageClass:String});
const emit=defineEmits(['update:catalogOpen','update:detailsOpen']);
function toggleCatalog(value){emit('update:catalogOpen',value);emit('update:detailsOpen',false);}
function toggleDetails(value){emit('update:detailsOpen',value);emit('update:catalogOpen',false);}
function keydown(event){if(event.key==='Escape'){toggleCatalog(false);toggleDetails(false);}}
onMounted(()=>window.addEventListener('keydown',keydown));
onBeforeUnmount(()=>window.removeEventListener('keydown',keydown));
</script>
<template>
 <section class="model-workbench" :class="{'workbench-expanded':expanded}" :aria-label="title">
  <div class="workbench-toolbar"><h1 tabindex="-1">{{ title }}</h1><div class="workbench-tools"><slot name="toolbar" /></div></div>
  <aside id="catalog" :class="{open:catalogOpen}" :aria-label="catalogLabel"><slot name="catalog" /></aside>
  <main id="viewport" :class="stageClass" :aria-label="title"><slot name="stage" /></main>
  <aside id="details" :class="{open:detailsOpen}" :aria-label="detailsLabel"><div class="panel-heading">{{ detailsLabel }}<button id="closeDetails" :aria-label="t('close')" @click="toggleDetails(false)">×</button></div><slot name="details" /></aside>
  <footer><slot name="status" /></footer>
  <div class="mobile-actions"><button id="catalogButton" :aria-expanded="catalogOpen" aria-controls="catalog" @click="toggleCatalog(!catalogOpen)">☷ {{ catalogLabel }}</button><button id="detailsButton" :aria-expanded="detailsOpen" aria-controls="details" @click="toggleDetails(!detailsOpen)">ⓘ {{ detailsLabel }}</button></div>
  <slot name="overlays" />
 </section>
</template>
