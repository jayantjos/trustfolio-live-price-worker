import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import worker,{PriceMonitorState} from '../index.js';
const original=worker.fetch;
afterEach(()=>{worker.fetch=original});
function bindStore() {
 const db=new Map();
 const store={get:async k=>db.get(k),put:async(k,v)=>db.set(k,v),
   transaction:async fn=>fn(store)};
 const obj=new PriceMonitorState({storage:store},{});
 return {obj,env:{TF_PRICE_WORKER_KEY:'TEST_ONLY_SECRET',MONITOR_STATE:{getByName:()=>obj}}};
}
test('public fresh sample fixed three Mongo products only; secret never exposed',async()=>{
 const {env}=bindStore();let hits=0;
 worker.fetch=async(req,e,ctx)=>{
   if(new URL(req.url).pathname!=='/api/check')return original(req,e,ctx);
   hits++;
   const body=await req.json();
   assert.equal(req.headers.get('x-api-key'),'TEST_ONLY_SECRET');
   assert.equal(body.items.length,3);
   assert.equal(body.useCache,false);
   assert.equal(body.browserProbe,false);
   return new Response(JSON.stringify({success:true,results:[
     {pid:'MOBH2AHZH779MGYF',flipkart:{status:'ok',priceNum:38999,extractionSource:'jsonld_product_offer'}},
     {pid:'MOBHQFDZKKM7EEFZ',flipkart:{status:'error',priceNum:null,error:'store_http_429'}},
     {pid:'B0FNCLVRW5',amazon:{status:'ok',priceNum:24000,extractionSource:'amazon_primary_buybox'}}
   ]}));
 };
 const oldLog=console.log;console.log=()=>{};
 try {
  const a=await original(new Request('https://unit.test/qa/sample'),env,{});
  const x=await a.json();
  assert.equal(a.status,200);
  assert.equal(x.fresh,true);assert.equal(x.report.result,'PRICE_UNVERIFIED');
  assert.equal(x.report.verified,2);assert.equal(x.report.trigger,'manual');
  assert.equal(x.report.checks[1].priceINR,null);
  assert.match(x.report.checks[0].productUrl,/MOBH2AHZH779MGYF/);
  assert.equal(JSON.stringify(x).includes('TEST_ONLY_SECRET'),false);
  const b=await original(new Request('https://unit.test/qa/sample'),env,{});
  const y=await b.json();
  assert.equal(y.fresh,false);assert.equal(y.rateLimited,true);
  assert.equal(y.report.verified,2);assert.equal(hits,1);
 }finally{console.log=oldLog}
});
test('missing Secret or Durable Object never fetches products',async()=>{
 const r=await original(new Request('https://unit.test/qa/sample'),{}, {});
 assert.equal(r.status,503);
});
test('rate limit reservation is globally serialized by Durable Object storage transaction',async()=>{
 const {obj}=bindStore();
 const one=await obj.claimOnDemand(1000000000);
 const two=await obj.claimOnDemand(1000000000+1000);
 const three=await obj.claimOnDemand(1000000000+16*60*1000);
 assert.equal(one.allowed,true);assert.equal(two.allowed,false);assert.ok(two.retryAfterSeconds>0);
 assert.equal(three.allowed,true);
});
