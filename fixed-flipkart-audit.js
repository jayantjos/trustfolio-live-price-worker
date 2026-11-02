import {extractFlipkart} from './price.js';

// Diagnostic only: fixed Mongo inventory and observed affiliate redirect host.
// This resolver is never used by the ordinary production /api/check handler.
const HOSTS=new Set(['fkrt.clnk.in','linksredirect.com','flipkart.com','www.flipkart.com']);
function explicitVariantConflicts(sample,product) {
  const norm=s=>String(s||'').toLowerCase().replace(/\b(\d{1,2})\s+(\d)\s+(ton|kg|inch)\b/g,(_,a,b,u)=>a+'.'+b+' '+u);
  const expected=norm(sample.title),actual=norm(product.name),conflicts=[];
  const check=(field,re)=>{const a=re.exec(expected)?.[1],b=re.exec(actual)?.[1];if(a&&b&&Number(a)!==Number(b))conflicts.push({field,catalog:a,retailer:b});};
  const category=sample.category;
  if(['air-conditioners','refrigerators','washing-machines'].includes(category))check('star_rating',/\b(\d)\s*star\b/);
  if(category==='air-conditioners')check('ton_capacity',/\b(\d+(?:\.\d+)?)\s*tons?\b/);
  if(['air-coolers','geysers','refrigerators','microwave-ovens','water-purifiers'].includes(category))check('litre_capacity',/\b(\d+(?:\.\d+)?)\s*(?:l|litres?|liters?)\b/);
  if(category==='washing-machines')check('kg_capacity',/\b(\d+(?:\.\d+)?)\s*kg\b/);
  if(category==='ceiling-fans')check('blade_sweep_mm',/\b(\d{3,4})\s*mm\b/);
  if(['smart-tvs','tablets','laptops','desktop-computers'].includes(category))check('display_inches',/\b(\d+(?:\.\d+)?)\s*(?:inches|inch|")/);
  return conflicts;
}
export async function resolveFixedFlipkart(sample) {
  const fail=(error,evidence={})=>({error,priceINR:null,status:'unverified',...evidence});
  let current=new URL(sample.url);
  for(let hop=0;hop<5;hop++) {
    if(current.protocol!=='https:'||!HOSTS.has(current.hostname)||current.username||current.password||current.port)
      return fail('fixed_redirect_host_unverified',{redirectHost:current.hostname,redirectProtocol:current.protocol});
    let response;
    try {response=await fetch(current.href,{redirect:'manual',signal:AbortSignal.timeout(6500),headers:{accept:'text/html','accept-language':'en-IN,en;q=0.9'}});}
    catch(_){return fail('fixed_link_fetch_failed');}
    if(response.status>=300&&response.status<400){
      const location=response.headers.get('location');
      if(!location)return fail('fixed_redirect_location_missing');
      try {current=new URL(location,current);}catch(_){return fail('fixed_redirect_invalid');}
      continue;
    }
    if(response.status!==200)return fail('fixed_link_http_'+response.status);
    if(!['flipkart.com','www.flipkart.com'].includes(current.hostname)||!/\/p\/itm[a-z0-9]+/i.test(current.pathname))
      return fail('fixed_link_not_product_page');
    let html;
    try {html=await response.text();}
    catch(error){return fail('fixed_product_html_read_failed',{errorType:String(error?.name||'Error').slice(0,40)});}
    if(!html||html.length>2_500_000)return fail('fixed_product_html_unusable');
    // A same-page primary Product JSON-LD SKU is authoritative. Never use the
    // first PID string from recommendations or an unrelated link/offer.
    const products=[];
    const visit=value=>{
      if(Array.isArray(value)){value.forEach(visit);return;}
      if(!value||typeof value!=='object')return;
      if(value['@graph'])visit(value['@graph']);
      if([value['@type']].flat().includes('Product'))products.push(value);
    };
    for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
      try{visit(JSON.parse(m[1]));}catch(_){}
    }
    if(products.length!==1)return fail('fixed_primary_product_jsonld_unverified');
    const pid=String(products[0].sku||'').toUpperCase();
    if(!/^[A-Z0-9]{12,24}$/.test(pid))return fail('fixed_primary_pid_missing');
    const brandText=typeof products[0].brand==='string'?products[0].brand:products[0].brand?.name||'';
    const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const expectedBrand=norm(sample.brand),retailerBrand=norm(brandText);
    if(expectedBrand.length>=3&&retailerBrand.length>=3&&!expectedBrand.includes(retailerBrand)&&!retailerBrand.includes(expectedBrand))
      return fail('fixed_catalog_brand_mismatch',{resolvedPid:pid,expectedBrand:sample.brand,retailerBrand:brandText});
    const variantConflicts=explicitVariantConflicts(sample,products[0]);
    if(variantConflicts.length)return fail('fixed_catalog_variant_mismatch',{resolvedPid:pid,variantConflicts});
    const canonicalTag=/<link\b[^>]*\brel=["']canonical["'][^>]*>/i.exec(html)?.[0];
    const href=canonicalTag&&/\bhref=["']([^"']+)["']/i.exec(canonicalTag)?.[1];
    if(href){
      let canonical;try{canonical=new URL(href,current);}catch(_){return fail('fixed_canonical_invalid');}
      if(!['flipkart.com','www.flipkart.com'].includes(canonical.hostname)||canonical.pathname!==current.pathname)
        return fail('fixed_canonical_product_mismatch');
    }
    const title=/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]||null;
    const parsed=extractFlipkart(html,{id:pid,title:sample.title,primaryProductValidated:true});
    current.search='';current.searchParams.set('pid',pid);
    return {resolved:{pid,url:current.href,title},result:{pid,flipkart:{...parsed,title,url:current.href,httpStatus:200}},fresh:true};
  }
  return fail('fixed_redirect_limit');
}
