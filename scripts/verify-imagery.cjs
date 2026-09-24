const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),output=path.join(root,'test-results'),live=process.env.IMAGERY_LIVE==='1';
 fs.mkdirSync(output,{recursive:true});
 const {createServer}=await import('vite'),server=await createServer({root,server:{host:'127.0.0.1',port:0}});await server.listen();
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1600,height:1060}}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().startsWith('https://gibs.earthdata.nasa.gov/'))requests.push(request.url());});
  if(!live)await page.route('https://gibs.earthdata.nasa.gov/**',route=>route.fulfill({status:200,contentType:'image/jpeg',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(path.join(root,'data/earth/source/gibs-sample-7-20-118.jpeg'))}));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?lang=zh-CN&body=399`);
  await page.waitForFunction(()=>window.SOLAR_TEST?.earth?.countryMeshes===242);
  assert.equal(await page.locator('#earthHD').isChecked(),true);
  await page.fill('#earthSearch','石河子');await page.locator('#earthResults button').first().click();
  await page.waitForFunction(()=>SOLAR_TEST.imagery?.status==='ready'&&SOLAR_TEST.imagery.level>=6,{},{timeout:90000});
  const city=await page.evaluate(()=>SOLAR_TEST.imagery);
  assert(city.loaded>0&&city.loaded===city.total);assert(city.level>=6);assert(city.pending===0);assert(city.cache<=48);
  assert.match(await page.locator('#earthImageryStatus').textContent(),/500/);
  await page.waitForTimeout(300);
  await page.screenshot({path:path.join(output,live?'earth-shihezi-live.png':'earth-tiles-fixture.png')});
  await page.click('#zoomIn');await page.waitForTimeout(1400);
  await page.waitForFunction(()=>SOLAR_TEST.imagery?.status==='ready',{},{timeout:90000});
  const close=await page.evaluate(()=>SOLAR_TEST.imagery);assert(close.level>=city.level);
  const count=requests.length;await page.waitForTimeout(700);assert.equal(requests.length,count,'A stationary camera must not refetch tiles');
  if(live)await page.screenshot({path:path.join(output,'earth-shihezi-close-live.png')});
  await page.uncheck('#earthHD');await page.waitForFunction(()=>!SOLAR_TEST.imagery.visible);
  assert.equal(await page.evaluate(()=>localStorage.getItem('opensolar.imagery')),'off');
  if(live)await page.screenshot({path:path.join(output,'earth-shihezi-base.png')});
  await page.check('#earthHD');await page.waitForFunction(()=>SOLAR_TEST.imagery.visible&&SOLAR_TEST.imagery.status==='ready');
  await page.evaluate(()=>SOLAR_TEST.selectBody('499'));await page.waitForFunction(()=>!SOLAR_TEST.imagery.visible);
  assert.equal(await page.evaluate(()=>{const driver=SOLAR_TEST;ATLAS_TEST.unmount();return driver.disposed&&!driver.imagery;}),true);
  // Bad image responses exercise fallback without depending on a network outage.
  await page.unroute('https://gibs.earthdata.nasa.gov/**');
  await page.route('https://gibs.earthdata.nasa.gov/**',route=>route.fulfill({status:200,contentType:'image/jpeg',headers:{'Access-Control-Allow-Origin':'*'},body:'invalid image'}));
  await page.evaluate(()=>{const url=new URL(location.href);url.searchParams.set('body','399');history.replaceState(null,'',url);ATLAS_TEST.mount();});await page.waitForFunction(()=>window.SOLAR_TEST?.imagery?.status==='fallback',{},{timeout:20000});
  assert.equal(await page.locator('#error').count(),0,'Tile failure must not become a fatal scene error');
  await page.waitForTimeout(100);const failedCount=requests.length;await page.waitForTimeout(1000);assert.equal(requests.length,failedCount,'No immediate retry storm');
  await page.uncheck('#earthHD');
  await page.unroute('https://gibs.earthdata.nasa.gov/**');
  await page.route('https://gibs.earthdata.nasa.gov/**',route=>route.fulfill({status:200,contentType:'image/jpeg',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(path.join(root,'data/earth/source/gibs-sample-7-20-118.jpeg'))}));
  await page.check('#earthHD');await page.waitForFunction(()=>SOLAR_TEST.imagery.status==='ready');
  await page.setViewportSize({width:390,height:844});await page.click('#detailsButton');
  await page.selectOption('#language','ja');await page.waitForTimeout(400);
  await page.waitForFunction(()=>SOLAR_TEST.imagery.status==='ready');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.setViewportSize({width:1600,height:1060});
  if(!live){
   for(const query of ['Beijing','London','Tokyo']){
    await page.fill('#earthSearch',query);await page.locator('#earthResults button').first().click();await page.waitForTimeout(400);
    await page.waitForFunction(()=>SOLAR_TEST.imagery.status==='ready'&&SOLAR_TEST.imagery.pending===0);
    assert(await page.evaluate(()=>SOLAR_TEST.imagery.cache<=48));
   }
  }
  await page.unroute('https://gibs.earthdata.nasa.gov/**');await page.route('https://gibs.earthdata.nasa.gov/**',route=>route.abort('internetdisconnected'));
  await page.evaluate(()=>{ATLAS_TEST.unmount();ATLAS_TEST.mount();});
  await page.waitForFunction(()=>window.SOLAR_TEST?.imagery?.status==='fallback',{},{timeout:20000});
  assert.equal(await page.locator('#error').count(),0);
  assert.deepEqual(errors,[]);
  const report={liveNASA:live,city,close,requestCount:requests.length,stationaryCache:true,offSwitch:true,nonEarthHidden:true,dispose:true,fallbackAndRetry:true,networkFailureFallback:true,mobileNoOverflow:true,errors};
  fs.writeFileSync(path.join(output,live?'imagery-live-verification.json':'imagery-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{if(browser)await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
