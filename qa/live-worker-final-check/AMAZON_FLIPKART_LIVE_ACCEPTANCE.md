# Amazon & Flipkart live Worker acceptance — 2 November 2026

**Overall: BLOCKED. No new product price or availability acceptance is claimed.**
The existing permanent Worker responds correctly to health and unauthorized requests. The job received neither expected caller credential, so valid authentication and the requested ten authenticated retailer tests could not proceed. This is a credential-access blocker, not a demonstrated parser defect.

Evidence: [run 41489945467](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41489945467), job 125430028160, source `334830fe1057ce1fe2c8e9242ce5bad04d1ac047`. The workflow's success means evidence was captured; it does not mean live-price acceptance passed. Raw safe evidence: `permanent-worker-connectivity.json`. Selected cases: `selected-product-cases.json`.

## 1. Existing active Worker

| Check | Result | Evidence |
|---|---|---|
| Active deployment lookup | PASS, metadata only | Deployment b5647cfe-fed7-4165-9941-0d4b7d91d473; active version **d993efa1-adcd-46b0-bb56-452781c8f12a**, 100%; created 2026-11-02 16:43:47.935062 UTC |
| workers.dev exposure | PASS, metadata only | enabled true, previews_enabled true |
| Compatibility | PASS, source/config observation | 2026-10-29; flags []; standard usage model |
| Health | PASS | HTTP 200; worker trustfolio-live-price-worker; application version **1.2.2**; ready true; 133 ms |
| Secret binding exists on Worker | PASS, metadata only | TF_PRICE_WORKER_KEY secret_text binding; value was not read |
| Valid authenticated handler connectivity | BLOCKED | No existing caller key was supplied by either expected GitHub Actions secret binding |

Permanent endpoint: `https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev`.

Observed 2026-11-02 17:18:48–17:18:49 UTC. The health body contains existing feature markers including seven-states-v1, balanced-elements-v1, json-owner-v1 and shared-variants-v2. The UUID above is from the deployment API; the health body returns application version 1.2.2, not that UUID. A deployment-API success alone is not counted as handler/price acceptance.

## 2. Authentication and 1042

All authentication control requests used `items:["invalid-staging-product"]`, `useCache:false`, `browserProbe:false`; no retailer fetch was initiated.

| Request | Result | HTTP / body | Latency | Ray ID |
|---|---|---|---|---|
| GET /health | PASS | 200 / expected Worker JSON | 133 ms | a544ccf7a898a2e0-LAX |
| POST /api/check, no key | PASS | 401 / unauthorized | 119 ms | a544ccf84cdedbc6-LAX |
| POST /api/check, deliberately wrong key | PASS | 401 / unauthorized | 176 ms | a544ccf95d0e2e7e-DFW |
| POST /api/check, valid existing key | BLOCKED, not attempted | Existing credential unavailable | — | — |

The workflow checked only the established `secrets.TF_PRICE_WORKER_KEY` and `secrets.PRICE_WORKER_KEY` bindings; both were empty/unavailable to this job. It did not guess credentials, read unrelated secrets, rotate the Worker's existing key, or substitute a public diagnostic endpoint for authenticated acceptance.

**1042: not observed in these three permanent-endpoint requests.** Thus the permanent endpoint was reachable during this bounded sample, unlike the earlier disposable-Worker samples. This does **not** prove that 1042 occurs only on temporary Workers, that authorized requests are reliable, or that the historical root cause has been resolved. The historical 39 failures and unresolved Support case remain separate evidence. No failed experiment was repeated and no new disposable Worker was created.

**Authentication overall: BLOCKED**, with missing/wrong-key controls PASS.

## 3. Five Amazon cases

Cases reuse existing audit identifiers and prior evidence. Because valid authentication was blocked, **none received a fresh Worker product request**. No stored, historical, cart-gated, MRP or other-seller price is represented as a verified current selling price.

