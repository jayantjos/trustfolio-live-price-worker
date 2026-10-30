import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractAmazon} from '../price.js';
const pid='B0FNCLVRW5';
function page(price,code=pid,title='MTC 43 Inch Smart TV - Amazon.in'){
 return '<html><title>'+title+'</title><body><div id="ASIN">'+code+'</div>'
  +'<div id="corePriceDisplay_desktop_feature_div"><span class="a-offscreen">₹'+price+'</span></div>'
  +'<div>Exact MTC smart TV product</div>'.repeat(35)+'</body></html>';
}
test('valid Indian grouping and decimal fractions are parsed as INR',()=>{
 assert.equal(extractAmazon(page('47,990.00'),{id:pid,title:'MTC 43 Inch Smart TV'}).priceNum,47990);
});
test('malformed Amazon currency grouping never yields a 100x INR price',()=>{
 const p=extractAmazon(page('47,99000'),{id:pid,title:'MTC 43 Inch Smart TV'});
 assert.equal(p.priceNum,null);assert.equal(p.status,'error');
});
test('HTTP200 generic Amazon.in soft-block is not verified product price',()=>{
 const p=extractAmazon(page('47,990.00',pid,'Amazon.in'),{id:pid,title:'MTC 43 Inch Smart TV'});
 assert.equal(p.priceNum,null);assert.equal(p.error,'product_identity_unverified');
});
test('wrong ASIN price rejected even if product title looks correct',()=>{
 const p=extractAmazon(page('47,990.00','B0UNRELATED'),{id:pid,title:'MTC 43 Inch Smart TV'});
 assert.equal(p.priceNum,null);assert.equal(p.error,'amazon_product_identity_unverified');
});
