# Pending Worker fixes — 2 November 2026

**Worker fixes deployed; production connection remains BLOCKED.** Original audit remains **108 PASS / 16 FAIL / 176 UNVERIFIED**. No new 300-product audit or screenshots were taken. No production Mongo writes/deletes, backend URL/credential edits, server restarts, watcher, Top-5 or ad/social code changes occurred.

Final code: [5b7b50929fd4ba28408ade2c718988d85b433adc](https://github.com/jayantjos/trustfolio-live-price-worker/commit/5b7b50929fd4ba28408ade2c718988d85b433adc); live version `5e4fc4a1-a929-49cf-b5eb-c3465a1da441`; [deployment and eight targeted checks](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41472399825). **71 focused tests passed, 0 failed** in deployment. Existing automatic parser CI also passed **102/102** tests. Normal requests do not start Browser Run.

## Issue-by-issue result

| Issue / previous status | Investigation and exact finding | Fix / test / deployment | Result |
|---|---|---|---|
| Croma probe existed; ordinary `/api/check` unsupported | Six current Mongo SKUs compared using same first-query parameters. VPS HTTP 200; Cloudflare Croma API HTTP 403 for every SKU. Three VPS prices; three exact SKUs absent from bounded search. | Fixed six-SKU diagnostic with bounded streaming, strict BUY fields, exact SKU/duplicate/conflicting-price checks; 5 focused tests. Diagnostic deployed in `2051f24b903a0d693def932d192a6f4ed0d2bbe6`, retained in final version. | **C: retain VPS primary.** Normal Croma adapter intentionally not activated; reliability condition failed. |
| Amazon 145 independently UNVERIFIED | Existing page-state records: 143 explicit cart-gated messages; record 4 unsupported-session/client page; record 74 is only an AX diff, so full primary price cannot be reconstructed from that text alone. Worker baseline errors: 57 buy-box missing, 33 identity unverified, 55 no parser error; these are different evidence layers. | No 145-page repeat. Keep original audit outcomes. | **Still not universally reliable/independently verified.** |
| Amazon suffix price window | Reproducible fixture: empty price-to-pay scope could swallow adjacent seller prices; fixed byte slices could include MRP outside the primary node. | Balanced element boundaries; empty priceToPay fails closed; ID/class priceToPay supported; primary ASIN input conflict rejected; aggregate offers excluded. Targeted fixtures pass; final deployment live. | Parser defects resolved; site access/cart gates remain. |
| Historical Amazon selector parity | Read-only scan of 197 existing scraper Python files found `.a-price .a-offscreen` and `span.a-price-whole` in `extractors/marketplace.py`, plus legacy Flipkart Buy-at rules. | Added exact priceblock currency text and whole/fraction extraction only within verified priceToPay. Original scraper not executed or edited. | Selector parity narrowed safely to primary scope; no page-wide minimum. |
| Flipkart wrong PID / unscoped fsp | Fixtures reproduced wrong primary PID falling through to unrelated ppd/fsp, and multiple seller offers selecting the first price or OOS state. | Reject single primary Product/canonical PID conflicts; fsp requires matching PID JSON owner; reject ambiguous offer arrays. Focused tests pass; final live variant checks reject 239/267. | Demonstrable parser defects resolved. Catalog mappings not rewritten. |
| Flipkart 11 FAIL | Existing catalog mappings have explicit brand/capacity/storage/color/connectivity conflicts. | Shared guards retained, focused real-variant regressions passed. Fresh 239/267 reject with `identity_mismatch`, null price. Existing 16 all-platform correction proposals retained. | Worker rejection verified where retested; catalog review remains. |
| Missing primary JSON-LD / E002 | Fresh records 155 and 234 still have no verifiable primary Product. E002 storefront response is a temporary store error. | E002 reported before primary JSON-LD processing; no guessed recommendation PID. Fixture and error-boundary tests pass. | 155/234 remain `price_unverified`; no accepted price or OOS inference. |
| Notify Me / OOS | Fresh 212 exact primary Product explicitly OutOfStock. | `out_of_stock`, false stock, null price, `jsonld_product_offer` source. | Affected live example passes error-contract check; not a buyable-product PASS. |
| Delivery limitations | JSON-LD stock alone cannot prove fulfillment to an unspecified postcode. | Seven-state contract supports `not_deliverable` when explicit verified primary evidence exists; fixture passed. Unknown location is not fabricated. | Real regional delivery behavior still unverified; earlier delivery-limited records stay UNVERIFIED. |
| Price movement 199/220 | Fresh same-PID Worker prices 36502 / 6940 now equal earlier independent screenshots (10:11:25 / 09:58:56 UTC). | Real no-cache audit checks after existing locks expired; no reset. | Earlier disagreement no longer reproduced; screenshots are hours older, so **no promotion to PASS**. |
| Timeout / HTTP / body failure | Existing error200 timeout fix retained; 429/502, E002, invalid JSON and body failure must not imply OOS. | Bounded normal HTML reads; additive rich-state adapter, dual stock aliases; focused tests and current-backend isolated policy canary pass. | Transport failures have null accepted price/stock and no confirmed unavailable signal. |
| Backend URL-only future switch | Current source/config re-read: old host retained; key absent; missing product_url alias, fallback and stock conversion risks remain. | Current source equal to earlier saved LivePrice/LiveBudget/Croma source. Proposed backend fixes revalidated in isolated VM; no production patch. | URL replacement alone is insufficient. See connection plan. |

## Final live examples (2 November, UTC)

| Record | Checked at | Source / verification | Price | Stock | Outcome |
| 1 | 2026-11-02T15:31:55.975Z | amazon_price_to_pay / ok | 2499 | true | Parser result only; original audit outcome retained |
| 155 | 2026-11-02T15:31:57.893Z | fixed_primary_product_jsonld_unverified / price_unverified | null | unknown | fixed_primary_product_jsonld_unverified |
| 199 | 2026-11-02T15:32:00.179Z | jsonld_product_offer / ok | 36502 | true | Parser result only; original audit outcome retained |
| 212 | 2026-11-02T15:32:02.058Z | jsonld_product_offer / out_of_stock | null | false | out_of_stock |
| 220 | 2026-11-02T15:32:04.210Z | jsonld_product_offer / ok | 6940 | true | Parser result only; original audit outcome retained |
| 234 | 2026-11-02T15:32:06.297Z | fixed_primary_product_jsonld_unverified / price_unverified | null | unknown | fixed_primary_product_jsonld_unverified |
| 239 | 2026-11-02T15:32:08.420Z | fixed_catalog_variant_mismatch / identity_mismatch | null | unknown | fixed_catalog_variant_mismatch |
| 267 | 2026-11-02T15:32:10.241Z | fixed_catalog_variant_mismatch / identity_mismatch | null | unknown | fixed_catalog_variant_mismatch |

## Contract and limits

`verificationStatus` is additive: `ok`, `out_of_stock`, `discontinued`, `not_deliverable`, `price_unverified`, `temporary_error`, `identity_mismatch`. It describes source verification, not independent screenshot/audit acceptance. Selected price results retain `status`, `priceNum`, formatted `price`, `inStock`, `extractionSource`/`source`, and add `in_stock`, `verificationOutcome` and evidence where available.

| Rich state | Legacy status | Accepted price | Stock |
|---|---|---|---|
| ok | ok | Positive finite selling price | true only with evidence; otherwise null |
| out_of_stock | out_of_stock | null | false |
| discontinued | out_of_stock | null | false |
| not_deliverable | error | null | null |
| price_unverified | error | null | null |
| temporary_error | error | null | null |
| identity_mismatch | error | null | null |

The rich adapter protects price callers; fixed audit resolution failures retain historical outer `status:unverified` with an additive rich status. A missing primary JSON-LD node does not become a guessed stock decision. No source interprets search absence, HTTP 429/502, CAPTCHA, timeout or invalid JSON as confirmed stock loss.

An inherited diagnostic-deployment workflow performed one Crompton Browser Run and one already-PASS record 151 fetch before the workflow was corrected to health-only plus unresolved examples. It returned primary-section ₹2499 for Crompton, without independent acceptance. No further Browser Run was made. The first Croma runner requests recorded HTTPError without bodies; a subsequent bounded diagnostic using an explicit application User-Agent reached the Worker and exposed the actual downstream Croma 403s. No retailer access restriction was bypassed. Existing automatic CI ran the repository suite; it was not manually repeated as another audit.

Intermediate deploy `e4ec198476e2aa090ea2f4aa7b5fe45b5fd4231d` uploaded successfully, but the immediate health read still showed the previous version and its workflow verification failed. Final deployment uses bounded health polling and the new feature markers were verified. Final live tests ran only after that success.

Remaining: Amazon independent primary-price access; unresolved primary Product JSON-LD; postcode-specific delivery; 16 catalog mapping reviews; Croma Cloudflare API access; backend shared credential and minimal safety patches; real staging Top-5/write/min-max tests. The prior Work browser navigation usage-limit rejection was not bypassed; no new browser navigation was attempted for this task.

Evidence files and reproducible isolated canary scripts: [qa/pending-worker-20261102](https://github.com/jayantjos/trustfolio-live-price-worker/tree/main/qa/pending-worker-20261102).
