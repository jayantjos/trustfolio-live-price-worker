# TrustFolio price errors and fixes — audit v2

As of 02 November 2026, 17:07 IST. Production cutover readiness: **BLOCKED**.

| Platform | PASS | FAIL | UNVERIFIED | Total |
|---|---:|---:|---:|---:|
| Amazon | 0 | 5 | 145 | 150 |
| Flipkart | 108 | 11 | 31 | 150 |
| Total | 108 | 16 | 176 | 300 |

All 300 selected records have traceable outcomes and a real, nonempty retailer screenshot with SHA-256 in the evidence index. PASS is a point-in-time comparison of exact primary SKU/catalog identity, visible standard selling price, Worker price and consistent available purchase state. It does not certify future prices. MRP, bank offers, EMI, coupons and other-seller minimums are excluded.

## Reconciliation with the previous checkpoint

The baseline was 37 PASS / 7 FAIL / 256 UNVERIFIED. The remaining 100 retailer pages were opened, and missing screenshot files were recaptured. Of those 100, 71 now pass independent comparison, 9 have confirmed identity conflicts and 20 remain unverified. Two baseline PASS results were withdrawn: record 166 now says not deliverable; record 199's independently observed price changed from ₹22,911 to ₹36,502 while a contemporaneous comparison is not established. Fresh allowed post-cooldown checks also promoted records 151 and 152: exact PIDs ACNHJZN5MZNMBWZS and AICGF8KFFAPSZJES, standard prices ₹37,990 and ₹8,999, with matching stock. Bank prices ₹34,490 and ₹8,099 were excluded. Final totals are 108 / 16 / 176.

Correction: the earlier evidence ZIP actually contained 67 screenshots, despite the earlier coverage claim through record 157. The v2 archive was extracted and checked to contain exactly **300 JPEGs plus 300 page-state text files**. The earlier ZIP, spreadsheet checkpoint and provisional classifications are superseded.

## Confirmed catalog/identity failures

| Record | Platform | Requested Amazon / primary Flipkart ID | Confirmed conflict |
|---:|---|---|---|
| 5 | amazon | B0GJDLKM5H | Catalog HP Ryzen 7/16GB/512GB conflicts with retailer Athlon/8GB/256GB. |
| 14 | amazon | B0FYGGJZV4 | Requested ASIN B0FYGGJZV4 conflicts with canonical B0HCBBMV3V. |
| 43 | amazon | B0C3GKWJ9L | Amazon canonical ASIN conflicts with requested product; fresh Worker rejected amazon_canonical_product_mismatch. |
| 113 | amazon | B0GK7VR8ZH | Catalog Godrej 194L conflicts with retailer 185L. |
| 134 | amazon | B0GMP813M4 | Catalog vivo Passion Red/12GB/256GB conflicts with retailer Lemon Yellow/8GB/256GB and canonical identity. |
| 156 | flipkart | WGYHYMQ63YBW9W9Q | Catalog BAJAJ 15L conflicts with retailer 25L; same 7299 price does not establish product identity. A separate exact 15L candidate was independently verified: PID WGYGTR6JUWU5ZGNX, standard 6499. It is a proposal only; the original production mapping is unchanged. |
| 157 | flipkart | ACCH8AZRUQPFTXQX | Catalog TECHFIRE conflicts with primary product PTROX and SEO GEMFLY; retailer price 666 is not validated for catalog product. |
| 203 | flipkart | MOBHK67SZ8QXFEGC | Catalog Tecno Melting Silver/128GB conflicts with primary Storm Titanium/256GB. |
| 209 | flipkart | WMNH6NKH4HBGDTJV | Catalog Voltas Beko White conflicts with primary Maroon/Burgundy. |
| 216 | flipkart | WGYENHVHHH2TTTZA | Catalog Venus 25L conflicts with primary 10L. |
| 218 | flipkart | ICTHG53WZ5EBRW43 | Catalog Cadlec 2000W conflicts with primary 1998W. |
| 227 | flipkart | TABGTHGM4J4RSBQJ | Catalog OnePlus Pad Go 4G conflicts with primary Wi-Fi Only. |
| 236 | flipkart | WGYHFYXJZUXB39AK | Catalog V-Guard 25L conflicts with primary 15L. |
| 238 | flipkart | ICTHB5YSP7YF47ZU | Catalog Cadlec 2000W conflicts with primary 1999W. |
| 239 | flipkart | COMGSV3GZYUDG6NP | Catalog Acer 128GB eMMC conflicts with primary 64GB eMMC. |
| 267 | flipkart | TABHMKTT5RPG7AD9 | Catalog OnePlus Pad 4 Dune Glow conflicts with selected/primary Sage Mist finish. |

