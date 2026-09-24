// WGS84-style geographic latitude is a surface-normal angle, not geocentric latitude.
// Use the scene's sourced reference axes; do not change its physical radius.
export function geographicPoint([longitude,latitude],axes,height=0){
 const lon=longitude*Math.PI/180,lat=latitude*Math.PI/180;
 const n=[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)];
 const denominator=Math.hypot(...axes.map((axis,index)=>axis*n[index]));
 return axes.map((axis,index)=>axis*axis*n[index]/denominator+height*n[index]);
}
export function geographicCoordinates(point,axes){
 const normal=point.map((value,index)=>value/(axes[index]*axes[index]));
 return [Math.atan2(normal[1],normal[0])*180/Math.PI,Math.atan2(normal[2],Math.hypot(normal[0],normal[1]))*180/Math.PI];
}
export function geographicName(place,locale='en'){return place?.shortNames?.[locale]||place?.names[locale]||place?.names.en||'';}
export function normalizePlaceSearch(value){return String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('en').replace(/[\s’'‐–-]/g,'');}
export function placeMatches(place,query){
 const needle=normalizePlaceSearch(query);
 return !needle||[...Object.values(place.names),...(place.aliases||[]),place.admin1,place.countryName].filter(Boolean).some(value=>normalizePlaceSearch(value).includes(needle));
}
// Densification follows the short route across ±180°, avoiding globe-spanning seams.
export function densifyRing(ring,maxStep=1){
 const points=[];
 for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i];const delta=((b[0]-a[0]+540)%360)-180;
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(delta),Math.abs(b[1]-a[1]))/maxStep));
  for(let j=0;j<steps;j++)points.push([a[0]+delta*j/steps,a[1]+(b[1]-a[1])*j/steps]);
 }
 if(ring.length)points.push(ring[ring.length-1]);return points;
}
export function visiblePlaceRank(distance,radius){
 const altitude=Math.max(.06,distance/radius-1);
 return altitude>2.5?1:altitude>1?3:altitude>.45?5:altitude>.18?7:10;
}
export async function loadEarthGeography(signal){
 const base=import.meta.env.BASE_URL;
 const [countries,cities,manifest]=await Promise.all(['countries','cities','manifest'].map(async file=>{
  const response=await fetch(`${base}data/earth/${file}.json`,{signal});
  if(!response.ok)throw new Error(`Earth geography ${file}: HTTP ${response.status}`);
  return response.json();
 }));
 if(!Array.isArray(countries)||!Array.isArray(cities)||countries.length!==manifest.counts.countries||cities.length!==manifest.counts.cities)throw new Error('Invalid geography snapshot');
 return {countries,cities,manifest};
}
