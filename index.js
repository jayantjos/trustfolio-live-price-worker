import { extractPrice } from './price.js';

const cache = new Map();
const TTL = 45_000;
const LIMIT = 5;
// Browser Run is EXPLICIT opt-in, one product per request; no automatic fallbacks.
const BROWSER_MAX_BYTES = 2_500_000;
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
function safeBrowserEvidence(html, meta, item) {
  const title=(/<title[^>]*>([^<]{0,260})<\/title>/i.exec(html)||[])[1]||'';
  const h1=(/<h1\b[^>]*>([\s\S]{0,1200}?)<\/h1>/i.exec(html)||[])[1]||'';
  let urlHost=null,urlPath=null;
  if (meta?.finalUrl) try { const u=new URL(meta.finalUrl); urlHost=u.hostname;urlPath=u.pathname.slice(0,140); }catch(_){}
  const e002=isBrowserE002(html);
  return {browserTitle:title.replace(/[\r\n\t<>]/g,' ').slice(0,130),
    mainHeading:h1.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,130),
    finalUrlHost:urlHost,finalUrlPath:urlPath,
    isExpectedPidInHtml:html.toUpperCase().includes(item.id.toUpperCase()),
    containsSellingPriceToken:/"(?:fsp|price)"\s*:/i.test(html),
    containsVisibleRupeePrice:/₹\s*[\d,]{3,}/.test(html),
    storeErrorCode:e002?'E002':null};
}
function isBrowserE002(html){
  const body=/<body\b[^>]*>([\s\S]{0,6000}?)<\/body>/i.exec(html)?.[1]||'';
  const plain=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  return plain.length<1500 && /\bE002\b/i.test(plain) && /something went wrong/i.test(plain);
}
async function browserRenderedPrice(item, env) {
  if(!env?.BROWSER || typeof env.BROWSER.quickAction!=='function')
    return {parsed:null,diagnostic:'browser_binding_missing',evidence:null};
  try {
    const r=await env.BROWSER.quickAction('content',{url:item.url,gotoOptions:{waitUntil:'networkidle2',timeout:30000}});
    if(!r?.ok)return {parsed:null,diagnostic:'browser_http_'+(r?.status??'unknown'),evidence:null};
    const raw=await r.text();
    if(!raw || raw.length>BROWSER_MAX_BYTES)return {parsed:null,diagnostic:'browser_content_empty_or_too_large',evidence:null};
    let html=raw,meta=null;
    if(/^\s*\{/.test(raw)){
      let d;try{d=JSON.parse(raw)}catch(_){return {parsed:null,diagnostic:'browser_invalid_json_envelope',evidence:null}}
      if(d.success!==true||typeof d.result!=='string')return {parsed:null,diagnostic:'browser_unsuccessful_envelope',evidence:null};
      html=d.result;meta=d.meta||null;
    }
    if(!html || html.length>BROWSER_MAX_BYTES)return {parsed:null,diagnostic:'browser_content_not_html',evidence:null};
    const evidence=safeBrowserEvidence(html,meta,item);
    if(evidence.finalUrlHost&&!['flipkart.com','www.flipkart.com','amazon.in','www.amazon.in'].includes(evidence.finalUrlHost))
      return {parsed:null,diagnostic:'browser_redirect_unknown_host',evidence};
    if(evidence.finalUrlPath&&item.platform==='flipkart'&&!evidence.finalUrlPath.includes('/p/'))
      return {parsed:null,diagnostic:'browser_redirect_away_from_product',evidence};
    if(evidence.storeErrorCode==='E002')return {parsed:null,diagnostic:'flipkart_e002_store_error_page',evidence};
    const parsed=extractPrice(item.platform,html,{id:item.id,title:item.variantTitle||null});
    return {parsed,diagnostic:parsed.status==='ok'?'verified_from_rendered_html':
      parsed.error||'rendered_page_no_price',evidence};
  }catch(e){return {parsed:null,diagnostic:'browser_request_failed:'+String(e?.name||'error').slice(0,40),evidence:null}}
}
async function retrieve(item, env, browserProbe=false) {
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
  let parsed=extractPrice(item.platform,html,{id:item.id,title:item.variantTitle||null});
  let browserDiagnostic='not_requested';
  let browserEvidenceSummary=null;
  // Browser Run is used only when manually requested for one exact product.
  // No recurring browser usage or cost on normal live-price traffic.
  if (browserProbe && parsed.status==='error') {
    const check=await browserRenderedPrice(item,env);
    browserDiagnostic=check.diagnostic;
    browserEvidenceSummary=check.evidence;
    if(check.parsed?.status==='ok' && check.parsed.priceNum>0) parsed=check.parsed;
    // Explicit unavailable evidence is only accepted from the exact verified
    // product page, not arbitrary related-product or category text.
  }
  return {
    platform:item.platform==='flipkart'?'Flipkart':'Amazon',
    url:item.url, title,
    price:parsed.price, priceNum:parsed.priceNum,
    inStock:parsed.inStock, status:parsed.status,
    error:parsed.error??null, httpStatus:resp.status,
    browserDiagnostic:browserProbe?browserDiagnostic:undefined,
    browserEvidence:browserProbe?browserEvidenceSummary:undefined,
    extractionSource:parsed.source??null,
    bytesRead:Math.round(new TextEncoder().encode(html).length/1024)+' KB',
    latencyMs:Date.now()-start
  };
}
function empty(platform, status) {
  return {platform, url:null, title:null, price:null, priceNum:null, inStock:null, status};
}
async function one(input, useCache, ctx, env, browserProbe=false) {
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
    data=await retrieve(item,env,browserProbe);
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

const MONITORED_PRODUCTS = Object.freeze([
  {label:'Flipkart OPPO Reno 12 Pro 512 GB',pid:'MOBH2AHZH779MGYF',
    url:'https://www.flipkart.com/oppo-reno-12-pro-5g-space-brown-512-gb/p/itmed01efe011f83?pid=MOBH2AHZH779MGYF',platform:'flipkart'},
  {label:'Flipkart Tecno Pova 8 Pro 512 GB',pid:'MOBHQFDZKKM7EEFZ',
    url:'https://www.flipkart.com/tecno-pova-8-pro-5g-tundra-green-512-gb/p/itmff783095ed31c?pid=MOBHQFDZKKM7EEFZ',platform:'flipkart'},
  {label:'Amazon MTC 43 inch Smart TV',pid:'B0FNCLVRW5',
    url:'https://www.amazon.in/dp/B0FNCLVRW5',platform:'amazon'},
]);
const MONITOR_CRON = '5 */6 * * *';
async function runScheduledPriceQA(worker,env,ctx) {
  if(!env?.TF_PRICE_WORKER_KEY) {
    console.error('TRUSTFOLIO_AUTO_PRICE_QA=worker_secret_missing');
    throw new Error('MONITOR_SECRET_MISSING');
  }
  // Exercise the SAME authenticated /api/check handler internally.
  // The secret never leaves the Worker, and no Browser Run is triggered.
  const request=new Request('https://trustfolio-monitor.internal/api/check',{
    method:'POST',
    headers:{'x-api-key':env.TF_PRICE_WORKER_KEY,'content-type':'application/json'},
    body:JSON.stringify({items:MONITORED_PRODUCTS.map(x=>x.url),useCache:false,browserProbe:false})
  });
  const response=await worker.fetch(request,env,ctx);
  if(!response.ok)throw new Error('MONITOR_CHECK_HTTP_'+response.status);
  const payload=await response.json();
  const rows=Array.isArray(payload.results)?payload.results:[];
  const checks=MONITORED_PRODUCTS.map((product,i)=>{
    const record=rows[i]||{};
    const value=record[product.platform]||{};
    const verified=record.pid===product.pid && value.status==='ok'
      && Number.isFinite(value.priceNum) && value.priceNum>0;
    return {pid:product.pid,platform:product.platform,label:product.label,
      verified,status:value.status||'request_failed',
      priceINR:verified?value.priceNum:null,
      source:verified?(value.extractionSource||null):null,
      httpStatus:value.httpStatus??null,
      error:verified?null:(value.error||record.error||'price_not_verified')};
  });
  const successes=checks.filter(x=>x.verified).length;
  const report={kind:'trustfolio_price_monitor',version:'0.5.0',
    checkedAt:new Date().toISOString(),cron:MONITOR_CRON,
    total:checks.length,verified:successes,
    result:successes===checks.length?'PASS':'PRICE_UNVERIFIED',checks};
  console.log('TRUSTFOLIO_AUTO_PRICE_QA '+JSON.stringify(report));
  // A nonzero Cron failure makes missing real prices visible in Cron Events.
  if(successes!==checks.length)throw new Error('MONITOR_PRICE_UNVERIFIED_'+successes+'_OF_'+checks.length);
  return report;
}

const worker = {
  async fetch(request, env, ctx) {
    const url=new URL(request.url);
    if (request.method==='GET' && (url.pathname==='/' || url.pathname==='/health'))
      return json({ok:true,worker:'trustfolio-live-price-worker',version:'0.5.0',
        ready:Boolean(env.TF_PRICE_WORKER_KEY),
        monitoring:{cronUTC:MONITOR_CRON,items:MONITORED_PRODUCTS.length,logs:'Workers Logs'},
        note:'Actual-price checks require configured secret and verifiable source content.'});
    if(url.pathname!=='/api/check')return json({error:'not_found'},404);
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    if(!env.TF_PRICE_WORKER_KEY) return json({error:'worker_key_not_configured'},503);
    if(request.headers.get('x-api-key')!==env.TF_PRICE_WORKER_KEY) return json({error:'unauthorized'},401);
    let body;try {body=await request.json()} catch(_) {return json({error:'invalid_json'},400)}
    if (!Array.isArray(body?.items)||body.items.length<1||body.items.length>LIMIT || body.items.some(x=>typeof x!=='string'))
      return json({error:'items_must_be_1_to_5_product_urls'},400);
    // Strictly limit expensive browser operation to an explicitly requested
    // single-SKU diagnostic. The ordinary price service is unchanged.
    const browserProbe=body.browserProbe===true;
    if (browserProbe && (body.items.length!==1 || body.useCache!==false))
      return json({error:'browser_probe_requires_one_item_and_useCache_false'},400);
    const results=[];
    for(const input of body.items) results.push(await one(input,body.useCache!==false,ctx,env,browserProbe));
    return json({success:true,results});
  }
  async scheduled(controller,env,ctx) {
    await runScheduledPriceQA(worker,env,ctx);
  }
};
export default worker;
export {identify,runScheduledPriceQA};
