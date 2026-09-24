const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),output=path.join(root,'test-results');fs.mkdirSync(output,{recursive:true});
 const production=process.argv.includes('--production');
 const {createServer,preview}=await import('vite');let server,close;
 if(production){
  assert(fs.existsSync(path.join(root,'dist/index.html')),'Run npm run build first');
  server=await preview({root,base:'/opensolar-atlas/',preview:{host:'127.0.0.1',port:0}});
  close=()=>new Promise(resolve=>server.httpServer.close(resolve));
 }else{server=await createServer({root,server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();close=()=>server.close();}
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const origin=`http://127.0.0.1:${server.httpServer.address().port}`,base=origin+(production?'/opensolar-atlas/':'/')+'?model=human-anatomy&lang=zh-CN';
  await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await page.goto(base);const canvas=page.locator('.anatomy-canvas canvas');
  await page.waitForFunction(()=>document.querySelector('.anatomy-canvas canvas')?.dataset.visibleLayers==='skeleton');
  assert.equal(await page.evaluate(()=>typeof window.SOLAR_DATA),'undefined');
  assert.equal(requests.filter(u=>u.endsWith('.glb')).length,1,'Only enabled geometry is downloaded');
  // Regression: all layers, repeated drags, idle rendering and independent samples.
  for(const key of ['arteries','veins','nerves','meridians','surface'])await page.locator(`[data-layer="${key}"]`).check();
  await page.waitForFunction(()=>document.querySelector('.anatomy-canvas canvas')?.dataset.visibleLayers.split(',').length===6,null,{timeout:90000});
  const dragBox=await canvas.boundingBox();
  for(let i=0;i<12;i++){await page.mouse.move(dragBox.x+dragBox.width*.4,dragBox.y+dragBox.height*.45);await page.mouse.down();await page.mouse.move(dragBox.x+dragBox.width*.6,dragBox.y+dragBox.height*.55,{steps:3});await page.mouse.up();}
  await page.waitForTimeout(2500);
  const stats=await canvas.evaluate(c=>({...c.dataset}));assert(Number(stats.drawCalls)<=45,`Batched draw calls: ${stats.drawCalls}`);
  await page.waitForTimeout(500);assert.equal(await canvas.getAttribute('data-frames'),stats.frames,'Idle scene stops rendering');
  assert.equal(await canvas.getAttribute('data-selected'),'','Dragging must not select a part');
  await page.locator('[data-anatomy-action="cutaway"]').click();
  await page.waitForFunction(()=>document.querySelector('.anatomy-canvas canvas').dataset.visibleLayers.split(',').length===6);
  assert.equal(await canvas.getAttribute('data-cutaway'),'true');
  assert.deepEqual((await canvas.getAttribute('data-clipped-layers')).split(',').sort(),['skeleton','surface']);
  for(const key of ['arteries','veins','nerves'])assert((await canvas.getAttribute('data-visible-layers')).includes(key),'Cutaway retains '+key);
  await page.locator('#anatomyCut').fill('-0.02');await page.locator('#anatomyCut').dispatchEvent('input');
  await page.screenshot({path:path.join(output,'anatomy-head-cutaway.png')});
  await page.locator('[data-anatomy-action="cutaway"]').click();
  async function checkPan(){
   await page.locator('[data-anatomy-action="head"]').click();
   const before=(await canvas.getAttribute('data-target')).split(',').map(Number);
   assert(before[1]>1.3,'Head focus changes orbit target');
   await page.locator('[data-anatomy-action="pan"]').click();
   const b=await canvas.boundingBox();
   await page.mouse.move(b.x+b.width*.5,b.y+b.height*.45);await page.mouse.down();
   await page.mouse.move(b.x+b.width*.6,b.y+b.height*.65,{steps:8});await page.mouse.up();
   await page.waitForFunction(initial=>document.querySelector('.anatomy-canvas canvas').dataset.target!==initial,before.join(','));
   const after=(await canvas.getAttribute('data-target')).split(',').map(Number);
   assert(Math.abs(after[1]-before[1])>.01,'Primary drag pans vertically instead of orbiting around the body centre');
   await page.locator('[data-anatomy-action="orbit"]').click();
   await page.locator('[data-anatomy-action="reset"]').click();
  }
  await checkPan();
  for(let cycle=0;cycle<2;cycle++){
   await page.selectOption('#anatomySample','female');
   await page.waitForFunction(()=>['skeleton','surface'].every(k=>document.querySelector('.anatomy-canvas canvas')?.dataset.visibleLayers.includes(k)),null,{timeout:90000});
   assert(await page.locator('[data-layer="meridians"]').isDisabled());
   assert.equal(await canvas.count(),1);
   assert.equal(await page.locator('[data-coverage]').count(),4);
   await checkPan();
   await page.screenshot({path:path.join(output,'anatomy-female.png')});
   await page.locator('[data-anatomy-action="cutaway"]').click();
   await page.waitForFunction(()=>document.querySelector('.anatomy-canvas canvas').dataset.visibleLayers.includes('nerves'),null,{timeout:90000});
   assert.deepEqual((await canvas.getAttribute('data-clipped-layers')).split(',').sort(),['skeleton','surface']);
   await page.screenshot({path:path.join(output,'anatomy-female-head.png')});
   await page.selectOption('#anatomySample','male');
   await page.waitForFunction(()=>document.querySelector('.anatomy-canvas canvas')?.dataset.visibleLayers==='skeleton',null,{timeout:60000});
   assert.equal(await canvas.count(),1);
  }
  console.log('Anatomy all-layer regression:',stats);
  await page.screenshot({path:path.join(output,'anatomy-skeleton.png')});
  await page.fill('#anatomySearch','FMA24475');await page.locator('[data-part="skeleton:FJ3259"]').click();
  assert.match(await canvas.getAttribute('data-selected'),/FJ3259/);
  assert.match(await page.locator('.anatomy-details h2').textContent(),/Left femur/);
  await page.locator('.anatomy-actions button').nth(1).click();
  await page.locator('.anatomy-actions button').nth(1).click();
  await page.locator('.anatomy-actions button').nth(2).click();
  const bounds=await canvas.boundingBox();
  await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  assert(await canvas.getAttribute('data-selected'),'Focused mesh is raycast-selectable');
  await page.locator('[data-anatomy-action="reset"]').click();await page.fill('#anatomySearch','');
  for(const key of ['arteries','veins'])await page.locator(`[data-layer="${key}"]`).check();
  await page.waitForFunction(()=>['arteries','veins'].every(k=>document.querySelector('.anatomy-canvas canvas').dataset.visibleLayers.includes(k)));
  await page.locator('#opacity-skeleton').fill('0.15');await page.locator('#opacity-skeleton').dispatchEvent('input');
  await page.screenshot({path:path.join(output,'anatomy-vascular.png')});
  for(const key of ['skeleton','arteries','veins'])await page.locator(`[data-layer="${key}"]`).uncheck();
  await page.locator('[data-layer="nerves"]').check();await page.waitForFunction(()=>document.querySelector('.anatomy-canvas canvas').dataset.visibleLayers==='nerves');
  await page.locator('[data-anatomy-action="head"]').click();await page.screenshot({path:path.join(output,'anatomy-neural.png')});
  await page.locator('[data-layer="nerves"]').uncheck();await page.locator('[data-layer="surface"]').check();await page.locator('[data-layer="meridians"]').check();
  await page.waitForFunction(()=>document.querySelector('.anatomy-canvas canvas').dataset.visibleLayers.includes('surface'));
  await page.locator('[data-anatomy-action="reset"]').click();await page.screenshot({path:path.join(output,'anatomy-meridians.png')});
  await page.fill('#anatomySearch','合谷');assert.equal(await page.locator('.anatomy-parts button').count(),1);await page.locator('.anatomy-parts button').click();
  assert.equal(await canvas.getAttribute('data-selected'),'point:LI4');
  await page.setViewportSize({width:390,height:844});
  for(const lang of ['en','zh-CN','zh-TW','ja','ko']){
   await page.selectOption('#language',lang);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,lang+' page overflow');
   await page.keyboard.press('Escape');await page.click('#catalogButton');assert(await page.locator('#anatomySearch').isVisible());await page.keyboard.press('Escape');
  }
  await page.selectOption('#language','zh-CN');await page.locator('[data-anatomy-action="reset"]').click();
  await page.screenshot({path:path.join(output,'anatomy-mobile.png')});
  await page.evaluate(()=>{window.anatomyContextLost=false;document.querySelector('.anatomy-canvas canvas').addEventListener('webglcontextlost',()=>window.anatomyContextLost=true);});
  await page.click('#libraryLink');await page.waitForFunction(()=>window.anatomyContextLost);
  assert.equal(await page.locator('.anatomy-canvas canvas').count(),0);
  // A failed layer is recoverable without a page reload.
  await page.setViewportSize({width:1500,height:1000});let fail=true;
  await page.route('**/skeleton*.glb',route=>fail?route.fulfill({status:503,body:'unavailable'}):route.continue());
  await page.goto(base);await page.waitForSelector('.anatomy-layer-state.anatomy-error');fail=false;
  await page.locator('.anatomy-layer-state.anatomy-error button').click();
  await page.waitForFunction(()=>document.querySelector('.anatomy-canvas canvas')?.dataset.visibleLayers==='skeleton');
  assert.equal(await page.locator('.anatomy-canvas canvas').count(),1);
  // A removed hashed asset can return index.html with HTTP 200 after deployment.
  await page.route('**/nerves*.glb',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Atlas</title>'}));
  await page.locator('[data-layer="nerves"]').check();
  await page.waitForSelector('.anatomy-layer-state.anatomy-error');
  assert.match(await page.locator('.anatomy-layer-state.anatomy-error').textContent(),/刷新/);
  await page.unroute('**/nerves*.glb');await page.locator('[data-layer="nerves"]').uncheck();
  // Leave while an optional layer is still downloading; old view must not reattach.
  let intercepted;const blocked=new Promise(resolve=>{intercepted=resolve;});
  await page.route('**/arteries*.glb',route=>{intercepted(route);});
  await page.locator('[data-layer="arteries"]').check();const route=await blocked;
  await page.click('#libraryLink');await route.abort().catch(()=>{});
  assert.equal(await page.locator('.anatomy-canvas').count(),0);
  assert.deepEqual(errors,[]);
  assert(requests.every(url=>url.startsWith(origin)),'Human module must not request remote assets');
  if(production){assert(requests.filter(url=>url.endsWith('.glb')).every(url=>url.includes('/opensolar-atlas/assets/')));}
  console.log(`PASS anatomy (${production?'production subpath':'development'}): local sourced layers, selection, opacity, TCM distinction, five locales, mobile, disposal and retry`);
 }finally{await browser?.close();await close();}
})().catch(e=>{console.error(e);process.exit(1);});
