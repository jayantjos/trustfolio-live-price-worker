import { extractPrice } from './price.js';
import { QA_100_PRODUCTS } from './qa/real-mongo-100-each.js';
import { DurableObject } from 'cloudflare:workers';

// Only a tiny, non-sensitive latest-QA summary is persisted; no secrets/HTML.
export class PriceMonitorState extends DurableObject {
  async readLatest() { return (await this.ctx.storage.get('latest')) || null; }
  async claimOnDemand(now,scope='sample') {
    // Serialize competing requests within the singleton Durable Object.
    // SQLite-backed Durable Objects expose storage.get/put directly.
    const previousGate=this._claimGate||Promise.resolve();
    let unlock;
    this._claimGate=new Promise(resolve=>{unlock=resolve;});
    await previousGate;
    try {
      const isBatch=/^qa100(?:v2)?_(amazon|flipkart)_\d{1,2}$/.test(scope);
      const storageKey=isBatch?scope+'_last_claim':scope==='budget'?'budget_last_claim':scope==='croma'?'croma_last_claim':'manual_last_claim';
      const previous=Number(await this.ctx.storage.get(storageKey)||0);
      const retryAfterMs=Math.max(0,previous+(isBatch?3*60*60*1000:15*60*1000)-now);
      if(retryAfterMs>0)return {allowed:false,retryAfterSeconds:Math.ceil(retryAfterMs/1000)};
      await this.ctx.storage.put(storageKey,now);
      return {allowed:true,retryAfterSeconds:0};
    } finally {
      unlock();
    }
  }
  async saveFixed100(key,report) {
    if(!/^qa100(?:v2)?_(amazon|flipkart)_\d{1,2}$/.test(key)||!report||report.kind!=='trustfolio_100_products_qa')throw new Error('INVALID_QA100_REPORT');
    await this.ctx.storage.put(key+'_result',report);
  }
  async readFixed100(key) {
    if(!/^qa100(?:v2)?_(amazon|flipkart)_\d{1,2}$/.test(key))return null;
    return (await this.ctx.storage.get(key+'_result'))||null;
  }
  async saveBudgetProbe(report) {
    if(!report || report.kind!=='budget20k_cloudflare_qa'||!Array.isArray(report.checks)||report.checks.length!==4)throw new Error('INVALID_BUDGET_QA');
    await this.ctx.storage.put('latest_budget20k_probe',report);
  }
  async readBudgetProbe() {
    return (await this.ctx.storage.get('latest_budget20k_probe'))||null;
  }
  async saveCromaProbe(report) {
    if(!report || report.sku!=='300154')throw new Error('INVALID_CROMA_REPORT');
    await this.ctx.storage.put('latest_croma_probe',report);
  }
  async readCromaProbe() {
    return (await this.ctx.storage.get('latest_croma_probe'))||null;
  }
  async saveLatest(report) {
    if (!report || report.kind!=='trustfolio_price_monitor'
       || !Array.isArray(report.checks) || report.checks.length!==3)
      throw new Error('INVALID_MONITOR_REPORT');
    await this.ctx.storage.put('latest', report);
    return true;
  }
}


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
  // Existing TrustFolio backend sends only the Amazon ASIN in items:[...].
  // Preserve that legacy request contract for a URL-only future cutover.
  const bareAsin=input.trim().toUpperCase();
  if (/^B0[A-Z0-9]{8}$/.test(bareAsin)) {
    return {platform:'amazon',id:bareAsin,url:'https://www.amazon.in/dp/'+bareAsin};
  }
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
    return {asin:null,pid:null,input,amazon:empty('Amazon','skipped'),flipkart:empty('Flipkart','skipped'),
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
  return {asin:item.platform==='amazon'?item.id:null,pid:item.id,input,amazon:am,flipkart:fk,croma:empty('Croma','not_supported'),
    bestDeal:data.status==='ok'?{winner:item.platform,savings:0,status:'ok'}:{winner:null,savings:0,status:'no_price'},
    cached,itemLatencyMs:Date.now()-start};
}


