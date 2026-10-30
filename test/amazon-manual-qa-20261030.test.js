import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractAmazon} from '../price.js';
const id='B074J9SPYX';
const expected={id,title:'Crompton Super Briz Deco 1200 mm Ceiling Fan'};
function page(body) {
 return '<html><title>Crompton Super Briz Deco 1200 mm Ceiling Fan - Amazon.in</title><body><div id="ASIN">'+id+'</div>'+body+'<p>Fan specifications and product details</p>'.repeat(45)+'</body></html>';
}
test('Amazon selling price outranks MRP inside primary buybox',()=>{
 const p=extractAmazon(page('<div id="corePriceDisplay_desktop_feature_div"><span class="a-text-price"><span class="a-offscreen">₹3,999</span></span><span id="priceToPay"><span class="a-price"><span class="a-offscreen">₹2,499</span></span></span></div>'),expected);
 assert.equal(p.status,'ok');assert.equal(p.priceNum,2499);
});
test('ambiguous primary prices fail closed rather than pick first MRP',()=>{
 const p=extractAmazon(page('<div id="corePriceDisplay_desktop_feature_div"><span class="a-offscreen">₹3,999</span><span class="a-offscreen">₹2,499</span></div>'),expected);
 assert.equal(p.status,'error');assert.equal(p.error,'amazon_conflicting_primary_prices');
});
test('malformed 100x currency is never accepted',()=>{
 const p=extractAmazon(page('<span id="priceToPay"><span class="a-offscreen">₹47,99000</span></span>'),expected);
 assert.equal(p.status,'error');assert.equal(p.priceNum,null);
});
test('single verified primary price remains backwards compatible',()=>{
 const p=extractAmazon(page('<div id="corePriceDisplay_desktop_feature_div"><span class="a-offscreen">₹2,499</span></div>'),expected);
 assert.equal(p.status,'ok');assert.equal(p.priceNum,2499);
});
