'use strict';
const assert=require('assert/strict');
const {workerItem,validateWorkerQuote}=require(process.argv[2]||'../../candidate-backend/services/LivePriceIdentity');
const cases=[['itm85c805abf4849','Godrej',9,'WMNHBK4HNYBSDJ9U'],['itm1ad6a5136676c','Motorola',7,'WMNG4WGVXYSRYHJZ'],['itm5b001b74dc1cc','Haier',8,'WMNHHUCY5FWTHBAN'],['itm0381052d06f11','Samsung',7,'WMNGYGJKCVNKSZWY']];
let count=0;
for(const [page,brand,capacity,pid] of cases){const d={platform:'flipkart',platform_product_id:page,brand,title:`${brand} ${capacity} kg Washing Machine`,clean_url:`https://www.flipkart.com/exact-product/p/${page}`};assert.equal(new URL(workerItem(d)).searchParams.get('pid'),pid);count++;
 assert.equal(workerItem({...d,title:`${brand} 3 kg different variant`}),null);count++;
 assert.equal(workerItem({...d,brand:'WrongBrand'}),null);count++;
 assert.equal(workerItem({...d,original_product_url:d.clean_url+'?pid=WMN0000000000000'}),null);count++;
}
for(const page of ['itmf65781027269c','itmf0e126c67d776']){assert.equal(workerItem({platform:'flipkart',platform_product_id:page,clean_url:`https://www.flipkart.com/product/p/${page}`}),null);count++;}
assert.equal(workerItem({platform:'amazon',platform_product_id:'B074J9SPYX'}),'B074J9SPYX');count++;
assert.equal(workerItem({platform:'amazon',platform_product_id:'B0D41L64NR',product_url:'https://www.amazon.in/dp/B0GX9P1BWT'}),null);count++;
const d={platform:'amazon',brand:'Bosch',title:'Bosch 9 kg WGA14200IN',category:'washing-machines'};
assert.equal(validateWorkerQuote(d,'B0D41L64NR',{asin:'B0D41L64NR',amazon:{title:'Bosch 8 kg WGA14200IN',url:'https://www.amazon.in/dp/B0D41L64NR',status:'ok'}}).status,'error');count++;
console.log(JSON.stringify({status:'PASS',count,scope:'pure canonical mapping and identity regression; no retailer requests or DB writes'}));