| Audit record | Product | Exact ASIN | Current selling price / stock | Result |
|---|---|---|---|---|
| 1 | Crompton Super Briz Deco 1200 mm ceiling fan, Smoked Brown | B074J9SPYX | Unverified / unknown | BLOCKED |
| 2 | Samsung Bespoke AI WindFree 1.5 Ton AC, AR60H19D1AWNNA | B0GD16BJ1Z | Unverified / unknown | BLOCKED |
| 3 | HAVAI Thunder-75 tower cooler, Black & Grey | B0GCKJ24Y3 | Unverified / unknown | BLOCKED |
| 4 | LUX AA0031 retractable ceiling fan, Matt White | B0BH9647DC | Unverified / unknown | BLOCKED |
| 5 | HP All-in-One Ryzen 7, 16 GB / 512 GB, 24-cr0023in | B0GJDLKM5H | Unverified / unknown | BLOCKED |

For each case: live ASIN/retailer identity, primary selling price, MRP exclusion, other-seller exclusion, stock, error classification and product-response latency remain **UNVERIFIED** in this run. Audit record 1 previously yielded Worker ₹2,499; a different historical staged ASIN B0DVH1HDVQ yielded ₹26,030. Neither historical value is promoted to a new accepted quote.

Fresh independent retailer comparison was not initiated without an authenticated Worker quote to compare. No hidden price was guessed and no screenshot/Browser Rendering was used.

## 4. Five Flipkart cases

| Audit record | Intended coverage / product | Existing exact PID evidence | Current price / stock | Result |
|---|---|---|---|---|
| 199 | Available price — Lenovo Chromebook 11IJL9, 4 GB / 64 GB | COMHCYMG83BGNQHH | Unverified / unknown | BLOCKED |
| 212 | Out of Stock — Crompton 100 L desert cooler | AICGETHFNCZCX7PA | Unverified / unknown | BLOCKED |
| 155 | Missing primary price — GAMESOUL JS39P drone | UNVERIFIED; saved affiliate/path evidence has no verified PID | Unverified / unknown | BLOCKED |
| 239 | Wrong catalog variant — Acer Chromebook; catalog 128 GB versus retailer 64 GB | COMGSV3GZYUDG6NP | Unverified / unknown | BLOCKED |
| 234 | Previously problematic listing — DZAB gaming desktop | UNVERIFIED; no exact PID in saved usable primary evidence | Unverified / unknown | BLOCKED |

The selected-product JSON retains saved URLs. Records 155/234 additionally require exact-PID resolution from genuine primary evidence; an affiliate URL or product-path fragment must not be invented into a PID.

Historical evidence reused, without relabelling it as a fresh acceptance:
- Record 199: earlier Worker ₹36,502 at 15:32:00 UTC; older independent evidence was from a different time.
- Record 212: earlier genuine Worker response explicitly out_of_stock, false stock, null price.
- Records 155/234: earlier price_unverified with no accepted price.
- Record 239: earlier fixed audit guard returned identity_mismatch with storage conflict 128 GB versus 64 GB. This fixed-audit/catalog-context protection does not establish that the ordinary item-only /api/check request validates unseen catalog specs.

No current unavailable/unverified product received an accepted price in this run because **zero product requests ran**. This is not a live test PASS for rejection behavior.

## 5. Speed and user experience

| Metric | Result |
|---|---|
| Health response | PASS measurement: 133 ms, one request |
| Unauthorized handler response | PASS measurements: 119 ms missing key; 176 ms wrong key |
| Real individual retailer request latency | BLOCKED |
| Retailer API overhead, separated from upstream time | UNVERIFIED |
| Product-request timeout frequency | UNVERIFIED; no product samples |
| Cached versus fresh quote latency | BLOCKED |
| Concurrent product-request behavior | BLOCKED |
| Real budget-based Top-5 delay | UNVERIFIED |
| Compatibility with backend's 6000 ms timeout | UNVERIFIED under live load |

Cloudflare management API durations (251/234/534 ms) are metadata timings and are **not** retailer or frontend request latency. The three lightweight endpoint responses are not evidence that a price check or Top-5 finishes in the same time.

