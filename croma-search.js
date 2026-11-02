// Search-channel diagnostic. No cart, browser, database or fulfillment inference.
export const CROMA_CONTEXT=Object.freeze({fields:'FULL',channel:'WEB',channelCode:'400049',spellOpt:'DEFAULT'});
export function cromaQueryPlan(doc) {
 const title=String(doc.title||'').trim().replace(/\s+/g,' ').replace(/^buy\s+/i,'');
 const words=title.split(' ').filter(Boolean),brand=String(doc.brand||words[0]||'').trim();
 const text=title+' '+String(doc.category||'');
 const kind=/washing machine|washing-machines/i.test(text)?'washing machine':/smartwatch|\bwatch\b|smart-watches/i.test(text)?'smartwatch':/headphone|earbud/i.test(text)?'headphones':/laptop/i.test(text)?'laptop':/\b5g\b|mobile|smart-phone/i.test(text)?'smartphone':/\btv\b|television|smart-tvs/i.test(text)?'tv':'';
 const seen=new Set();return [{query:words.slice(0,3).join(' '),pages:1},{query:words.slice(0,2).join(' '),pages:1},{query:kind?(brand+' '+kind).trim():'',pages:3},{query:brand,pages:3}].filter(p=>{const k=p.query.toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true;});
}
function money(value) {
 if(value&&typeof value==='object')return money(value.value??value.formattedValue);
 if(typeof value!=='number'&&typeof value!=='string')return null;
 const text=String(value).trim().replace(/^₹\s*/,'');
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(text))return null;
 const n=Number(text.replace(/,/g,''));return Number.isFinite(n)&&n>0&&n<1e8?n:null;
}
export function cromaExactPrice(body,sku) {
 const fail=error=>({status:'error',priceNum:null,price:null,inStock:null,error,source:'croma_search_web'});
 if(!Array.isArray(body?.products))return fail('croma_products_missing');
 const hits=body.products.filter(row=>row&&['code','skuId','productCode','id'].some(k=>String(row[k]??'')===sku));
 if(!hits.length)return {...fail('exact_croma_sku_not_in_search'),status:'no_price'};
 if(hits.length!==1)return fail('croma_ambiguous_exact_sku');
 const row=hits[0],ids=['code','skuId','productCode','id'].map(k=>row[k]).filter(x=>x!=null).map(String);
 if(ids.some(id=>id!==sku))return fail('croma_conflicting_product_identifiers');
 const candidates=['price','pincodePrice'].filter(k=>String(row[k]?.priceType||'').toUpperCase()==='BUY').map(k=>({field:k+'.value',value:money(row[k])})).filter(x=>x.value!==null);
 if(new Set(candidates.map(x=>x.value)).size>1)return fail('croma_channel_price_conflict');
 const chosen=candidates[0];
 const result={status:chosen?'ok':'no_price',priceNum:chosen?.value??null,price:chosen?'₹'+chosen.value.toLocaleString('en-IN'):null,inStock:null,in_stock:null,availability:null,source:chosen?'croma_'+chosen.field+'_BUY':'croma_search_web',error:chosen?null:'croma_buy_price_not_present',sku,title:String(row.name||'').slice(0,2048),mrp:money(row.mrp),identityVerified:true,availabilityEvidence:'search stockFlag/store arrays are not delivery confirmation',stockFlagCount:Array.isArray(row.stockFlag)?row.stockFlag.length:null,plmStatus:row.plmStatus??null};
 return result;
}
export async function boundedText(response,limit=2_500_000) {
 if(!response.body)return '';
 const reader=response.body.getReader(),decoder=new TextDecoder();let total=0,text='';
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw Error('response_body_exceeds_limit');}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
export async function inspectCromaSearch(doc,{fetchImpl=fetch,timeoutMs=6500,totalMs=20000}={}) {
 const sku=String(doc.platform_product_id||''),start=Date.now(),traces=[];
 const fail=error=>({status:'error',priceNum:null,price:null,inStock:null,in_stock:null,availability:null,error,source:'croma_search_web',sku,traces,latencyMs:Date.now()-start});
 if(!/^\d{4,12}$/.test(sku)||!String(doc.title||'').trim())return fail('invalid_croma_sku_or_title');
 let valid=false;
 for(const plan of cromaQueryPlan(doc))for(let page=0;page<plan.pages;page++){
  const remaining=totalMs-(Date.now()-start);if(remaining<=0)return fail('croma_total_timeout');
  const url=new URL('https://api.croma.com/searchservices/v1/search');url.search=new URLSearchParams({currentPage:String(page),query:plan.query+' :relevance',...CROMA_CONTEXT});
  const at=new Date().toISOString(),tick=Date.now();let response,body;
  try{response=await fetchImpl(url.href,{headers:{accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(Math.min(timeoutMs,remaining))});
   if(response.status!==200){traces.push({at,url:url.href,httpStatus:response.status,latencyMs:Date.now()-tick});return {...fail('croma_http_'+response.status),httpStatus:response.status};}
   const raw=await boundedText(response);try{body=JSON.parse(raw);}catch{return fail('croma_invalid_json');}
  }catch(e){return fail('croma_fetch_or_read_failed:'+String(e?.name||'Error'));}
  const headers=Object.fromEntries(['date','age','cache-control','expires','etag','last-modified','x-cache','cf-cache-status','vary','content-type'].map(k=>[k,response.headers.get(k)]).filter(x=>x[1]!==null));
  const exact=cromaExactPrice(body,sku);
  traces.push({at,url:url.href,httpStatus:response.status,headers,latencyMs:Date.now()-tick,productCount:Array.isArray(body?.products)?body.products.length:null,pagination:body?.pagination??null,exact:exact.identityVerified?exact:null});
  if(exact.error==='croma_products_missing')return fail(exact.error);
  valid=true;
  if(exact.error!=='exact_croma_sku_not_in_search')return {...exact,context:CROMA_CONTEXT,httpStatus:200,checkedAt:new Date().toISOString(),latencyMs:Date.now()-start,traces};
  const pages=Number(body?.pagination?.totalPages);if(!body.products.length||(Number.isFinite(pages)&&pages>0&&page+1>=pages))break;
 }
 return {...fail(valid?'exact_croma_sku_not_in_search':'croma_search_unavailable'),status:valid?'no_price':'error',httpStatus:valid?200:null,context:CROMA_CONTEXT};
}
