# Future backend connection plan — 2 November 2026

**Do not switch production now. A URL/credential replacement alone is not sufficient for safe behavior.** Existing production configuration remains unchanged; new Worker code is isolated at `https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev`.

## Actual current integration

Read-only current VPS source/config: [41470361130](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41470361130). Existing `PRICE_WORKER_URL` host is `spring-shape-2759.1shailendrasoni1.workers.dev`; `PRICE_WORKER_KEY` is absent/empty. No secret values were printed or rotated. New Worker health confirms its own `TF_PRICE_WORKER_KEY` is configured; this does not prove matching backend credentials.

| Area | Actual source / new Worker contract | Minimum future work |
|---|---|---|
| Authentication | POST `/api/check`, JSON Content-Type, `x-api-key` must equal Worker secret. Missing/wrong key returns 401; missing Worker key 503. | Securely provision the approved same credential in staging, verify real authorized/unauthorized behavior, then approved production configuration later. No key may appear in reports/logs. |
| Payload | Backend sends `{items:[item],useCache:true}`, one request per listing; up to 30 listings processed. Worker accepts 1–5 strings per request. | Existing one-item shape is compatible. For fresh canaries useCache:false. No automatic browserProbe. |
| Amazon identity | Backend sends bare B0 ASIN; Worker returns truthy `r.asin` and `r.amazon`. | Supported by focused tests; exact catalog context is currently absent from ordinary requests. Catalog-vs-retailer variant validation requires proposed per-item catalog context or prevalidated mapping, not merely a URL switch. |
| Flipkart identity | Backend sends canonical PDP URL and PID; Worker returns `r.flipkart` with falsey r.asin. | Preserve exact PID. Add `product_url` selection/projection alias. Affiliate links without verified PID remain unsupported by ordinary handler; use reviewed canonical mapping proposals, no automatic DB rewrite. |
| Croma | Backend selects `canFetchCroma()` and fetchCromaDirect() locally, not Worker. | Keep VPS direct path. Normal Worker Croma remains disabled because all six Cloudflare API requests were 403. |
| Response fields | success/results array; r.error guard; selected-store status, priceNum, price, inStock plus in_stock aliases, source/extractionSource, httpStatus. | Legacy decoder is compatible for Amazon/Flipkart; rich verificationStatus is additive. Existing tests pass. Preserve unknown stock as null. |
| Timeouts | Backend timeout 6000 ms; Worker upstream request timeout 6500 ms plus parsing/transport; browser diagnostics much longer and explicit only. | Define/test a staging request budget so Worker finishes before caller timeout. Either bound upstream below caller budget or minimally configure caller budget; do not blindly enable Browser Run. |
| Cache | Worker success TTL45 s; backend Mongo live freshness60 s. | Freshness/canary test must separate cached/fresh responses; do not claim a cached quote is a new retailer check. |

## Minimum backend safety changes — proposed only

1. Apply and review the already supplied `TrustFolio_Backend_Proposed_Fixes.patch` in staging only: reject failed/error/OOS/explicit-false-stock live results in LiveBudgetRecommendationService; do not use catalog price as a fresh live fallback; preserve ranker order, ≤budget cap and next eligible candidate wave.
2. Preserve both `in_stock` and `inStock`, including false/null. Never derive true from status ok alone. The new Worker supplies both aliases; backend still needs defensive handling for existing/other providers and inconsistent responses. Only successful finite positive accepted prices may update canonical catalog fields.
3. Include `product_url` in projection and workerItem URL selection. That alias does not resolve an affiliate URL to an exact PID. Review 16 catalog identity proposals and isolate unmapped records from acceptance before any catalog mutation.
4. Review adding explicit catalog title/spec context if the ordinary price request must reject catalog variant errors as the fixed audit endpoint does. URL/ASIN identifies the retailer listing, not correctness of Mongo's title/specs. This has not been implemented in production.
5. Resolve the caller/upstream timeout budget and securely match credentials. No change above was applied to the server.

`backend-proposed-results.json` revalidates the previous proposed patch against unchanged freshly retrieved LivePrice/LiveBudget source using isolated mocked dependencies. It reproduces stale fallback, false-stock and missing URL-alias defects, then verifies rejection, unknown stock preservation, next candidate waves and ranker order. These are **not real network/Mongo integration tests**. `backend-contract-results.json` separately tests the new seven-state adapter against the **actual current ProductAvailabilityPolicy and LivePriceService source** in a VM with network/DB disabled.

