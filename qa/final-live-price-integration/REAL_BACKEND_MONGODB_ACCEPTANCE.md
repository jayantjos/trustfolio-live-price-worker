# Real backend MongoDB acceptance

**Result: PASS for two connected canaries and real category/cache/watcher execution. Full cutover remains UNVERIFIED.**

Evidence: [isolated acceptance run 41506362145](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41506362145), workflow commit `e3767a309c4c6a0c79653195217aeca350561290`; raw `real-integration-results.json`, reproducible `integration-runner.cjs`, source hashes in `source-summary.json`.

## Actual implementation and isolation

The source job read 71 actual current developer JS files from the existing VPS; it did not recreate business services. Used actual LivePriceService, LiveBudgetRecommendationService, ProductAvailabilityPolicy, ProductController, ProductRecommendationService ranker, CategoryService and category watcher. Croma adapter hash remained unchanged.

A separate write-capable runner received encrypted JS source/catalog fixtures and the quote-only Worker key. Its job had no SSH key, Cloudflare deployment token, production Mongo URI, or production environment file. Source was checked for literal MongoDB connection URIs. The fixed target and mongoose connection guard allowed only:

`mongodb://127.0.0.1:27017/trustfolio_acceptance_disposable?replicaSet=rs0`

MongoDB 7 was a real disposable replica set. The actual watcher ran in a separate process against change streams. The Mongo connector and HTTP listener were staging adapters; business controller/watcher/ranker were actual code. Source/credential transfers were CMS AES256 encrypted to a transient RSA public certificate. Plaintext credentials were transient runner files/process environment, never logs or commits.

## Staging-only compatibility edits

- Include product_url in URL selection/projection; explicitly use approved exact Flipkart PID mappings.
- POST authenticated /api/check with useCache:false and browserProbe:false for fresh acceptance.
- Require expected returned ASIN/PID, known catalog dimension compatibility and brand. This is a limited dimension/brand guard, not exhaustive proof of every arbitrary model/variant.
- Accept only ok/verificationStatus ok, finite positive price and no explicit false stock.
- Read both stock aliases; preserve unknown as null.
- Persist price, price_inr, currentPriceValue and live verification/source/identifier/timestamps together.
- Exclude failed/unverified live quotes from recommendations; remove stale catalog fallback; expose nullable live stock.
- Keep the real 6000 ms caller timeout. The separate 6500 ms upstream Worker deadline is still a worst-case mismatch requiring resolution before production.

No production backend patch or Worker deployment was applied.

## Genuine connected success

| Canary | Exact Mongo fixture | Stored → genuine quote/persisted price | Worker RTT | Result |
|---|---|---|---|---|
|HP 24-cr0023in, B0GJDLKM5H|69f89be69a622ea2d7ce0b9c|₹75,699 → ₹69,990|2382 ms|PASS real retailer + real staging DB|
|Lenovo 11IJL9, COMHCYMG83BGNQHH|69f4192b9a622ea2d7ccb68b|₹16,990 → ₹22,911|1200 ms|PASS real retailer + real staging DB|

Canaries were fetched concurrently through actual LivePriceService; connected round trip **2390 ms**. Both had status ok/verification ok and true stock. Exact fixture selection, canonical fields, live.price_inr, live.status, checked_at, priced_at, verification_status, extraction_source and retailer_product_id were read back and asserted. HP source amazon_price_to_pay; Lenovo jsonld_product_offer. No historical expected price was hardcoded into success.

HP Ray `a54568d8e9841875-STL`, 2026-11-02T19:05:16.663Z.
Lenovo Ray `a54568d8ef3ede75-STL`, 2026-11-02T19:05:15.480Z.
The fresh independent Lenovo response also matched ₹22,911; historical ₹36,502 was not reused as a current price.

## Real controller, cache and watcher

**PASS — genuine quote + real MongoDB + actual controller/watcher.** Before writes, controller bounds reflected ₹75,699 and ₹16,990. For each category, first HTTP request performed one actual product find; repeated request performed zero product finds. After live writes, each controller request performed a new product find and returned ₹69,990 / ₹22,911.

Actual watcher log: CHANGE_STREAM_ACTIVE at 19:05:14.221 UTC; CATEGORY_RANGE_FULL_REFRESH categories=3,failed=0 at 19:05:20.782 UTC. Persisted category min=max matched each canary. Frontend-facing min/max and min_price/max_price were correct; metadata-path requests took 3 ms HP and 2 ms Lenovo. Measured propagation **6644 ms from canary request start**, including network and watcher debounce. No backend restart occurred. These are single-fixture category bounds, not exhaustive mixed-category extrema coverage.

## Controlled failure/unknown-stock supplements

**PASS — real staging MongoDB and actual backend, SIMULATED retailer transport.** These are separate from genuine acceptance:
- Failed quote preserved HP ₹69,990 and category bounds.
- Actual LiveBudgetRecommendationService returned zero products rather than stale-price fallback.
- A simulated accepted ₹12,345 quote with null stock preserved null. This amount is not a real retailer price.

Two known-OOS washing-machine fixtures were archived/deleted only in the disposable DB during Top-5 testing; the HP/Lenovo canaries were not deleted. Existing deletion ordering/restoration and invalid-HTML evidence in `qa/final-staging-acceptance/missing-deletion-results.json` is reused, not reclassified as genuine retailer success.

**Cleanup: PASS** — disposable database dropped; transient key/source/private-key files and Mongo container removed by job cleanup. Transport certificate/envelope blobs were removed from the branch tip; encrypted historical ciphertext is not usable without the discarded private key. No production writes, VPS restart/config change, secret rotation, Worker URL replacement, or social workflow edits.