// Read-only fixed SKU test of the existing VPS Croma search API via Cloudflare.
// NEVER treat missing search results, HTTP errors or SKU mismatch as sold-out.
async function probeCromaFixedSku() {
  const api=new URL('https://api.croma.com/searchservices/v1/search');
  const args={currentPage:'0',query:'Crompton Energion Hyperjet :relevance',
    fields:'FULL',channel:'WEB',channelCode:'400049',spellOpt:'DEFAULT'};
  for(const [key,value] of Object.entries(args))api.searchParams.set(key,value);
  let response;
  try{response=await fetch(api.toString(),{
    method:'GET',headers:{accept:'application/json'},
    signal:AbortSignal.timeout(6500),
    redirect:'manual'
  });}
  catch(e){return {sku:'300154',status:'error',error:'croma_fetch_failed',
    errorKind:String(e?.name||'network_error'),priceINR:null};}
  if(response.status!==200)return {sku:'300154',status:'error',error:'croma_http_'+response.status,
    httpStatus:response.status,priceINR:null};
  let body;
  try{body=await response.json()}catch(_){return {sku:'300154',status:'error',
    error:'croma_invalid_json',httpStatus:200,priceINR:null}}
  if(!Array.isArray(body?.products))return {sku:'300154',status:'error',
    error:'croma_products_missing',httpStatus:200,priceINR:null};
  const row=body.products.find(x=>x&&['code','skuId','productCode','id'].some(k=>String(x[k]??'')==='300154'));
  if(!row)return {sku:'300154',status:'no_price',error:'exact_croma_sku_not_in_search',
    httpStatus:200,priceINR:null,returnedProducts:body.products.length};
  const money=(v)=>{
    if(v&&typeof v==='object')return money(v.value??v.formattedValue);
    const n=Number(String(v??'').replace(/[^0-9.]/g,''));
    return Number.isFinite(n)&&n>=100&&n<100000000?n:null;
  };
  let price=null,source=null;
  for(const key of ['price','pincodePrice']){
    const p=row[key];
    if(String(p?.priceType||'').toUpperCase()==='BUY'){
      const candidate=money(p);
      if(candidate!=null){price=candidate;source='croma_'+key+'_BUY';break;}
    }
  }
  if(price===null){
    for(const key of ['sellingPrice','offerPrice','finalPrice']){
      const candidate=money(row[key]);
      if(candidate!=null){price=candidate;source='croma_'+key;break;}
    }
  }
  const result={sku:'300154',status:price===null?'no_price':'ok',
    httpStatus:200,priceINR:price,source,
    title:String(row.name||row.title||'').slice(0,140),
    brand:String(row.brandName||row.brand||'').slice(0,70),
    hasSpecifications:Boolean(row.specifications||row.attributes||row.classifications),
    productFieldNames:Object.keys(row).filter(k=>/brand|spec|attr|model|code|price|categor/i.test(k)).slice(0,24),
    error:price===null?'croma_buy_price_not_present':null};
  return result;
}


