import { ref } from 'vue';
import { locales, messages, languageNames } from './messages.js';
export { locales, languageNames };
const storageKey='opensolar.locale';
export function resolveLocale(query, saved){return locales.includes(query)?query:locales.includes(saved)?saved:'en';}
let saved;
try{saved=localStorage.getItem(storageKey);}catch{/* Storage may be disabled. */}
export const locale=ref(resolveLocale(new URLSearchParams(location.search).get('lang'),saved));
export function t(key,params={}){
 const text=messages[locale.value][key]??messages.en[key]??key;
 return text.replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??`{${name}}`));
}
export function setLocale(value){
 locale.value=locales.includes(value)?value:'en';
 document.documentElement.lang=locale.value;
 document.title=`OpenSolar Atlas · ${t('title')}`;
 try{localStorage.setItem(storageKey,locale.value);}catch{/* Selection still works without storage. */}
 const url=new URL(location.href);url.searchParams.set('lang',locale.value);history.replaceState(null,'',url);
}
export function number(value,digits=2){return Number.isFinite(value)?new Intl.NumberFormat(locale.value,{maximumFractionDigits:digits}).format(value):t('unknown');}