All 16 are explicitly quarantined in the proposed migration/change manifest. **This is an audit quarantine, not a modification to production catalog data or website filtering.** Correct replacement mappings have not been established for every record. No identity was rewritten merely to accept a price.

For record 156, a separate 15L candidate was verified through the retailer's own capacity selector followed by one normal reload: **WGYGTR6JUWU5ZGNX**, BAJAJ Popular Plus 15L, standard **₹6,499**, in stock. Its exact observed URL, timestamp and screenshot are in the replacement proposal and `replacements/156.jpg`. The original affiliate listing resolves to the 25L SKU. The new candidate is **proposed-only and not Worker-authenticated or written to MongoDB**; record 156 therefore remains FAIL pending mapping review.

## Deployed Worker changes

| Change | Commit | Evidence and scope |
|---|---|---|
| Bounded Amazon primary selectors | c18c7935e0cac23cddb6db18650ec2303b4cafcd | Earlier live Crompton extraction ₹2,499; same ASIN confirmed. Independent primary price remains hidden. |
| Amazon canonical ASIN protection | 4903f24d32c3c7f7309091a819193e8c586e3d24 | Record 14 fresh live rejection at 10:15:33 UTC; record 43 prior fresh rejection after deployment. |
| Shared catalog dimensions/storage/CPU guard | 3632ebbaa46d90021bd4772a5184e40b32a82a7b | Fixed audit only. Fresh record 5 at 10:08:49 UTC rejects Athlon/256GB and clears best-deal output. |
| Explicit watts, basic colors and cellular/Wi-Fi | 957ec8527f791ec873d9a83466390247496e6d92 | Fixed audit only; regressions from records 203/209/218/227/238. |
| DDR RAM and named tablet finish | 779c79d366453e6a6cc4977fb80e010f7174f83d | Fixed audit only; primary Product color validates named finishes. |
| Abort/body-read exception handling | 1bc5de07965c95ff3d406b164df40b7dbb84e9e0 | AbortError and TimeoutError regression coverage. |
| Telemetry values schema | 7867a821a9eeb305349a4076fc40f87665f41dcc | Added required timeframe/type; keys, values and query all returned HTTP 200. |

Final deployment: [41427579835](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41427579835), version `d0dace75-690e-4890-aba4-5a107d071c72`, exact code commit `779c79d366453e6a6cc4977fb80e010f7174f83d`. **83 tests passed, 0 failed**, and live health verification passed. The new shared catalog guard is used by the fixed audit endpoint; it does not imply that the production backend now sends catalog context to ordinary `/api/check`.

All seven original failures were retested after their individual cooldowns. Records 5, 14, 43, 113 and 134 rejected wrong identity/variant prices; record 156 rejected 15L versus 25L, and record 157 rejected TECHFIRE versus PTROX. HP record 159 now parses ₹31,933 but remains UNVERIFIED because its independent page says not deliverable. POCO record 183 now parses ₹12,999, but independent evidence was not refreshed during this resumed repair, so it also remains UNVERIFIED.

## Amazon verification limitation

145 Amazon records remain UNVERIFIED. Their independent browser evidence does not expose a comparable primary selling price. Crompton B074J9SPYX shows a primary add-to-cart message and other-seller minimum ₹2,499; that minimum cannot prove the same seller's buy-box price. One normal add-to-cart attempt to establish the same seller's price returned Amazon's unsupported-session/client page. Cart addition was not confirmed. No purchase, checkout, login, CAPTCHA bypass or delivery-location fabrication occurred. The authentic blocker screenshot is `diagnostics/amazon-cart-client-block.jpg`.

Later, automatic approval review blocked new retailer-page navigation because of the Work browser usage limit. This is separate from Cloudflare Browser Run quota. No alternate browser surface or indirect request was used to bypass that blocked navigation. Already-captured bytes were saved without further browser network requests; existing independent Worker checks and file creation continued.

## Flipkart unresolved cases

31 Flipkart records remain UNVERIFIED. The JSON/CSV lists each specific blocker: E002, missing primary Product JSON-LD, Notify Me/OutOfStock, delivery limitation, an older resolver/title error awaiting cooldown retest, price movement, or error 200.

