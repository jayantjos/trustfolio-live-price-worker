import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import worker,{runScheduledPriceQA} from '../index.js';
const saved=worker.fetch;
afterEach(()=>{worker.fetch=saved});
test('cron handler and health report v0.5 without exposing secret',async()=>{
 assert.equal(typeof worker.scheduled,'function');
 const x=await worker.fetch(new Request('https://x.test/health'),{TF_PRICE_WORKER_KEY:'DO_NOT_LOG'}, {});
 const y=await x.json();
 assert.equal(y.version,'0.5.0');
 assert.equal(y.monitoring.items,3);
 assert.equal(JSON.stringify(y).includes('DO_NOT_LOG'),false);
});
test('scheduled QA makes one secret-protected request for all 3 exact products',async()=>{
 let called=0;
 worker.fetch=async req=>{
   called++;
   assert.equal(req.headers.get('x-api-key'),'MY_FAKE_SECRET');
   const data=await req.json();
   assert.equal(data.useCache,false);
   assert.equal(data.browserProbe,false);
   assert.equal(data.items.length,3);
   return new Response(JSON.stringify({results:[
     {pid:'MOBH2AHZH779MGYF',flipkart:{status:'ok',priceNum:38999}},
     {pid:'MOBHQFDZKKM7EEFZ',flipkart:{status:'ok',priceNum:54999}},
     {pid:'B0FNCLVRW5',amazon:{status:'ok',priceNum:24000}}
   ]}));
 };
 const log=console.log;const lines=[];console.log=(...x)=>lines.push(x.join(' '));
 try{
  const result=await runScheduledPriceQA(worker,{TF_PRICE_WORKER_KEY:'MY_FAKE_SECRET'},{});
  assert.equal(result.result,'PASS');assert.equal(called,1);assert.equal(result.verified,3);
  assert.equal(lines.some(x=>x.includes('MY_FAKE_SECRET')),false);
 }finally{console.log=log}
});
test('failed prices detected, never guessed, no outside write',async()=>{
 worker.fetch=async()=>new Response(JSON.stringify({results:[]}));
 const old=console.log;console.log=()=>{};
 try{await assert.rejects(runScheduledPriceQA(worker,{TF_PRICE_WORKER_KEY:'fake'},{}),/MONITOR_PRICE_UNVERIFIED_0_OF_3/)}
 finally{console.log=old}
});
test('no secret triggers safe failure',async()=>{
 await assert.rejects(runScheduledPriceQA(worker,{},{}),/MONITOR_SECRET_MISSING/);
});
