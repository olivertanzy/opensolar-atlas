const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
(async()=>{
 const root=path.resolve(__dirname,'..');const output=path.join(root,'test-results');fs.mkdirSync(output,{recursive:true});
 const {createServer}=await import('vite');
 const server=await createServer({root,server:{host:'127.0.0.1',port:0}});await server.listen();
 const base='http://127.0.0.1:'+server.httpServer.address().port;
 const browser=await chromium.launch({...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{}),headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:980}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' '+m.location().url)});
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.addInitScript(()=>localStorage.setItem('opensolar.imagery','off'));
 await page.goto(base+'/?model=solar-system');
 await page.waitForFunction(()=>window.SOLAR_TEST?.meshes.size>0);
 await page.waitForTimeout(1800);
 for(const id of ['10','199','699','799','899']){
  await page.evaluate(id=>SOLAR_TEST.selectBody(id),id);
  await page.waitForTimeout(300);
  await page.screenshot({path:path.join(output,'preview-'+id+'.png')});
  if(['799','899'].includes(id)){
   await page.mouse.move(400,500);await page.mouse.down();await page.mouse.move(920,500,{steps:24});await page.mouse.up();await page.waitForTimeout(200);
   await page.screenshot({path:path.join(output,'preview-'+id+'-reverse.png')});
  }
 }
 const report=await page.evaluate(()=>{
  const t=SOLAR_TEST,b=t.data.bodies;
  const fail=[];
  const assert=(v,s)=>{if(!v)fail.push(s)};
  const saturn=t.meshes.get('699');assert(saturn.material.uniforms.maskBlack.value===0,'Saturn illustration must not use observation mask');
  for(const id of ['799','899']){assert(t.meshes.get(id).material.uniforms.maskBlack.value===0&&!t.data.missingMasks[id],'Illustrated hemisphere must not use missing mask');assert(b.find(x=>x.id===id).appearanceType.includes('补绘'),'Illustration disclosure');}
  const rings=t.world.children.filter(m=>m.userData.ringBounds);
  assert(JSON.stringify(rings.map(m=>m.userData.ringBounds))===JSON.stringify([[66900,74510],[74658,91975],[91975,117507],[122340,136780]]),'Ring bounds or Cassini division');
  assert(rings.every(m=>m.isMesh&&m.quaternion.angleTo(saturn.quaternion)<1e-7),'Rings must share Saturn equatorial orientation');
  assert(new Set(b.map(x=>x.key)).size===b.length,'duplicate body key');
  assert(b.filter(x=>x.kind==='moon').length===461,'catalog count');
  for(const x of b){
   if(x.positionKm)assert(x.jdTdb===2461307.5,'mixed epoch '+x.name);
   const m=t.meshes.get(x.key);
   if(!x.axesKm)assert(!m,'invented size '+x.name);
   if(!x.positionKm)assert(!m,'invented position '+x.name);
   if(m){assert(Math.abs(m.scale.x-Math.max(...x.axesKm))<1e-8,'size scale '+x.name);assert(m.scale.x===m.scale.y&&m.scale.y===m.scale.z,'unequal rendering scale');}
   if(x.texture)assert(!!t.data.textures[x.texture]&&!!x.textureSource,'missing texture provenance');
  }
  t.selectBody('599');
  assert(t.origin.every((v,i)=>v===b.find(x=>x.id==='599').positionKm[i]),'camera origin');
  for(const m of t.meshes.values())assert(m.position.toArray().every((v,i)=>Math.abs(v-(m.userData.body.positionKm[i]-t.origin[i]))<1e-6),'distance scaling');
  return {summary:t.data.summary,fail,meshCount:t.meshes.size};
 });
 report.defaultEnglish=await page.locator('html').getAttribute('lang')==='en';
 report.languages=[];
 for(const [code,caption] of [['en','Earth'],['zh-CN','地球'],['zh-TW','地球'],['ja','地球'],['ko','지구']]){
  await page.selectOption('#language',code);await page.evaluate(()=>SOLAR_TEST.selectBody('399'));
  await page.waitForFunction(caption=>document.querySelector('#bodyDetails h1').textContent===caption,caption);
  report.languages.push({code,lang:await page.locator('html').getAttribute('lang'),description:await page.locator('.profile-description').textContent()});
  await page.screenshot({path:path.join(output,'locale-'+code+'.png')});
 }
 await page.reload();await page.waitForFunction(()=>window.SOLAR_TEST?.meshes.size>0);
 report.languageRemembered=await page.locator('#language').inputValue()==='ko';
 await page.goto(base+'/?lang=ja&body=699');await page.waitForFunction(()=>window.SOLAR_TEST?.meshes.size>0);
 report.deepLink=await page.locator('html').getAttribute('lang')==='ja'&&await page.evaluate(()=>SOLAR_TEST.selected==='699');
 await page.selectOption('#language','en');
 await page.waitForTimeout(500);
 const initialDistance=await page.evaluate(()=>SOLAR_TEST.distance);
 await page.click('#zoomIn');
 await page.waitForTimeout(900);
 report.zoomCloser=await page.evaluate(d=>SOLAR_TEST.distance<d&&SOLAR_TEST.distance>Math.max(...SOLAR_TEST.data.bodies.find(b=>b.key===SOLAR_TEST.selected).axesKm),initialDistance);
 await page.click('#expandView');
 report.expanded=await page.evaluate(()=>document.querySelector('#viewport').getBoundingClientRect().width===innerWidth);
 await page.click('#expandView');
 await page.evaluate(()=>SOLAR_TEST.selectBody('799'));
 await page.waitForTimeout(300);
 await page.screenshot({path:path.join(output,'preview-missing-region.png')});
 report.unlit=await page.evaluate(()=>SOLAR_TEST.meshes.get('799').material.fragmentShader.includes('float light=1.0;')&&!document.querySelector('#fillLight'));
 await page.evaluate(()=>SOLAR_TEST.selectBody('999'));
 report.plutoTextured=await page.evaluate(()=>SOLAR_TEST.meshes.get('999').material.uniforms.placeholder.value===0&&SOLAR_TEST.meshes.get('999').material.uniforms.maskBlack.value===1);
 await page.screenshot({path:path.join(output,'preview-999.png')});
 report.solidPlaceholder=await page.evaluate(()=>[...SOLAR_TEST.meshes.values()].some(m=>!m.material.wireframe&&m.material.uniforms.placeholder.value===1));
 await page.evaluate(()=>SOLAR_TEST.selectBody('599'));
 await page.waitForTimeout(300);
 await page.screenshot({path:path.join(output,'preview-desktop.png')});
 await page.click('[data-tab="moons"]');
 report.moonRows=await page.locator('#bodyList button').count();
 await page.fill('#search','S/2009 S 1');
 report.searchRows=await page.locator('#bodyList button').count();
 await page.evaluate(()=>SOLAR_TEST.selectBody(SOLAR_TEST.data.bodies.find(b=>!b.positionKm&&!b.id).key));
 await page.waitForFunction(()=>document.querySelector('#sceneMessage').textContent.includes('No position'));
 report.missingNotice=await page.locator('#sceneMessage').textContent();
 await page.click('#methodButton');
 report.dialog=await page.locator('#method').evaluate(e=>e.open);
 await page.click('#closeMethod');
 await page.evaluate(()=>SOLAR_TEST.selectBody('301'));
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(500);
 report.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.screenshot({path:path.join(output,'preview-mobile.png')});
 await page.click('#detailsButton');
 report.mobileDetails=await page.locator('#details').evaluate(e=>e.classList.contains('open'));
 report.mobileLocales=[];
 for(const code of ['en','zh-CN','zh-TW','ja','ko']){
  await page.selectOption('#language',code);
  await page.screenshot({path:path.join(output,'mobile-'+code+'.png')});
  report.mobileLocales.push({code,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 report.dispose=await page.evaluate(()=>{const old=SOLAR_TEST;ATLAS_TEST.unmount();return old.disposed&&old.meshes.size===0&&!window.SOLAR_TEST&&document.querySelectorAll('#scene canvas').length===0;});
 await page.evaluate(()=>ATLAS_TEST.mount());await page.waitForFunction(()=>window.SOLAR_TEST?.meshes.size>0);
 report.remount=await page.locator('#scene canvas').count()===1;
 report.errors=errors;
 if(!report.defaultEnglish||!report.languageRemembered||!report.deepLink||!report.dispose||!report.remount||report.mobileLocales.some(row=>row.overflow)||report.languages.some(row=>row.code!==row.lang||!row.description))report.fail.push('Locale / lifecycle verification failed');
 if(report.moonRows!==461||report.searchRows!==1||!report.missingNotice.includes('No position')||report.mobileOverflow||errors.length||!report.dialog||!report.mobileDetails||!report.zoomCloser||!report.expanded||!report.unlit||!report.solidPlaceholder||!report.plutoTextured)report.fail.push('UI verification failed');
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(report.fail.length)process.exitCode=1;
 }finally{await browser.close();await server.close();}
})();
