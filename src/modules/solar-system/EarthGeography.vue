<script setup>
import { computed, ref } from 'vue';
import { locale, t, number } from '../../i18n/index.js';
import { geographicName, placeMatches } from './earth-geography.js';
const props=defineProps({data:Object,loading:Boolean,error:Boolean,ready:Boolean,options:{type:Object,required:true},selected:Object,imagery:Object});
const emit=defineEmits(['focus','options','retry']);
const query=ref(''),kind=ref('city'),country=ref('all');
const name=place=>geographicName(place,locale.value);
const countryMap=computed(()=>new Map((props.data?.countries||[]).map(place=>[place.code,place])));
const sortedCountries=computed(()=>[...(props.data?.countries||[])].sort((a,b)=>name(a).localeCompare(name(b),locale.value)));
const results=computed(()=>{
 const source=kind.value==='country'?sortedCountries.value:props.data?.cities||[];
 return source.filter(place=>(kind.value==='country'||country.value==='all'||place.country===country.value)&&placeMatches(place,query.value));
});
const visible=computed(()=>results.value.slice(0,query.value.trim()||country.value!=='all'?40:8));
const region=place=>place.kind==='country'?place.code:name(countryMap.value.get(place.country))||place.countryName;
function toggle(key,event){emit('options',{...props.options,[key]:event.target.checked});}
function browse(place){kind.value='city';country.value=place.code;query.value='';}
</script>
<template>
 <section id="earthGeography" class="earth-geography" :aria-labelledby="'earthHeading'">
  <div class="earth-heading"><h2 id="earthHeading">{{ t('earthExplore') }}</h2><span>EARTH / 01</span></div>
  <p v-if="loading" class="note" role="status">{{ t('earthLoading') }}</p>
  <div v-else-if="error" class="earth-load-error" role="alert"><p>{{ t('earthError') }}</p><button id="retryEarth" @click="emit('retry')">{{ t('retry') }}</button></div>
  <template v-else-if="data">
   <p class="earth-count">{{ t('earthCounts',{countries:number(data.countries.length,0),cities:number(data.cities.length,0)}) }}</p>
   <label class="earth-hd-toggle"><input id="earthHD" type="checkbox" :checked="options.imagery" @change="toggle('imagery',$event)">{{ t('earthHD') }}</label>
   <p id="earthImageryStatus" class="earth-imagery-status" role="status" :data-status="options.imagery?(imagery?.status||'idle'):'off'">{{ t(!options.imagery?'earthHDOff':imagery?.status==='ready'?'earthHDReady':imagery?.status==='fallback'?'earthHDFallback':imagery?.status==='loading'?'earthHDLoading':'earthHDIdle',{loaded:imagery?.loaded||0,total:imagery?.total||0}) }}</p>
   <a class="earth-imagery-credit" href="https://gibs.earthdata.nasa.gov/layer-metadata/v1.0/BlueMarble_ShadedRelief_Bathymetry.json" target="_blank" rel="noopener">NASA GIBS · Blue Marble · 2004 · {{ t('earthHDSource') }} ↗</a>
   <div class="earth-switches"><label><input id="earthBorders" type="checkbox" :checked="options.borders" @change="toggle('borders',$event)">{{ t('earthBorders') }}</label><label><input id="earthCities" type="checkbox" :checked="options.cities" @change="toggle('cities',$event)">{{ t('earthCities') }}</label></div>
   <label class="search earth-search"><span aria-hidden="true">⌕</span><input id="earthSearch" v-model="query" :placeholder="t('earthSearch')" :aria-label="t('earthSearch')" type="search"></label>
   <div class="earth-tabs"><button id="earthCountryTab" :aria-pressed="kind==='country'" @click="kind='country'">{{ t('earthCountries') }}</button><button id="earthCityTab" :aria-pressed="kind==='city'" @click="kind='city'">{{ t('earthTowns') }}</button></div>
   <select v-if="kind==='city'" id="earthCountryFilter" v-model="country" :aria-label="t('earthAllCountries')"><option value="all">{{ t('earthAllCountries') }}</option><option v-for="place in sortedCountries" :key="place.id" :value="place.code">{{ name(place) }}</option></select>
   <ul id="earthResults" class="earth-results"><li v-for="place in visible" :key="place.id"><button :data-place="place.id" :aria-label="`${name(place)} · ${t('earthGo')}`" :aria-current="selected?.id===place.id?'true':undefined" :disabled="!ready" @click="emit('focus',place)"><span><b>{{ name(place) }}</b><small>{{ region(place) }}<template v-if="place.capital"> · ★</template></small></span><span aria-hidden="true">↗</span></button></li></ul>
   <p class="earth-result-count" role="status">{{ results.length?t('earthResults',{shown:visible.length,total:number(results.length,0)}):t('earthEmpty') }}</p>
   <section v-if="selected" id="earthPlaceDetails" class="earth-place-card">
    <h3>{{ name(selected) }}</h3><p>{{ selected.kind==='country'?t('earthCountries'):selected.capital?t('earthCapital'):t('earthCity') }}</p>
    <dl><template v-if="selected.kind==='city'"><dt>{{ t('earthCountries') }}</dt><dd>{{ region(selected) }}</dd><template v-if="selected.admin1"><dt>{{ t('earthRegion') }}</dt><dd>{{ selected.admin1 }}</dd></template></template><dt>{{ t('earthCoordinates') }}</dt><dd>{{ number(selected.coordinates[1],4) }}° / {{ number(selected.coordinates[0],4) }}°</dd></dl>
    <button class="earth-relocate" :disabled="!ready" @click="emit('focus',selected)">{{ t('earthGo') }} ↗</button>
    <button v-if="selected.kind==='country'" class="earth-relocate" @click="browse(selected)">{{ t('earthListCities') }}</button>
    <a v-if="selected.geonamesId" :href="`https://www.geonames.org/${selected.geonamesId}/`" target="_blank" rel="noopener">GeoNames · {{ t('earthGeoSource') }} ↗</a>
   </section>
   <details class="earth-provenance"><summary>{{ t('earthSource') }}</summary><p>{{ t('earthCoverage') }}</p><p>{{ t('earthPolicy') }}</p><a :href="data.manifest.countriesSource" target="_blank" rel="noopener">Natural Earth · {{ t('earthCountries') }} ↗</a><a :href="data.manifest.citiesSource" target="_blank" rel="noopener">Natural Earth · {{ t('earthTowns') }} ↗</a><a :href="data.manifest.boundaryPolicy" target="_blank" rel="noopener">Natural Earth · {{ t('earthSource') }} ↗</a></details>
  </template>
 </section>
</template>
