import { objectNames } from '../../i18n/science.js';
import { locales } from '../../i18n/messages.js';

export const nameOf=(body,locale)=>body?objectNames[body.key]?.[locales.indexOf(locale)]||body.name:'';
const mapKeys={'10':'sun','199':'mercury','299':'venus','399':'earth','499':'mars','599':'jupiter','301':'moon','501':'io','606':'titan','999':'pluto'};
export function appearanceKeys(body){
 if(!body.texture)return ['placeholder',body.axesKm?'placeholderNotice':'missingSize'];
 if(['699','799','899'].includes(body.id))return ['illustratedMap','illustrationInfo'];
 const key=mapKeys[body.id]||'legacy';return [`${key}Map`,`${key}Info`];
}
export function filterBodies(bodies,{search,tab,parent,mappedOnly}){
 const query=search.trim().toLowerCase().replace(/\s/g,'');
 return bodies.filter(body=>{
  if(query){if(![body.name,body.zh,body.id,body.designation,...(objectNames[body.key]||[])].some(value=>String(value??'').toLowerCase().replace(/\s/g,'').includes(query)))return false;}
  else if(tab==='moons'?body.kind!=='moon':body.kind==='moon')return false;
  if(tab==='moons'&&parent!=='all'&&body.parent!==parent)return false;
  return !(tab==='moons'&&mappedOnly&&!body.texture);
 });
}