// Four exact first-wave Amazon/Flipkart candidates from the real MongoDB
// TrustFolio smart-phones INR 20,000 ranker. No arbitrary user-supplied URLs.
const BUDGET20K_CHECKS = Object.freeze([
 {platform:'amazon',pid:'B0GPX4LV4F',name:'realme C83 5G 4+64GB',
  input:'B0GPX4LV4F',productUrl:'https://www.amazon.in/dp/B0GPX4LV4F'},
 {platform:'amazon',pid:'B0GQKZGBFD',name:'realme C83 5G 6+128GB',
  input:'B0GQKZGBFD',productUrl:'https://www.amazon.in/dp/B0GQKZGBFD'},
 {platform:'flipkart',pid:'MOBH7YZ9NSDFC3EK',name:'POCO X7 5G Yellow 256GB',
  input:'https://www.flipkart.com/poco-x7-5g-yellow-256-gb/p/itm09a41b8f384f7?pid=MOBH7YZ9NSDFC3EK',
  productUrl:'https://www.flipkart.com/poco-x7-5g-yellow-256-gb/p/itm09a41b8f384f7?pid=MOBH7YZ9NSDFC3EK'},
 {platform:'flipkart',pid:'MOBH7YZ9DHHSMGHN',name:'POCO X7 5G Cosmic Silver 256GB',
  input:'https://www.flipkart.com/poco-x7-5g-cosmic-silver-256-gb/p/itmdfee46549bede?pid=MOBH7YZ9DHHSMGHN',
  productUrl:'https://www.flipkart.com/poco-x7-5g-cosmic-silver-256-gb/p/itmdfee46549bede?pid=MOBH7YZ9DHHSMGHN'},
]);
async function runBudget20kProbe(worker,env,ctx) {
 const request=new Request('https://trustfolio-budget-qa.internal/api/check',{
  method:'POST',headers:{'content-type':'application/json','x-api-key':env.TF_PRICE_WORKER_KEY},
  body:JSON.stringify({items:BUDGET20K_CHECKS.map(v=>v.input),useCache:false,browserProbe:false})
 });
 const res=await worker.fetch(request,env,ctx);
 if(!res.ok)throw new Error('BUDGET_QA_API_'+res.status);
 const body=await res.json();
 const checks=BUDGET20K_CHECKS.map((p,i)=>{
   const row=body?.results?.[i]||{};
   const store=row[p.platform]||{};
   const hasIdentity=(p.platform==='amazon'?row.asin===p.pid:row.pid===p.pid);
   const hasPrice=hasIdentity&&store.status==='ok'&&Number.isFinite(store.priceNum)&&store.priceNum>0;
   const price=hasPrice?store.priceNum:null;
   return {name:p.name,platform:p.platform,pid:p.pid,productUrl:p.productUrl,
     status:store.status||'no_response',priceINR:price,
     inBudget:hasPrice?price<=20000:null,
     httpStatus:store.httpStatus??null,extractionSource:hasPrice?store.extractionSource||null:null,
     error:store.error||null,identityVerified:hasIdentity};
 });
 return {kind:'budget20k_cloudflare_qa',checkedAt:new Date().toISOString(),
    budgetINR:20000,category:'smart-phones',checked:checks.length,
    verified:checks.filter(x=>x.priceINR!==null).length,
    withinBudget:checks.filter(x=>x.inBudget===true).length,
    overBudget:checks.filter(x=>x.inBudget===false).length,
    unverified:checks.filter(x=>x.inBudget===null).length,checks};
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
async function runScheduledPriceQA(worker,env,ctx,options={}) {
  if(!env?.TF_PRICE_WORKER_KEY) {
    console.error('TRUSTFOLIO_AUTO_PRICE_QA=worker_secret_missing');
    throw new Error('MONITOR_SECRET_MISSING');
  }
  // Exercise the SAME authenticated /api/check handler internally.
  // The secret never leaves the Worker, and no Browser Run is triggered.
  const request=new Request('https://trustfolio-monitor.internal/api/check',{
    method:'POST',
    headers:{'x-api-key':env.TF_PRICE_WORKER_KEY,'content-type':'application/json'},
    body:JSON.stringify({items:MONITORED_PRODUCTS.map(x=>x.platform==='amazon'?x.pid:x.url),useCache:false,browserProbe:false})
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
    return {pid:product.pid,platform:product.platform,label:product.label,productUrl:product.url,
      verified,status:value.status||'request_failed',
      priceINR:verified?value.priceNum:null,
      source:verified?(value.extractionSource||null):null,
      httpStatus:value.httpStatus??null,
      error:verified?null:(value.error||record.error||'price_not_verified')};
  });
  const successes=checks.filter(x=>x.verified).length;
  const report={kind:'trustfolio_price_monitor',version:'1.2.1',
    checkedAt:new Date().toISOString(),cron:MONITOR_CRON,trigger:options.trigger==='manual'?'manual':'cron',
    total:checks.length,verified:successes,
    result:successes===checks.length?'PASS':'PRICE_UNVERIFIED',checks};
  console.log('TRUSTFOLIO_AUTO_PRICE_QA '+JSON.stringify(report));
  if (env?.MONITOR_STATE) {
    try {
      const state=env.MONITOR_STATE.getByName('trustfolio-monitor-singleton');
      await state.saveLatest(report);
    } catch (error) {
      console.error('TRUSTFOLIO_AUTO_QA_STORAGE_ERROR='+String(error?.name||'error'));
      throw new Error('MONITOR_STORAGE_FAILED');
    }
  } else {
    console.error('TRUSTFOLIO_AUTO_QA_STORAGE_NOT_CONFIGURED');
  }
  // A nonzero Cron failure makes missing real prices visible in Cron Events.
  if(successes!==checks.length && options.failOnUnverified!==false)throw new Error('MONITOR_PRICE_UNVERIFIED_'+successes+'_OF_'+checks.length);
  return report;
}

const worker = {
  async fetch(request, env, ctx) {
    const url=new URL(request.url);
    if (request.method==='GET' && (url.pathname==='/' || url.pathname==='/health'))
      return json({ok:true,worker:'trustfolio-live-price-worker',version:'1.2.1',
        ready:Boolean(env.TF_PRICE_WORKER_KEY),
        monitoring:{cronUTC:MONITOR_CRON,items:MONITORED_PRODUCTS.length,logs:'Workers Logs',
          statusUrl:'/monitor/latest',testUrl:'/qa/sample',cromaTestUrl:'/qa/croma',budgetTestUrl:'/qa/budget20k',batch100Url:'/qa/check-100',storageConfigured:Boolean(env.MONITOR_STATE)},
        note:'Actual-price checks require configured secret and verifiable source content.'});
    // Controlled test-only public endpoint: exactly three hardcoded Mongo SKUs.
    // No arbitrary URLs, browser calls, credentials in responses, or writes to MongoDB.
    // Read-only price QA: fixed 100 real Mongo products per store, no arbitrary URL input.
    // Each exact SKU can be fetched at most once every 3 hours across all users.
    // Price format diagnostic: five preidentified Amazon anomalies only.
    // Returns small price tokens, not raw HTML and not secret data.
    if(request.method==='GET' && url.pathname==='/qa/amazon-format') {
      const sku=String(url.searchParams.get('sku')||'');
      if(!['B0H75M7JKH','B0CGDBR9DC','B0FMS18RZ2','B0H2F9KKP9','B0H44SBX2T'].includes(sku))
        return json({error:'not_in_qa_allowlist'},400);
      try {
        const res=await fetch('https://www.amazon.in/dp/'+sku,{
          method:'GET',headers:{accept:'text/html','accept-language':'en-IN,en;q=0.9',
          'user-agent':'Mozilla/5.0 (compatible; TrustFolioPrice/1.0; +https://trustfolio.in)'},
          redirect:'manual',signal:AbortSignal.timeout(6500)
        });
        if(res.status!==200)return json({sku,httpStatus:res.status,tokens:[]});
        const html=(await res.text()).slice(0,2400000);
        const marker=/id=["'](?:corePriceDisplay_desktop_feature_div|corePrice_feature_div|priceToPay|priceblock_ourprice)["']/i.exec(html);
        const scope=marker?html.slice(marker.index,marker.index+3500):'';
        const tokens=[...scope.matchAll(/a-offscreen[^>]*>\s*([^<]{1,85})\s*<\/span>/gi)]
          .slice(0,7).map(m=>m[1].trim().slice(0,70));
        return json({sku,httpStatus:200,title:(/<title[^>]*>([^<]{0,100})<\/title>/i.exec(html)||[])[1]||null,tokens});
      }catch(e){return json({sku,error:String(e?.name||'error'),tokens:[]})}
    }
    if(request.method==='GET' && url.pathname==='/qa/check-100') {
      const platform=url.searchParams.get('platform');
      const index=Number(url.searchParams.get('index'));
      if(!['amazon','flipkart'].includes(platform) || !Number.isInteger(index)||index<0||index>=100)
        return json({error:'only_100_fixed_products_supported'},400);
      if(!env?.TF_PRICE_WORKER_KEY||!env?.MONITOR_STATE)
        return json({error:'qa100_not_configured'},503);
      const sample=QA_100_PRODUCTS[platform][index];
      if(!sample) return json({error:'sample_missing'},404);
      const key=(url.searchParams.get('rev')==='v2'?'qa100v2_':'qa100_')+platform+'_'+index;
      const state=env.MONITOR_STATE.getByName('trustfolio-monitor-singleton');
      let claim;
      try{claim=await state.claimOnDemand(Date.now(),key)}
      catch(_){return json({error:'qa100_storage_unavailable'},503)}
      if(!claim.allowed){
        const report=await state.readFixed100(key);
        return json({fresh:false,rateLimited:true,retryAfterSeconds:claim.retryAfterSeconds,report});
      }
      let report;
      try{
        const data=await one(sample.input,false,ctx,env,false);
        const store=data?.[platform]||{};
        const actual=store.status==='ok'&&Number.isFinite(store.priceNum)&&store.priceNum>0
          ?store.priceNum:null;
        const identityValid=(platform==='amazon'?data.asin:data.pid)===sample.sku;
        report={kind:'trustfolio_100_products_qa',platform,index,sku:sample.sku,
          category:sample.category,title:sample.title,url:sample.url,storedPrice:sample.storedPrice,
          checkedAt:new Date().toISOString(),status:store.status||'error',
          priceINR:identityValid?actual:null,identityVerified:identityValid,
          error:identityValid?(store.error||null):'product_identity_mismatch',
          source:store.extractionSource||null,httpStatus:store.httpStatus??null,
          elapsedMs:Number(data.itemLatencyMs)||null};
        await state.saveFixed100(key,report);
        return json({fresh:true,rateLimited:false,report});
      } catch(e){
        return json({error:'qa100_fetch_failed',errorType:String(e?.name||'error')},503);
      }
    }
    if(request.method==='GET' && url.pathname==='/qa/budget20k') {
      if(!env?.TF_PRICE_WORKER_KEY||!env?.MONITOR_STATE)return json({error:'budget_test_not_configured'},503);
      const state=env.MONITOR_STATE.getByName('trustfolio-monitor-singleton');
      let claim;
      try{claim=await state.claimOnDemand(Date.now(),'budget')}
      catch(_){return json({error:'budget_rate_limit_unavailable'},503)}
      if(!claim.allowed)return json({fresh:false,rateLimited:true,
        retryAfterSeconds:claim.retryAfterSeconds,report:await state.readBudgetProbe()});
      try{
        const report=await runBudget20kProbe(worker,env,ctx);
        await state.saveBudgetProbe(report);
        return json({fresh:true,rateLimited:false,report});
      }catch(e){return json({error:'budget_test_failed',reason:String(e?.name||'error')},503)}
    }
    if(request.method==='GET' && url.pathname==='/qa/croma') {
      if(!env?.MONITOR_STATE)return json({error:'croma_probe_storage_not_configured'},503);
      const state=env.MONITOR_STATE.getByName('trustfolio-monitor-singleton');
      let claim;
      try{claim=await state.claimOnDemand(Date.now(),'croma')}
      catch(_){return json({error:'croma_probe_rate_limit_unavailable'},503)}
      if(!claim.allowed){
        const latest=await state.readCromaProbe();
        return json({fresh:false,rateLimited:true,retryAfterSeconds:claim.retryAfterSeconds,report:latest});
      }
      const result=await probeCromaFixedSku();
      const report={kind:'croma_api_cloudflare_readonly_test',checkedAt:new Date().toISOString(),...result};
      try{await state.saveCromaProbe(report)}
      catch(_){return json({error:'croma_probe_storage_failed'},503)}
      return json({fresh:true,rateLimited:false,report});
    }
    if(request.method==='GET' && url.pathname==='/qa/sample') {
      if(!env?.TF_PRICE_WORKER_KEY||!env?.MONITOR_STATE)
        return json({error:'sample_test_not_configured'},503);
      const state=env.MONITOR_STATE.getByName('trustfolio-monitor-singleton');
      let claim;
      try{claim=await state.claimOnDemand(Date.now())}
      catch(_){return json({error:'sample_rate_limit_unavailable'},503)}
      if(!claim.allowed){
        const latest=await state.readLatest();
        return json({fresh:false,rateLimited:true,retryAfterSeconds:claim.retryAfterSeconds,
          report:latest||null});
      }
      try {
        const report=await runScheduledPriceQA(worker,env,ctx,{trigger:'manual',failOnUnverified:false});
        return json({fresh:true,rateLimited:false,report});
      } catch(e) {
        return json({error:'sample_test_failed',kind:String(e?.name||'error')},503);
      }
    }
    if(request.method==='GET' && url.pathname==='/monitor/latest') {
      if(!env?.MONITOR_STATE)return json({ready:false,error:'monitor_storage_not_configured'},503);
      try {
        const state=env.MONITOR_STATE.getByName('trustfolio-monitor-singleton');
        const latest=await state.readLatest();
        return json({ready:true,version:'1.2.1',state:latest?'available':'pending',latest});
      } catch(e) {
        return json({ready:false,error:'monitor_storage_unavailable'},503);
      }
    }
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
  },
  async scheduled(controller,env,ctx) {
    await runScheduledPriceQA(worker,env,ctx);
  }
};
export default worker;
export {identify,runScheduledPriceQA};
