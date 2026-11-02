# Live price verification results

**Result: PASS for genuine connected quotes and Lenovo independent selling-price comparison; broader independent price/availability accuracy UNVERIFIED; records 155/234 BLOCKED.**

Permanent endpoint unchanged: https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev
No Worker code fix, redeployment, key rotation, browser probe or screenshot was needed.

## Evidence reused

Prior authentication/health and parser checks were reused from `qa/live-worker-final-check/`; they were not repeated. Last observed deployment UUID **4c503467-81e3-4321-8d1b-80f408f1beaa**, application **1.2.2**, deployment **2900b889-bf56-461c-a384-3e1b5af0af5f**, 100%, workers.dev enabled. This task did not requery account deployment metadata; no claim of a new version inspection is made.

Earlier missing/wrong-key 401 controls and valid-key handler 200 PASS remain the credential checkpoint. Current genuine quotes used the matching GitHub Actions TF_PRICE_WORKER_KEY securely and reached the actual retailer handlers. All **20** genuine fresh Worker quotes in the two connected runs returned HTTP 200; no 1042 or transport timeout was observed. This sample does not prove the historical intermittent platform cause has been fixed.

## Canaries: real retailer → real backend → real staging MongoDB

|Product|Exact identity|Fresh Worker price|Source|Stock|RTT|Result|
|---|---|---|---|---|---|---|
|HP 24-cr0023in Ryzen 7/16 GB/512 GB|B0GJDLKM5H|₹69,990|amazon_price_to_pay|true|2382 ms|PASS connected persistence; matches reused independent evidence|
|Lenovo 11IJL9 N4500/4 GB/64 GB|COMHCYMG83BGNQHH|₹22,911|jsonld_product_offer|true|1200 ms|PASS connected persistence and fresh independent primary Offer|

Lenovo was separately fetched once because the fresh price differed from the historical ₹36,502 and the current HTML title still contained that older amount. The new response (2026-11-02T19:10:33.931091Z, 1,578,043 bytes) contained **one primary Product, exact SKU, one INR Offer ₹22,911, InStock**. SHA-256 `4bf61605e17164d9c1fa69a8b2194036bb251e4df4157bb9ad82bb21943080dd`; RTT1109ms. See `lenovo-fresh-independent.json`. A title's historical price was not substituted for the current Offer.

HP's fresh primary price matches the previously independent primary priceToPay evidence; a second independent HP fetch was not repeated. No hidden, cart-gated, MRP, coupon, or other-seller amount was invented.

## Real Top-5 continuation quotes

[Run 41507384017](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41507384017), `top5-continuation-results.json`. Ten exact, fresh requests, useCache:false and browserProbe:false, executed through actual staged LivePriceService. Prices below are **Worker primary-extraction observations**, not ten independent retailer comparisons.

|Platform|Identifier|Worker selling-price quote|Stock|Status / verification|RTT|
|---|---|---|---|---|---|
|Flipkart|WMNHBK4HNYBSDJ9U|₹34,490|true|ok / ok|1167 ms|
|Flipkart|WMNGAM87GSNGWJER|₹40,490|true|ok / ok|1510 ms|
|Amazon|B0F24G847Q|null|unknown|error / price_unverified|2296 ms|
|Amazon|B0D41L64NR|₹33,490|true|ok / ok|2306 ms|
|Amazon|B0F6MVY5TH|null|false|out_of_stock / out_of_stock|2376 ms|
|Flipkart|WMNHHUCY5FWTHBAN|₹30,130|true|ok / ok|1172 ms|
|Flipkart|WMNG4WGVXYSRYHJZ|₹33,990|true|ok / ok|1195 ms|
|Flipkart|WMNGYGJKCVNKSZWY|₹32,236|true|ok / ok|1509 ms|
|Amazon|B0G4R2117K|null|false|out_of_stock / out_of_stock|1834 ms|
|Amazon|B0GX9P1BWT|₹32,990|true|ok / ok|1999 ms|

The buybox-unexposed Whirlpool returned null price/null stock and was excluded. Both explicit unavailable Amazon rows returned null/false and were excluded. IFB's genuine ₹40,490 exceeded the ₹35,000 budget and was excluded. Genuine missing-price preservation is visible in MongoDB: Whirlpool retained its stored ₹33,090 but live.status=error and it was never returned as a verified offer.

The earlier unresolved fan price/independent OOS cases retain their existing UNVERIFIED labels; the prior unavailable direct evidence was not blindly repeated. Exact mappings for records155/234 remained BLOCKED after real MongoDB and one bounded canonical HTML read each; no Worker request for an invented PID.

**Price/stock limits:** Worker status ok is an extraction contract, not independent proof for every selected quote. Stock reflects listing evidence, not postcode deliverability or long-term availability. Full independent accuracy across all five Top-5 products remains UNVERIFIED.

## Preservation

Croma stayed on the existing VPS direct-price adapter; no Croma Cloudflare request. The adapter's unchanged source hash is recorded. Earlier genuine exact-SKU evidence (317463 ₹33,900; 300154 ₹2,799; 312748 ₹21,990) with unknown stock is reused from `qa/final-staging-acceptance/croma-preserved-evidence.json`, not presented as fresh prices or used to fill this Amazon/Flipkart Top-5.

