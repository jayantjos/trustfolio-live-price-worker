import {test} from 'node:test';
import assert from 'node:assert/strict';
import {amazonBrowserPrice,AMAZON_SELECTORS} from '../amazon-browser.js';
const item={platform:'amazon',id:'B074J9SPYX',url:'https://www.amazon.in/dp/B074J9SPYX'};
const title='Crompton Super Briz Deco 1200 mm (48 Inch) High Speed Decorative Ceiling Fan (Smoked Brown), Pack Of 1, 4 stars';
function fixture(body='<span id="priceToPay"><span class="a-price"><span class="a-offscreen">₹2,499.00</span></span></span>') {
  return [
    {selector:'head > title',results:[{text:title+' - Amazon.in'}]},
    {selector:'#centerCol #title #productTitle',results:[{text:title}]},
    {selector:'input#ASIN',results:[{attributes:[{name:'value',value:item.id}]}]},
    {selector:'link[rel="canonical"]',results:[{attributes:[{name:'href',value:item.url}]}]},
    {selector:'#apex_desktop',results:[{html:body}]},
    {selector:'#availability',results:[{html:'<span>In stock. Ships from Amazon. Sold by Jagganth Enterprises. Select delivery location to confirm delivery availability.</span>'}]}
  ];
}
async function run(rows) {
  let calls=0;
  const env={BROWSER:{quickAction:async(action,args)=>{
    calls++;assert.equal(action,'scrape');assert.equal(args.url,item.url);
    assert.deepEqual(args.elements,AMAZON_SELECTORS.map(selector=>({selector})));
    return new Response(JSON.stringify(rows));
  }}};
  const result=await amazonBrowserPrice(item,env);
  assert.equal(calls,1);return result;
}
test('primary-section response replaces full-page content without raising size limit',async()=>{
  const r=await run({success:true,result:fixture()});
  assert.equal(r.parsed.priceNum,2499);assert.equal(r.evidence.identityVerified,true);
});
test('supports bare array binding responses',async()=>{
  const r=await run(fixture());assert.equal(r.parsed.priceNum,2499);
});
test('reads selector HTML when metadata innerText is empty',async()=>{
  const f=fixture();
  f[0].results[0]={text:'',html:title+' - Amazon.in'};
  f[1].results[0]={html:'<span>'+title+'</span>'};
  const r=await run(f);assert.equal(r.parsed.priceNum,2499);
});
test('rejects different ASIN even when title matches',async()=>{
  const f=fixture();f[2].results[0].attributes[0].value='B000000000';
  assert.equal((await run(f)).diagnostic,'amazon_product_identity_unverified');
});
test('rejects different canonical product',async()=>{
  const f=fixture();f[3].results[0].attributes[0].value='https://www.amazon.in/dp/B000000000';
  assert.equal((await run(f)).diagnostic,'browser_product_redirect_mismatch');
});
test('hidden main price never substitutes other sellers or EMI',async()=>{
  const r=await run(fixture('<div>To see product details, add this item to your cart. You can always remove it later.</div><div>EMI starts at ₹88.</div>'));
  assert.equal(r.parsed.priceNum,null);assert.equal(r.diagnostic,'amazon_buybox_price_not_exposed');
});
test('rejects unsuccessful JSON envelopes',async()=>{
  assert.equal((await run({success:false,result:fixture()})).diagnostic,'browser_unsuccessful_envelope');
});
test('response size protection remains and cancels oversized stream',async()=>{
  let cancelled=false;
  const env={BROWSER:{quickAction:async()=>new Response(new ReadableStream({
    pull(c){c.enqueue(new Uint8Array(1_000_000));},cancel(){cancelled=true;}
  }))}};
  assert.equal((await amazonBrowserPrice(item,env)).diagnostic,'browser_content_exceeds_limit');
  assert.equal(cancelled,true);
});
