import solarSystem from './solar-system/module.js';
// MODULE_IMPORTS: import new module manifests here.
// Only working, reviewed subjects are registered; templates are not catalogue entries.
export const modelModules = Object.freeze({
 [solarSystem.id]:solarSystem,
 // MODULE_ENTRIES: add [yourModule.id]:yourModule here.
});
export function resolveModule(id){return Object.hasOwn(modelModules,id)?modelModules[id]:null;}
export function moduleText(model,field,locale='en'){return model[field]?.[locale]||model[field]?.en||'';}
export function routeFromSearch(search){
 const params=new URLSearchParams(search);
 if(params.get('view')==='guide')return {page:'guide'};
 if(params.get('view')==='library')return {page:'library'};
 const id=params.get('model')||(params.has('body')?'solar-system':null);
 return id?{page:'model',id}:{page:'library'};
}
