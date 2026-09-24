const localized=(en,cn,tw,ja,ko)=>({'en':en,'zh-CN':cn,'zh-TW':tw,ja,ko});
export default {
 id:'human-anatomy',version:'0.2.0',unit:'m',
 name:localized('Human anatomy','人体结构','人體結構','人体の構造','인체 구조'),
 category:localized('Life sciences','生命科学','生命科學','生命科学','생명 과학'),
 description:localized('Explore sourced skeletal, vascular and available neural surfaces. Compare a separate, approximate traditional meridian diagram.','分层探索有来源的骨骼、血管和已收录神经结构，另附传统经络近似示意。','分層探索有來源的骨骼、血管及已收錄神經結構，另附傳統經絡近似示意。','出典付きの骨格・血管・収録済み神経構造と、別レイヤーの伝統的経絡概略図。','출처가 있는 골격·혈관·수록 신경 구조와 별도 전통 경락 개략도.'),
 credit:'BodyParts3D / DBCLS · HRA / HuBMAP · CC BY 4.0',
 cover:new URL('./assets/cover.svg',import.meta.url).href,
 loadView:()=>import('./ModelView.vue'),
};
