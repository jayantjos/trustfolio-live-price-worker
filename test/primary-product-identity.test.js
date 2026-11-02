import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractFlipkart} from '../price.js';
const pid='MOBH9HFJSWHHG6ZS';
const expected='POCO M7 5G - Locked with Airtel Prepaid (Mint Green, 128 GB)';
function html(title,name=expected){return '<html><title>'+title+'</title><body><h1>'+name+'</h1><script type="application/ld+json">'+JSON.stringify({'@type':'Product',name,sku:pid,offers:{price:12999,availability:'https://schema.org/InStock'}})+'</script>'+('<p>Product specification</p>'.repeat(30))+'</body></html>';}
test('verified primary exact SKU/full variant can disambiguate abbreviated SEO title',()=>{
 const r=extractFlipkart(html('POCO M7 5G (128 GB Storage, 6 GB RAM) Online at Best Price On Flipkart.com'),{id:pid,title:expected,primaryProductValidated:true});
 assert.equal(r.status,'ok');assert.equal(r.priceNum,12999);assert.equal(r.inStock,true);
});
test('primary identity path still rejects wrong capacity',()=>{
 const r=extractFlipkart(html('POCO M7 5G Online - Flipkart.com',expected.replace('128 GB','256 GB')),{id:pid,title:expected,primaryProductValidated:true});
 assert.equal(r.status,'error');assert.equal(r.priceNum,null);
});
test('primary identity opt-in never accepts a blocked page title',()=>{
 assert.equal(extractFlipkart(html('Robot Check'),{id:pid,title:expected,primaryProductValidated:true}).status,'error');
});
