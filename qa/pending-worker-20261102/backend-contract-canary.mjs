import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {withVerification} from '../../product-state.js';
import path from 'node:path';
const sourceRoot=process.argv[2];if(!sourceRoot)throw Error('Pass a PRIVATE directory with read-only LivePriceService.js and ProductAvailabilityPolicy.js snapshots');
const source=fs.readFileSync(path.join(sourceRoot,'LivePriceService.js'),'utf8');
function load(s,require){const module={exports:{}};vm.runInNewContext(s,{module,exports:module.exports,require,process:{env:{}},Date,Number,String,Boolean,Set,Map,Math,Array,Promise,JSON,AbortSignal,fetch:()=>{throw Error('Network forbidden');}});return module.exports;}
const policy=load(fs.readFileSync(path.join(sourceRoot,'ProductAvailabilityPolicy.js'),'utf8'),()=>{throw Error('Dependency forbidden');});
const live=load(source+'\nmodule.exports.__toLive=toLive;',n=>n==='mongoose'?{}:n==='./CromaLivePriceDirect'?{}:n==='./ProductAvailabilityPolicy'?policy:(()=>{throw Error(n)})());
const checks=[];
for(const state of ['ok','out_of_stock','discontinued','not_deliverable','price_unverified','temporary_error','identity_mismatch']){
 const result=withVerification({status:state==='ok'?'ok':'error',verificationStatus:state,priceNum:19999,price:'₹19,999',inStock:null});
 const actual=live.__toLive(result,{price_inr:18000});
 assert.equal(actual.in_stock,['out_of_stock','discontinued'].includes(state)?false:null);
 assert.equal(policy.isConfirmedUnavailable(actual),['out_of_stock','discontinued'].includes(state));
 checks.push({state,legacyStatus:result.status,liveStatus:actual.status,in_stock:actual.in_stock,unavailableChecks:actual.unavailable_checks,wouldQualifyForRemoval:policy.isConfirmedUnavailable(actual),retainedOldDisplayPrice:state!=='ok'&&actual.price_inr===18000});
}
for(const error of ['store_http_429','store_http_502','fetch_failed:TimeoutError','html_read_failed','croma_invalid_json','flipkart_e002_store_error_page']){
 const result=withVerification({status:'error',error,priceNum:999,inStock:false});const actual=live.__toLive(result,{price_inr:18000});assert.equal(policy.isConfirmedUnavailable(actual),false);assert.equal(actual.status,'error');assert.equal(result.priceNum,null);
}
console.log(JSON.stringify({networkCalls:0,mongoConnections:0,mongoWrites:0,productionChanges:0,checks,transportFailuresNeverUnavailable:true,important:'Actual current backend immediately classifies explicit permanent OOS/discontinued as removable; ambiguous unavailable requires two checks. This is source-policy evidence, not a performed deletion.'},null,2));
