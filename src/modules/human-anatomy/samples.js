import male from './assets/catalog.json';
import female from './assets/female/catalog.json';
export const samples={
 male:{catalog:male,urls:{
  skeleton:new URL('./assets/skeleton.glb',import.meta.url).href,
  arteries:new URL('./assets/arteries.glb',import.meta.url).href,
  veins:new URL('./assets/veins.glb',import.meta.url).href,
  nerves:new URL('./assets/nerves.glb',import.meta.url).href,
  surface:new URL('./assets/surface.glb',import.meta.url).href,
 }},
 female:{catalog:female,urls:{
  skeleton:new URL('./assets/female/skeleton.glb',import.meta.url).href,
  arteries:new URL('./assets/female/arteries.glb',import.meta.url).href,
  veins:new URL('./assets/female/veins.glb',import.meta.url).href,
  nerves:new URL('./assets/female/nerves.glb',import.meta.url).href,
  surface:new URL('./assets/female/surface.glb',import.meta.url).href,
 }},
};
