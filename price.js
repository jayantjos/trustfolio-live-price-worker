/**
 * Product-scoped Amazon + Flipkart HTML extraction, based on the older
 * TrustFolio Scrape.do pricing logic. Do not read sponsored items, MRP or EMI.
 * Never treat HTML/price-parser failure as proof of unavailability.
 */
const parseMoney = (value) => {
  if (typeof value === 'object' && value !== null) return parseMoney(value.amount ?? value.value ?? value.price);
  const raw = String(value ?? '').trim().replace(/^[₹$]\s*/, '').replace(/^Rs\.?\s*/i, '');
  // Never turn malformed Amazon "47,99000" into INR 4,799,000.
  if (raw.includes(',') &&
      !/^(?:\d{1,3}(?:,\d{3})+|\d{1,3}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(raw))
    return null;
  const s=raw.replace(/,/g,'');
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
function isVisibleFlipkartE002(html) {
  const body=/<body\b[^>]*>([\s\S]{0,6000}?)<\/body>/i.exec(html)?.[1]||'';
  const plain=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  return plain.length<1500 && /\bE002\b/i.test(plain) && /something went wrong/i.test(plain);
}
export function extractFlipkart(html, expected) {
  if (!html || html.length<500) return failure('empty_product_page');
  if (isVisibleFlipkartE002(html)) return failure('flipkart_e002_store_error_page');
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
  // An independently verified same-PID page may expose only a primary price DOM.
  // Reject multiple prices, recommendations far from the product, MRP and bank offers.
  if (expected?.id && html.toUpperCase().includes(String(expected.id).toUpperCase())) {
    const amounts=[];
    const re=/<(?:div|span)\b[^>]*class=["']([^"']*\bNx9bqj\b[^"']*)["'][^>]*>([^<]{0,100})<\/(?:div|span)>/gi;
    let m;
    while ((m=re.exec(html))) {
      if (/mrp|strike|original|bank|card|cashback|emi|exchange|offer/i.test(m[1])) continue;
      const near=html.slice(Math.max(0,m.index-3500),Math.min(html.length,m.index+3500));
      if (!near.toUpperCase().includes(String(expected.id).toUpperCase())
        && !/<h1\b[^>]*>[\s\S]{0,1400}?<\/h1>/i.test(near)) continue;
      const match=/^\s*(?:₹|Rs\.?)\s*([\d,]{3,}(?:\.\d{1,2})?)\s*$/.exec(m[2]);
      const amount=parseMoney(match?.[1]);
      if(amount!=null) amounts.push(amount);
    }
    const distinct=[...new Set(amounts)];
    if(distinct.length===1) return ok(distinct[0],'flipkart_primary_price_element');
  }
  // Scrape.do legacy "Buy at ₹..." rule, adapted conservatively:
  // only accept within the primary product heading scope of the exact PID.
  // A site-wide "Buy at" can belong to a recommendation, so never trust it.
  if(expected?.id && html.toUpperCase().includes(String(expected.id).toUpperCase())) {
    const headline=/<h1\b[^>]*>[\s\S]{0,1200}?<\/h1>/i.exec(html);
    if(headline && variantMatch(expected.title,
       headline[0].replace(/<[^>]*>/g,' ').replace(/\s+/g,' '))) {
      const nearby=html.slice(Math.max(0,headline.index-1000),
        Math.min(html.length,headline.index+4200));
      if(nearby.toUpperCase().includes(String(expected.id).toUpperCase())) {
        const matches=[...nearby.matchAll(/\bBuy\s+at\s*(?:₹|Rs\.?)\s*([\d,]{3,}(?:\.\d{1,2})?)/gi)]
          .map(x=>parseMoney(x[1])).filter(x=>x!==null);
        const unique=[...new Set(matches)];
        if(unique.length===1 && !/NOTIFY_ME|notify\s+me/i.test(nearby)) {
          return ok(unique[0],'flipkart_primary_buy_at');
        }
      }
    }
  }
  return failure('product_page_price_not_exposed');
}
export function extractAmazon(html, expected) {
  if (!html || html.length<500) return failure('empty_product_page');
  if (!identityValid(html,expected)) return failure('product_identity_unverified');
  // Amazon soft-blocks may return HTTP 200 with generic Amazon.in pages.
  // Price evidence from another product must never be accepted for this ASIN.
  const title=productTitle(html).trim();
  if (/^amazon\.in\s*$/i.test(title) || !expected?.id ||
    !html.toUpperCase().includes(String(expected.id).toUpperCase()))
    return failure('amazon_product_identity_unverified');
  // Price-to-pay is the checkout selling price. MRP, struck-through prices,
  // deal banners and recommendation prices must not override it.
  // Use a short DOM scope: the old 3800-byte window could swallow MRP.
  const primaryIds=['priceToPay','apex_desktop','corePriceDisplay_desktop_feature_div',
    'corePrice_feature_div','priceblock_dealprice','priceblock_ourprice'];
  const readCandidates=(scope) => {
    const a=[];
    const re=/<span\\b([^>]*)>\\s*(?:₹|Rs\\.?)\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s*<\\/span>/gi;
    let m;
    while((m=re.exec(scope))) {
      if(!/\\ba-offscreen\\b/i.test(m[1])) continue;
      const prefix=scope.slice(Math.max(0,m.index-260),m.index);
      if(/a-text-price|a-price-strike|listPrice|basisPrice|\\bMRP\\b|maximum retail price/i.test(m[1]+prefix)) continue;
      const n=parseMoney(m[2]);
      if(n!==null) a.push(n);
    }
    return [...new Set(a)];
  };
  const priceToPay=/<(?:span|div)\\b[^>]*id=["']priceToPay["'][^>]*>/i.exec(html);
  if(priceToPay) {
    const scope=html.slice(priceToPay.index,priceToPay.index+950);
    const amounts=readCandidates(scope);
    if(amounts.length===1) return ok(amounts[0],'amazon_price_to_pay');
    if(amounts.length>1) return failure('amazon_conflicting_primary_prices');
  }
  // Product-level buybox only; if it contains multiple distinct prices,
  // never silently pick the first (often the crossed-out MRP).
  for (const id of primaryIds.filter(x=>x!=='priceToPay')) {
    const doubleQuoted=html.indexOf('id="'+id+'"');
    const singleQuoted=html.indexOf("id='"+id+"'");
    const position=doubleQuoted>=0?doubleQuoted:singleQuoted;
    if(position<0) continue;
    const scope=html.slice(position,Math.min(html.length,position+1700));
    const amounts=readCandidates(scope);
    if(amounts.length>1) return failure('amazon_conflicting_primary_prices');
    if(amounts.length===1) return ok(amounts[0],'amazon_primary_buybox');
  }
  // JSON-LD is not authoritative when a page explicitly exposes a price
  // conflict. A valid product-scoped offer is useful only as a last resort.
  const ld=productJsonld(html,expected);
  if(ld) return ld;
  return failure('amazon_buybox_price_not_exposed');
}
export function extractPrice(platform, html, expected) {
  return platform==='flipkart' ? extractFlipkart(html, expected) : extractAmazon(html, expected);
}
