import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveFixedFlipkart} from '../fixed-flipkart-audit.js';
const name='Panasonic 2026 Model 1.5 Ton 3 Star Split Inverter Wi-fi AC';
const sample={url:'https://fkrt.clnk.in/CfuU',title:name,brand:'Panasonic'};
const canonical='https://www.flipkart.com/panasonic-2026-ac/p/itmc394322d7a27f';
const product={ '@type':'Product',name,brand:{name:'Panasonic'},sku:'ACNHJZN5MZNMBWZS',offers:{price:37990,priceCurrency:'INR',availability:'https://schema.org/InStock'}};
function html(products){return '<html><title>'+name+' - Flipkart.com</title><link href="'+canonical+'" rel="canonical"><body><h1>'+name+'</h1><script type="application/ld+json">'+JSON.stringify(products)+'</script><div>Buy at ₹34,490 with bank offer</div>'+('<p>Product specifications and warranty</p>'.repeat(30))+'</body></html>';}
test('fixed affiliate redirect resolves exact primary SKU and standard price, not bank offer',async()=>{
 const original=global.fetch;const urls=[];
 const intermediate='https://linksredirect.com/fixed-fixture';
 global.fetch=async url=>{urls.push(String(url));return urls.length<3?new Response(null,{status:302,headers:{location:urls.length===1?intermediate:canonical}}):new Response(html([product]));};
 try{const r=await resolveFixedFlipkart(sample);assert.equal(r.resolved.pid,product.sku);assert.equal(r.result.flipkart.priceNum,37990);assert.equal(r.result.flipkart.inStock,true);assert.deepEqual(urls,[sample.url,intermediate,canonical]);}
 finally{global.fetch=original;}
});
test('unknown redirect host is rejected before contacting it',async()=>{
 const original=global.fetch;let calls=0;
 global.fetch=async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://unknown.example/product'}});};
 try{const r=await resolveFixedFlipkart(sample);assert.equal(r.error,'fixed_redirect_host_unverified');assert.equal(r.redirectHost,'unknown.example');assert.equal(calls,1);}
 finally{global.fetch=original;}
});
test('ambiguous Product JSON-LD never supplies an arbitrary PID or price',async()=>{
 const original=global.fetch;let calls=0;
 global.fetch=async()=>++calls===1?new Response(null,{status:302,headers:{location:canonical}}):new Response(html([product,{...product,sku:'ACNHJZN5TSZ5HAVM'}]));
 try{const r=await resolveFixedFlipkart(sample);assert.equal(r.error,'fixed_primary_product_jsonld_unverified');assert.equal(r.priceINR,null);}
 finally{global.fetch=original;}
});
test('catalog brand conflict blocks price even when PID and amount exist',async()=>{
 const original=global.fetch;let calls=0;
 global.fetch=async()=>++calls===1?new Response(null,{status:302,headers:{location:canonical}}):new Response(html([{...product,brand:{name:'PTROX'}}]));
 try{const r=await resolveFixedFlipkart({...sample,brand:'TECHFIRE'});assert.equal(r.error,'fixed_catalog_brand_mismatch');assert.equal(r.priceINR,null);assert.equal(r.retailerBrand,'PTROX');}
 finally{global.fetch=original;}
});