Records 199 and 220 have noncontemporaneous Worker-versus-browser differences: ₹22,911 versus ₹36,502, and ₹6,930 versus ₹6,940 respectively. These require a fresh allowed retest; they are not established parser bugs. Records 166, 240, 249 and 251 have a delivery limitation despite a displayed price. Correctly withheld out-of-stock prices are not parser failures and are not deletion instructions.

## Error 200: actual evidence

Cloudflare Ray `a541c6b14d1c7533`, 2 November 2026 08:30:22 UTC (14:00:22 IST), recorded an exception and **“The operation was aborted due to timeout”**. The corrected telemetry query found it in the original time window. The exact stack location was not returned. An uncaught body-read timeout is consistent with the old code and timing, but that call-site attribution remains an inference.

The deployed boundary converts aborted/timed-out body reads to structured unverified responses; both error types have regression coverage. A captured screenshot confirms the FABER 20L/PID MRCGYCKD8RYGBKYM listing and ₹6,470, with delivery limitation. The allowed fresh retest at 2026-11-02T11:30:34.989Z returned exact PID MRCGYCKD8RYGBKYM, price ₹6,470 and in-stock true, with a normal structured response. No 1101 occurred in this request. Together with the original telemetry and AbortError/TimeoutError regression coverage, this verifies the observed repaired path. It does not guarantee that a retailer can never time out again. The product audit remains UNVERIFIED because the independent page has a delivery limitation. The request was made after the original 3-hour cooldown. No alternate endpoint or quota reset was used to bypass it.

## Backend source defects and proposed repairs

Read-only source/runtime inspection confirmed the old Worker host `spring-shape-2759.1shailendrasoni1.workers.dev` and an empty PRICE_WORKER_KEY. Production files were not changed.

The supplied proposed patch and isolated canaries address:

- Top-5 catalog-price fallback after a failed live refresh: candidates now require live status ok, positive price within budget and no explicit false stock; ranker order and subsequent candidate waves are preserved.
- `inStock` versus `in_stock`: preserve false/null; do not label unknown stock true or persist an inconsistent successful price.
- The `product_url` alias: include it in read projection and canonical URL selection. Unresolved affiliate URLs remain unsupported until verified canonical PID mappings are reviewed.

The baseline defects were reproduced from retrieved production source in an isolated VM. Proposed tests pass with mocked network/Mongo dependencies. No production network or DB mutation occurs in these tests. The patch is **not deployed** and the real backend integration is not passed off as a mock success. The existing category min/max refresh path was not proved by a write canary.

## Actual canaries and controls

- MongoDB actual read-only connectivity succeeded. Production write/delete count from this work: **0**. No production write canary was attempted.
- Existing VPS Croma direct service found exact SKU 317463 at **₹33,900**, with stock unknown. Croma implementation was unchanged.
- Internal authenticated Worker sample returned Amazon ₹24,000 and Flipkart ₹54,999; another Flipkart item was out of stock. This exercises the Worker's internal authenticated handler, **not the backend's missing credential**.
- Internal budget probe returned two Flipkart records at ₹19,999; two Amazon buy-box prices were not exposed. This is a partial four-candidate check, not a five-product website ranking acceptance test.
- The real read-only catalog ranker returned zero products for the ₹18,000–₹20,000 window. A five-product real live ranking was therefore not validated.
- Backend cutover, restart, Mongo changes, Croma code changes and ad/social publishing changes: **none**. New audit workflows are read-only.
- Browser Run calls in this resumed work: **0**. Existing cooldowns and quotas were not reset. Actual remaining Cloudflare account quota is unknown.
- Existing external credential availability was checked without fetching products or changing secrets: neither connected repository key name had a value. No secret rotation was attempted. The production backend's key remains empty.
- Category-range source inspection succeeded after correcting a diagnostic regex: the controller has category-metadata fast paths, and the watcher calls per-category/all-category range refresh methods. This is static source evidence only; actual per-write propagation remains unverified.

## Change proposals and deliverables

There are **74 proposed-only price updates** from final PASS records. The previous 22-price proposal list is superseded; records 166 and 199 are excluded. No proposal is approved or applied automatically.

The XLSX contains Dashboard, platform records, PASS/FAIL/UNVERIFIED views, price and identity differences, fixes/commits, and deployment/canaries. Formula totals reconcile to the CSV/JSON; the formula scan found no errors, and all ten sheet views were rendered and visually reviewed. The evidence index maps all 300 records to real JPEG paths and hashes. Review [versioned audit results](https://github.com/jayantjos/trustfolio-live-price-worker/tree/main/qa/audit-20261102/review-v2) and the separate production-readiness report before any cutover decision.
