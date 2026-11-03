const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const base=process.argv[2]||'backend',out=process.argv[3]||'candidate-backend';
function edit(s,a,b){assert.ok(s.includes(a),'Source drift: '+a.slice(0,90));return s.replace(a,b);}
function put(p,s){fs.mkdirSync(path.dirname(out+'/'+p),{recursive:true});fs.writeFileSync(out+'/'+p,s);}
let s=fs.readFileSync(base+'/services/LivePriceService.js','utf8');
s=edit(s,"const WORKER_TIMEOUT_MS = 6000;","const WORKER_TIMEOUT_MS = 8000; // 6500 ms upstream + 1500 ms response/parsing margin");
s=edit(s,"const { classify, toAvailabilityState, isConfirmedUnavailable } = require('./ProductAvailabilityPolicy');","const { classify, toAvailabilityState, isConfirmedUnavailable } = require('./ProductAvailabilityPolicy');\nconst { workerItem, validateWorkerQuote } = require('./LivePriceIdentity');");
const a=s.indexOf('function workerItem(doc) {'),b=s.indexOf('\nasync function fetchLive',a);assert.ok(a>0&&b>a);s=s.slice(0,a)+s.slice(b);
s=edit(s,'async function fetchLive(item) {','async function fetchLive(item, doc) {');
s=edit(s,'items: [item], useCache: true','items: [item], useCache: false, browserProbe: false');
s=edit(s,"return (r.asin ? r.amazon : r.flipkart) || { status: 'error', error: 'no store result' };","return validateWorkerQuote(doc, item, r);");
s=edit(s,'fetchCromaDirect(d) : fetchLive(workerItem(d))',"fetchCromaDirect(d).then(r => ({...r, verificationStatus:r.status==='ok'?'ok':null, extractionSource:'croma_vps_exact_sku_buy', retailer_product_id:String(d.platform_product_id), retailer_url:d.original_product_url||d.clean_url||d.product_url||d.url||null})) : fetchLive(workerItem(d), d)");
s=edit(s,'  const availabilityKind = classify(result);',"  if(result.status==='ok' && (!Number.isFinite(result.priceNum) || result.priceNum<=0 || result.verificationStatus!=='ok' || result.in_stock===false || result.inStock===false)) result={status:'error',error:'invalid_accepted_quote',in_stock:null};\n  const availabilityKind = classify(result);");
s=edit(s,"const priced = (liveStatus === 'ok' || liveStatus === 'out_of_stock') && result.priceNum > 0;","const priced = liveStatus === 'ok' && Number.isFinite(result.priceNum) && result.priceNum > 0;");
s=edit(s,"? result.in_stock : liveStatus === 'ok',","? (typeof result.in_stock==='boolean'?result.in_stock:null) : (typeof result.inStock==='boolean'?result.inStock:null),");
s=edit(s,'    checked_at: new Date(),',"    checked_at: new Date(),\n    verification_status:result.verificationStatus||null,\n    extraction_source:result.extractionSource||null,\n    retailer_product_id:result.retailer_product_id||null,\n    retailer_url:result.retailer_url||result.url||null,");
s=edit(s,'platform: 1, asin: 1, url: 1, clean_url: 1, productUrl: 1, original_product_url: 1,','platform: 1, asin: 1, url: 1, clean_url: 1, product_url: 1, productUrl: 1, original_product_url: 1,');
s=edit(s,'platform_product_id: 1, title: 1, brand: 1, category: 1, price_inr: 1, live: 1,','platform_product_id: 1, title: 1, brand: 1, category: 1, model: 1, model_number: 1, specifications: 1, price_inr: 1, live: 1,');
s=edit(s,'  if (fetched.length) {',"  if (fetched.length) {\n    const changedCategories=[...new Set(fetched.filter(d=>deletedIds.has(String(d._id)) || d.live.status==='ok').map(d=>d.category).filter(Boolean))];\n    await Promise.all(changedCategories.map(slug=>require('./CategoryService').updateCategoryPriceRange(slug)));\n");
put('services/LivePriceService.js',s);
s=fs.readFileSync(base+'/services/LiveBudgetRecommendationService.js','utf8');
s=edit(s,'  const inspected = new Set();',"  const started=Date.now();\n  const inspected = new Set();");
s=edit(s,'    waveCount++;',"    if(Date.now()-started>8000) break; // Do not admit another 8000 ms fetch wave after 8000 ms elapsed.\n    waveCount++;");
s=edit(s,'      ...opts,',"      ...opts,\n      livePriceCandidates: true,");
const start=s.indexOf('      let displayPrice = candidate.price_inr;'),end=s.indexOf('      if (!goodPrice(displayPrice, budgetCap)) continue;',start);assert.ok(start>0&&end>start);
s=s.slice(0,start)+"      if (!row.supported || live?.status!=='ok' || live.verification_status!=='ok' || live.in_stock===false || !live.priced_at || Date.now()-new Date(live.priced_at).getTime()>60000) continue;\n      const displayPrice=live.price_inr;\n      const priceSource='website_live_price_api';\n"+s.slice(end);
s=edit(s,'        ...candidate,',"        ...candidate,\n        in_stock:live.in_stock,\n        inStock:live.in_stock,\n        availability_status:live.in_stock===true?'In Stock':null,\n        product_url:live.retailer_url||candidate.product_url,\n        verified_retailer_id:live.retailer_product_id,");
s=edit(s,'    ...original,\n    products,',"    ...original,\n    priceWindow:{min:0,max:budgetCap},\n    products,");
put('services/LiveBudgetRecommendationService.js',s);
s=fs.readFileSync(base+'/services/ProductRecommendationService.js','utf8');
s=edit(s,'  const budgetCap = Math.floor(Number(budgetInINR));',"  // Live candidate mode keeps the same ranker, but does not trust stale catalog price for eligibility.\n  const candidateBudget=options.livePriceCandidates?Number.MAX_SAFE_INTEGER:budgetInINR;\n  const budgetCap = Math.floor(Number(candidateBudget));");
s=edit(s,'  const { min: minBudget, max: maxFromRule } = getBudgetPriceWindow(budgetInINR);',"  const { min: minBudget, max: maxFromRule } = options.livePriceCandidates\n    ? {min:0,max:Number.MAX_SAFE_INTEGER} : getBudgetPriceWindow(budgetInINR);");
put('services/ProductRecommendationService.js',s);
s=fs.readFileSync(base+'/controllers/ProductController.js','utf8');
// The pre-live parallel bounds value can be stale relative to writes performed by the recommendation.
s=edit(s,'const [recommendation, catalogPriceRange] = await Promise.all([','const [recommendation] = await Promise.all([');
s=edit(s,'const budgetCap = Math.floor(Number(budget));',"const catalogPriceRange = await getLivePriceBoundsForCategory(normalizedCategory);\nconst budgetCap = Math.floor(Number(budget));");
put('controllers/ProductController.js',s);
