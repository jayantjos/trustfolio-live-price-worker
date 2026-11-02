# Croma VPS vs Cloudflare — 2 November 2026

**Decision C: keep the existing VPS Croma service primary.** Cloudflare Croma API returned HTTP **403 for all six real Mongo SKUs**; no Cloudflare selling price or exact-product response was available. Do not add ordinary Croma `/api/check` support or route the production backend to Cloudflare on this evidence.

VPS evidence: [read-only source/price comparison run 41470361130](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41470361130), 15:19:08–15:19:14 UTC (20:49:08–20:49:14 IST). Cloudflare: [six response diagnostic run 41471312848](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41471312848), 15:24:52–15:24:54 UTC (20:54:52–20:54:54 IST). These are about six minutes apart, not simultaneous, and no buyer postcode was supplied. All first-query URLs use the same query and channel parameters. VPS uses curl defaults; Cloudflare sends Accept application/json; environment/transport differ. The evidence establishes observed access rejection, not its exact WAF/network policy cause.

| SKU | Product | VPS selling / MRP (INR) | VPS status / latency | Cloudflare selling | Cloudflare API status / latency | Price comparison / availability |
|---|---|---|---|---|---|---|
| 317463 | Apple Watch SE 3 GPS+Cellular with Starlight Sport Band - M/L (44mm Retina LTPO OLED Display, Starlight Aluminium Case) | 33900 / 33900 | ok; HTTP 200; 370 ms total/1 calls | null | 403; 86 ms | Not comparable; stock unknown on both |
| 300154 | Crompton Energion Hyperjet 5 Star 1200mm 3 Blade BLDC Motor Ceiling Fan with Remote (Anti rust, Brown) | 2799 / 4849 | ok; HTTP 200; 479 ms total/1 calls | null | 403; 96 ms | Not comparable; stock unknown on both |
| 316459 | Croma 5 Star 1200mm 3 Blade BLDC Motor Ceiling Fan with Remote (Sleep Function, Brown) | null / unknown | no_price; HTTP 200; 1769 ms total/5 calls | null | 403; 100 ms | Not comparable; stock unknown on both |
| 311096 | Croma AV4315 3 Litres Instant Geyser with Rustproof Design (White) | null / unknown | no_price; HTTP 200; 1033 ms total/5 calls | null | 403; 42 ms | Not comparable; stock unknown on both |
| 317201 | ASUS Vivobook 15 M1502YA-BQ712WS AMD Ryzen 7 5825U Laptop (16GB, 1TB SSD, Windows 11 Home, 15.6 inch Full HD IPS Display, MS Office Home 2024, Cool Silver, 1.7 KG) | null / unknown | no_price; HTTP 200; 2080 ms total/8 calls | null | 403; 56 ms | Not comparable; stock unknown on both |
| 312748 | LG 7.5 kg 5 Star Inverter Fully Automatic Top Load Washing Machine (T75VBSF1Z, Smart Inverter Motor, Middle Free Silver) | 21990 / 27590 | ok; HTTP 200; 394 ms total/1 calls | null | 403; 110 ms | Not comparable; stock unknown on both |

## API request and schema

Endpoint `https://api.croma.com/searchservices/v1/search`; zero-based `currentPage`; `query=<search terms> :relevance`; `fields=FULL`, `channel=WEB`, `channelCode=400049`, `spellOpt=DEFAULT`. No login, browser, Scrape.do, supplied postcode or custom location cookie. The meaning of channelCode is not inferred to be the shopper's postcode.

Current VPS `searchPlan` tries first three title words, first two, brand+category kind (up to three pages), then brand (up to three), deduplicated. Each call uses curl connect 3 s / total 5 s, max buffer 4 MB; the existing service caches/deduplicates identical query promises for 45 s. This inspection used a separate VM instance of the unchanged current source and intercepted curl solely to capture headers/body evidence. It made genuine VPS HTTP calls; it did not invoke the Mongo-writing LivePrice endpoint. Local test results are distinct from these live calls.

Response is `{products:[...], pagination:{...}}`. Match the exact SKU string against code/skuId/productCode/id; never take the first search hit. For 317463, 300154 and 312748, `code` and product identity matched the Mongo record. Price source was **`price.value` with `price.priceType=BUY`**, agreeing with `pincodePrice.value` BUY. `mrp.value` had `priceType=FROM`; discount/discountValue were separate. Current VPS also has named sellingPrice/offerPrice/finalPrice fallbacks, but none were exercised by these three hits, so those fallback meanings are not newly validated.

All successful API responses had `Cache-Control: no-cache, no-store, must-revalidate`; response Date/Expires aligned with request time. No reliable product-price update timestamp or origin search-index freshness SLA was exposed. Therefore these are current **WEB search-channel selling-price quotes**, not proof of uncached origin inventory or final checkout/delivery pricing. For fan 300154, web BUY was 2799 but storeMop entries included 3220; physical-store/channel values must not override WEB price or be called a parser error.

`stockFlag` is a list of fulfillment/store codes, not a shopper-specific in-stock boolean. `plmStatus` values included ZD/ZA/ZN, whose meaning is unverified; do not decode them into discontinued/OOS. Existing VPS correctly returns stock/availability null. Search absence is not proof of product deletion/discontinuation. Missing SKUs 316459 and 311096 were chosen from existing live no-price/error records; 317201 is the sampled laptop. VPS exhausted 5/5/8 bounded queries respectively with HTTP 200 products but no exact SKU. This is a search coverage limitation, not evidence that unrelated search results are valid substitutes.

## Error and deployment behavior

The deployed read-only six-SKU diagnostic bounds body reads at 2.5 MB, each request at 6.5 s and each search plan at 20 s. It rejects duplicate/conflicting IDs, different BUY prices across price/pincodePrice, malformed money, MRP-only data, missing products, invalid JSON, body failures and non-200 HTTP responses. All return null accepted prices and unknown stock. Five focused Croma tests cover exact matching and these safety paths. Croma diagnostic responses are fixed-allowlist, cooldown-protected QA; ordinary authenticated price requests remain unsupported for Croma.

Cloudflare's outer diagnostic HTTP 200 merely transports a structured **upstream 403**. It is not a successful Croma price fetch. The source of the API access rejection is not proven from status alone; no alternate route, proxy, browser bypass, CAPTCHA/login workaround or header-fingerprint evasion was attempted. A provider-approved Cloudflare access route and renewed exact-SKU comparison are required before revisiting an adapter. VPS is the practical primary based on observed access, **not a claim that its three missing SKUs or location-specific availability are solved**.

Evidence: `croma-vps-evidence.json` (actual query traces, rows and hashes); `cf-response.json` (upstream 403 and timing per SKU). No backend or Croma production source was modified.

Evidence files and reproducible isolated canary scripts: [qa/pending-worker-20261102](https://github.com/jayantjos/trustfolio-live-price-worker/tree/main/qa/pending-worker-20261102).
