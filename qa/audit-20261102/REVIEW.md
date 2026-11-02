# TrustFolio price audit — 2 November 2026

The selected inventory contains 300 actual MongoDB records: 150 Amazon and 150 Flipkart. Independent retailer pages were inspected and screenshots captured for records 1–200. Browser and local execution capability became unavailable before record 201. The remaining records receive Worker-only checks and cannot pass independent price verification.

| Platform | PASS | FAIL | UNVERIFIED | Selected |
|---|---:|---:|---:|---:|
| Amazon | 0 | 5 | 145 | 150 |
| Flipkart | 37 | 2 | 111 | 150 |
| Total | 37 | 7 | 256 | 300 |

PASS requires exact catalog/retailer identity, matching visible standard selling price and Worker price, and matching stock status. Bank offers, MRP, EMI and other-seller minimums do not establish a primary selling-price match. These are point-in-time observations.

## Confirmed catalog problems

- Record 5: Catalog HP Ryzen 7/16GB/512GB conflicts with retailer Athlon/8GB/256GB.
- Record 14: Requested ASIN B0FYGGJZV4 conflicts with canonical B0HCBBMV3V.
- Record 43: Amazon canonical ASIN conflicts with requested product; fresh Worker rejected amazon_canonical_product_mismatch.
- Record 113: Catalog Godrej 194L conflicts with retailer 185L.
- Record 134: Catalog vivo Passion Red/12GB/256GB conflicts with retailer Lemon Yellow/8GB/256GB and canonical identity.
- Record 156: Catalog BAJAJ 15L conflicts with retailer 25L; same 7299 price does not establish product identity.
- Record 157: Catalog TECHFIRE conflicts with primary product PTROX and SEO GEMFLY; retailer price 666 is not validated for catalog product.

These require catalog/retailer mapping review. No automatic brand rewrite, product deletion or database update was performed. Record 156 supersedes an earlier provisional price-only PASS; it is FAIL because the capacity differs. Record 157 is also FAIL after identity review.

## Deployed changes and validation

- Crompton B074J9SPYX: replaced oversized whole-page Browser Run extraction with bounded, scoped primary-section selectors. Latest deployment probe returned ₹2,499 and exact primary ASIN; full independent audit remains UNVERIFIED because the Work browser did not expose a comparable primary seller price.
- Reject Amazon canonical ASIN conflicts.
- Resolve fixed-inventory Flipkart affiliate links through observed allowlisted hosts, including linksredirect.com.
- Require one primary Product JSON-LD, exact SKU, catalog brand and explicit category dimensions. Use standard selling price rather than bank offers.
- Support bounded long titles and primary Product identity when SEO titles abbreviate variants; blocked/error titles and conflicting capacity/storage still fail.
- Catch body-read, storage and resolver failures as structured unverified responses.
- Deployment commit: 1bc5de07965c95ff3d406b164df40b7dbb84e9e0. Version: ebe5a608-8cf9-4cdd-af1b-445c694a9c80. All 65 regression tests passed and deployed health markers were verified.
- Record 200 returned Cloudflare 1101 at 08:30:22 UTC, Ray a541c6b14d1c7533. The telemetry values request returned HTTP 400, so its exact internal cause remains unconfirmed. New exception boundaries do not prove that original cause.

## Backend and database

Read-only backend inspection found PRICE_WORKER_URL configured to spring-shape-2759.1shailendrasoni1.workers.dev. The active new-Worker authentication configuration was not established, so no auth canary or backend cutover was performed. Static inspection found one deleteMany reference in LivePriceService.js; this alone does not verify its policy or execution.

MongoDB writes performed: zero. Croma and social/ad workflows were unchanged. There are 22 proposed price changes from same-product PASS records; they are proposals only, listed in review-candidates.json. Cooldowns were preserved, with no reset or bypass.

## Evidence and unfinished work

- [Captured evidence ZIP through record 157](https://chatgpt.com/library?file_id=libfile_e1756a699b2481919e4d5a1232cd4203&account_id=personal). Its raw classifications are provisional; this report supersedes them.
- Screenshots for 158–200 were captured but could not be exported after execution capability was lost.
- No independent retailer page or screenshot exists from this session for 201–300.
- A fresh final XLSX could not be exported. Earlier checkpoint spreadsheets/reports are incomplete and must not be treated as a final 300-record workbook.
- Still required: complete independent browser verification for 201–300, expose comparable Amazon primary selling prices, retest affected records after their cooldowns, export remaining evidence/XLSX, and validate representative authenticated Amazon/Flipkart/Croma and Mongo canaries before any backend cutover.

## Completed Worker-only checks for records 201–300

All 100 requests completed with HTTP 200, one request per record and no retries. Semantic results: 81 ok price extractions, 6 out-of-stock, 10 missing/unverified primary Product JSON-LD, 2 rejected capacity conflicts, and 1 product identity rejection. None is an independent browser PASS.

Worker-only warnings requiring independent review: record 216 catalog 25L versus retailer 10L (PID WGYENHVHHH2TTTZA), and record 236 catalog 25L versus retailer 15L (PID WGYHFYXJZUXB39AK). These remain UNVERIFIED rather than being added to the 7 browser-confirmed FAIL results.

[Complete remote check run and downloadable JSON artifact](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41417687959).

[300-record consolidated JSON](consolidated-results.json) includes the real selected inventory, outcomes, Worker-only raw results, limitations and proposed-only changes. [Review proposals](review-candidates.json) are separate from production data.

Record 239 was rejected as product_identity_unverified; no price was accepted. Its retailer URL mentioned 128GB while the returned title mentioned 64GB. This requires independent browser review and remains UNVERIFIED.
