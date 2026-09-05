const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const url='file:///'+path.resolve(__dirname,'../index.html').replace(/\\/g,'/');
 const go=async id=>{await p.goto(url+'#/'+id);await p.waitForTimeout(100);};
 await go('home');
 await p.locator('[data-category="daily"]').click();
 assert.equal(await p.locator('.feature:visible').count(),4);
 await p.locator('#featureSearch').fill('attendance');
 assert.equal(await p.locator('.feature:visible').count(),1);
 await p.locator('[data-category="office"]').click();
 assert.equal(await p.locator('.feature:visible').count(),0);
 await p.locator('[data-category="all"]').click();await p.locator('#featureSearch').fill('');
 await p.screenshot({path:path.resolve(__dirname,'../../test-artifacts/theme-desktop.png')});
 const routes=await p.evaluate(()=>Object.keys(PAGES));
 for(const width of [1440,390,320]){
  await p.setViewportSize({width,height:1000});
  for(const id of routes){await go(id);
   const bad=await p.locator('svg[viewBox="0 0 24 24"]').evaluateAll(xs=>xs.filter(x=>{const r=x.getBoundingClientRect();return r.width>48||r.height>48;}).length);
   assert.equal(bad,0,`${id} icons at ${width}`);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id} overflow at ${width}`);
  }
 }
 await go('home');await p.screenshot({path:path.resolve(__dirname,'../../test-artifacts/theme-mobile.png')});
 await p.setViewportSize({width:1440,height:1000});await go('salary');
 // Inject a known pay stage into the existing select to test a slab boundary independently of level tables.
 await p.locator('#sBasic').evaluate(e=>{e.add(new Option('46500','46500'));e.value='46500';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await p.locator('#sHra').selectOption('Y');await p.locator('#sPen').selectOption('gpf');
 let pay=await p.evaluate(()=>window.__TB_PAY);
 assert.equal(pay.si,2200);assert.equal(pay.rghs,658);assert.equal(pay.pen,2850);assert.equal(pay.hra,9300);assert.equal(pay.da,27900);
 await p.locator('#sHra').selectOption('N');assert.equal(await p.evaluate(()=>__TB_PAY.hra),0);
 await p.locator('#sSiActual').fill('0');assert.equal(await p.evaluate(()=>__TB_PAY.si),0);
 await p.locator('#sPenActual').fill('4000');assert.equal(await p.evaluate(()=>__TB_PAY.pen),4000);
 await p.locator('#sPenActual').fill('');assert.equal(await p.evaluate(()=>__TB_PAY.pen),2850);
 const newTax=async gross=>{await p.locator('#tGross').fill(String(gross));return Number((await p.locator('#tOut .kv').nth(3).locator('b').first().innerText()).replace(/[^0-9]/g,''));};
 assert.equal(await newTax(1275000),0);
 assert.equal(await newTax(1276000),1040);
 assert.equal(await newTax(1500000),97500);
 await p.locator('#tGross').fill('5000001');assert.equal(await p.locator('#tOut .kv').count(),0);
 await go('verification');assert.ok((await p.locator('#main').innerText()).includes('74'));
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.resolve(__dirname,'../../test-artifacts/theme-results.json'),JSON.stringify({routes:routes.length,widths:[1440,390,320],icons:'pass',overflow:'pass',filters:'pass',payroll:'pass',runtimeErrors:errors},null,2));
 console.log(`PASS ${routes.length} routes × 3 widths; icons, overflow, categories, payroll and verification page`);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});

