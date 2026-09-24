<script setup>
import { computed,ref,onMounted,onBeforeUnmount,watch } from 'vue';
import ModelWorkbench from '@/components/ModelWorkbench.vue';
import { locale,locales } from '@/i18n/index.js';
import { moduleText } from '@/modules/registry.js';
import model from './module.js';
import { createScene } from './scene.js';

const rows={
 objects:['Parts','部件','部件','パーツ','부품'],
 details:['Model information','模型信息','模型資訊','モデル情報','모델 정보'],
 cube:['Example cube','示例立方体','範例立方體','立方体の例','예제 정육면체'],
 description:['A 1 × 1 × 1 m cube made with Three.js BoxGeometry. Integration example only, not a scientific reconstruction.','使用 Three.js BoxGeometry 生成的 1 × 1 × 1 米立方体。仅用于演示接入，不是科学重建。','使用 Three.js BoxGeometry 產生的 1 × 1 × 1 公尺立方體。僅用於示範接入，並非科學重建。','Three.js BoxGeometry の1 × 1 × 1 m立方体。接続例であり、科学的な再構成ではありません。','Three.js BoxGeometry로 만든 1 × 1 × 1 m 정육면체입니다. 연동 예제이며 과학적 재구성이 아닙니다.'],
 visible:['Show part','显示部件','顯示部件','パーツを表示','부품 표시'],
 reset:['Reset view','重置视角','重設視角','視点をリセット','시점 초기화'],
 status:['Drag to orbit · Scroll or pinch to zoom','拖动旋转 · 滚轮或双指缩放','拖曳旋轉 · 滾輪或雙指縮放','ドラッグで回転 · スクロール・ピンチで拡大','드래그 회전 · 스크롤 또는 핀치 확대'],
 failure:['Could not initialize WebGL. Return to the library and retry.','WebGL 初始化失败，请返回模型库重试。','WebGL 初始化失敗，請返回模型庫重試。','WebGLを初期化できません。ライブラリから再試行してください。','WebGL을 초기화할 수 없습니다. 라이브러리에서 다시 시도하세요.'],
};
const text=key=>rows[key][locales.indexOf(locale.value)]||rows[key][0];
const title=computed(()=>moduleText(model,'name',locale.value));
const host=ref(null),catalogOpen=ref(false),detailsOpen=ref(false),visible=ref(true),failed=ref(false);
// Never put the renderer, scene or meshes in a deeply reactive ref.
let driver;
onMounted(()=>{try{driver=createScene(host.value);}catch{failed.value=true;}});
watch(visible,value=>driver?.setVisible(value));
onBeforeUnmount(()=>driver?.dispose());
</script>
<template>
 <ModelWorkbench :title="title" :catalog-label="text('objects')" :details-label="text('details')" v-model:catalog-open="catalogOpen" v-model:details-open="detailsOpen">
  <template #toolbar><button @click="driver?.reset()">{{ text('reset') }}</button></template>
  <template #catalog><div class="panel-heading">{{ text('objects') }}</div><label><input v-model="visible" type="checkbox">{{ text('visible') }}</label><p>{{ text('cube') }}</p></template>
  <template #stage><div ref="host" class="structure-canvas" :aria-label="text('cube')"></div><p v-if="failed" class="loading-state" role="alert">{{ text('failure') }}</p></template>
  <template #details><h2>{{ text('cube') }}</h2><p class="structure-note">{{ text('description') }}</p><p class="structure-note">1 unit = 1 {{ model.unit }}<br>Three.js BoxGeometry · MIT</p></template>
  <template #status><span>{{ text('status') }}</span></template>
 </ModelWorkbench>
</template>
<style scoped>
.structure-canvas{position:absolute;inset:0;touch-action:none}.structure-canvas :deep(canvas){display:block;width:100%;height:100%}.structure-note{line-height:1.9;color:#a9c1cd;font-size:12px}
</style>
