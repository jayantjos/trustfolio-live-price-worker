# Remaining extraction acceptance — 2 November 2026

**PARTIAL PASS; remaining independent verification UNVERIFIED.** Latest GitHub source/reports read before work. Local index/price blob hashes matched current GitHub (2b2b608e0dffb8c5e9e31b311c7ce94da56d3095 / 036e722e0dcdbb827470752110c7ae7784b471c6). Fourteen targeted parser fixtures passed. No new reproducible parser defect was established; production parser code was not changed or redeployed.

Existing evidence still identifies 143 cart-gated Amazon pages, one unsupported-client page and one incomplete AX-diff record among 145 UNVERIFIED. Those remain unverified; no screenshots or cart bypass. Existing historical selector inspection is in qa/pending-worker-20261102/scraper-selectors.json. Most saved evidence is screenshots/AX, not full HTML; synthetic parser fixtures must not be described as captured retailer HTML.

Actual authenticated isolated-Worker HTTP: B0DVH1HDVQ returned 26030, inStock/in_stock true, amazon_price_to_pay, status/verificationStatus ok; upstream latency1931ms, HTTP total2172ms. This is a real source extraction result, not a new independent audit PASS. Flipkart exact PID AICGETHFNCZCX7PA returned out_of_stock, price null, stock false, jsonld_product_offer; upstream1123ms,total1345ms. Missing primary JSON-LD, delivery constraints and wrong catalog mappings remain as documented. No unverified records promoted.

Evidence: auth-staging-retry-results.json; parser-fixtures.txt; live run https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41478638789. Source commit 2ba346681aeb66b5182f611037eb133562c13696; staging pre-secret deployment version d79ff47b-bce0-40ba-83a2-fdf88445e022. Secret upload creates an additional version; its ID was not captured, so exact post-secret version attribution is incomplete.


Production unchanged: no production Mongo writes/deletions, credentials, URLs, backend deploy, PM2 restart, watcher or social/ads changes. Original audit remains 108 PASS / 16 FAIL / 176 UNVERIFIED. Production Worker remains code 5b7b50929fd4ba28408ade2c718988d85b433adc, version 5e4fc4a1-a929-49cf-b5eb-c3465a1da441. New staging Workers had no Browser/cron/DO bindings and were deleted after each run. No cooldowns were reset.

## Authentication-only follow-up

Run https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41478863603 used only invalid-staging-product (zero retailer fetches). Missing key401 and wrong key401 passed. Valid-key request encountered Cloudflare404/error1042; workflow failed. Valid-key retailer requests had200 in prior run41478638789, but **no single clean complete auth acceptance run passed**. Mark consolidated auth acceptance **FAIL/intermittent edge1042**, not PASS. Ephemeral Workers were removed; no production secret or URL changed. The workflow raw type label is generic; auth-only results are network authentication tests, not retailer calls. Root cause of edge1042 was not proven; no bypass attempted.
