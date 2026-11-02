# Amazon & Flipkart live acceptance after secret rotation

**Result: authentication PASS; 8 exact live Worker checks completed; 2 independently matching selling prices PASS; 2 missing-PID cases BLOCKED. Overall acceptance remains UNVERIFIED.**

**Next step: a controlled, disposable staging backend canary may proceed using the independently verified HP and Lenovo mappings. Full Top-5 acceptance and production cutover are not approved.** No backend/Mongo integration was performed in this task.

Evidence: [live run 41495950447](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41495950447), source `1293402048d1896a6d9af6aed3dc5aadfc9c487b`; [independent Lenovo completion 41496321270](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41496321270), source `51f9d4e53596d8e52a4c50a55251f0d0f0c6c085`.
Saved data: `rotated-key-live-results.json`, `independent-flipkart-199.json`, updated `selected-product-cases.json`.
Earlier credential-blocked evidence is retained in `permanent-worker-connectivity.json` and report history at commit `bf4b3c098c56f08b94754a481f581d6076c8f0ab`.

## Active version and authentication

Permanent endpoint: `https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev`.

| Check | Result | HTTP / evidence | Latency |
|---|---|---|---|
| Active deployment | PASS, metadata | Version **4c503467-81e3-4321-8d1b-80f408f1beaa**, 100%; deployment 2900b889-bf56-461c-a384-3e1b5af0af5f; created 2026-11-02 17:54:01.042032 UTC | — |
| workers.dev route | PASS, metadata | enabled true; previews_enabled true | — |
| Health | PASS | 200; worker trustfolio-live-price-worker; application version **1.2.2**; ready true | 153 ms |
| Missing key | PASS | 401 / unauthorized | 109 ms |
| Wrong key | PASS | 401 / unauthorized | 79 ms |
| Newly configured matching key | **PASS** | 200 / success true; actual handler returned unsupported_product_url for the controlled invalid product | 101 ms |
| Cloudflare 1042 | PASS for this sample | Not observed in auth or eight product requests; historical root cause is not declared resolved | — |

The matching key came only from the GitHub Actions secret `TF_PRICE_WORKER_KEY`; its value was never printed, logged, committed or rotated here. Authentication controls did not call a retailer. The valid application response plus real product responses demonstrate handler execution, not merely API-deployment success.

Valid-auth Ray: `a54505958e9c95c3-MEM`; client correlation ID `5c16b268-ef68-40e0-8f2e-57f4403b3a40`; 2026-11-02 17:57:28 UTC. Raw evidence includes Ray IDs, timestamps and local correlation IDs for every Worker request. Correlation IDs were sent; no unsupported claim of server-side echo is made. The deployed UUID is from the active deployment API; the handler exposes application version 1.2.2, not a version UUID header.

## Compact product results

Every executed fresh request used `useCache:false`, `browserProbe:false`. Returned ASIN/PID matched the exact requested identifier in all eight executed cases. “Quote” means a Worker-returned price whose independent accuracy remains unverified. Unknown stock is not converted to true.

