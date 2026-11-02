# Production cutover readiness

**NOT READY. Do not replace the production Worker URL or credentials.**

| Gate | Status |
|---|---|
| Existing focused parser regression | PASS14 fixtures; no new production parser changes |
| Staging live Amazon source extraction / Flipkart OOS | PASS limited examples |
| Three-way real HTTP authentication | PARTIAL; see auth-only follow-up |
| Real disposable Mongo price/deletion safety | PASS recorded scenarios with simulated retailer input |
| Full backend shared-key request/response/timeout/cache | UNVERIFIED |
| Real three-platform Top-5/budget/ranker/next candidate | UNVERIFIED |
| Real-retailer-to-Mongo accepted update | UNVERIFIED |
| Category min/max watcher/frontend propagation | UNVERIFIED |
| Full deletion matrix/runtime archive ordering | UNVERIFIED |
| Cloudflare Croma | BLOCKED by prior403; retain VPS direct |
| Amazon independent primary price / unresolved Flipkart catalog/delivery | UNVERIFIED |

After gates pass and separate explicit approval: configure PRICE_WORKER_URL to new production Worker, provision matching x-api-key securely, apply reviewed minimal stock/fallback/product_url/catalog-context/timeout compatibility changes, retain VPS Croma and current architecture, validate category-range propagation, and prepare rollback. No production action authorized or performed by this acceptance task.

Managed environment_status tool was unavailable; /etc/codex/network-policy.json, Docker and mongod were absent in scratch. Disposable infrastructure was therefore created inside GitHub Actions rather than assuming local credential/network readiness. A full deployed staging backend with copied ranker/controller/watcher dependencies is still required; its absence is an implementation gap, not a proven permission denial. No invented access blocker or claimed full completion.


Production unchanged: no production Mongo writes/deletions, credentials, URLs, backend deploy, PM2 restart, watcher or social/ads changes. Original audit remains 108 PASS / 16 FAIL / 176 UNVERIFIED. Production Worker remains code 5b7b50929fd4ba28408ade2c718988d85b433adc, version 5e4fc4a1-a929-49cf-b5eb-c3465a1da441. New staging Workers had no Browser/cron/DO bindings and were deleted after each run. No cooldowns were reset.

## Authentication-only follow-up

Run https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41478863603 used only invalid-staging-product (zero retailer fetches). Missing key401 and wrong key401 passed. Valid-key request encountered Cloudflare404/error1042; workflow failed. Valid-key retailer requests had200 in prior run41478638789, but **no single clean complete auth acceptance run passed**. Mark consolidated auth acceptance **FAIL/intermittent edge1042**, not PASS. Ephemeral Workers were removed; no production secret or URL changed. The workflow raw type label is generic; auth-only results are network authentication tests, not retailer calls. Root cause of edge1042 was not proven; no bypass attempted.
