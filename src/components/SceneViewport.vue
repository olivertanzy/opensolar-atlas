<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { locale, t } from '../i18n/index.js';
import { nameOf } from '../modules/solar-system/presentation.js';
import { geographicName } from '../modules/solar-system/earth-geography.js';

const props=defineProps({data:{type:Object,required:true},selected:{type:String,required:true},labels:Boolean,moons:Boolean,earthData:Object,earthOptions:Object});
const emit=defineEmits(['select','place','state','error','ready']);
const host=ref(null),labelsCanvas=ref(null);
let driver=null,unmounted=false;
onMounted(async()=>{
 try{
  const module=await import('../modules/solar-system/createSolarScene.js');
  if(unmounted)return;
  driver=module.createSolarScene({host:host.value,viewport:host.value.parentElement,labelCanvas:labelsCanvas.value,data:props.data,selectedKey:props.selected,getName:body=>nameOf(body,locale.value),getPlaceName:place=>geographicName(place,locale.value),onPlaceSelect:place=>emit('place',place),onSelect:key=>emit('select',key),onState:state=>emit('state',state),onError:(key,name)=>emit('error',{key,name})});
  driver.setLabels(props.labels);driver.setMoons(props.moons);
  driver.setEarthOptions(props.earthOptions);if(props.earthData)driver.setEarthData(props.earthData);
  if(import.meta.env.DEV||import.meta.env.MODE==='test')window.SOLAR_TEST=driver.diagnostics;
  emit('ready');
 }catch(error){console.error(error);emit('error',{key:'initError'});}
});
watch(()=>props.selected,key=>{if(driver?.diagnostics.selected!==key)driver?.selectBody(key);});
watch(()=>props.labels,value=>driver?.setLabels(value));
watch(()=>props.moons,value=>driver?.setMoons(value));
watch(locale,()=>driver?.invalidate());
watch(()=>props.earthData,value=>driver?.setEarthData(value));
watch(()=>props.earthOptions,value=>driver?.setEarthOptions(value),{deep:true});
onBeforeUnmount(()=>{unmounted=true;driver?.dispose();if(window.SOLAR_TEST===driver?.diagnostics)delete window.SOLAR_TEST;});
defineExpose({
 frameBody:()=>driver?.frameBody(),frameWide:inner=>driver?.frameWide(inner),frameSystem:()=>driver?.frameSystem(),
 zoomBy:factor=>driver?.zoomBy(factor),setZoom:value=>driver?.setZoom(value),resetAngles:()=>driver?.resetAngles(),
 focusPlace:place=>driver?.focusEarthPlace(place),
});
</script>
<template>
 <div id="scene" ref="host"></div>
 <canvas id="labels" ref="labelsCanvas" :aria-label="t('labels')"></canvas>
</template>