| Platform | Product ID | Actual price / quote | Availability | Worker status / verification | Fresh latency | PASS / FAIL / other |
|---|---|---|---|---|---|---|
| Amazon | B074J9SPYX — Crompton fan | **Quote ₹2,499** | Worker: in stock | ok / ok | 2,665 ms | UNVERIFIED independent price |
| Amazon | B0GD16BJ1Z — Samsung AC | null | Worker: currently unavailable | out_of_stock / out_of_stock | 2,248 ms | UNVERIFIED stock accuracy; null-price safety PASS |
| Amazon | B0GCKJ24Y3 — HAVAI cooler | null | Worker: currently unavailable | out_of_stock / out_of_stock | 2,120 ms | UNVERIFIED stock accuracy; null-price safety PASS |
| Amazon | B0BH9647DC — LUX fan | **Quote ₹34,220** | Worker: in stock | ok / ok | 1,866 ms | UNVERIFIED independent price |
| Amazon | B0GJDLKM5H — HP 24-cr0023in | **₹69,990 — independently matched** | Worker: in stock | ok / ok | 2,653 ms | **PASS primary selling price** |
| Flipkart | COMHCYMG83BGNQHH — record 199 Lenovo | **₹36,502 — independently matched** | Worker and primary Offer: InStock | ok / ok | 1,400 ms | **PASS primary selling price** |
| Flipkart | AICGETHFNCZCX7PA — record 212 Crompton | null | Worker: out of stock | out_of_stock / out_of_stock | 1,048 ms | UNVERIFIED independent stock; null-price safety PASS |
| Flipkart | Record 155 GAMESOUL — PID unknown | Not requested / null | Unknown | Not tested | — | **BLOCKED exact PID** |
| Flipkart | COMGSV3GZYUDG6NP — record 239 Acer | null | Unknown | error / price_unverified; product_identity_unverified | 1,080 ms | UNVERIFIED catalog identity; safe refusal PASS |
| Flipkart | Record 234 DZAB — PID unknown | Not requested / null | Unknown | Not tested | — | **BLOCKED exact PID** |

There were four positive Worker prices, three unavailable responses with null price/false stock, and one unverified-identity response with null price/null stock. No unaccepted-price leak was observed. These are response-contract observations, not eight independent retailer acceptances.

### Selling-price and availability evidence

- **HP PASS:** a fresh independent standard HTML request returned the exact canonical ASIN and matching ASIN input; the primary priceToPay scope contained ₹69,990. Full product title matches Ryzen 7 7730U, 16 GB DDR4, 512 GB SSD and model 24-cr0023in. No MRP, seller minimum or promotional/coupon amount was substituted. Body SHA-256 and primary-scope text are saved.
- **Lenovo PASS:** a separate fresh retailer HTML response contained exactly one primary Product, SKU COMHCYMG83BGNQHH, model 11IJL9 / 4 GB / 64 GB, and one INR Offer for 36,502 with schema.org/InStock. Its price matched the fresh Worker quote. This is listing-level offer evidence, not postcode delivery verification.
- **Crompton and LUX independent prices UNVERIFIED:** their separate direct HTML responses contained no verifiable canonical ASIN/primary price scope. They were not retried with alternate identities or access-control workarounds. Their Worker quotes remain labelled as quotes.
- **Samsung/HAVAI unavailable evidence:** actual Worker responses retained primary availability text, “Currently unavailable. We don't know when or if this item will be back in stock.” Both returned null accepted prices. No independent second stock source was collected, and no permanence/deletion claim is made.
- **Flipkart Crompton:** real exact-PID JSON-LD extraction returned OOS, false stock and null price. Independent availability accuracy remains unverified.
- **Acer 239:** ordinary item-only API returned product_identity_unverified / price_unverified and no accepted price. The known catalog 128 GB versus retailer-title 64 GB conflict remains visible. **No catalog-context payload was sent; therefore generalized catalog variant protection is not demonstrated.** This safe rejection must not be represented as proof that ordinary API always validates unseen Mongo catalog specs.
- **Records 155/234:** saved cases have affiliate links and no verified exact PID. Existing earlier primary evidence was insufficient. No PID was invented and no different product was substituted.

One independent Lenovo capture hit the harness's 1.5 MB byte limit. Only that independent comparison was repeated with a 2.5 MB bound, yielding a complete 1,634,763-byte page and the exact primary Offer. This was a harness evidence-limit completion, not a Worker/parser fix or repeated price sweep. Total: **8 fresh Worker product requests, 2 successful cache probes, 5 independent retailer HTML requests**. No screenshots or Browser Rendering were used.

## Performance and six-second compatibility

