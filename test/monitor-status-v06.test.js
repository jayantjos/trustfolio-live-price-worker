import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{PriceMonitorState} from '../index.js';
test('health includes v0.6 monitoring status route, no key leak',async()=>{
 const binding={getByName:()=>({readLatest:async()=>null})};
 const r=await worker.fetch(new Request('https://unit.test/health'),{TF_PRICE_WORKER_KEY:'secret',MONITOR_STATE:binding},{});
 const x=await r.json();assert.equal(x.version,'1.2.2');
 assert.equal(x.monitoring.statusUrl,'/monitor/latest');
 assert.equal(x.monitoring.storageConfigured,true);
 assert.equal(JSON.stringify(x).includes('secret'),false);
});
test('public status endpoint is read-only and returns pending before first Cron',async()=>{
 let reads=0,writes=0;
 const binding={getByName:()=>({readLatest:async()=>{reads++;return null},saveLatest:async()=>{writes++}})};
 const r=await worker.fetch(new Request('https://unit.test/monitor/latest'),{MONITOR_STATE:binding},{});
 const x=await r.json();
 assert.equal(x.state,'pending');assert.equal(x.latest,null);
 assert.equal(reads,1);assert.equal(writes,0);
});
test('DO class stores only validated 3-SKU reports',async()=>{
 const saved=new Map();
 const object=new PriceMonitorState({storage:{get:async k=>saved.get(k),put:async(k,v)=>saved.set(k,v)}},{});
 const good={kind:'trustfolio_price_monitor',checks:[{},{},{}]};
 assert.equal(await object.saveLatest(good),true);
 assert.deepEqual(await object.readLatest(),good);
 await assert.rejects(object.saveLatest({kind:'bad',checks:[]}),/INVALID_MONITOR_REPORT/);
});
