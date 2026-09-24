import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { geographicPoint, geographicCoordinates, densifyRing, placeMatches, geographicName, visiblePlaceRank } from '../src/modules/solar-system/earth-geography.js';
const root=new URL('../data/earth/',import.meta.url);
const countries=JSON.parse(fs.readFileSync(new URL('countries.json',root)));
const cities=JSON.parse(fs.readFileSync(new URL('cities.json',root)));
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
test('geography preserves the pinned source counts, coordinates and provenance',()=>{
 assert.equal(countries.length,242);assert.equal(cities.length,7342);
 assert.equal(new Set([...countries,...cities].map(place=>place.id)).size,7584);
 for(const source of manifest.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('source/'+source.file,root))).digest('hex'),source.sha256);
 for(const [file,hash] of Object.entries(manifest.outputs))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex'),hash);
 const original=JSON.parse(fs.readFileSync(new URL('source/ne_10m_populated_places.geojson',root)));
 const byId=new Map(original.features.map(feature=>[`city-${feature.properties.NE_ID}`,feature]));
 for(const place of cities){assert.deepEqual(place.coordinates,byId.get(place.id).geometry.coordinates);assert.equal(place.capital,byId.get(place.id).properties.ADM0CAP===1);}
 for(const place of [...countries,...cities])for(const locale of ['en','zh-CN','zh-TW','ja','ko'])assert(geographicName(place,locale));
});
test('Earth coordinates use east-positive geographic latitude and the sourced ellipsoid',()=>{
 const axes=[6378.1366,6378.1366,6356.7519];
 geographicPoint([0,0],axes).forEach((value,index)=>assert(Math.abs(value-[axes[0],0,0][index])<1e-9));
 for(const location of [[116.394201,39.90172],[-74.006,40.7128],[179.8,-16],[-179.8,80],[0,90]]){
  const point=geographicPoint(location,axes);
  assert(Math.abs(point.reduce((sum,value,index)=>sum+(value/axes[index])**2,0)-1)<1e-12);
  geographicCoordinates(point,axes).forEach((value,index)=>assert(Math.abs(value-location[index])<1e-8));
 }
 assert(geographicPoint([90,0],axes)[1]>6378);
 const ring=densifyRing([[179,10],[-179,10],[-179,12],[179,10]]);
 assert(ring.length<20,'Do not cross the whole globe at the date line');
 assert(ring.every(([longitude])=>Math.abs(longitude)>=179));
});
test('search covers five source languages and small cities, with zoom-dependent density',()=>{
 const beijing=cities.find(place=>place.names.en==='Beijing');
 for(const query of ['Beijing','北京','北京市','베이징'])assert(placeMatches(beijing,query));
 assert(countries.some(place=>placeMatches(place,'中国')&&place.code==='CHN'));
 const saoPaulo=cities.find(place=>place.names.en==='São Paulo');assert(saoPaulo);assert(placeMatches(saoPaulo,'sao paulo'));
 assert(cities.some(place=>place.rank>=8));
 assert(visiblePlaceRank(6378*1.16,6378)>visiblePlaceRank(6378*4.4,6378));
 assert(!placeMatches(beijing,'not-a-place-xyz'));
});
