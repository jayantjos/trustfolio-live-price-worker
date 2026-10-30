import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../index.js';
import {extractFlipkart,extractAmazon} from '../price.js';
const pid='MOBHH2KYWG8UBBAF', title='POCO X8 Pro Max Blue 512 GB';
const url='https://www.flipkart.com/poco-x8-pro-max-blue-512-gb/p/itmfc8cc712fe4a5?pid='+pid;
const head='<html><head><title>POCO X8 Pro Max (Blue, 512 GB) at Flipkart</title></head><body>';
const tail='<p>Specs</p>'.repeat(50)+'</body></html>';
const saved=globalThis.fetch;afterEach(()=>globalThis.fetch=saved);
const req=(probe=false)=>new Request('https://unit.example/api/check',{method:'POST',headers:{'x-api-key':'unit','content-type':'application/json'},body:JSON.stringify({items:[url],useCache:false,browserProbe:probe})});
test('E002 is transient, not out-of-stock',()=>{
 const p=extractFlipkart(head+'<h2>Something went wrong!</h2><p>Please try again later.</p><div>E002</div>'+tail,{id:pid,title});
 assert.equal(p.status,'error');assert.equal(p.priceNum,null);assert.equal(p.error,'flipkart_e002_store_error_page');
});
test('JSON-LD exact PID selling price, not MRP',()=>{
 const offer={'@type':'Product',name:title,sku:pid,offers:{price:49999}};
 const p=extractFlipkart(head+'<script type="application/ld+json">'+JSON.stringify(offer)+'</script><p>MRP ₹61,999</p>'+tail,{id:pid,title});
 assert.equal(p.priceNum,49999);
});
test('Unique price DOM needs matching PID',()=>{
 const x=head+'<div data-pid="'+pid+'"><div class="Nx9bqj">₹49,999</div></div>'+tail;
 assert.equal(extractFlipkart(x,{id:pid,title}).priceNum,49999);
 assert.equal(extractFlipkart(x.replace(pid,'FAKE_PID'),{id:pid,title}).priceNum,null);
});
test('Conflicting DOM prices fail closed',()=>{
 const x=head+'<div data-pid="'+pid+'"><div class="Nx9bqj">₹49,999</div><div class="Nx9bqj">₹52,999</div></div>'+tail;
 assert.equal(extractFlipkart(x,{id:pid,title}).priceNum,null);
});
test('Amazon buy box price not MRP',()=>{
 const h='<html><head><title>iPhone 16 128GB Amazon.in</title></head><body><div id="ASIN">B012345678</div><div id="corePriceDisplay_desktop_feature_div"><span class="a-offscreen">₹69,900</span></div><del>₹79,900</del>'+tail;
 assert.equal(extractAmazon(h,{id:'B012345678',title:'iPhone 16 128GB'}).priceNum,69900);
});
test('Health version 0.4 and auth',async()=>{
 const h=await worker.fetch(new Request('https://unit.example/health'),{TF_PRICE_WORKER_KEY:'unit'},{});assert.equal((await h.json()).version,'1.2.2');
 const x=await worker.fetch(req(),{TF_PRICE_WORKER_KEY:'incorrect'},{});assert.equal(x.status,401);
});
test('Browser E002 reveals only safe diagnostic; opt-in',async()=>{
 globalThis.fetch=async()=>new Response(head+tail,{status:200,headers:{'content-type':'text/html'}});
 let count=0;
 const env={TF_PRICE_WORKER_KEY:'unit',BROWSER:{quickAction:async()=>{count++;return new Response(head+'<h2>Something went wrong!</h2><p>Please try again later.</p><div>E002</div>'+tail)}}};
 const normal=(await (await worker.fetch(req(false),env,{})).json()).results[0].flipkart;assert.equal(count,0);assert.equal(normal.priceNum,null);
 const probe=(await (await worker.fetch(req(true),env,{})).json()).results[0].flipkart;assert.equal(count,1);
 assert.equal(probe.browserDiagnostic,'flipkart_e002_store_error_page');
 assert.equal(probe.browserEvidence.storeErrorCode,'E002');assert.equal(probe.priceNum,null);
});
