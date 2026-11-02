import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractFlipkart} from '../price.js';
const name='HP Intel Celeron Dual Core N4500 - (8 GB/512 GB SSD/Windows 11 Home) 14s-dq3149TU / 14s-dq3141TU Thin and Light Laptop';
const title=name+' Rs.31933 Price in India - Buy '+name+' Jet Black Online - HP : Flipkart.com';
const pid='COMHDNV8HQQJSHFH';
function page(t){return '<html><title>'+t+'</title><body><h1>'+name+'</h1><script type="application/ld+json">'+JSON.stringify({'@type':'Product',name,sku:pid,offers:{price:31933,availability:'https://schema.org/InStock'}})+'</script>'+('<p>Product specifications</p>'.repeat(30))+'</body></html>';}
test('valid retailer SEO title over 260 chars preserves exact laptop identity',()=>{
 assert.ok(title.length>260);const r=extractFlipkart(page(title),{id:pid,title:name});
 assert.equal(r.status,'ok');assert.equal(r.priceNum,31933);assert.equal(r.inStock,true);
});
test('long title still rejects a conflicting storage variant',()=>{
 const r=extractFlipkart(page(title.replaceAll('512 GB','256 GB')),{id:pid,title:name});
 assert.equal(r.status,'error');assert.equal(r.priceNum,null);
});
