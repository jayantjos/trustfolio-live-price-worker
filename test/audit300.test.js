import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../index.js';
const request=sequence=>new Request('https://unit/qa/audit-300?sequence='+sequence);
const env={MONITOR_STATE:{getByName:()=>({claimOnDemand:async()=>({allowed:true})})}};
test('fixed audit rejects arbitrary sequences without fetching',async()=>{
  assert.equal((await worker.fetch(request(301),env,{})).status,400);
  assert.equal((await worker.fetch(request('https://evil.example'),env,{})).status,400);
});
test('missing Flipkart canonical identity never triggers a fetch or out-of-stock result',async()=>{
  const original=global.fetch;
  global.fetch=()=>{throw new Error('must not fetch affiliate URL');};
  try{
    const r=await (await worker.fetch(request(151),env,{})).json();
    assert.equal(r.status,'unverified');
    assert.equal(r.error,'canonical_product_identifier_missing');
    assert.equal(r.priceINR,null);
  }finally{global.fetch=original;}
});
test('fixed exact ASIN check is read-only and never invokes Browser Run',async()=>{
  const original=global.fetch;let calls=0;
  global.fetch=async url=>{calls++;assert.equal(String(url),'https://www.amazon.in/dp/B074J9SPYX');return new Response('<html><title>Crompton Super Briz Deco Fan - Amazon.in</title><input id="ASIN" value="B074J9SPYX"><div id="corePrice_feature_div"><span class="a-offscreen">₹2,499</span></div>'+('<p>Product specification</p>'.repeat(40))+'</html>',{headers:{'content-type':'text/html'}});};
  try{
    const r=await (await worker.fetch(request(1),{...env,BROWSER:{quickAction:()=>{throw new Error('no browser');}}},{})).json();
    assert.equal(r.productId,'69f2e6991dafb58cccdbbad0');
    assert.equal(r.sku,'B074J9SPYX');assert.equal(calls,1);
    assert.equal(r.result.amazon.priceNum,2499);
  }finally{global.fetch=original;}
});
