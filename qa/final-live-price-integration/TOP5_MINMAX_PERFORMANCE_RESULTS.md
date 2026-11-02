# Top-5, category bounds and performance

**Result: PASS for the bounded real Amazon/Flipkart Top-5 integration and real canary category/cache/watcher refresh. Cross-platform Croma Top-5, independent accuracy of all five offers and production tail latency remain UNVERIFIED.**

Evidence: [canary/watcher run 41506362145](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41506362145), [Top-5-only continuation 41507384017](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41507384017), actual source hashes and raw JSON in this folder.

## Actual ranker/controller acceptance

Real current developer ProductRecommendationService and ProductController ran with staged safety-patched LiveBudgetRecommendationService/LivePriceService and real disposable MongoDB. Ten current catalog washing-machine candidates (5 Amazon/5 Flipkart), catalog window ₹31,500–35,000, budget cap ₹35,000. This is a bounded fixture population, not whole-catalog acceptance.

Initial combined run: **UNVERIFIED**, four results in4598ms. Its cap of ten external quotes included two successful canaries, leaving two candidate requests unexecuted. It did not establish a catalog shortage. The continuation repeated **only the incomplete Top-5 gate**, allotted ten genuine candidate quotes, reused confirmed mappings, and did not repeat canary, watcher, parser, cache-probe or failure-simulation gates. No fake quote-budget response occurred in this completion.

|Actual rank|Platform|Exact identifier|Verified Worker selling-price quote|Result|
|---|---|---|---|---|
|1|flipkart|WMNHBK4HNYBSDJ9U|₹34,490|PASS connected selection|
|2|amazon|B0D41L64NR|₹33,490|PASS connected selection|
|3|amazon|B0GX9P1BWT|₹32,990|PASS connected selection|
|4|flipkart|WMNG4WGVXYSRYHJZ|₹33,990|PASS connected selection|
|5|flipkart|WMNHHUCY5FWTHBAN|₹30,130|PASS connected selection|

Actual ranker first wave: Godrej FK, Bosch Amazon, Whirlpool Amazon, Godrej Amazon, IFB FK. Second wave: IFB Amazon, Samsung Amazon, Motorola FK, Haier FK, Samsung FK. Final order was asserted equal to actual candidate wave order filtered by qualified products. Next eligible Haier filled the fifth slot; Samsung FK ₹32,236 remained eligible but later-ranked. Final list had five unique MongoDB IDs and matched known exact request IDs plus the staging dimension/brand guard.

Unavailable Godrej/IFB Amazon excluded; missing-price Whirlpool excluded without fallback to stored₹33,090; IFB FK₹40,490 excluded for cap violation. No sorting by cheapest price was substituted for the developer ranker. Haier's fresh₹30,130 is below the original catalog candidate window but within the requested zero-to-budget eligibility rule; the controller response still exposes the original catalog priceWindow. That UI/window distinction needs product confirmation before cutover.

**PASS real MongoDB persistence:** selected fresh quotes persisted in actual product records and live metadata; see persistedProducts. Two explicit-OOS staging fixtures were archived/deleted by actual policy: `6a30d4bb3570d521d1841a98` and `6a11eb601550236f65449f35`. Both archive snapshots are saved in raw JSON; all staging data was subsequently dropped. No production deletion.

This test used two retailers. Croma adapter preserved with inherited genuine VPS evidence; fresh three-retailer Top-5 execution is **UNVERIFIED**. Catalog context checks cover exact requested identifier, known dimensions and brand; exhaustive arbitrary variant equivalence is **UNVERIFIED**.

## Real category controller/cache/watcher

**PASS — genuine HP/Lenovo quotes, real staging replica set and actual controller/watcher, no stub counters.**
- HP: min=max₹75,699 → ₹69,990; Lenovo:₹16,990 → ₹22,911.
- Actual Mongo command observations: first bounds lookup one product find, cached repeat zero, post-write lookup one. HTTP bounds changed with fresh persistence.
- Change stream active19:05:14.221UTC; actual CATEGORY_RANGE_FULL_REFRESH categories=3,failed=0 at19:05:20.782UTC.
- Frontend min/max and min_price/max_price matched persisted category metadata. Observed cached metadata HTTP paths3ms/2ms.
- Propagation6644ms from canary request start (includes live fetch and watcher debounce); no backend restart.
- Controlled failed check preserving category bounds: **PASS with simulated transport + real backend/DB**, not genuine retailer-failure acceptance. Mixed-population extrema correctness beyond these single-canary categories remains UNVERIFIED.

## Measured performance

|Measurement|Observed|Assessment|
|---|---|---|
|Two genuine canaries together|2390ms|PASS measured sample|
|First combined Top-5|4598ms/four results|UNVERIFIED incomplete cap|
|Completed actual Top-5|4485ms/five results|PASS measured sample|
|Ten continuation individual Worker RTTs|1167–2376ms|PASS below6000ms|
|Continuation actual ranker database queries|7ms and5ms|PASS observed|
|Fresh Worker HTTP errors/timeouts across two connected runs|0/20|PASS observed; not load reliability proof|
|Actual watcher propagation|6644ms from request start|PASS measured; not immediate|
|Prior cache probes|~100ms cached responses|Reused; no fresh retailer extraction claim|
|Worker CPU time / broad-load p95 / repeated-POP reliability|Not measured|UNVERIFIED|
|Worst-case deadline nesting|Worker upstream6500ms vs backend6000ms|UNVERIFIED safety gate; mismatch remains|

No claim of millisecond fresh retailer requests or universal Top-5 SLA. The measured4.485-second answer can be useful, but one bounded run is insufficient for a production latency guarantee.

