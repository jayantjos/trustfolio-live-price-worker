'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),cp=require('child_process');
const mongoose=require('mongoose'),express=require('express');
const URI='mongodb://127.0.0.1:27017/trustfolio_acceptance_disposable?replicaSet=rs0';
const ROOT=path.resolve('backend');
const report={status:'UNVERIFIED',productionWrites:0,workerDeployment:false,canaries:[],mappings:[],quotes:[],rankerWaves:[],watcherLogs:[],simulation:[],checks:[],failures:[],sourceHashes:{}};
let watcher,server,faultServer,faultCase,faultPrice;let quoteCount=0,mode='real';const originalFetch=global.fetch;
function record(name,status,evidence){report.checks.push({name,status,...evidence});}
function check(name,fn){try{fn();record(name,'PASS',{});}catch(e){record(name,'FAIL',{error:e.message});report.failures.push({name,error:e.message});}}
function write(){fs.writeFileSync('real-integration-results.json',JSON.stringify(report,null,2));}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,ms=16000){const end=Date.now()+ms;while(Date.now()<end){const r=await fn();if(r)return r;await delay(200);}throw Error('bounded_wait_expired');}
function sha(s){return crypto.createHash('sha256').update(s).digest('hex');}
function edit(s,a,b){assert.ok(s.includes(a),'Source patch anchor missing: '+a.slice(0,60));return s.replace(a,b);}
function normalizeDoc(d){const o={...d,_id:new mongoose.Types.ObjectId(d._id)};if(o.live){delete o.live;}return o;}
async function startFaultServer(){faultServer=require('http').createServer((req,res)=>{req.resume();const f=faultCase,timer=setTimeout(()=>{const sku='B0D41L64NR',q={status:'ok',verificationStatus:'ok',priceNum:faultPrice,in_stock:f.name==='unknown_stock'?null:true,inStock:f.name==='unknown_stock'?null:true,title:f.name==='wrong_variant'?'Bosch 8 kg WGA14200IN':'Bosch 9 kg WGA14200IN',url:'https://www.amazon.in/dp/'+sku,extractionSource:'SIMULATED_HTTP'};res.setHeader('content-type','application/json');res.end(JSON.stringify({results:[{asin:f.name==='wrong_identity'?'B000000000':sku,amazon:q}]}));},f.delay);res.on('close',()=>clearTimeout(timer));});faultServer.listen(0,'127.0.0.1');await new Promise(r=>faultServer.on('listening',r));}
async function main(){
 await startFaultServer();
 assert.equal(process.env.STAGING_MONGO_URI,URI);
 for(const k of ['MONGODB_URI','MONGO_URI','MONGODB_URL','DATABASE_URL','TF_DEPLOY_SSH_KEY','CLOUDFLARE_API_TOKEN'])assert.ok(!process.env[k],k+' forbidden');
 const originalConnect=mongoose.connect.bind(mongoose);mongoose.connect=(u,...a)=>{assert.equal(u,URI);return originalConnect(u,...a);};
 const snap=JSON.parse(fs.readFileSync('private-sources.json'));report.sourceHashes=snap.sha256;report.sourceCatalogReadAt=snap.readAt;report.mappingRecords=snap.mappingRecords;
 for(const [p,s] of Object.entries(snap.sources)){assert.ok(!p.includes('..'));assert.ok(!s.includes('mongodb:')&&!s.includes('mongodb+srv:'));const f=path.join(ROOT,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s);}
 fs.mkdirSync(ROOT+'/config',{recursive:true});
 fs.writeFileSync(ROOT+'/config/mongo.js',`module.exports=async()=>require('mongoose').connect(process.env.STAGING_MONGO_URI,{autoIndex:false});`);
 fs.writeFileSync('staging-db-guard.cjs',`const m=require('mongoose'),assert=require('assert/strict');const u=${JSON.stringify(URI)};assert.equal(process.env.STAGING_MONGO_URI,u);const c=m.connect.bind(m);m.connect=(v,...a)=>{assert.equal(v,u);return c(v,...a)};`);
 cp.execFileSync(process.execPath,['build-candidate.cjs',ROOT,ROOT]);
 fs.copyFileSync('LivePriceIdentity.js',ROOT+'/services/LivePriceIdentity.js');fs.copyFileSync('CatalogIdentityGuard.js',ROOT+'/services/CatalogIdentityGuard.js');
 process.env.PRICE_WORKER_URL='https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev';
 process.env.PRICE_WORKER_KEY=fs.readFileSync('worker-key.txt','utf8').trim();assert.ok(process.env.PRICE_WORKER_KEY);
 process.env.LIVE_PRICE_FRESH_MS='60000';
 await mongoose.connect(URI,{autoIndex:false,monitorCommands:true});assert.equal(mongoose.connection.db.databaseName,'trustfolio_acceptance_disposable');
 const col=mongoose.connection.collection('my_products'),cats=mongoose.connection.collection('categories'),archive=mongoose.connection.collection('my_products_deleted');
 const docs=snap.pool.map(normalizeDoc);const unique=[...new Map(docs.map(d=>[String(d._id),d])).values()];
 const confirmedMappings={"69f419329a622ea2d7ccb736": "WMNHBK4HNYBSDJ9U", "6a1013380f397d1e1344dd59": "WMNG4WGVXYSRYHJZ", "6a2c08a19665e4a0b177b34b": "WMNHHUCY5FWTHBAN", "6a2c234e63eb5b6abbf912be": "WMNGYGJKCVNKSZWY"};
 for(const d of unique){const pid=confirmedMappings[String(d._id)];if(pid){d.platform_product_id=pid;const u=d.original_product_url||d.clean_url||d.url;d.original_product_url=u+(u.includes('?')?'&':'?')+'pid='+pid;}}
 await col.insertMany(unique);
 const slugs=[...new Set(unique.map(d=>d.category_slug||d.category))];for(const slug of slugs)await cats.insertOne({title:slug,slug,price_ranges:[]});
 const relay=require('./croma-relay.cjs');require(ROOT+'/services/CromaLivePriceDirect').fetchCromaDirect=async d=>{const t=Date.now();const result=await relay(d,unique.filter(x=>String(x.platform).toLowerCase()==='croma'));(report.cromaQuotes||=[]).push({id:String(d._id),sku:d.platform_product_id,result,latencyMs:Date.now()-t,kind:'actual VPS adapter request via staging transport'});return result;};
 const service=require(ROOT+'/services/LivePriceService'),controller=require(ROOT+'/controllers/ProductController'),ranker=require(ROOT+'/services/ProductRecommendationService'),category=require(ROOT+'/services/CategoryService');
 const originalRank=ranker.getTopProductsForCategoryAndBudget.bind(ranker);ranker.getTopProductsForCategoryAndBudget=async(...args)=>{const t=Date.now(),r=await originalRank(...args);report.rankerWaves.push({category:args[0],budget:args[1],excluded:args[2]?.excludeProductIds||[],ids:r.products.map(p=>p.id),latencyMs:Date.now()-t});return r;};
 let queries=0;mongoose.connection.getClient().on('commandStarted',e=>{if(e.commandName==='find'&&e.command.find==='my_products')queries++;});
 global.fetch=async(url,options)=>{
  if(String(url).startsWith('http://127.0.0.1:'))return originalFetch(url,options);
  assert.equal(String(url),process.env.PRICE_WORKER_URL+'/api/check');
  const body=JSON.parse(options.body),item=body.items[0],label=typeof item==='string'&&item.startsWith('https:')?new URL(item).searchParams.get('pid'):item;
  if(mode!=='real'){return originalFetch('http://127.0.0.1:'+faultServer.address().port,options);}
  if(false){const q=mode==='unknown'?{status:'ok',verificationStatus:'ok',priceNum:12345,price:'₹12,345',inStock:null,in_stock:null,title:'HP 24-cr0023in',extractionSource:'SIMULATED_STOCK_GUARD'}:{status:'error',verificationStatus:'temporary_error',priceNum:null,inStock:null,error:'SIMULATED_FAILURE'};return new Response(JSON.stringify({results:[{asin:label,pid:label,amazon:q}]}),{status:200,headers:{'content-type':'application/json'}});}
  if(quoteCount>=10)return new Response(JSON.stringify({results:[{error:'acceptance_quote_budget_exhausted'}]}),{status:200});
  quoteCount++;const t=Date.now();try{const res=await originalFetch(url,options),text=await res.text();let data;try{data=JSON.parse(text);}catch{}
   const rr=data?.results?.[0],store=rr?.asin?rr.amazon:rr?.flipkart;
   report.quotes.push({item,atUTC:new Date().toISOString(),httpStatus:res.status,ray:res.headers.get('cf-ray'),latencyMs:Date.now()-t,row:rr||null,source:store?.extractionSource||null});
   return new Response(text,{status:res.status,headers:{'content-type':res.headers.get('content-type')||'application/json'}});
  }catch(e){report.quotes.push({item,error:e.name,latencyMs:Date.now()-t});throw e;}
 };
 const app=express();app.get('/api/products/price-bounds',controller.getProductPriceBounds);app.get('/api/products/top',controller.getTopProducts);server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const endpoint='http://127.0.0.1:'+server.address().port;
 const get=async p=>{const t=Date.now(),r=await originalFetch(endpoint+p);return {httpStatus:r.status,body:await r.json(),latencyMs:Date.now()-t};};
 watcher=cp.fork(ROOT+'/scripts/trustfolio-category-price-watcher.js',[],{silent:true,execArgv:['--require',path.resolve('staging-db-guard.cjs')],env:{PATH:process.env.PATH,STAGING_MONGO_URI:URI,NODE_PATH:path.resolve('node_modules')}});watcher.stdout.on('data',b=>report.watcherLogs.push({at:Date.now(),text:String(b)}));watcher.stderr.on('data',b=>report.watcherLogs.push({at:Date.now(),stderr:String(b)}));await waitFor(()=>report.watcherLogs.some(x=>x.text?.includes('CHANGE_STREAM_ACTIVE')));
 report.boundsBefore=await get('/api/products/price-bounds?category=washing-machines');const categoryStarted=Date.now();
 const catalogBefore=await originalRank('washing-machines',35000,{limit:5});report.catalogRankingBefore=catalogBefore;
 const top=await get('/api/products/top?category=washing-machines&budget=35000&limit=5');report.top5=top;
 const selected=top.body.data?.products||[];report.top5Count=selected.length;record('full_real_top5',selected.length===5?'PASS':'UNVERIFIED',{eligibleCount:selected.length,shortage:Math.max(0,5-selected.length)});
 check('top5_budget_identity_and_no_stale',()=>{assert.equal(top.httpStatus,200);assert.equal(new Set(selected.map(p=>p.id)).size,selected.length);for(const p of selected){assert.ok(p.price_inr<=35000);assert.equal(p.price_source,'website_live_price_api');assert.equal(p.live_price_status,'ok');const doc=unique.find(d=>String(d._id)===p.id);assert.ok(doc);}});
 check('frontend_budget_window',()=>{assert.deepEqual(top.body.data.priceWindow,{min:0,max:35000});for(const p of selected){assert.ok(p.price_inr>0&&p.price_inr<=35000);assert.ok(p.product_url);}});
 report.threePlatformStatus=selected.length===5&&new Set(selected.map(p=>p.platform)).size===3?'PASS':'UNVERIFIED';
 report.newlyEligible=await get('/api/products/top?category=washing-machines&budget=31500&limit=5');
 const haier=await col.findOne({_id:new mongoose.Types.ObjectId('6a2c08a19665e4a0b177b34b')});
 if(haier?.live?.status==='ok'&&haier.price_inr<=31500)check('newly_eligible_below_previous_catalog_window',()=>{assert.ok(report.newlyEligible.body.data.products.some(p=>p.id===String(haier._id)));assert.equal(haier.price_inr,haier.live.price_inr);});
 await waitFor(async()=>{const meta=await cats.findOne({slug:'washing-machines'}),all=await col.find({}).toArray(),nums=all.map(d=>d.price_inr).filter(n=>Number.isFinite(n)&&n>0);return meta?.min_price===Math.min(...nums)&&meta?.max_price===Math.max(...nums);},20000);
 report.propagationMs=Date.now()-categoryStarted;report.boundsAfter=await get('/api/products/price-bounds?category=washing-machines');report.categoryMetadata=await cats.findOne({slug:'washing-machines'});
 check('mixed_category_bounds_and_post_write_contract',()=>{assert.equal(report.boundsAfter.body.data.min,report.categoryMetadata.min_price);assert.equal(report.boundsAfter.body.data.max,report.categoryMetadata.max_price);assert.equal(top.body.data.catalogPriceRange.min,report.boundsAfter.body.data.min);assert.equal(top.body.data.catalogPriceRange.max,report.boundsAfter.body.data.max);});
 report.persistedProducts=await col.find({}).project({_id:1,platform_product_id:1,price_inr:1,live:1}).toArray();report.archivedProducts=await archive.find({}).toArray();
 check('ranker_order_and_next_eligible',()=>{const order=report.rankerWaves.filter(w=>w.category==='washing-machines').flatMap(w=>w.ids);const accepted=new Set(selected.map(p=>p.id));assert.deepEqual(selected.map(p=>p.id),order.filter((id,i)=>accepted.has(id)&&order.indexOf(id)===i));});
 // Affected timeout/identity guards use an actual local HTTP server, not retailer evidence.
 const faultTarget=unique.find(d=>d.platform_product_id==='B0D41L64NR');const beforeFailure=await col.findOne({_id:faultTarget._id});const archiveBefore=await archive.countDocuments();faultPrice=beforeFailure.price_inr;
 for(const f of [{name:'valid_slow',delay:1200},{name:'valid_near_deadline',delay:6900},{name:'timeout',delay:9000},{name:'wrong_identity',delay:0},{name:'wrong_variant',delay:0},{name:'unknown_stock',delay:0}]){
  faultCase=f;mode='controlled';await col.updateOne({_id:faultTarget._id},{$unset:{'live.checked_at':''}});const t=Date.now();const rows=await service.getLivePrices([faultTarget._id]);const after=await col.findOne({_id:faultTarget._id});const item={...f,latencyMs:Date.now()-t,live:after.live,price:after.price_inr,kind:'controlled local HTTP response; real service and disposable MongoDB'};report.simulation.push(item);
  check('affected_'+f.name,()=>{assert.ok(after);assert.equal(after.price_inr,beforeFailure.price_inr);});
  if(f.name==='timeout'||f.name==='wrong_identity'||f.name==='wrong_variant')check('no_acceptance_'+f.name,()=>{assert.equal(after.live.status,'error');assert.equal(after.live.unavailable_checks,0);});
  if(f.name==='unknown_stock')check('null_stock',()=>assert.equal(after.live.in_stock,null));
 }
 report.archiveAfterFaults=await archive.countDocuments();check('archive_count_unchanged_for_faults',()=>assert.equal(report.archiveAfterFaults,archiveBefore));
 mode='real';
 mode='real';report.archiveCount=await archive.countDocuments();report.quoteCount=quoteCount;report.catalogScope={category:'washing-machines',budget:35000,fixtureCandidates:snap.pool.length,networkQuoteCap:10};
 report.scope='Only final affected guards, budget window and genuine three-platform integration';report.status=report.failures.length?'FAIL':report.top5Count===5?'PASS':'UNVERIFIED';
}
(async()=>{try{await main();}catch(e){report.status='FAIL';report.fatal={name:e.name,message:e.message,stack:e.stack};}finally{if(watcher){watcher.kill('SIGTERM');await delay(500);}if(server)await new Promise(r=>server.close(r));if(faultServer){faultServer.closeAllConnections();await new Promise(r=>faultServer.close(r));}if(mongoose.connection.readyState===1){await mongoose.connection.dropDatabase();report.disposableDatabaseDropped=true;await mongoose.disconnect();}delete process.env.PRICE_WORKER_KEY;try{fs.unlinkSync('worker-key.txt');}catch{}write();console.log('REAL_INTEGRATION_RESULTS='+JSON.stringify(report));}})();
