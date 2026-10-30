import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractFlipkart} from '../price.js';

const pid='MOBH7YZ9NSDFC3EK',title='POCO X7 5G Yellow 256 GB';
function product(htmlPrice, htmlPid=pid) {
 return '<html><head><title>POCO X7 5G (Yellow, 256 GB) on Flipkart</title></head><body>'
  +'<h1>POCO X7 5G Yellow 256 GB</h1>'
  +'<div data-pid="'+htmlPid+'">'+htmlPrice+'</div>'
  +'<p>Exact product details and specifications</p>'.repeat(45)
  +'</body></html>';
}
test('ported Scrape.do Flipkart Buy-at matches single price within exact PID',()=>{
 const x=extractFlipkart(product('Buy at ₹19,999'),{id:pid,title});
 assert.equal(x.status,'ok');assert.equal(x.priceNum,19999);
 assert.equal(x.source,'flipkart_primary_buy_at');
});
test('unmatched PID cannot capture another variant price',()=>{
 const x=extractFlipkart(product('Buy at ₹19,999','MOBH000000000000'),{id:pid,title});
 assert.equal(x.priceNum,null);assert.equal(x.status,'error');
});
test('conflicting Buy-at prices must fail closed',()=>{
 const x=extractFlipkart(product('Buy at ₹19,999, Buy at ₹20,999'),{id:pid,title});
 assert.equal(x.priceNum,null);assert.equal(x.status,'error');
});
test('Notify Me is not a live price',()=>{
 const x=extractFlipkart(product('Notify Me Buy at ₹19,999'),{id:pid,title});
 assert.equal(x.priceNum,null);assert.equal(x.status,'error');
});
test('E002 storefront error is transient, not deletion instruction',()=>{
 const x=extractFlipkart(product('<h2>Something went wrong!</h2> E002'),{id:pid,title});
 assert.equal(x.priceNum,null);assert.equal(x.status,'error');
 assert.equal(x.error,'flipkart_e002_store_error_page');
});
