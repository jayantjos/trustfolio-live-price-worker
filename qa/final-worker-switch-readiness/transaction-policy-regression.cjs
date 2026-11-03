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

 mode='controlled';fixtureDocs=pool.filter(d=>['6a080110fe6fd8dc386bbee3','69f419329a622ea2d7ccb736','6a1013380f397d1e1344dd59','6a2c08a19665e4a0b177b34b','6a1011ac0f397d1e1344d8d1'].includes(String(d._id)));assert.equal(fixtureDocs.length,5);
 fixtureDocs.push({...fixtureDocs.find(d=>d.platform==='amazon'),_id:new mongoose.Types.ObjectId(),acceptance_fixture:'SYNTHETIC_DUPLICATE_FOR_DELETION_CAP_ONLY'});
 let phase='oos',commands=[];
 const archiveBulk=archive.bulkWrite.bind(archive),deleteMany=col.deleteMany.bind(col);
 archive.bulkWrite=async(...args)=>{commands.push('archive-before');const r=await archiveBulk(...args);commands.push('archive-complete');if(phase==='expiry')await sleep(250);return r;};
 col.deleteMany=async(...args)=>{commands.push('delete');return deleteMany(...args);};
 const simulatedFetch=global.fetch;
 global.fetch=async(url,opts)=>{
  const result=await simulatedFetch(url,opts);if(String(url).startsWith('http://127.0.0.1:'))return result;
  const b=await result.json();for(const row of b.results){const store=row.amazon||row.flipkart;store.status='out_of_stock';store.verificationStatus='out_of_stock';store.availability='Out of stock';store.price=null;store.priceNum=null;store.inStock=false;store.in_stock=false;}
  return new Response(JSON.stringify(b),{status:200});
 };
 await seed(fixtureDocs);commands=[];let t=Date.now();const rows=await service.getLivePrices(fixtureDocs.map(d=>d._id));
 report.controls.push({name:'archive_cap',evidence:'SIMULATED OOS for six disposable catalog copies; real actual-service transaction',latencyMS:Date.now()-t,commands,ids:fixtureDocs.map(d=>String(d._id))});
 check('archive_before_delete_and_five_item_cap',()=>{assert.equal(rows.filter(r=>r.deleted).length,5);assert.ok(commands.indexOf('archive-complete')<commands.indexOf('delete'));});
 let survivors=await col.find({}).toArray(),archives=await archive.find({}).toArray();check('exact_deleted_ids_are_archived',()=>{assert.equal(survivors.length,1);assert.equal(archives.length,5);for(const r of rows.filter(x=>x.deleted))assert.ok(archives.some(d=>String(d._id)===r.id));});
 const remaining=survivors[0];const expectedPrice=Number(String(remaining.price||'').replace(/[^0-9.]/g,''))||remaining.currentPriceValue||remaining.price_inr;
 const cat=await cats.findOne({slug:'washing-machines'});report.categoryAfterDeletion={min:cat.min_price,max:cat.max_price,expected:expectedPrice};check('transactional_category_bounds',()=>{assert.equal(cat.min_price,expectedPrice);assert.equal(cat.max_price,expectedPrice);});
 await col.insertMany(archives.map(d=>{const x={...d};delete x.deleted_at;delete x.deleted_reason;delete x.live;return x;}));await archive.deleteMany({});
 await seed(fixtureDocs);const before=JSON.stringify(await col.find({}).sort({_id:1}).toArray());commands=[];phase='expiry';let aborted=false;t=Date.now();try{await deadline.run(()=>service.getLivePrices([fixtureDocs[0]._id]),{timeoutMS:100});}catch(e){aborted=true;}await sleep(300);
 report.controls.push({name:'expiry_after_archive_before_delete',evidence:'SIMULATED OOS; deliberate 250ms archive-return delay inside real Mongo transaction',latencyWithObservationMS:Date.now()-t,commands,aborted});
 const after=JSON.stringify(await col.find({}).sort({_id:1}).toArray());check('deadline_rolls_back_archive_and_prevents_delete',()=>{assert.ok(aborted);assert.equal(after,before);assert.ok(!commands.includes('delete'));});
 report.archiveCount=await archive.countDocuments();check('expired_archive_transaction_leaves_no_archive',()=>assert.equal(report.archiveCount,0));
 report.status=report.failures.length?'FAIL':'PASS';report.scope='CONTROLLED ONLY: no Worker/retailer requests, actual services and disposable Mongo; transaction archive/deletion/cap/category preservation';

}
(async()=>{try{await main();}catch(e){report.status='FAIL';report.fatal={name:e.name,message:e.message,stack:e.stack};}finally{if(server)await new Promise(r=>server.close(r));if(mongoose.connection.readyState===1){await mongoose.connection.dropDatabase();report.databaseDropped=true;await mongoose.disconnect();}delete process.env.PRICE_WORKER_KEY;try{fs.unlinkSync('worker-key.txt')}catch{}fs.writeFileSync('allowlist-results.json',JSON.stringify(report,null,2));console.log('DEADLINE_ACCEPTANCE='+JSON.stringify(report));}})();
