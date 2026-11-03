# Frontend budget window results

**PASS — affected actual ranker/controller contract, safe price persistence, same-response category bounds and cache freshness in real disposable MongoDB. Full browser/native latency acceptance remains UNVERIFIED.**

Two genuine code defects were reproduced and corrected in staging:
1. Catalog-price candidate filtering could omit a product whose verified price dropped below budget. A live-candidate option now uses the existing ranker across a bounded category candidate scan, and applies the user's cap only after live verification. Ranking/quota/rating/spec functions are preserved. Ordinary ranker callers retain their old window.
2. Parallel/pre-write category metadata could remain stale until the watcher. Initial run returned max34490 while genuine accepted IFB price40490 was already in MongoDB; actual later bounds correctly40490. Merely rereading metadata after recommendations was insufficient. Final LivePriceService now awaits existing CategoryService refresh for successfully changed/deleted categories and then invalidates caches; controller rereads post-write bounds.

## Executed final evidence

[Final three-path regression 41574910954](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41574910954): **PASS**, all six assertions. Real retailer quotes and real disposable replica set.
- User budget35000: all five returned prices≤35000, unique products and original ranker wave order; live priceWindow **{min:0,max:35000}** and message match accepted zero-to-budget eligibility.
- Actual same-response catalogPriceRange **21990–40490**, equal to subsequent frontend-facing bounds. Category range can correctly exceed the chosen budget; it describes the whole category, not accepted Top-5 eligibility.
- Haier catalog33610→genuine30130 persisted in price/string, price_inr/currentPriceValue and live metadata. At budget31500 it appeared as newly eligible, alongside Croma21990; over-budget items stayed excluded.
- Exact canonical retailer links were returned; affiliate-only links were not used as identity proof. Haier URL retains pid=WMNHHUCY5FWTHBAN.
- Unknown Croma stock remained null.

[Focused defect regression 41574433908](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41574433908): **business assertions PASS**, one genuine Haier quote through actual service/controller; two clearly SIMULATED catalog bounds fixtures in real MongoDB.
- Seeded mixed bounds33000–40000; genuine Haier30130 made the same response and immediate bounds30130–40000.
- Response1909ms; immediately following bounds4ms.
- Actual watcher later refreshed and retained the same bounds; no restart.
- This one-product regression was not mislabelled a five-retailer success.
- GitHub job conclusion was failure solely because cleanup attempted to delete an absent optional blob (404). Business JSON had PASS and DB drop true; a cleanup-only workflow subsequently confirmed transport absent and removed exact encrypted artifacts. No retailer test was repeated for that cleanup issue.

The earlier controlled failed-quote tests (actual DB/backend, SIMULATED transport) preserved accepted price and category bounds; refreshed catalog bounds are computed only for accepted successful writes/deletions. Existing availability/deletion policy and watcher source remain unchanged.

## Scope and limits

The candidate scan is bounded by the developer's existing database scan caps and at most4 candidate waves, additionally limited by a time-admission guard. It cannot certify every unseen catalog item without fetching it; no whole-catalog completeness claim or mass audit was made. Broader category ranking behavior remains outside this washing-machine acceptance.

Actual frontend-facing JSON/controller endpoints were exercised. Browser/mobile rendering and their own cached-filter/global timeout configuration were not changed or fully executed. **UNVERIFIED: native UI/proxy timeout behavior for the approximately10-second relay-including response.** No website UI redesign or production deployment occurred.

