import {extractAmazon} from './price.js';

// Fetch only primary product sections. Whole rendered Amazon documents contain
// megabytes of scripts/recommendations which are irrelevant to buy-box pricing.
export const AMAZON_SELECTORS = Object.freeze([
  'title', 'link[rel="canonical"]', 'input#ASIN', '#productTitle',
  '#apex_desktop', '#corePriceDisplay_desktop_feature_div',
  '#corePrice_feature_div', '#priceblock_dealprice', '#priceblock_ourprice',
  '#availability'
]);
const LIMIT = 2_500_000;
const escape = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const attr = (row,key) => row?.attributes?.find(x=>x.name===key)?.value;
// Quick Actions may return empty innerText for metadata/hidden title nodes.
// Use only that exact selector's HTML text, never other page sections.
const nodeText = row => typeof row?.text==='string'&&row.text.trim()?row.text.trim():
  typeof row?.html==='string'?row.html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim():'';

// Bound the response while reading, before allocating/parsing an entire body.
async function readBounded(response) {
  if(!response.body) return '';
  const reader=response.body.getReader(), decoder=new TextDecoder();
  let text='',bytes=0;
  try {
    while(true) {
      const {value,done}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>LIMIT) {await reader.cancel();throw new Error('browser_content_exceeds_limit');}
      text+=decoder.decode(value,{stream:true});
    }
    return text+decoder.decode();
  } finally {reader.releaseLock();}
}
export async function amazonBrowserPrice(item,env) {
  const response=await env.BROWSER.quickAction('scrape',{
    url:item.url,elements:AMAZON_SELECTORS.map(selector=>({selector})),
    gotoOptions:{waitUntil:'networkidle2',timeout:30000}
  });
  const fail=(diagnostic,evidence=null)=>({parsed:null,diagnostic,evidence});
  if(!response?.ok)return fail('browser_http_'+(response?.status??'unknown'));
  let raw;
  try {raw=await readBounded(response);} catch(e) {return fail(e.message);}
  if(!raw)return fail('browser_content_empty');
  let data;
  try {data=JSON.parse(raw);} catch(_){return fail('browser_invalid_json_envelope');}
  const rows=Array.isArray(data)?data:data?.success===true?data.result:null;
  if(!Array.isArray(rows))return fail('browser_unsuccessful_envelope');
  // Reject duplicate/unexpected selector groups; never silently use the first.
  const groups=new Map();
  for(const group of rows) {
    if(!AMAZON_SELECTORS.includes(group?.selector)||groups.has(group.selector)||!Array.isArray(group.results))
      return fail('browser_invalid_scrape_schema');
    groups.set(group.selector,group.results);
  }
  const one=selector=>{const rs=groups.get(selector)||[];return rs.length===1?rs[0]:null;};
  const asin=String(attr(one('input#ASIN'),'value')||'').toUpperCase();
  const title=nodeText(one('title'));
  const heading=nodeText(one('#productTitle'));
  const evidence={responseBytes:new TextEncoder().encode(raw).length,
    browserTitle:String(title||'').slice(0,130),mainHeading:String(heading||'').slice(0,130),
    primaryAsin:asin||null,identityVerified:asin===item.id,mode:'amazon-primary-sections-v2',
    selectorCounts:Object.fromEntries([...groups].map(([key,value])=>[key,value.length]))};
  if(asin!==item.id||!title||!heading)return fail('amazon_product_identity_unverified',evidence);
  const canonical=attr(one('link[rel="canonical"]'),'href');
  if(canonical) {
    let u;try {u=new URL(canonical,item.url);} catch(_){return fail('browser_invalid_canonical',evidence);}
    const id=/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i.exec(u.pathname)?.[1]?.toUpperCase();
    if(!['amazon.in','www.amazon.in'].includes(u.hostname)||id!==item.id)
      return fail('browser_product_redirect_mismatch',evidence);
  }
  let html='<html><title>'+escape(title)+'</title><body><input id="ASIN" value="'+escape(asin)+'"><h1>'+escape(heading)+'</h1>';
  for(const selector of AMAZON_SELECTORS.filter(x=>x.startsWith('#')&&x!=='#productTitle')) {
    const rs=groups.get(selector)||[];
    if(rs.length>1)return fail('browser_ambiguous_primary_section',evidence);
    if(rs.length===1) {
      if(typeof rs[0].html!=='string')return fail('browser_invalid_scrape_schema',evidence);
      html+='<div id="'+selector.slice(1)+'">'+rs[0].html+'</div>';
    }
  }
  html+='</body></html>';
  const parsed=extractAmazon(html,{id:item.id,title:item.variantTitle||heading});
  return {parsed,diagnostic:parsed.status==='ok'?'verified_from_rendered_primary_sections':parsed.error,evidence};
}
