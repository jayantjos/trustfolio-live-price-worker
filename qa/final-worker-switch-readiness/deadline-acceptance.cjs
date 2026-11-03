'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const mongoose=require('mongoose'),express=require('express');
const URI='mongodb://127.0.0.1:27017/trustfolio_acceptance_disposable?replicaSet=rs0',ROOT=path.resolve('backend');
const report={status:'UNVERIFIED',productionWrites:0,quotes:[],checks:[],controls:[],failures:[]};let server;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function check(name,fn){try{fn();report.checks.push({name,status:'PASS'});}catch(e){report.failures.push({name,error:e.message});}}
async function main(){
 assert.equal(process.env.STAGING_MONGO_URI,URI);
 for(const k of ['MONGODB_URI','MONGO_URI','MONGODB_URL','DATABASE_URL','TF_DEPLOY_SSH_KEY','CLOUDFLARE_API_TOKEN'])assert.ok(!process.env[k],k+' forbidden');
 const snap=JSON.parse(fs.readFileSync('private-sources.json')),expected=JSON.parse(fs.readFileSync('patch-source-hashes.json'));
 for(const [p,v] of Object.entries(expected))if(v.base_sha256)assert.equal(snap.sha256[p],v.base_sha256,'source drift '+p);
 for(const [p,s] of Object.entries(snap.sources)){assert.ok(!p.includes('..'));assert.ok(!/mongodb(?:\+srv)?:\/\//.test(s));fs.mkdirSync(path.dirname(ROOT+'/'+p),{recursive:true});fs.writeFileSync(ROOT+'/'+p,s);}
 cp.execFileSync('git',['apply','--check','--directory=backend','candidate.diff']);cp.execFileSync('git',['apply','--directory=backend','candidate.diff']);
 report.patchSHA256=sha(fs.readFileSync('candidate.diff'));report.candidateHashes={};
 for(const [p,v] of Object.entries(expected)){const actual=sha(fs.readFileSync(ROOT+'/'+p));assert.equal(actual,v.candidate_sha256);report.candidateHashes[p]=actual;}
 assert.equal(sha(snap.frontendSource),'36d74bdbfe88a2221c1929897caba75df4bddb8e260cd5a6ab5829be61410521');
 fs.mkdirSync('frontend/src/services',{recursive:true});fs.writeFileSync('frontend/src/services/api.service.ts',snap.frontendSource);
 cp.execFileSync('git',['apply','--check','--directory=frontend','frontend.diff']);cp.execFileSync('git',['apply','--directory=frontend','frontend.diff']);
 report.frontendCandidateHash=sha(fs.readFileSync('frontend/src/services/api.service.ts'));
 fs.mkdirSync(ROOT+'/config',{recursive:true});fs.writeFileSync(ROOT+'/config/mongo.js',"module.exports=async()=>require('mongoose').connect(process.env.STAGING_MONGO_URI,{autoIndex:false});");
 const connect=mongoose.connect.bind(mongoose);mongoose.connect=(u,...a)=>{assert.equal(u,URI);return connect(u,...a);};
 process.env.PRICE_WORKER_URL='https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev';process.env.PRICE_WORKER_KEY=fs.readFileSync('worker-key.txt','utf8').trim();assert.ok(process.env.PRICE_WORKER_KEY);
 await mongoose.connect(URI,{autoIndex:false});
 const col=mongoose.connection.collection('my_products'),cats=mongoose.connection.collection('categories'),archive=mongoose.connection.collection('my_products_deleted');
 const pool=snap.pool.map(d=>({...d,_id:new mongoose.Types.ObjectId(d._id)}));for(const d of pool)delete d.live;
 const actualFetch=global.fetch,identity=require(ROOT+'/services/LivePriceIdentity');let mode='genuine',delay=0,fixtureDocs=[];
 global.fetch=async(url,opts)=>{
  if(String(url).startsWith('http://127.0.0.1:'))return actualFetch(url,opts);
  assert.equal(String(url),process.env.PRICE_WORKER_URL+'/api/check');const b=JSON.parse(opts.body),item=b.items[0];assert.equal(b.useCache,false);assert.equal(b.browserProbe,false);
  if(mode==='genuine'){
   assert.ok(report.quotes.length<2);assert.ok(!String(item).includes('WMNHBK4HNYBSDJ9U'),'exact Godrej retest cap already exhausted');
   const t=Date.now(),res=await actualFetch(url,opts),raw=await res.text();let body;try{body=JSON.parse(raw)}catch{}
   report.quotes.push({at:new Date().toISOString(),item,http:res.status,latencyMS:Date.now()-t,ray:res.headers.get('cf-ray'),body});return new Response(raw,{status:res.status,headers:{'content-type':'application/json'}});
  }
  if(delay)await sleep(delay); // deliberate non-cooperative quote task, to test discarded late completion
  if(mode==='failure')return new Response('{}',{status:502});
  const doc=fixtureDocs.find(d=>identity.workerItem(d)===item);assert.ok(doc,'controlled fixture mapping');
  const amazon=doc.platform.toLowerCase()==='amazon',id=amazon?item:new URL(item).searchParams.get('pid');
  const quote={status:'ok',priceNum:20000+fixtureDocs.indexOf(doc)*100,price:'controlled',in_stock:null,inStock:null,verificationStatus:'ok',extractionSource:'SIMULATED_DEADLINE_CONTROL',url:amazon?'https://www.amazon.in/dp/'+id:item,title:doc.title};
  return new Response(JSON.stringify({results:[{asin:amazon?id:null,pid:amazon?null:id,[amazon?'amazon':'flipkart']:quote}]}),{status:200});
 };
 const service=require(ROOT+'/services/LivePriceService'),controller=require(ROOT+'/controllers/ProductController'),deadline=require(ROOT+'/services/LivePriceDeadline');
 async function seed(docs){await col.deleteMany({});await cats.deleteMany({});for(const d of docs)delete d.live;await col.insertMany(docs);for(const slug of new Set(docs.map(d=>d.category)))await cats.insertOne({slug,title:slug,price_ranges:[]});controller.invalidatePriceCaches();}
 const real=pool.filter(d=>['6a080110fe6fd8dc386bbee3','69f4192b9a622ea2d7ccb68b'].includes(String(d._id)));assert.equal(real.length,2);let t;
 mode='controlled';fixtureDocs=pool.filter(d=>['6a080110fe6fd8dc386bbee3','69f419329a622ea2d7ccb736','6a1013380f397d1e1344dd59','6a2c08a19665e4a0b177b34b','6a1011ac0f397d1e1344d8d1'].includes(String(d._id)));assert.equal(fixtureDocs.length,5);
 const app=express();app.get('/products/top',controller.getTopProducts);server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const front=fs.readFileSync('frontend/src/services/api.service.ts','utf8');const start=front.indexOf('function isAbortError('),end=front.indexOf('\n}',front.indexOf('async function fetchAPI',start))+2;assert.ok(start>=0&&end>start);
 const ts=require('typescript');let js=ts.transpileModule(front.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const frontend=new Function('getApiBaseCandidates','API_TIMEOUT_MS','fetch',js+';return fetchAPI;')(()=>[base],8000,actualFetch);
 for(const [name,ms] of [['fast',20],['slow',6800]]){
  await seed(fixtureDocs);delay=ms;t=Date.now();const body=await frontend('/products/top?category=washing-machines&budget=35000&limit=5');const elapsed=Date.now()-t;
  report.controls.push({name,evidence:'SIMULATED retailer quotes; actual ranker/controller/frontend wrapper/transactional MongoDB',elapsedMS:elapsed,count:body.data?.products?.length,products:body.data?.products});
  check('controlled_'+name+'_five_within_client_deadline',()=>{assert.equal(body.data.products.length,5);assert.ok(elapsed<20500);for(const p of body.data.products){assert.ok(p.price_inr<=35000);assert.equal(p.in_stock,null);}assert.equal(new Set(body.data.products.map(p=>p.id)).size,5);});
 }
 delay=0;mode='failure';const before=await col.find({}).toArray();await col.updateMany({},{$unset:{'live.checked_at':''}});controller.invalidatePriceCaches();t=Date.now();const failed=await frontend('/products/top?category=washing-machines&budget=35000&limit=5');report.controls.push({name:'502_no_stale_fallback',elapsedMS:Date.now()-t,count:failed.data?.products?.length});
 check('failed_quotes_do_not_return_stale_prices_or_delete',()=>assert.equal(failed.data.products.length,0));const after=await col.find({}).toArray();check('failed_quote_preserves_canonical_prices',()=>{assert.equal(after.length,5);for(const d of after)assert.equal(d.price,before.find(x=>x._id.equals(d._id)).price);});
 mode='controlled';delay=350;await seed(fixtureDocs);let baseline=JSON.stringify(await col.find({}).sort({_id:1}).toArray());t=Date.now();let aborted=false;
 try{await deadline.run(()=>service.getLivePrices([fixtureDocs[0]._id]),{timeoutMS:100});}catch(e){aborted=true;}
 const responseMS=Date.now()-t;await sleep(500);
 report.controls.push({name:'late_quote',responseMS,postCompletionObservationMS:500,aborted});
 // Evaluate async read separately from the synchronous assertion helper.
 const late=JSON.stringify(await col.find({}).sort({_id:1}).toArray());check('late_quote_cannot_mutate_after_timeout',()=>{assert.ok(aborted);assert.equal(late,baseline);});
 delay=0;await seed(fixtureDocs);baseline=JSON.stringify(await col.find({}).sort({_id:1}).toArray());const category=require(ROOT+'/services/CategoryService'),originalCategory=category.updateCategoryPriceRange;category.updateCategoryPriceRange=async(...args)=>{await sleep(250);return originalCategory(...args);};aborted=false;t=Date.now();
 try{await deadline.run(()=>service.getLivePrices([fixtureDocs[0]._id]),{timeoutMS:100});}catch(e){aborted=true;}category.updateCategoryPriceRange=originalCategory;await sleep(300);
 const rolled=JSON.stringify(await col.find({}).sort({_id:1}).toArray());check('expiry_during_mutation_rolls_back_transaction',()=>{assert.ok(aborted);assert.equal(rolled,baseline);});report.controls.push({name:'transaction_expiry',totalWithObservationMS:Date.now()-t,aborted});
 check('zero_archive_and_no_false_deletion',()=>assert.equal(after.length,5));report.archiveCount=await archive.countDocuments();check('no_archives',()=>assert.equal(report.archiveCount,0));
 if(!report.failures.length) {mode='genuine';delay=0;await seed(real);
 t=Date.now();const live=await service.getLivePrices(real.map(d=>d._id));report.genuineConnectedMS=Date.now()-t;report.genuineRows=live;
 const realAfter=await col.find({}).toArray();report.genuineAcceptance=realAfter.every(d=>d.live?.status==='ok')?'PASS':'BLOCKED';
 if(report.genuineAcceptance==='PASS')check('actual_transactional_service_genuine_quote_persistence',()=>{for(const d of realAfter){assert.equal(d.price,String(d.live.price_inr));assert.equal(d.price_inr,d.live.price_inr);assert.equal(d.currentPriceValue,d.live.price_inr);assert.equal(d.live.verification_status,'ok');}});
}
 report.status=report.failures.length?'FAIL':report.genuineAcceptance==='PASS'?'PASS':'BLOCKED';
 report.nativeVPSFullTop5='UNVERIFIED; no safe native isolated runtime';report.scope='Two genuine new quotes; five-product timing/negative tests explicitly SIMULATED origin, actual business services and real disposable DB. Croma adapter and availability policy unchanged.';
}
(async()=>{try{await main();}catch(e){report.status='FAIL';report.fatal={name:e.name,message:e.message,stack:e.stack};}finally{if(server)await new Promise(r=>server.close(r));if(mongoose.connection.readyState===1){await mongoose.connection.dropDatabase();report.databaseDropped=true;await mongoose.disconnect();}delete process.env.PRICE_WORKER_KEY;try{fs.unlinkSync('worker-key.txt')}catch{}fs.writeFileSync('allowlist-results.json',JSON.stringify(report,null,2));console.log('DEADLINE_ACCEPTANCE='+JSON.stringify(report));}})();
