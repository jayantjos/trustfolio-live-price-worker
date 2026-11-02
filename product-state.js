// Rich verification states are additive; legacy callers still see ok/error/out_of_stock.
const STATES=new Set(['ok','out_of_stock','discontinued','not_deliverable','price_unverified','temporary_error','identity_mismatch']);
export function withVerification(result) {
 let state=result.verificationStatus;
 if(!STATES.has(state)) {
  const error=String(result.error||'');
  state=result.status==='out_of_stock'?'out_of_stock':result.status==='ok'?'ok':
   /canonical.*mismatch|primary_pid_mismatch|catalog.*mismatch|brand.*mismatch|product.*redirect.*mismatch/.test(error)?'identity_mismatch':
   /fetch|timeout|http_|read_failed|invalid_json|empty_product_page|e002|too_large|exceeds_limit|not_html|captcha|blocked|storage|binding/.test(error)?'temporary_error':'price_unverified';
 }
 const accepted=state==='ok'&&result.status==='ok'&&Number.isFinite(result.priceNum)&&result.priceNum>0&&result.inStock!==false;
 if(state==='ok'&&!accepted)state='price_unverified';
 const unavailable=['out_of_stock','discontinued'].includes(state);
 const stock=unavailable?false:state==='not_deliverable'?null:accepted?(result.inStock??result.in_stock??null):null;
 return {...result,status:accepted?'ok':unavailable?'out_of_stock':'error',verificationStatus:state,
  priceNum:accepted?result.priceNum:null,price:accepted?result.price:null,
  inStock:stock,in_stock:stock,availability:unavailable?state:null,
  source:result.source||result.extractionSource||null,verificationOutcome:accepted?'selling_price_verified':state,
  error:accepted?null:(result.error||state)};
}
// Return the complete element, never a fixed suffix that can swallow neighbors.
export function elementAt(html,index,max=100000) {
 const opening=/^<([a-z][a-z0-9]*)\b[^>]*>/i.exec(html.slice(index));if(!opening)return null;
 const tag=opening[1],re=new RegExp('<\\/?'+tag+'\\b[^>]*>','gi');re.lastIndex=index;let depth=0,m;
 while((m=re.exec(html))&&m.index-index<=max){if(/^<\//.test(m[0]))depth--;else if(!/\/>$/.test(m[0]))depth++;if(depth===0)return html.slice(index,re.lastIndex);}
 return null;
}
export function byId(html,id) {
 const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const re=new RegExp('<[a-z][a-z0-9]*\\b[^>]*\\bid=["\\\']'+escaped+'["\\\'][^>]*>','i');const m=re.exec(html);return m?elementAt(html,m.index):null;
}
export const plainText=html=>String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
export function primaryAvailability(html,platform) {
 const scopes=platform==='amazon'?['availability','availabilityInsideBuyBox_feature_div']:['availability','availabilityStatus'];
 for(const id of scopes){const text=plainText(byId(html,id));
  if(/\b(?:this (?:item|product) (?:has been |is )?)discontinued\b|no longer available/i.test(text))return {state:'discontinued',evidence:text.slice(0,240)};
  if(/\b(?:out of stock|sold out|currently unavailable)\b/i.test(text))return {state:'out_of_stock',evidence:text.slice(0,240)};
  if(/(?:cannot|can.t|not|unable to).{0,25}(?:deliver|ship)|not deliverable/i.test(text))return {state:'not_deliverable',evidence:text.slice(0,240)};
  if(/\bin stock\b/i.test(text))return {state:'ok',inStock:true,evidence:text.slice(0,240)};
 }
 return null;
}
