'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const mongoose=require('mongoose'),express=require('express');
const URI='mongodb://127.0.0.1:27017/trustfolio_acceptance_disposable?replicaSet=rs0',ROOT=path.resolve('backend');
const report={status:'UNVERIFIED',productionWrites:0,workerDeployment:false,checks:[],quotes:[],resolutions:[],failures:[]};let server;
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function check(name,fn){try{fn();report.checks.push({name,status:'PASS'});}catch(e){report.failures.push({name,error:e.message});report.checks.push({name,status:'FAIL',error:e.message});}}
async function main(){
 assert.equal(process.env.STAGING_MONGO_URI,URI);
 for(const key of ['MONGODB_URI','MONGO_URI','MONGODB_URL','DATABASE_URL','TF_DEPLOY_SSH_KEY','CLOUDFLARE_API_TOKEN'])assert.ok(!process.env[key],key+' forbidden');
 const snap=JSON.parse(fs.readFileSync('private-sources.json'));report.sourceReadAt=snap.readAt;report.sourceHashes=snap.sha256;
 const expected=JSON.parse(fs.readFileSync('patch-source-hashes.json'));for(const [p,v] of Object.entries(expected))if(v.base_sha256)assert.equal(snap.sha256[p],v.base_sha256,'Actual source drift '+p);
 for(const [p,s] of Object.entries(snap.sources)){assert.ok(!p.includes('..'));assert.ok(!/mongodb(?:\+srv)?:\/\//.test(s));const f=path.join(ROOT,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s);}
 cp.execFileSync('git',['apply','--check','--directory=backend','candidate.diff']);cp.execFileSync('git',['apply','--directory=backend','candidate.diff']);
 report.patchSHA256=sha(fs.readFileSync('candidate.diff'));
 report.candidateHashes={};for(const [p,v] of Object.entries(expected)){const actual=sha(fs.readFileSync(ROOT+'/'+p));assert.equal(actual,v.candidate_sha256,'Exact candidate drift '+p);report.candidateHashes[p]=actual;}
 fs.mkdirSync(ROOT+'/config',{recursive:true});fs.writeFileSync(ROOT+'/config/mongo.js',"module.exports=async()=>require('mongoose').connect(process.env.STAGING_MONGO_URI,{autoIndex:false});");
 const connect=mongoose.connect.bind(mongoose);mongoose.connect=(u,...args)=>{assert.equal(u,URI);return connect(u,...args);};
 process.env.PRICE_WORKER_URL='https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev';process.env.PRICE_WORKER_KEY=fs.readFileSync('worker-key.txt','utf8').trim();assert.ok(process.env.PRICE_WORKER_KEY);
 await mongoose.connect(URI,{autoIndex:false});assert.equal(mongoose.connection.db.databaseName,'trustfolio_acceptance_disposable');
 const col=mongoose.connection.collection('my_products'),cats=mongoose.connection.collection('categories'),archive=mongoose.connection.collection('my_products_deleted');
 const useIds=['6a080110fe6fd8dc386bbee3','69f419329a622ea2d7ccb736','69f419289a622ea2d7ccb608','69f4026f9a622ea2d7ccb2e6'];
 const docs=snap.pool.filter(d=>useIds.includes(String(d._id))).map(d=>({...d,_id:new mongoose.Types.ObjectId(d._id)}));assert.equal(docs.length,4);
 for(const d of docs)delete d.live;
 const mapped=docs.find(d=>String(d._id)==='69f419329a622ea2d7ccb736');assert.ok(mapped);
 assert.ok(!/^[A-Z]{3}[A-Z0-9]{13}$/.test(mapped.platform_product_id),'Fixture must retain real itm page ID');
 for(const field of ['original_product_url','clean_url','url','product_url'])if(mapped[field])assert.ok(!/[?&]pid=/i.test(mapped[field]),'No fixture PID injection allowed');
 const canon=mapped.original_product_url||mapped.clean_url||mapped.url;
 const clone=(label,extra)=>({...mapped,_id:new mongoose.Types.ObjectId(),acceptance_fixture:label,...extra});
 const negatives=[clone('unknown_page',{platform_product_id:'itm0000000000000',original_product_url:'https://www.flipkart.com/unknown/p/itm0000000000000',clean_url:'https://www.flipkart.com/unknown/p/itm0000000000000',url:'https://www.flipkart.com/unknown/p/itm0000000000000',product_url:null}),clone('conflicting_pid',{original_product_url:canon+'?pid=WMNHHUCY5FWTHBAN'}),clone('wrong_brand',{brand:'UnrelatedBrand'}),clone('wrong_capacity',{title:'Godrej 8 kg wrong capacity fixture'}),clone('wrong_model',{model_number:'UNAPPROVED_MODEL_FIXTURE'})];
 docs.push(...negatives);await col.insertMany(docs);for(const slug of new Set(docs.map(d=>d.category_slug||d.category)))if(slug)await cats.insertOne({title:slug,slug,price_ranges:[]});
 const identity=require(ROOT+'/services/LivePriceIdentity'),actualItem=identity.workerItem;identity.workerItem=d=>{const item=actualItem(d);report.resolutions.push({id:String(d._id),platform:d.platform,catalogIdentifier:d.platform_product_id,originalURL:d.original_product_url||d.clean_url||d.url,brand:d.brand,title:d.title,item});return item;};
 const originalFetch=global.fetch;global.fetch=async(url,opts)=>{if(String(url).startsWith('http://127.0.0.1:'))return originalFetch(url,opts);assert.equal(String(url),process.env.PRICE_WORKER_URL+'/api/check');assert.ok(report.quotes.length<4,'Bounded quote allowance');const body=JSON.parse(opts.body);assert.equal(body.useCache,false);assert.equal(body.browserProbe,false);const t=Date.now();const res=await originalFetch(url,opts),raw=await res.text();let data;try{data=JSON.parse(raw);}catch{}report.quotes.push({item:body.items[0],atUTC:new Date().toISOString(),http:res.status,ray:res.headers.get('cf-ray'),latencyMs:Date.now()-t,row:data?.results?.[0]||null});return new Response(raw,{status:res.status,headers:{'content-type':'application/json'}});};
 const service=require(ROOT+'/services/LivePriceService'),controller=require(ROOT+'/controllers/ProductController');
 const t=Date.now();report.liveRows=await service.getLivePrices(docs.map(d=>d._id));report.connectedLatencyMs=Date.now()-t;
 const after=await col.find({}).toArray();report.persistence=after.map(d=>({id:String(d._id),fixture:d.acceptance_fixture||null,catalogIdentifier:d.platform_product_id,price:d.price,price_inr:d.price_inr,currentPriceValue:d.currentPriceValue,live:d.live}));
 const approved=after.filter(d=>['6a080110fe6fd8dc386bbee3','69f419329a622ea2d7ccb736'].includes(String(d._id)));
 const success=approved.every(d=>d.live?.status==='ok');report.genuineStatus=success?'PASS':'BLOCKED';
 if(success)check('genuine_approved_mapping_and_persistence',()=>{for(const d of approved){assert.ok(Number.isFinite(d.price_inr)&&d.price_inr>0);assert.equal(d.price,String(d.live.price_inr));assert.equal(d.currentPriceValue,d.live.price_inr);assert.equal(d.live.verification_status,'ok');assert.ok(d.live.checked_at&&d.live.priced_at);}assert.equal(mapped.platform_product_id,after.find(d=>d._id.equals(mapped._id)).platform_product_id);assert.equal(after.find(d=>d._id.equals(mapped._id)).live.retailer_product_id,'WMNHBK4HNYBSDJ9U');});
 for(const d of negatives){const updated=after.find(x=>x._id.equals(d._id));check('reject_'+d.acceptance_fixture,()=>{assert.ok(updated);assert.notEqual(updated.live?.status,'ok');assert.equal(updated.price_inr,d.price_inr);});}
 for(const id of ['69f419289a622ea2d7ccb608','69f4026f9a622ea2d7ccb2e6'])check('excluded_catalog_'+id,()=>{const d=after.find(x=>String(x._id)===id);assert.ok(d);assert.equal(actualItem(d),null);});
 const app=express();app.get('/top',controller.getTopProducts);app.get('/bounds',controller.getProductPriceBounds);server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const endpoint='http://127.0.0.1:'+server.address().port;
 const t2=Date.now(),http=await originalFetch(endpoint+'/top?category=washing-machines&budget=35000&limit=5');report.selectionHTTP={http:http.status,body:await http.json(),latencyMs:Date.now()-t2,cache:'reuse genuine just-persisted 60-second live records; not another fresh retailer run'};
 const products=report.selectionHTTP.body.data?.products||[];check('only_approved_ids_in_actual_controller',()=>{for(const p of products){assert.ok(approved.some(d=>String(d._id)===p.id));assert.ok(p.price_inr<=35000);assert.equal(p.live_price_status,'ok');}if(success)assert.equal(products.length,approved.filter(d=>d.live.price_inr<=35000).length);});
 check('zero_archive_and_no_staging_deletion',()=>assert.equal(after.length,docs.length));report.archiveCount=await archive.countDocuments();check('no_archives',()=>assert.equal(report.archiveCount,0));
 report.status=report.failures.length?'FAIL':success?'PASS':'BLOCKED';report.scope='Final exact candidate diff; no fixture PID injection; three genuine Worker quotes maximum; no Croma/previous suite retest';
}
(async()=>{try{await main();}catch(e){report.status='FAIL';report.fatal={name:e.name,message:e.message,stack:e.stack};}finally{if(server)await new Promise(r=>server.close(r));if(mongoose.connection.readyState===1){await mongoose.connection.dropDatabase();report.databaseDropped=true;await mongoose.disconnect();}delete process.env.PRICE_WORKER_KEY;try{fs.unlinkSync('worker-key.txt');}catch{}fs.writeFileSync('allowlist-results.json',JSON.stringify(report,null,2));console.log('FINAL_ALLOWLIST_RESULTS='+JSON.stringify(report));}})();