Source evidence: normal Worker upstream timeout is 6500 ms, existing backend caller timeout is 6000 ms, and Worker success cache TTL is 45 seconds. Therefore URL replacement alone does not establish a safe timeout budget. Normal five-item Worker batches iterate items sequentially, while the current backend normally sends individual one-item requests in parallel. Neither behavior has new load-test evidence here. No millisecond retailer response promise or Top-5 performance approval is made.

## 6. Future backend contract

**Source-level compatibility: PASS for the legacy basic shape; real connected acceptance: BLOCKED.** Current repository source and the already captured actual developer backend source were inspected; existing successful parser/compatibility tests were reused, not rerun.

| Field / selection | Existing source behavior | New live verification |
|---|---|---|
| Identifier | Top-level asin/pid; backend selects amazon when r.asin is truthy, otherwise flipkart | BLOCKED; exact returned identifier still needs comparison with requested product |
| status | Selected store keeps ok/error/out_of_stock legacy statuses | BLOCKED |
| priceNum / price | Accepted store results carry numeric and formatted price; rich adapter nulls unaccepted prices | BLOCKED |
| inStock / in_stock | Rich results expose both aliases; unknown is intended to remain null | BLOCKED |
| verificationStatus | Seven-state additive contract | BLOCKED |
| extractionSource | Normal retrieval exposes parsed source under extractionSource; missing source is not fresh-price evidence | BLOCKED |

The existing backend consumes status, priceNum and stock for persistence but does not fully retain/use rich verification and extraction provenance. Unsupported/skipped/error paths need not contain every successful-price field, so presence alone is not proof of acceptance.

**A future URL and credential replacement alone is NOT sufficient for safe acceptance.** Previously identified minimal staging changes remain necessary:
1. Include product_url in URL selection and projection; resolve real Flipkart PID instead of sending unmapped affiliate links.
2. Preserve both stock aliases, false and unknown; require a finite positive accepted price for canonical persistence.
3. Remove stale catalog-price fallback from LiveBudgetRecommendationService after failed/unverified live checks.
4. Match exact request/response product identity and handle catalog model/variant context. Ordinary item-only calls cannot validate catalog fields they were never given.
5. Set and verify a safe caller/Worker timeout budget, and securely provide the matching existing credential.
6. Validate the real quote-driven Mongo/Top-5/min-max integration separately after this Worker test passes.

The actual saved LivePriceService still has a 6000 ms timeout and original URL alias/stock conversion behavior; LiveBudgetRecommendationService still contains the unsafe catalog fallback in production source. Proposed staging patches and earlier simulation results do not count as production fixes or connected acceptance.

Croma remains on the existing VPS direct adapter. No Croma request or configuration change occurred.

## 7. Fixes, deployment and next gate

**Parser fix: none. Worker deployment: none.** No reproducible price-parser defect could be established without a genuine authenticated quote. Correct 401 controls are not a defect to bypass.

**Remaining immediate blocker:** the existing permanent Worker's matching caller key is not available through the expected GitHub Actions bindings. Make that same existing value securely available as an authorized repository/environment secret (for example TF_PRICE_WORKER_KEY) to the acceptance job. Do not paste the value into reports/chat, commit it, or rotate the permanent Worker secret as a shortcut.

After credential access is supplied, run one valid authentication-only request, then the selected genuine Amazon/Flipkart price tests and bounded cache/concurrency checks. Stop on any renewed platform failure. Existing historical results must remain distinct from fresh quotes.

**Can backend integration safely proceed now? BLOCKED / NO.** Health and missing/wrong authentication pass, but valid auth, ten live products, selling-price correctness and six-second user-experience acceptance have not passed.

Production safeguards upheld: no production Mongo writes/deletes; no developer Worker URL replacement; no server restart; no production secret rotation; no browser/screenshot generation; no Croma or ad/social changes; no full audit or parser-suite rerun.
