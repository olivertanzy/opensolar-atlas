const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createModel}=require('./create-model.cjs');
(async()=>{
 const root=path.resolve(__dirname,'..'),output=path.join(root,'test-results');fs.mkdirSync(output,{recursive:true});
 // Inject a generated contribution in the test server only. Do not edit the real registry.
 const fixtureRoot=fs.mkdtempSync(path.join(output,'module-fixture-'));
 fs.cpSync(path.join(root,'templates/structure'),path.join(fixtureRoot,'templates/structure'),{recursive:true});
 const fixture=createModel('structure-example',{root:fixtureRoot});
 assert.throws(()=>createModel('structure-example',{root:fixtureRoot}),/EEXIST/);
 for(const id of ['../outside','UPPER','con','a/b',''])assert.throws(()=>createModel(id,{root:fixtureRoot}));
 const {createServer}=await import('vite');
 const {modelModules}=await import('../src/modules/registry.js');
 const expectedModelCount=Object.keys(modelModules).length+1; // Plus the generated test-only module.
 const server=await createServer({root,plugins:[{name:'test-contributed-module',enforce:'pre',transform(code,id){
  if(id.replaceAll('\\','/').endsWith('/src/modules/registry.js'))return code.replace('// MODULE_IMPORTS:',`import example from '/@fs/${fixture.replaceAll('\\','/')}/module.js';\n// MODULE_IMPORTS:`).replace('// MODULE_ENTRIES:', '[example.id]:example,\n// MODULE_ENTRIES:');
 }}],server:{host:'127.0.0.1',port:0}});await server.listen();
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  await page.addInitScript(()=>localStorage.setItem('opensolar.imagery','off'));
  const base=`http://127.0.0.1:${server.httpServer.address().port}/`;
  await page.goto(base);await page.waitForSelector('.model-card');
  assert.equal(await page.locator('.model-card').count(),expectedModelCount);
  assert.equal(requests.some(url=>new URL(url).pathname==='/data.js'),false);
  await page.fill('#modelSearch','太阳');assert.equal(await page.locator('.model-card').count(),1);
  await page.fill('#modelSearch','no-such-model');assert.equal(await page.locator('.model-card').count(),0);
  await page.locator('.library-empty button').click();assert.equal(await page.locator('.model-card').count(),expectedModelCount);
  await page.locator('[data-model="structure-example"] .primary-link').click();await page.waitForSelector('.structure-canvas canvas');
  assert.equal(await page.evaluate(()=>typeof window.SOLAR_DATA),'undefined','Independent model must not depend on astronomy');
  const canvas=await page.locator('.structure-canvas canvas').boundingBox();
  await page.mouse.move(canvas.x+canvas.width/2,canvas.y+canvas.height/2);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width/2+80,canvas.y+canvas.height/2+20,{steps:10});await page.mouse.up();await page.mouse.wheel(0,150);
  await page.locator('#catalog input').uncheck();await page.locator('#catalog input').check();
  await page.screenshot({path:path.join(output,'shell-contribution-template.png')});
  await page.evaluate(()=>{window.templateContextLost=false;document.querySelector('.structure-canvas canvas').addEventListener('webglcontextlost',()=>window.templateContextLost=true);});
  await page.click('#libraryLink');await page.waitForFunction(()=>window.templateContextLost);
  assert.equal(await page.locator('canvas').count(),0,'Leaving module removes its canvas');
  await page.goBack();await page.waitForSelector('.structure-canvas canvas');
  await page.goForward();await page.waitForSelector('.model-card');
  await page.locator('[data-model="solar-system"] .primary-link').click();await page.waitForFunction(()=>window.SOLAR_TEST?.meshes.size>0);
  await page.evaluate(()=>window.lastSolarDriver=SOLAR_TEST);
  await page.click('#guideLink');await page.waitForFunction(()=>window.lastSolarDriver.disposed&&window.SOLAR_TEST===undefined);
  assert.equal(await page.locator('canvas').count(),0);assert.equal((await page.request.get(base+'docs/ADDING_A_MODEL.md')).status(),200);
  await page.setViewportSize({width:390,height:844});
  for(const locale of ['en','zh-CN','zh-TW','ja','ko']){
   await page.selectOption('#language',locale);await page.click('#libraryLink');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.click('#guideLink');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.screenshot({path:path.join(output,'shell-guide-mobile.png')});
  await page.goto(base+'?model=structure-example&lang=zh-CN');await page.waitForSelector('.structure-canvas canvas');
  await page.click('#catalogButton');assert(await page.locator('#catalog').isVisible());
  await page.click('#detailsButton');assert(await page.locator('#details').isVisible());assert.equal(await page.locator('#catalog').isVisible(),false);
  await page.screenshot({path:path.join(output,'shell-template-mobile.png')});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#details').isVisible(),false);
  await page.goto(base+'?model=unregistered&lang=en');await page.waitForSelector('.shell-state[role=alert]');assert.equal(await page.locator('canvas').count(),0);
  await page.route('**/data.js',route=>route.abort());await page.goto(base+'?model=solar-system&lang=en');await page.waitForSelector('.shell-state[role=alert]');
  await page.unroute('**/data.js');await page.locator('.shell-state button').click();await page.waitForFunction(()=>window.SOLAR_TEST?.meshes.size>0);
  // Leaving during an async load must not mount a stale scene afterwards.
  await page.route('**/data.js',async route=>{await new Promise(resolve=>setTimeout(resolve,800));await route.continue();});
  await page.goto(base);await page.locator('[data-model="solar-system"] .primary-link').click();await page.click('#libraryLink');await page.waitForTimeout(1200);
  assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.evaluate(()=>typeof window.SOLAR_TEST),'undefined');
  assert.deepEqual(errors,[]);
  const report={generatedModule:true,scaffoldOverwriteProtection:true,independentData:true,librarySearch:true,history:true,switchDisposal:true,fiveLanguages:true,mobilePanels:true,unknownModule:true,loadFailureRetry:true,staleLoadCancelled:true,errors};
  fs.writeFileSync(path.join(output,'shell-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{
  if(browser)await browser.close();await server.close();
  // Only remove this test's newly created directory inside test-results.
  const resolved=path.resolve(fixtureRoot);if(path.dirname(resolved)!==output||!path.basename(resolved).startsWith('module-fixture-'))throw new Error('Unexpected fixture path');
  fs.rmSync(resolved,{recursive:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
