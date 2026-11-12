import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { quoteBrowserFlow } from './quote-browser-flow';
import { catalogBrowserFlow } from './catalog-browser-flow';
import { brandBrowserFlow } from './brand-browser-flow';
import { equipmentDraftBrowserFlow } from './equipment-draft-browser-flow';
import { purchaseOutcomeBrowserFlow } from './purchase-outcome-browser-flow';
import { quoteDetailAddBrowserFlow } from './quote-detail-add-browser-flow';
import { quoteDetailGroupBrowserFlow } from './quote-detail-group-browser-flow';

const require=createRequire(import.meta.url);
const port=Number(process.env.FISHJOONGO_TEST_PORT||3100);
const origin=`http://127.0.0.1:${port}`;
process.env.BROWSER_BASE_URL=origin;
await mkdir('outputs/next-migration',{recursive:true});
let serverOutput='';
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,NODE_ENV:'development',NEXT_PUBLIC_DEMO_MODE:'true',NEXT_PUBLIC_DEMO_BRAND_SNAPSHOT_DELAY_MS:'350'},stdio:['ignore','pipe','pipe']});
child.stdout.on('data',chunk=>{serverOutput=(serverOutput+String(chunk)).slice(-12000);});
child.stderr.on('data',chunk=>{serverOutput=(serverOutput+String(chunk)).slice(-12000);});
let browser;
const errors:string[]=[];
try{
  const deadline=Date.now()+60000;
  let ready=false;
  while(Date.now()<deadline){
    if(child.exitCode!==null)throw new Error(`Preview server stopped:\n${serverOutput}`);
    try{const response=await fetch(origin);if(response.ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,300));
  }
  assert.ok(ready,`Preview server did not start:\n${serverOutput}`);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const backendRequests:string[]=[];
  const quoteContext=await browser.newContext({baseURL:origin,viewport:{width:1440,height:1040},permissions:['clipboard-read','clipboard-write']});
  const quotePage=await quoteContext.newPage();
  quotePage.on('pageerror',error=>errors.push(error.message));
  quotePage.on('request',request=>{if(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/.test(request.url()))backendRequests.push(request.url());});
  await quoteBrowserFlow(quotePage);
  await quoteContext.close();
  console.log('PASS: quote builder, saved history, editing, print preview, clipboard and mobile layout');
  const catalogContext=await browser.newContext({baseURL:origin,viewport:{width:1440,height:1040},acceptDownloads:true});
  const catalogPage=await catalogContext.newPage();
  catalogPage.on('pageerror',error=>errors.push(error.message));
  catalogPage.on('request',request=>{if(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/.test(request.url()))backendRequests.push(request.url());});
  await catalogPage.goto(origin);
  await catalogPage.getByRole('heading',{name:'새 견적 만들기',exact:true}).waitFor();
  await catalogBrowserFlow(catalogPage);
  await catalogContext.close();
  console.log('PASS: brand/rod CRUD, price editor, JSON import/export, protected settings and mobile layout');
  const brandContext=await browser.newContext({baseURL:origin,viewport:{width:1366,height:768}});
  const brandPage=await brandContext.newPage();
  brandPage.on('pageerror',error=>errors.push(error.message));
  brandPage.on('request',request=>{if(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/.test(request.url()))backendRequests.push(request.url());});
  await brandBrowserFlow(brandPage);
  await brandContext.close();
  console.log('PASS: confirmed brand registration, review exclusions, alias search and saved quote preservation');
  const equipmentContext=await browser.newContext({baseURL:origin,viewport:{width:1366,height:768}});
  const equipmentPage=await equipmentContext.newPage();
  equipmentPage.on('pageerror',error=>errors.push(error.message));
  equipmentPage.on('request',request=>{if(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/.test(request.url()))backendRequests.push(request.url());});
  await equipmentDraftBrowserFlow(equipmentPage);
  await equipmentContext.close();
  console.log('PASS: category draft confirmation, repeat import, preserved catalogue prices and explicit unknown component pricing');
  const purchaseContext=await browser.newContext({baseURL:origin,viewport:{width:1366,height:768}});
  const purchasePage=await purchaseContext.newPage();
  purchasePage.on('pageerror',error=>errors.push(error.message));
  purchasePage.on('request',request=>{if(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/.test(request.url()))backendRequests.push(request.url());});
  await purchaseOutcomeBrowserFlow(purchasePage);
  await purchaseContext.close();
  console.log('PASS: purchase statuses, partial quantities, independent actual amounts, source snapshots and responsive result editing');
  const detailAddContext=await browser.newContext({baseURL:origin,viewport:{width:1366,height:768}});
  const detailAddPage=await detailAddContext.newPage();
  detailAddPage.on('pageerror',error=>errors.push(error.message));
  detailAddPage.on('request',request=>{if(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/.test(request.url()))backendRequests.push(request.url());});
  await quoteDetailAddBrowserFlow(detailAddPage);
  await detailAddContext.close();
  console.log('PASS: shared detail item pickers, additive quantities, saved snapshots and edit rollback');
  const groupEditContext=await browser.newContext({baseURL:origin,viewport:{width:1366,height:768}});
  const groupEditPage=await groupEditContext.newPage();
  groupEditPage.on('pageerror',error=>errors.push(error.message));
  groupEditPage.on('request',request=>{if(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/.test(request.url()))backendRequests.push(request.url());});
  await quoteDetailGroupBrowserFlow(groupEditPage);
  await groupEditContext.close();
  console.log('PASS: saved rod group editing, duplicate lengths, historical prices, keyboard entry and rollback');
  assert.deepEqual(backendRequests,[],'Preview must never request the live Firebase backend');
  assert.deepEqual(errors,[],'Browser runtime errors');
  console.log('PASS: no runtime errors and no live Firebase requests');
}catch(error){
  for(const [contextIndex,context] of (browser?.contexts()??[]).entries()){
    for(const [pageIndex,page] of context.pages().entries()){
      await page.screenshot({path:`outputs/next-migration/failure-${contextIndex}-${pageIndex}.png`,fullPage:true}).catch(()=>{});
      console.error((await page.locator('body').innerText().catch(()=>'' )).slice(-9000));
    }
  }
  console.error('Browser errors:',errors);
  console.error(serverOutput);
  throw error;
}finally{
  await browser?.close();
  child.kill('SIGTERM');
}
