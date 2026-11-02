# Top-5 / MongoDB / min-max / deletion acceptance

**Real disposable MongoDB passed the recorded safety scenarios with simulated retailer inputs. Full real-retailer integration remains UNVERIFIED.** Mongo7 ran as a GitHub Actions service on127.0.0.1:27017; only trustfolio_acceptance_disposable was writable. Production credentials were not available to the write-capable step.

Evidence run: https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41478203436; workflow commit76ddedcdcacbabff1ccca7f82380a7115f8d1ac3. Executed actual current backend source in a VM with real Mongoose connection and simulated fetch responses. Actual controller was replaced with an invalidation counter. Mongo staging results do not attribute simulated prices to a live Worker deployment.

| Test | Type | Result | Detail |
|---|---|---|---|
| Canonical price update | Real staging Mongo; simulated2499 quote | PASS | price string,price_inr,currentPriceValue,live.checked_at; unknown stock null; ObjectId6ae8b51b4059bf9831e57068 |
| Failed quote preserves accepted price | Real Mongo; simulated429/502/timeout/invalid_json/identity/delivery/no_price | PASS | Same product survives; canonical2499 retained |
| Explicit OOS and discontinued archive/delete/restore | Real Mongo; simulated evidence | PASS for observed final states | Archive exists, product removed, restoration succeeds |
| Ambiguous unavailable | Real Mongo; simulated evidence | PASS | Product retained after first check; archived/deleted after second |
| Deletion cap | Real Mongo; seven simulated OOS products | PASS | Five archived in single request |
| Archive-before-delete ordering | Source inspection only | UNVERIFIED runtime ordering | Final states checked; no operation-order instrumentation |
| Actual Top-5 ranker | Not executed | UNVERIFIED | Previous mocks insufficient; full ranker dependency graph/catalog not staged |
| Category min/max and visible bounds | Not executed | UNVERIFIED | 13 stub invalidation calls prove invocation only; no actual controller/watcher, frontend or propagation-delay measurement |
| Successful real-retailer-driven Mongo update | Not executed | UNVERIFIED | Live quote run and Mongo simulated-input run were separate |

Full raw results in mongo-staging-results.json. IDs for archive/restore/cap fixtures were generated but not captured in the original result JSON; this traceability gap remains. Invalid HTML was not separately exercised; invalid_json was a simulated error response. No claim that all requested deletion scenarios or end-to-end acceptance passed.


Production unchanged: no production Mongo writes/deletions, credentials, URLs, backend deploy, PM2 restart, watcher or social/ads changes. Original audit remains 108 PASS / 16 FAIL / 176 UNVERIFIED. Production Worker remains code 5b7b50929fd4ba28408ade2c718988d85b433adc, version 5e4fc4a1-a929-49cf-b5eb-c3465a1da441. New staging Workers had no Browser/cron/DO bindings and were deleted after each run. No cooldowns were reset.

## Authentication-only follow-up

Run https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41478863603 used only invalid-staging-product (zero retailer fetches). Missing key401 and wrong key401 passed. Valid-key request encountered Cloudflare404/error1042; workflow failed. Valid-key retailer requests had200 in prior run41478638789, but **no single clean complete auth acceptance run passed**. Mark consolidated auth acceptance **FAIL/intermittent edge1042**, not PASS. Ephemeral Workers were removed; no production secret or URL changed. The workflow raw type label is generic; auth-only results are network authentication tests, not retailer calls. Root cause of edge1042 was not proven; no bypass attempted.
