import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractAmazon} from '../price.js';
const html=canonical=>'<html><head><title>iQOO 15 Alpha 12GB 256GB - Amazon.in</title><link href="https://www.amazon.in/dp/'+canonical+'" rel="canonical"></head><body><input id="ASIN" value="B0FYGGJZV4"><div id="corePrice_feature_div"><span class="a-offscreen">₹85,999</span></div>'+('<p>Product specifications</p>'.repeat(30))+'</body></html>';
test('different canonical ASIN cannot supply price for requested listing',()=>{
 const r=extractAmazon(html('B0HCBBMV3V'),{id:'B0FYGGJZV4'});
 assert.equal(r.status,'error');assert.equal(r.priceNum,null);
 assert.equal(r.error,'amazon_canonical_product_mismatch');
});
test('same canonical ASIN preserves verified primary price extraction',()=>{
 assert.equal(extractAmazon(html('B0FYGGJZV4'),{id:'B0FYGGJZV4'}).priceNum,85999);
});
