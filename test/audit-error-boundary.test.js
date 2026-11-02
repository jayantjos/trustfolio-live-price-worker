import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveFixedFlipkart} from '../fixed-flipkart-audit.js';
import worker from '../index.js';
test('aborted retailer body becomes structured unverified response, not uncaught exception',async()=>{
 const original=global.fetch;let calls=0;
 global.fetch=async()=>++calls===1?new Response(null,{status:302,headers:{location:'https://www.flipkart.com/test/p/itm123abc'}}):new Response(new ReadableStream({start(c){c.error(new DOMException('fixture abort','AbortError'));}}));
 try{const r=await resolveFixedFlipkart({url:'https://fkrt.clnk.in/CfuU',title:'Test'});assert.equal(r.status,'unverified');assert.equal(r.error,'fixed_product_html_read_failed');assert.equal(r.errorType,'AbortError');assert.equal(r.priceINR,null);}
 finally{global.fetch=original;}
});
test('audit storage failure is JSON unverified and never out of stock',async()=>{
 const res=await worker.fetch(new Request('https://unit/qa/audit-300?sequence=201'),{MONITOR_STATE:{getByName:()=>({claimOnDemand:async()=>{throw new Error('fixture storage failure');}})}},{});
 assert.equal(res.status,503);const r=await res.json();assert.equal(r.error,'qa300_storage_unavailable');assert.equal(r.priceINR,null);
});
