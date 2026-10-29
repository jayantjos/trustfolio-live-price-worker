import { extractPrice } from './price.js';

const cache = new Map();
const TTL = 45_000;
const LIMIT = 5;
const CORS_ORIGIN = '*';
const json = (value, status=200) => new Response(JSON.stringify(value), {
  status, headers: {'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'access-control-allow-origin':CORS_ORIGIN}
});
const errorShape = (platform, error, httpStatus=null) => ({
  platform:platform==='amazon'?'Amazon':'Flipkart',
  url:null,title:null,price:null,priceNum:null,inStock:null,status:'error',error,httpStatus
});
function identify(input) {
  if (typeof input!=='string' || input.length>1500) return null;
  let u; try {u=new URL(input)} catch (_) {return null}
  if(u.protocol!=='https:' || u.username || u.password || u.port) return null;
  const host=u.hostname.toLowerCase();
  if(host==='www.flipkart.com'||host==='flipkart.com') {
    const pid=String(u.searchParams.get('pid')||'').trim().toUpperCase();
    if(!/^[A-Z0-9]{12,24}$/.test(pid) || !/\/p\/itm[a-z0-9]+/i.test(u.pathname))return null;
    // Canonical first-party product PDP only; discard unsafe/additional parameters.
    return {platform:'flipkart',id:pid,variantTitle:decodeURIComponent(u.pathname.split('/p/')[0].slice(1)).replace(/-/g,' '),url:'https://www.flipkart.com'+u.pathname+'?pid='+encodeURIComponent(pid)};
  }
  if(host==='www.amazon.in'||host==='amazon.in') {
    const m=/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i.exec(u.pathname);
    if(!m)return null;
    const asin=m[1].toUpperCase();
    return {platform:'amazon',id:asin,url:'https://www.amazon.in/dp/'+asin};
  }
  return null;
}
async function retrieve(item) {
  const start=Date.now();
  let resp;
  try {
    resp=await fetch(item.url, {
      method:'GET',
      headers: {
        accept:'text/html,application/xhtml+xml',
        'accept-language':'en-IN,en;q=0.9',
        'user-agent':'Mozilla/5.0 (compatible; TrustFolioPrice/1.0; +https://trustfolio.in)'
      }, redirect:'manual', signal:AbortSignal.timeout(6500)
    });
  } catch(e) {
    return {...errorShape(item.platform,'fetch_failed:'+String(e.name||'network_error')),latencyMs:Date.now()-start};
  }
  // A redirect is not proof a product is unavailable. Do not follow unknown hosts.
  if (resp.status>=300 && resp.status<400) {
    return {...errorShape(item.platform,'redirect_unverified',resp.status),latencyMs:Date.now()-start};
  }
  if(resp.status!==200) {
    return {...errorShape(item.platform,'store_http_'+resp.status,resp.status),latencyMs:Date.now()-start};
  }
  const type=resp.headers.get('content-type')||'';
  if(type && !/html/i.test(type))return {...errorShape(item.platform,'not_html',resp.status),latencyMs:Date.now()-start};
  let html='';try {html=await resp.text()} catch(_) {
    return {...errorShape(item.platform,'html_read_failed',resp.status),latencyMs:Date.now()-start};
  }
  if(html.length>2_500_000)return {...errorShape(item.platform,'html_too_large',resp.status),latencyMs:Date.now()-start};
  const match=/<title[^>]*>([^<]*)<\/title>/i.exec(html);
  const title=match?.[1]||null;
  const parsed=extractPrice(item.platform,html,{id:item.id,title:item.variantTitle||null});
  return {
    platform:item.platform==='flipkart'?'Flipkart':'Amazon',
    url:item.url, title,
    price:parsed.price, priceNum:parsed.priceNum,
    inStock:parsed.inStock, status:parsed.status,
    error:parsed.error??null, httpStatus:resp.status,
    extractionSource:parsed.source??null,
    bytesRead:Math.round(new TextEncoder().encode(html).length/1024)+' KB',
    latencyMs:Date.now()-start
  };
}
function empty(platform, status) {
  return {platform, url:null, title:null, price:null, priceNum:null, inStock:null, status};
}
async function one(input, useCache, ctx) {
  const start=Date.now();
  const item=identify(input);
  if(!item) {
    return {pid:null,input,amazon:empty('Amazon','skipped'),flipkart:empty('Flipkart','skipped'),
      croma:empty('Croma','not_supported'),bestDeal:{winner:null,savings:0,status:'no_price'},
      cached:false,itemLatencyMs:Date.now()-start,error:'unsupported_product_url'};
  }
  const k=item.platform+':'+item.id;
  const existing=cache.get(k);
  let data,cached=false;
  if (useCache && existing && existing.expiry>Date.now()) {
    data=existing.data;cached=true;
  } else {
    data=await retrieve(item);
    if(data.status==='ok' && data.priceNum>0) {
      cache.set(k,{data,expiry:Date.now()+TTL});
      if(cache.size>300)cache.delete(cache.keys().next().value);
    }
  }
  const fk=item.platform==='flipkart'?data:empty('Flipkart','skipped');
  const am=item.platform==='amazon'?data:empty('Amazon','skipped');
  return {pid:item.id,input,amazon:am,flipkart:fk,croma:empty('Croma','not_supported'),
    bestDeal:data.status==='ok'?{winner:item.platform,savings:0,status:'ok'}:{winner:null,savings:0,status:'no_price'},
    cached,itemLatencyMs:Date.now()-start};
}
export default {
  async fetch(request, env, ctx) {
    const url=new URL(request.url);
    if (request.method==='GET' && (url.pathname==='/' || url.pathname==='/health'))
      return json({ok:true,worker:'trustfolio-live-price-worker',version:'0.1.0',
        ready:Boolean(env.TF_PRICE_WORKER_KEY),
        note:'Actual-price checks require configured secret and verifiable source content.'});
    if(url.pathname!=='/api/check')return json({error:'not_found'},404);
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    if(!env.TF_PRICE_WORKER_KEY) return json({error:'worker_key_not_configured'},503);
    if(request.headers.get('x-api-key')!==env.TF_PRICE_WORKER_KEY) return json({error:'unauthorized'},401);
    let body;try {body=await request.json()} catch(_) {return json({error:'invalid_json'},400)}
    if (!Array.isArray(body?.items)||body.items.length<1||body.items.length>LIMIT || body.items.some(x=>typeof x!=='string'))
      return json({error:'items_must_be_1_to_5_product_urls'},400);
    const results=[];
    for(const input of body.items) results.push(await one(input,body.useCache!==false,ctx));
    return json({success:true,results});
  }
};
export {identify};
