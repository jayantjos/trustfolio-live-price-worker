# Backend compatibility

**PARTIAL PASS / end-to-end backend connection UNVERIFIED.** Actual current LivePriceService and ProductAvailabilityPolicy were copied read-only over SSH into an isolated runner; production URI/.env were not copied. The write test hard-asserted mongodb://127.0.0.1:27017/trustfolio_acceptance_disposable and rejected source text containing Mongo URI literals. SSH private key was removed before tests. Only isolated source copies received proposed stock/URL/persistence safety fixes.

Real disposable Mongo tests passed using actual Mongoose and patched service, with explicitly simulated retailer responses. Unknown stock remained null; product_url alias and defensive stock conversion/persistence changes were present in staging copy. Existing ranker/fallback proposal remains proven only by previous isolated mocks, not real Top-5 acceptance.

Dedicated staged Worker received a generated secret securely; no production secret was read or changed. First run read before secret readiness and got503; readiness wait fixed that harness race. Second run: missing key401, valid Amazon and Flipkart both200. Incorrect key request instead encountered Cloudflare edge404/error1042, so complete three-way auth acceptance was not passed in that run. See later authentication-only evidence if present; do not substitute mock success for that edge failure.

Actual HTTP latencies were2172/1345ms. Backend's6000ms vs Worker6500ms worst-case timeout mismatch remains unresolved; these two fast observations do not establish tail latency safety. No staging caller timeout patch or cache freshness integration was validated. Existing45s/60s caches remain unchanged; live staged calls used useCache:false and browserProbe:false.

No full staging backend with ranker/controller/watcher and real retailer calls was assembled. Staging source tests stubbed retailer fetch and controller invalidation; they are not full backend network acceptance. Stage URL/key were ephemeral and removed, not persisted as production configuration.


Production unchanged: no production Mongo writes/deletions, credentials, URLs, backend deploy, PM2 restart, watcher or social/ads changes. Original audit remains 108 PASS / 16 FAIL / 176 UNVERIFIED. Production Worker remains code 5b7b50929fd4ba28408ade2c718988d85b433adc, version 5e4fc4a1-a929-49cf-b5eb-c3465a1da441. New staging Workers had no Browser/cron/DO bindings and were deleted after each run. No cooldowns were reset.

## Authentication-only follow-up

Run https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41478863603 used only invalid-staging-product (zero retailer fetches). Missing key401 and wrong key401 passed. Valid-key request encountered Cloudflare404/error1042; workflow failed. Valid-key retailer requests had200 in prior run41478638789, but **no single clean complete auth acceptance run passed**. Mark consolidated auth acceptance **FAIL/intermittent edge1042**, not PASS. Ephemeral Workers were removed; no production secret or URL changed. The workflow raw type label is generic; auth-only results are network authentication tests, not retailer calls. Root cause of edge1042 was not proven; no bypass attempted.
