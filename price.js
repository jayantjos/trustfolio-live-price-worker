/**
 * Product-scoped Amazon + Flipkart HTML extraction, based on the older
 * TrustFolio Scrape.do pricing logic. Do not read sponsored items, MRP or EMI.
 * Never treat HTML/price-parser failure as proof of unavailability.
 */
const parseMoney = (value) => {
  if (typeof value === 'object' && value !== null) return parseMoney(value.amount ?? value.value ?? value.price);
  const s = String(value ?? '').trim().replace(/^[₹$]\s*/, '').replace(/,/g, '');
  if (!/^\d{3,8}(?:\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 100 && n <= 1e7 ? n : null;
};
const normalize = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const words = (v) => normalize(v).split(' ').filter(Boolean);
const colors = new Set(['black','blue','white','green','red','gold','grey','gray','silver','pink','violet','purple','yellow','orange','brown']);
function variantMatch(expected, actual) {
  if (!expected || !actual) return true;
  const a = words(expected), b = words(actual);
  const ca = a.find(x=>colors.has(x)), cb = b.find(x=>colors.has(x));
  if (ca && cb && ca!==cb) return false;
  const cap = (xs) => {
    for (let i=0;i<xs.length-1;i++) if (/^(?:64|128|256|512|1024)$/.test(xs[i]) && xs[i+1]==='gb') return xs[i];
    return null;
  };
  if (cap(a) && cap(b) && cap(a)!==cap(b)) return false;
  const stop = new Set(['online','best','price','storage','ram','mobile','smartphone','on','at','with','new']);
  const identity=a.filter(x=>x.length>2 && !stop.has(x)).slice(0,4);
  return identity.length===0 || identity.filter(x=>b.includes(x)).length>=Math.min(2,identity.length);
}
const ok = (p, source, stock=null) => ({status:'ok',priceNum:p,price:'₹'+p.toLocaleString('en-IN'),inStock:stock,source});
const failure = (error, httpStatus=200) => ({status:'error',priceNum:null,price:null,inStock:null,error,httpStatus});
function productJsonld(html,expected) {
  const regex=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m=regex.exec(html))) {
    try {
      const graph=[];
      const add=x=>{
        if (Array.isArray(x)) {x.forEach(add);return;}
        if (!x || typeof x!=='object') return;
        if (x['@graph']) add(x['@graph']);
        if ([x['@type']].flat().some(t=>String(t).toLowerCase()==='product')) graph.push(x);
      };
      add(JSON.parse(m[1]));
      for (const p of graph) {
        if (!variantMatch(expected.title,p.name)) continue;
        const sku=String(p.sku ?? p.productID ?? '').trim().toUpperCase();
        if (sku && expected.id && sku!==expected.id.toUpperCase()) continue;
        const offers=Array.isArray(p.offers)?p.offers:[p.offers];
        for (const offer of offers) {
          if (!offer || typeof offer!=='object') continue;
          const amount=parseMoney(offer.price);
          const availability=String(offer.availability||'').toLowerCase();
          if (/outofstock|soldout|discontinued/.test(availability)) return {
            status:'out_of_stock',priceNum:null,price:null,inStock:false,source:'jsonld_product_offer',availability:'out_of_stock'
          };
          if (amount!=null) return ok(amount,'jsonld_product_offer',/instock/.test(availability)?true:null);
        }
      }
    } catch (_) { /* ignore invalid JSON-LD */ }
  }
  return null;
}
function productTitle(html) {return (/<title[^>]*>([^<]{0,260})<\/title>/i.exec(html)||[])[1]||'';}
function identityValid(html, expected) {
  const title=productTitle(html);
  if (!title || /captcha|access denied|something went wrong|robot check/i.test(title)) return false;
  if (!variantMatch(expected.title,title)) return false;
  // Flipkart PID/ Amazon ASIN in the primary URL is checked by the request parser.
  return true;
}
export function extractFlipkart(html, expected) {
  if (!html || html.length<500) return failure('empty_product_page');
  if (!identityValid(html,expected)) return failure('product_identity_unverified');
  const ld=productJsonld(html,expected);
  if (ld) return ld;
  // Historical Scrape.do parser: fsp is the product selling price, not MRP.
  const p= /"ppd"\s*:\s*\{([\s\S]{0,2000}?)\}/gi;
  let m;
  while ((m=p.exec(html))) {
    const amount=parseMoney((/"fsp"\s*:\s*"?(\d{3,8})"?/i.exec(m[1])||[])[1]);
    if (amount==null) continue;
    const near=html.slice(Math.max(0,m.index-300),Math.min(html.length,m.index+2400));
    if (/"NOTIFY_ME"\s*:\s*true/i.test(near)) continue;
    return ok(amount,'flipkart_ppd_fsp');
  }
  // This field is only accepted when a primary-product identity was verified.
  const meta=/<meta\b[^>]*itemprop=["']price["'][^>]*content=["']([\d,.]+)["'][^>]*>/i.exec(html)
       || /<meta\b[^>]*content=["']([\d,.]+)["'][^>]*itemprop=["']price["'][^>]*>/i.exec(html);
  const n=parseMoney(meta?.[1]);
  if (n!=null) return ok(n,'flipkart_product_price_meta');
  return failure('product_page_price_not_exposed');
}
export function extractAmazon(html, expected) {
  if (!html || html.length<500) return failure('empty_product_page');
  if (!identityValid(html,expected)) return failure('product_identity_unverified');
  const ld=productJsonld(html,expected);
  if (ld) return ld;
  for (const id of ['corePriceDisplay_desktop_feature_div','corePrice_feature_div','priceToPay','priceblock_dealprice','priceblock_ourprice']) {
    const re=new RegExp('id=["\\\']'+id+'["\\\']','i');
    const match=re.exec(html);
    if (!match) continue;
    const scope=html.slice(match.index,Math.min(html.length,match.index+3800));
    const priceTag=/<span[^>]*class=["'][^"']*\ba-offscreen\b[^"']*["'][^>]*>\s*(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*<\/span>/i.exec(scope);
    const price=parseMoney(priceTag?.[1]);
    if(price!=null) return ok(price,'amazon_primary_buybox');
  }
  return failure('amazon_buybox_price_not_exposed');
}
export function extractPrice(platform, html, expected) {
  return platform==='flipkart' ? extractFlipkart(html, expected) : extractAmazon(html, expected);
}
