'use strict';
const fs=require('fs'),assert=require('assert/strict');
const {workerItem,validateWorkerQuote}=require('../../candidate-backend/services/LivePriceIdentity');
const cases=JSON.parse(fs.readFileSync(__dirname+'/primary-model-evidence.json'));let checks=0;
for(const c of cases){
 const d=c.catalogFields;const item=workerItem({...d,platform:'flipkart'});assert.equal(new URL(item).searchParams.get('pid'),c.pid);checks++;
 const row={pid:c.pid,flipkart:{url:item,title:d.title,status:'ok',verificationStatus:'ok',priceNum:1,inStock:null}};
 assert.equal(validateWorkerQuote({...d,platform:'flipkart'},item,row).retailer_product_id,c.pid);checks++;
 assert.equal(validateWorkerQuote({...d,platform:'flipkart'},item,{...row,pid:'WMN0000000000000'}).status,'error');checks++;
 const wrong={...row,flipkart:{...row.flipkart,title:c.brand+' 3 kg wrong capacity'}};
 assert.equal(validateWorkerQuote({...d,platform:'flipkart',category:'washing-machines'},item,wrong).status,'error');checks++;
}
console.log(JSON.stringify({status:'PASS',checks,scope:'three newly observed model/SKU bindings with actual catalog context; pure identity regression, no retailer or DB requests'}));