## Current persistence/deletion and min/max behavior

Current getLivePrices is database-mutating: it stores `live`, and for `live.status==='ok'` plus finite positive price writes `price`, `price_inr`, `currentPriceValue`. Therefore this task did **not** call it or `/api/live-prices` against production. On errors toLive retains the last display price, which is permissible for display but must not qualify as a freshly verified Top-5 candidate.

Source-confirmed policy: explicit permanent `out_of_stock`/discontinued is immediately eligible for archive-then-delete; ambiguous unavailable requires two checks; transient transport/parser failures do not count. At most five removals are selected per request. This is more specific than a blanket “everything requires two checks” assumption. The current code was not changed and **no deletion was performed**. In isolated current-policy tests, rich not_deliverable/temporary_error/price_unverified/identity_mismatch map to error and never qualify for removal; OOS/discontinued do qualify. Unknown Croma stock and missing search SKU remain non-removal signals.

After actual live-price writes, LivePriceService calls ProductController.invalidatePriceCaches(). Earlier read-only controller/watcher inspection established cached category-bound fast paths and a price watcher calling updateAllCategoryPriceRanges/updateCategoryPriceRange. That static evidence does not prove immediate per-write range propagation. No production write/restart/forced refresh was done; existing watcher is preserved. No old scraper price cron was enabled.

## Exact staging acceptance checklist (not performed here)

- Use an isolated staging backend/database with deletion/archive paths directed only to disposable fixtures; production URI and endpoints must not be used. Obtain a reproducible baseline and backup/restore verification.
- Configure the new URL plus matching credential securely; verify authorized price checks succeed and missing/wrong auth returns 401 with no retailer fetch. Test ordinary Amazon ASIN and exact canonical Flipkart PID payloads, unknown/invalid input, and both stock field names.
- Use representative same-SKU Amazon/Flipkart/Croma products; Croma remains VPS direct. Independently verify comparable primary selling price and real availability. Hidden Amazon/cart-gated price remains UNVERIFIED; no other-seller minimum substitution.
- Test new Worker response contracts for exact identity mismatch, unknown stock, unavailable/discontinued, postcode-limited delivery, price_unverified, 429/502, CAPTCHA, timeout, invalid JSON and body read failure. Ensure temporary/unknown results cannot persist a fresh canonical price or qualify for deletion.
- Real staging Top-5 acceptance: ≥5 candidates across the three platform paths, current selling price ≤budget, correct website rank order, over-budget/OOS/error skip, fetch next eligible candidate, no stale-catalog fallback, no duplicate variant. The previous real catalog-only ranker returned zero candidates in its narrow budget window; that is not a Top-5 pass.
- In disposable staging Mongo only, perform one accepted price update, verify canonical fields/live timestamps, immediately inspect category min/max and rendered front-end range, then verify watcher propagation without restart. Test a price that changes the minimum and one that changes the maximum; confirm invalid/error updates cannot move bounds. Restore fixtures after checks.
- Exercise explicit permanent and ambiguous deletion-policy cases only in staging; verify archive precedes deletion, five-item bound, transient errors never delete, and archive restore works.
- Record actual latency/cache behavior and no unexpected Browser Run. Confirm Croma and ad/social pipelines remain unchanged. Capture exact deployed Worker version and test results.
- Only after these gates pass, request explicit user approval for the concrete production configuration/credential changes, minimal reviewed backend patch and rollback plan. No approval is requested now because readiness gates are not satisfied.

## Remaining blockers

Amazon primary-price access/independent verification; unresolved Flipkart primary JSON-LD/delivery evidence; 16 catalog identity reviews; Croma Cloudflare 403 and three VPS exact-search misses; backend shared credential; minimal backend safety/URL/timeout/context changes; real staging Top-5, write/archive/restore and category min/max propagation. Final isolated Worker code [5b7b50929fd4ba28408ade2c718988d85b433adc](https://github.com/jayantjos/trustfolio-live-price-worker/commit/5b7b50929fd4ba28408ade2c718988d85b433adc), version `5e4fc4a1-a929-49cf-b5eb-c3465a1da441`, [live verified](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41472399825), does not remove these end-to-end blockers.

Evidence files and reproducible isolated canary scripts: [qa/pending-worker-20261102](https://github.com/jayantjos/trustfolio-live-price-worker/tree/main/qa/pending-worker-20261102).
