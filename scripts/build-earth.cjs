// Reproducible, offline conversion of the pinned Natural Earth v5.1.2 GeoJSON.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../data/earth');
const files=['ne_50m_admin_0_countries.geojson','ne_10m_populated_places.geojson'];
const sources=files.map(file=>{
 const bytes=fs.readFileSync(path.join(root,'source',file));
 return {file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),url:`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/${file}`,data:JSON.parse(bytes)};
});
const valid=value=>typeof value==='string'&&value.trim()&&value!=='-99';
const names=p=>Object.fromEntries([['en','NAME_EN'],['zh-CN','NAME_ZH'],['zh-TW','NAME_ZHT'],['ja','NAME_JA'],['ko','NAME_KO']].map(([locale,key])=>[locale,valid(p[key])?p[key]:p.NAME]));
const aliases=p=>[...new Set(['NAME','NAMEASCII','NAMEALT','NAME_LONG','FORMAL_EN','ISO_A2','ADM0_A3'].map(key=>p[key]).filter(valid))];
const displayNames=Object.fromEntries(['en','zh-CN','zh-TW','ja','ko'].map(locale=>[locale,new Intl.DisplayNames([locale],{type:'region',style:'short'})]));
const countries=sources[0].data.features.map(feature=>{
 const p=feature.properties,geometry=feature.geometry;
 if(!['Polygon','MultiPolygon'].includes(geometry.type))throw new Error('Unexpected country geometry');
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 const shortNames=/^[A-Z]{2}$/.test(p.ISO_A2_EH)?Object.fromEntries(Object.entries(displayNames).map(([locale,formatter])=>[locale,formatter.of(p.ISO_A2_EH)])):names(p);
 return {id:`country-${p.NE_ID}`,code:p.ADM0_A3,kind:'country',names:names(p),shortNames,aliases:[...new Set([...aliases(p),...Object.values(shortNames)])],coordinates:[p.LABEL_X,p.LABEL_Y],rank:p.LABELRANK,classification:p.TYPE,region:p.SUBREGION,polygons};
});
const cities=sources[1].data.features.map(feature=>{
 const p=feature.properties;
 if(feature.geometry.type!=='Point')throw new Error('Unexpected city geometry');
 return {id:`city-${p.NE_ID}`,kind:'city',names:names(p),aliases:aliases(p),coordinates:feature.geometry.coordinates,country:p.ADM0_A3,countryName:p.ADM0NAME,admin1:p.ADM1NAME||null,capital:p.ADM0CAP===1,rank:p.SCALERANK,geonamesId:p.GEONAMESID>0?p.GEONAMESID:null};
}).sort((a,b)=>a.rank-b.rank||Number(b.capital)-Number(a.capital)||a.id.localeCompare(b.id));
for(const list of [countries,cities]){
 if(new Set(list.map(place=>place.id)).size!==list.length)throw new Error('Duplicate place ID');
 for(const place of list){const [lon,lat]=place.coordinates;if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)throw new Error(`Invalid coordinates: ${place.id}`);}
}
for(const [file,data] of [['countries.json',countries],['cities.json',cities]])fs.writeFileSync(path.join(root,file),JSON.stringify(data)+'\n');
const manifest={provider:'Natural Earth',repositoryTag:'v5.1.2',retrieved:'2026-09-24',license:'Public domain',licenseUrl:'https://www.naturalearthdata.com/about/terms-of-use/',boundaryPolicy:'https://www.naturalearthdata.com/about/disputed-boundaries-policy/',countriesSource:'https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/',citiesSource:'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/',countryScale:'1:50 million',cityScale:'1:10 million',counts:{countries:countries.length,cities:cities.length},sources:sources.map(({data,...source})=>source),outputs:Object.fromEntries(['countries.json','cities.json'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]))};
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Earth geography: ${countries.length} country/region records, ${cities.length} populated places.`);
