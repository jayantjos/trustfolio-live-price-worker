import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import worker,{identify} from '../index.js';

const asin='B0FNCLVRW5';
const fk='https://www.flipkart.com/oppo-reno-12-pro-5g-space-brown-512-gb/p/itmed01efe011f83?pid=MOBH2AHZH779MGYF';
const original=globalThis.fetch;
afterEach(()=>{globalThis.fetch=original;});
const req=(items)=>new Request('https://unit.test/api/check',{method:'POST',headers:{'x-api-key':'unit','content-type':'application/json'},body:JSON.stringify({items,useCache:false})});
const longBody='<div>Product detail</div>'.repeat(42);
test('legacy Amazon bare ASIN identifies exact /dp URL',()=>{
 assert.deepEqual(identify(asin),{platform:'amazon',id:asin,url:'https://www.amazon.in/dp/'+asin});
 assert.equal(identify('B0INVALIDASIN'),null);
});
test('legacy backend receives r.asin truthy and r.amazon selling price for bare ASIN',async()=>{
 globalThis.fetch=async url=>{
  assert.equal(url,'https://www.amazon.in/dp/'+asin);
  return new Response('<html><title>MTC 43 Inch Full HD Smart LED TV Amazon.in</title><body><div id="corePriceDisplay_desktop_feature_div"><span class="a-offscreen">₹24,000</span></div>'+longBody+'</body></html>',{headers:{'content-type':'text/html'}});
 };
 const response=await worker.fetch(req([asin]),{TF_PRICE_WORKER_KEY:'unit'},{});
 assert.equal(response.status,200);
 const row=(await response.json()).results[0];
 assert.equal(row.asin,asin);
 assert.equal((row.asin?row.amazon:row.flipkart).status,'ok');
 assert.equal((row.asin?row.amazon:row.flipkart).priceNum,24000);
});
test('Flipkart matching continues using r.flipkart when no Amazon ASIN',async()=>{
 globalThis.fetch=async()=>new Response('<html><title>OPPO Reno 12 Pro 5G (Space Brown, 512 GB)</title><body><script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'OPPO Reno 12 Pro 5G Space Brown 512 GB',sku:'MOBH2AHZH779MGYF',offers:{price:38999}})+'</script>'+longBody+'</body></html>',{headers:{'content-type':'text/html'}});
 const row=(await (await worker.fetch(req([fk]),{TF_PRICE_WORKER_KEY:'unit'},{})).json()).results[0];
 assert.equal(Boolean(row.asin),false);
 assert.equal((row.asin?row.amazon:row.flipkart).priceNum,38999);
});
test('old Worker fetch contract chooses Amazon vs Flipkart correctly',()=>{
 const amazonResult={asin,amazon:{status:'ok',priceNum:24000},flipkart:{status:'skipped'}};
 const flipkartResult={asin:null,amazon:{status:'skipped'},flipkart:{status:'ok',priceNum:38999}};
 assert.equal((amazonResult.asin?amazonResult.amazon:amazonResult.flipkart).priceNum,24000);
 assert.equal((flipkartResult.asin?flipkartResult.amazon:flipkartResult.flipkart).priceNum,38999);
});
