# Three-platform tests

| Subsystem | Status | Evidence and limit |
|---|---|---|
| Amazon actual staged Worker HTTP | PASS for source extraction only | B0DVH1HDVQ,26030,true,amazon_price_to_pay; no fresh independent audit acceptance |
| Flipkart actual staged Worker HTTP | PASS for OOS contract | AICGETHFNCZCX7PA,null,false,jsonld_product_offer |
| Missing/wrong/valid auth | PARTIAL pending auth-only follow-up | Missing401, valid200; wrong key hit edge404/1042 in price run |
| VPS Croma direct | UNVERIFIED fresh; previous limited price evidence available | Earlier read-only six-SKU run41470361130 found317463=33900,300154=2799,312748=21990; stock unknown; three exact-SKU search misses. No new Croma requests here |
| Combined actual backend three-platform flow | UNVERIFIED | No full staging backend/ranker wired to disposable Mongo and live three-platform providers |
| Hidden price / wrong variant / missing price live cases | UNVERIFIED fresh | Prior targeted evidence retained; no blanket re-audit |

Real staging HTTP evidence: auth-staging-retry-results.json / https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41478638789. No new Worker Cloudflare Croma sweep; Croma remains VPS direct. No browser rendering used. Both ephemeral Worker deletion steps succeeded. The first run's unvalidated Flipkart URL never reached retailer extraction (503); the corrected run used the previously observed canonical URL.


Production unchanged: no production Mongo writes/deletions, credentials, URLs, backend deploy, PM2 restart, watcher or social/ads changes. Original audit remains 108 PASS / 16 FAIL / 176 UNVERIFIED. Production Worker remains code 5b7b50929fd4ba28408ade2c718988d85b433adc, version 5e4fc4a1-a929-49cf-b5eb-c3465a1da441. New staging Workers had no Browser/cron/DO bindings and were deleted after each run. No cooldowns were reset.

## Authentication-only follow-up

Run https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41478863603 used only invalid-staging-product (zero retailer fetches). Missing key401 and wrong key401 passed. Valid-key request encountered Cloudflare404/error1042; workflow failed. Valid-key retailer requests had200 in prior run41478638789, but **no single clean complete auth acceptance run passed**. Mark consolidated auth acceptance **FAIL/intermittent edge1042**, not PASS. Ephemeral Workers were removed; no production secret or URL changed. The workflow raw type label is generic; auth-only results are network authentication tests, not retailer calls. Root cause of edge1042 was not proven; no bypass attempted.