| Measurement | Observed result |
|---|---|
| Eight fresh product round trips | **1,048–2,665 ms**, median 1,993 ms; mean 1,885 ms |
| Worker-reported item handling | 916–2,547 ms, including upstream fetch/parsing; not CPU time |
| Client RTT minus item handling | 106–141 ms estimate; not a pure CPU/API-cost measurement |
| Amazon cache probe | 101 ms, cached true, itemLatencyMs 0 |
| Flipkart cache probe | 100 ms, cached true, itemLatencyMs 0 |
| Bounded fresh concurrency | First two Amazon requests overlapped; total wall time 2,667 ms; individual RTTs 2,665 / 2,248 ms |
| Unexpected HTTP errors/timeouts | 0/8 fresh product requests; 401 controls were intentional |
| Existing 6000 ms caller deadline | All 8 measured fresh responses were below it; **tail/load compatibility UNVERIFIED** |
| Cloudflare CPU/wall execution logs | Historical-Ray query succeeded but returned zero matching events; CPU measurements UNVERIFIED |
| Actual budget Top-5/ranker latency | Not tested; UNVERIFIED |

Cached responses retain original quote/store latency metadata; current cache-probe latency is the measured RTT and itemLatencyMs 0. They are not new retailer checks. Two cache hits do not establish cross-POP cache reliability.

Existing source still has a **6500 ms Worker upstream timeout versus a 6000 ms backend caller timeout**. These eight fast samples do not remove that worst-case budget mismatch. Two concurrent requests are not a five-candidate load test, and these products span different categories. No promise of millisecond live retailer extraction, full-load reliability or acceptable real Top-5 completion is made.

## Existing backend compatibility

**Basic request/response interface: PASS by source review plus real responses. General safe backend integration: not yet accepted.**

| Interface element | Finding |
|---|---|
| Request | Actual developer LivePriceService sends POST /api/check, x-api-key and items:[item], useCache:true. Fresh acceptance uses useCache:false. |
| Identifier | Executed responses preserve expected ASIN/PID. Backend still needs to validate the returned ID against the selected listing. |
| status / priceNum / price | Real priced rows expose ok, finite positive numeric price and formatted price; unaccepted rows returned null price. |
| inStock / in_stock | Both spellings were present and agreed in every executed selected-store response; unknown Acer stock remained null. |
| verificationStatus | Present on all eight executed selected-store results. |
| extractionSource | amazon_price_to_pay for priced Amazon; jsonld_product_offer for priced/OOS Flipkart; null for unsupported price/identity evidence. |
| Croma | Existing VPS direct adapter remains unchanged and was not called. |

Reuse the actual backend source snapshot and existing proven fixtures. Remaining **minimal staging-only** safeguards:
1. Add product_url URL selection/projection and do not treat unresolved affiliate links as exact-PID products.
2. Preserve false/null stock for both aliases; persist canonical price only from accepted finite positive quotes.
3. Remove stale catalog-price fallback after failed/unverified live checks in LiveBudgetRecommendationService.
4. Enforce exact response identity and an approved catalog model/variant mapping/context; ordinary API cannot verify catalog fields it was not given.
5. Measure and reconcile the caller/Worker timeout budget before production switching.

**A URL/key replacement alone is still insufficient.** No backend code, credentials, database records, category bounds or watcher were changed here.

## Fixes, deployment and next step

**Confirmed new parser defects: none. Fixes: none. Deployments: none. New secret rotations: none.** Incomplete independent evidence is not treated as a parser defect. Prior successful parser tests were reused, not repeated.

**May staging integration proceed? YES, limited to a controlled disposable canary** using independently verified HP B0GJDLKM5H and Lenovo COMHCYMG83BGNQHH mappings, with the necessary staging-only safety patches. Prepared steps are in `NEXT_REAL_STAGING_STEP.md`; they were not executed. Require a new genuine quote at canary time, actual LivePriceService persistence, real controller/watcher checks and isolated DB guards. Current prices are observations, not permanently fixed expected values.

**Full acceptance / production cutover: NO.** Two missing-PID cases, two unconfirmed independent Amazon prices, independent OOS confirmation, generic catalog-context behavior, actual Top-5 and end-to-end Mongo/min-max/watcher performance remain incomplete.

No production Mongo updates/deletes, VPS restart, developer Worker URL replacement, Croma Cloudflare request, ad/social workflow change, full audit, screenshots or Browser Rendering occurred.
