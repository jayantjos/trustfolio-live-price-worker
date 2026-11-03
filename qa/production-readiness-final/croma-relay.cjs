'use strict';
const cp=require('child_process'),crypto=require('crypto');
let pending;
const api=async(args,input)=>new Promise((resolve,reject)=>{const p=cp.execFile('gh',['api',...args],{maxBuffer:2000000,timeout:6000},(e,out)=>e?reject(e):resolve(out));if(input)p.stdin.end(JSON.stringify(input));});
module.exports=async function(d,docs){
 if(!pending)pending=(async()=>{const branch=process.env.STAGING_BRANCH,repo=process.env.GH_REPO,nonce=crypto.randomUUID();
  await api(['-X','PUT',`repos/${repo}/contents/qa/production-readiness-final/croma-request.json`,'--input','-'],{message:'Request bounded genuine VPS Croma adapter quotes',branch,content:Buffer.from(JSON.stringify({nonce,ids:docs.map(x=>String(x._id))})).toString('base64')});
  const until=Date.now()+14000;while(Date.now()<until){try{const x=JSON.parse(await api([`repos/${repo}/contents/qa/production-readiness-final/croma-response.json?ref=${branch}`]));const r=JSON.parse(Buffer.from(x.content,'base64').toString());if(r.nonce===nonce)return r;}catch{}await new Promise(r=>setTimeout(r,700));}return {results:[],error:'staging_croma_transport_deadline'};
 })();
 const r=await pending,x=r.results?.find(x=>x.id===String(d._id));return x?{...x.result,vpsEvidence:x}:{status:'error',in_stock:null,error:r.error||'croma_exact_sku_unavailable'};
};
