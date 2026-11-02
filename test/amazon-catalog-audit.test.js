import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../index.js';
test('same-ASIN HP catalog conflict cannot escape through price or bestDeal',async()=>{
 const original=global.fetch;
 global.fetch=async()=>new Response('<html><title>HP Atholon (8GB DDR4, 256GB SSD) - Amazon.in</title><link rel="canonical" href="https://www.amazon.in/dp/B0GJDLKM5H"><input id="ASIN" value="B0GJDLKM5H"><div id="corePrice_feature_div"><span class="a-offscreen">₹69,990</span></div>'+('<p>Product specification</p>'.repeat(40))+'</html>',{headers:{'content-type':'text/html'}});
 try{
 const env={MONITOR_STATE:{getByName:()=>({claimOnDemand:async()=>({allowed:true})})}};
 const r=await (await worker.fetch(new Request('https://unit/qa/audit-300?sequence=5'),env,{})).json();
 assert.equal(r.result.amazon.error,'fixed_catalog_variant_mismatch');
 assert.equal(r.result.amazon.priceNum,null);assert.equal(r.result.bestDeal.winner,null);
 }finally{global.fetch=original;}
});
