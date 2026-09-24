import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { locales,messages } from '../src/i18n/messages.js';
import { objectNames } from '../src/i18n/science.js';
import { filterBodies,appearanceKeys,nameOf } from '../src/modules/solar-system/presentation.js';
import { profiles } from '../src/modules/solar-system/profiles.js';
import { modelModules,resolveModule,moduleText,routeFromSearch } from '../src/modules/registry.js';
const root=new URL('../',import.meta.url);
const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('data.js',root),'utf8'),context);
const bodies=context.window.SOLAR_DATA.bodies;
const records=JSON.parse(fs.readFileSync(new URL('data/discovery-records.json',root),'utf8'));

test('all five locales have nonempty messages and identical interpolation parameters',()=>{
 assert.deepEqual(locales,['en','zh-CN','zh-TW','ja','ko']);
 const parameters=value=>(value.match(/\{\w+\}/g)||[]).sort();
 for(const locale of locales){
  assert.deepEqual(Object.keys(messages[locale]),Object.keys(messages.en));
  for(const [key,text] of Object.entries(messages[locale])){assert.equal(typeof text,'string',`${locale}:${key}`);assert(text.trim(),`${locale}:${key}`);assert.deepEqual(parameters(text),parameters(messages.en[key]),`${locale}:${key}`);}
 }
 for(const values of Object.values(objectNames))assert.equal(values.filter(Boolean).length,5);
});
test('search accepts all localized names, original names and spaced temporary designations',()=>{
 const options={tab:'systems',parent:'all',mappedOnly:false};
 for(const search of ['Earth','地球','지구'])assert.equal(filterBodies(bodies,{...options,search})[0].id,'399');
 for(const search of ['Uranus','天王星','천왕성'])assert.equal(filterBodies(bodies,{...options,search})[0].id,'799');
 assert.equal(filterBodies(bodies,{...options,search:'エンケラドゥス'})[0].id,'602');
 assert.equal(filterBodies(bodies,{...options,search:'S/2009 S 1'}).length,1);
 assert.equal(filterBodies(bodies,{...options,tab:'moons',search:''}).length,461);
 assert(filterBodies(bodies,{...options,tab:'moons',parent:'699',mappedOnly:true,search:''}).every(body=>body.parent==='699'&&body.texture));
 assert.equal(filterBodies(bodies,{...options,search:'not-a-celestial-object'}).length,0);
});
test('every object has localized evidence text, a profile or a matched official discovery record',()=>{
 assert.equal(bodies.length,471);assert.equal(Object.keys(records.records).length,460);
 assert.equal(Object.keys(profiles).length,32);
 for(const body of bodies){
  const profile=profiles[body.key],record=records.records[body.key];
  assert(profile||record,`missing background: ${body.name}`);
  for(const locale of locales){assert(nameOf(body,locale));for(const key of appearanceKeys(body))assert(messages[locale][key],`${body.name}:${key}:${locale}`);}
  if(profile){assert.equal(profile.text.filter(Boolean).length,5);assert.equal(new URL(profile.source).hostname,'science.nasa.gov');}
  if(record){assert.equal(record.year,body.discovered,body.name);assert(record.discoverers,body.name);assert.equal(new URL(record.source).hostname,'ssd.jpl.nasa.gov');}
 }
 const sha=crypto.createHash('sha256').update(fs.readFileSync(new URL('data/discovery.html',root))).digest('hex');assert.equal(records.sourceSha256,sha);
});
test('only implemented modules can be selected; no anatomy placeholder is advertised',()=>{
 assert.equal(resolveModule('not-registered'),null);assert.equal(resolveModule('toString'),null);assert.equal(resolveModule('solar-system').unit,'km');
 for(const [id,model] of Object.entries(modelModules)){
  assert.equal(id,model.id);assert.equal(typeof model.loadView,'function');assert(model.unit&&model.credit&&model.version);
  for(const locale of locales)for(const field of ['name','category','description'])assert(model[field][locale]?.trim(),`${id}:${field}:${locale}`);
  assert.equal(moduleText(model,'name','unknown'),model.name.en);
 }
 assert.deepEqual(routeFromSearch(''),{page:'library'});
 assert.deepEqual(routeFromSearch('?body=399'),{page:'model',id:'solar-system'});
 assert.deepEqual(routeFromSearch('?model=anatomy'),{page:'model',id:'anatomy'});
 assert.deepEqual(routeFromSearch('?view=guide&body=399'),{page:'guide'});
});
test('physical tables retain source units, uncertainties and signed retrograde periods',()=>{
 const physical=JSON.parse(fs.readFileSync(new URL('data/physical-records.json',root),'utf8'));
 const field=(id,key)=>physical.records[id].values.find(value=>value.key===key);
 assert.equal(Object.keys(physical.records).length,55);
 assert(field('399','radius').value.startsWith('6371.0084'));
 assert(field('399','radius').value.includes('±0.0001'));
 assert.equal(field('399','mass').unit,'×10²⁴ kg');
 assert.equal(field('999','mass').unit,'×10¹⁸ kg');
 assert(field('999','mass').value.startsWith('13024.6'));
 assert(field('299','rotationPeriod').value.startsWith('-243.018'));
 assert.equal(field('301','gm').unit,'km³/s²');
 assert(field('301','radius').value.startsWith('1737.4 ± 0.1'));
 for(const [file,sha] of Object.entries(physical.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('data/'+file,root))).digest('hex'),sha);
});
