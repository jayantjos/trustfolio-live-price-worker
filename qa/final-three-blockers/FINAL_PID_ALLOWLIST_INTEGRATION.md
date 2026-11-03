# Final PID allowlist integration

**PASS — exact final candidate diff, actual canonical allowlist branch, genuine Worker quotes and real isolated MongoDB.**

Environment: GitHub-runner MongoDB7 replica set, actual current developer source, actual LivePriceService/ProductController/ranker/policy/category service. No production credentials were present in the write runner. No retailer responses were mocked.
[Run 41579784025](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41579784025); raw final-allowlist-results.json.

## Exact code and branch

Patch SHA256: **a58a6f381887f2380f824df6b59406b7b6f14c7d51549d8646115b854676441e**.
All six base/candidate source hashes matched patch-source-hashes.json from qa/production-readiness-final/. The committed diff was applied with git apply, not rebuilt approximately. No backend code change was necessary.

The unchanged Godrej record69f419329a622ea2d7ccb736 entered with platform_product_id **itm85c805abf4849** and canonical URLs **without pid=**. Actual final workerItem resolved **WMNHBK4HNYBSDJ9U** from its approved read-only table and validated brand/capacity. No SKU was injected into a fixture, and the catalog page identifier remained unchanged after persistence.

An initial zero-retailer-request attempt stopped on a fixture precondition: current Haier already contained a SKU. That precondition was corrected by choosing the current unchanged Godrej itm record; no production catalog edit or price test was repeated to fix it. initial-fixture-precondition-result.json preserves the failure.

## Genuine connected requests

|Purpose|Exact identifier|HTTP / observed price|RTT|Ray|
|---|---|---|---|---|
|Approved real canonical mapping|WMNHBK4HNYBSDJ9U|200 /34490 accepted|1256ms|a548bd70ef7278e9-LAX|
|Deliberately wrong-model staging context, same real listing|WMNHBK4HNYBSDJ9U|200 /34490 returned by Worker; backend rejected context|1083ms|a548bd70ff7c4800-LAX|
|Approved Amazon control|B0D41L64NR|200 /33490 accepted|2495ms|a548bd70ddce2ea5-LAX|

All used useCache:false/browserProbe:false and the existing securely passed matching key. These application responses prove handler execution/authentication; earlier missing/wrong-key controls were not repeated. Fresh accepted quotes were not hardcoded to historical prices.

Connected actual service → Worker → Mongo execution: **2584ms**, three concurrent genuine requests. Subsequent actual controller selection used the newly persisted live cache and took **28ms**; it is not advertised as a fresh two-product retailer extraction or a native Top-5 timing.

## Persistence and negative cases

Godrej persisted price='34490', price_inr/currentPriceValue/live.price_inr34490, verification_status ok, jsonld_product_offer source, fresh checked_at/priced_at and exact retailer PID/URL. Bosch persisted corresponding33490 fields, amazon_price_to_pay_parts source and exact ASIN. Readback assertions PASS.

Unknown canonical page, conflicting explicit PID, wrong brand and wrong capacity fixtures were rejected before accepted price persistence; the wrong model fixture went through a genuine quote and was rejected as catalog_variant_mismatch. These are deliberately invalid **staging catalog fixtures**, not claims that a real retailer sold an incorrect product. No fabricated Worker quote was used.

Records155/234 were copied to disposable Mongo only, stayed unsupported and retained their canonical fixture prices. No attempt was made to invent their PIDs or redo failed listing searches. All nine staging fixtures survived; archive count0. Production records were never written/deleted.

Actual controller returned only the two genuinely eligible approved products, ranks Godrej then Bosch, cap35000, exact retailer links and zero-to-budget label. It excluded every negative fixture. It did not fabricate five candidates; previous full three-retailer five-product PASS is reused separately.

Eleven connected assertions PASS. Database drop confirmed. Temporary encrypted source/key transport was removed after result preservation; no permanent Worker deployment or production cutover.

