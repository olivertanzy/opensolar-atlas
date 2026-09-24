import { loadSolarData } from './loadSolarData.js';

export default {
 id:'solar-system', unit:'km', version:'0.1.0',
 cover:new URL('./cover.svg',import.meta.url).href,
 name:{en:'Solar system', 'zh-CN':'太阳系', 'zh-TW':'太陽系', ja:'太陽系', ko:'태양계'},
 category:{en:'Astronomy', 'zh-CN':'天文学', 'zh-TW':'天文學', ja:'天文学', ko:'천문학'},
 description:{
  en:'Explore planets, moons and Earth geography at a shared physical scale. Inspect the evidence behind every object.',
  'zh-CN':'在统一真实尺度下探索行星、卫星与地球地理，查看每个天体背后的资料依据。',
  'zh-TW':'在統一真實尺度下探索行星、衛星與地球地理，查看每個天體背後的資料依據。',
  ja:'共通の実際の縮尺で惑星・衛星・地球の地理を探索し、各天体の出典を確認できます。',
  ko:'같은 실제 비율로 행성, 위성, 지구 지리를 탐색하고 각 천체의 근거 자료를 확인합니다.',
 },
 credit:'NASA · JPL · Natural Earth',
 async loadView(){await loadSolarData();return import('./SolarExplorer.vue');},
};
