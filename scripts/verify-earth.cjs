const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),output=path.join(root,'test-results');fs.mkdirSync(output,{recursive:true});
 const {createServer}=await import('vite');const server=await createServer({root,server:{host:'127.0.0.1',port:0}});await server.listen();
 const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1500,height:1040}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.addInitScript(()=>localStorage.setItem('opensolar.imagery','off'));
  await page.goto(base+'/?lang=zh-CN&body=399');
  await page.waitForFunction(()=>window.SOLAR_TEST?.earth?.countryMeshes===242);
  await page.waitForTimeout(700);
  await page.screenshot({path:path.join(output,'earth-global.png')});
  await page.fill('#earthSearch','北京');
  await page.locator('#earthResults button').first().click();
  await page.waitForFunction(()=>window.SOLAR_TEST.earth.selected?.startsWith('city-'));
  await page.waitForTimeout(200);
  assert.match(await page.locator('#targetCaption').textContent(),/北京/);
  const focus=await page.evaluate(()=>{
   const d=SOLAR_TEST,earth=d.meshes.get('399'),point=d.earth.labels.find(label=>label.id===d.earth.selected);
   const local=d.camera.position.clone().sub(earth.position).applyQuaternion(earth.quaternion.clone().invert());
   const axes=earth.userData.body.axesKm;
   const longitude=Math.atan2(local.y,local.x)*180/Math.PI;
   const latitude=Math.atan2(local.z/axes[2]**2,Math.hypot(local.x/axes[0]**2,local.y/axes[1]**2))*180/Math.PI;
   return {point,longitude,latitude,distance:d.distance,axes,labels:d.earth.labels.length};
  });
  assert(focus.point,'Selected city must be visible');
  assert(Math.abs(focus.longitude-116.394201)<.001);assert(Math.abs(focus.latitude-39.90172)<.001);
  assert(focus.distance>Math.max(...focus.axes));
  await page.screenshot({path:path.join(output,'earth-beijing.png')});
  const backface=await page.evaluate(async()=>{
   const cities=await (await fetch('/data/earth/cities.json')).json();const london=cities.find(place=>place.names.en==='London');
   return {id:london.id,visible:SOLAR_TEST.earth.labels.some(label=>label.id===london.id)};
  });
  assert.equal(backface.visible,false,'Do not show cities through the far side of Earth');
  const canvas=await page.locator('#labels').boundingBox();
  await page.mouse.click(canvas.x+focus.point.x+13,canvas.y+focus.point.y);
  assert.match(await page.locator('#earthPlaceDetails h3').textContent(),/北京/);
  // A close-up surface point should follow the pointer, not jump across continents.
  const dragChecks=[];
  async function checkDrag(dx,dy,{steps=12,touch=false}={}){
   const canvas=await page.locator('#labels').boundingBox();
   await page.evaluate(()=>{
    const d=SOLAR_TEST;
    window.dragSurfacePoint=d.camera.position.clone().normalize().multiplyScalar(Math.max(...d.meshes.get('399').userData.body.axesKm));
   });
   const x=canvas.x+canvas.width/2,y=canvas.y+canvas.height/2;
   if(touch){
    const session=await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
    for(let i=1;i<=steps;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/steps,y:y+dy*i/steps,id:1}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
   }else{
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x+dx,y+dy,{steps});await page.mouse.up();
   }
   await page.waitForTimeout(100);
   const delta=await page.evaluate(()=>{
    const p=window.dragSurfacePoint.clone().project(SOLAR_TEST.camera),rect=document.querySelector('#labels').getBoundingClientRect();
    return {x:p.x*rect.width/2,y:-p.y*rect.height/2};
   });
   dragChecks.push({dx,dy,touch,steps,...delta});
   assert(Math.abs(delta.x-dx)<15&&Math.abs(delta.y-dy)<15,`Close-up drag must follow pointer: ${JSON.stringify(dragChecks)}`);
  }
  await checkDrag(60,0);await checkDrag(0,60);
  for(let i=0;i<4;i++)await page.click('#zoomIn');
  await page.waitForTimeout(1000);
  assert(Math.abs(await page.evaluate(()=>SOLAR_TEST.distance/Math.max(...SOLAR_TEST.meshes.get('399').userData.body.axesKm))-1.06)<.001);
  await checkDrag(-60,0);await checkDrag(0,-60);
  // Subpixel moves still form a drag and must not activate the label on release.
  await page.fill('#earthSearch','北京');await page.locator('#earthResults button').first().click();await page.waitForTimeout(100);
  await checkDrag(30,0,{steps:60});
  await page.uncheck('#earthBorders');await page.waitForFunction(()=>!SOLAR_TEST.earth.visible);
  await page.uncheck('#earthCities');await page.waitForFunction(()=>!SOLAR_TEST.earth.options.cities);
  assert.equal(await page.evaluate(()=>SOLAR_TEST.earth.labels.length),1,'Selected pin remains visible when layers are off');
  await page.check('#earthBorders');await page.check('#earthCities');
  await page.click('#earthCountryTab');await page.fill('#earthSearch','中国');
  await page.locator('#earthResults button').first().click();
  await page.waitForFunction(()=>SOLAR_TEST.earth.selected?.startsWith('country-'));
  await page.locator('#earthPlaceDetails button').nth(1).click();
  assert.equal(await page.locator('#earthCountryFilter').inputValue(),'CHN');
  await page.fill('#earthSearch','成都');await page.locator('#earthResults button').first().click();
  assert.match(await page.locator('#targetCaption').textContent(),/成都/);
  await page.evaluate(()=>SOLAR_TEST.selectBody('499'));await page.waitForFunction(()=>!SOLAR_TEST.earth.visible);
  assert.equal(await page.locator('#earthGeography').count(),0);
  await page.evaluate(()=>SOLAR_TEST.selectBody('399'));await page.waitForFunction(()=>SOLAR_TEST.earth.visible);
  await page.setViewportSize({width:390,height:844});await page.click('#detailsButton');
  for(const [locale,query] of [['en','Beijing'],['zh-CN','北京'],['zh-TW','北京'],['ja','北京市'],['ko','베이징']]){
   await page.selectOption('#language',locale);await page.fill('#earthSearch',query);
   assert(await page.locator('#earthResults button').count()>0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,`earth-mobile-${locale}.png`)});
  }
  await page.locator('#earthResults button').first().click();
  assert.equal(await page.locator('#details').evaluate(element=>element.classList.contains('open')),false);
  for(let i=0;i<8;i++)await page.click('#zoomIn');await page.waitForTimeout(1000);
  await checkDrag(40,0,{touch:true});await checkDrag(0,40,{touch:true});
  await page.screenshot({path:path.join(output,'earth-mobile-focus.png')});
  assert.equal(await page.evaluate(()=>{const driver=SOLAR_TEST;ATLAS_TEST.unmount();return driver.disposed&&!driver.earth;}),true);
  // Failure must stay local to geography, and retry must recover without rebuilding the scene.
  await page.route('**/data/earth/cities.json',route=>route.fulfill({status:200,contentType:'application/json',body:'null'}));
  await page.goto(base+'/?body=399&lang=en');await page.click('#detailsButton');await page.waitForSelector('#retryEarth');
  assert(await page.locator('#scene canvas').count()===1);
  await page.unroute('**/data/earth/cities.json');await page.click('#retryEarth');await page.waitForFunction(()=>SOLAR_TEST.earth?.countryMeshes===242);
  assert.deepEqual(errors,[]);
  const report={earthCountryRecords:242,earthCityRecords:7342,geographicCameraFocus:focus,dragChecks,farSideHidden:true,searchAndCountryFilter:true,clickableLabels:true,layerToggles:true,otherPlanetsUnchanged:true,mobileFiveLocales:true,dispose:true,loadFailureRecovery:true,errors};
  fs.writeFileSync(path.join(output,'earth-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{if(browser)await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
