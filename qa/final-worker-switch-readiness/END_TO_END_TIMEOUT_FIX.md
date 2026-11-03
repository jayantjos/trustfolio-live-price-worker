# End-to-end timeout fix — staging only

**PASS — implemented candidate, exact-source staging, genuine transactional persistence and bounded cancellation controls. BLOCKED — genuine native full Top-5 deadline acceptance.**

Production re-read preserved original hashes: LivePriceService03d5c3c8… remains6000ms; frontend36d74bdb… remains8000ms. Worker upstream6500ms unchanged. No override or production activation was made. Existing native Nginx inspection found no timeout overrides; documented60s defaults are configuration inference, not new latency measurements.

## Coordinated provisional budget

|Layer|Staging proposal|Purpose|
|---|---|---|
|Worker upstream|6500ms unchanged|Existing retailer fetch/body bound|
|Backend Worker call|7500ms, further clamped by remaining request budget|1000ms response/parsing/transport allowance|
|Backend entire Top-5|18500ms absolute scope|Planning envelope:2000ms initial work + two worst-case7500ms quote waves +1500ms mutation/refresh/response reserve|
|New-wave admission|Require at least7500+1500ms remaining|Do not start a full slow wave without write reserve; existing maximum4waves unchanged|
|Top-5 frontend only|20500ms shared across API-base attempts|2000ms outer margin; unrelated API default stays8000ms|
|Proxy|No staging/production Nginx modification|Actual native route still must be measured|

These are derived staging allocations, not a production SLA or blind timeout increase. Fast waves can admit more candidates within the same aggregate limit. An insufficient remaining budget can return fewer verified products; it must not fabricate five or use stale prices. Actual read/query/driver operations receive the remaining budget where supported; read-only controller/ranker work is raced against the request scope. Croma stays on its existing adapter; expired Croma result promises are discarded, without claiming the existing subprocess itself is killed.

## Implementation

LivePriceDeadline uses one AsyncLocalStorage request scope, AbortController, clamped Worker signal and late-result guard. The existing controller propagates request abort/response close and emits504 for expired work. Shared in-flight quotes are scoped to a request so one caller's cancellation cannot cancel another caller's work. LivePriceService performs archive/delete/price writes and category refresh in a MongoDB transaction, with explicit session propagation; callbacks are sequential. Quote expiry before writes or during the tested pre-commit mutation phase rolls back. Cache invalidation follows committed work. Existing availability criteria/cap, Croma adapter and production ranker source are unchanged in the final minimal package.

MongoDB6.20 requires operations to inherit withTransaction's timeout instead of supplying an operation-level timeoutMS. The first draft failed safely on this rule before persistence ([41586955374](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41586955374)); corrected run [41587272943](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41587272943) passed. Official driver reference: https://mongodb.github.io/node-mongodb-native/6.20/classes/ClientSession.html . No production error/fix was introduced.

## Actual execution evidence

- Genuine Bosch B0D41L64NR ₹33490 and Lenovo COMHCYMG83BGNQHH ₹22911 traversed actual patched LivePriceService into real disposable MongoDB, with canonical/string/current-price and verification readback assertions. Connected2392ms; quote RTT2362/1010ms. No simulation substituted for these successes.
- Final minimal-package run [41588132854](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41588132854) kept ProductRecommendationService byte-identical to production (cadaae48…). Actual controller/frontend HTTP/real MongoDB with **SIMULATED** quote delays: five products in382ms fast and6824ms slow (6800ms quote delay, concurrent five). All under20500ms; unknown stock remained null. These are not genuine retailer Top-5 timings.
- Controlled502 failure returned zero products in14ms; prior canonical prices survived, no stale-price acceptance/deletion.
- Deliberately non-cooperative350ms quote task: request expired at101ms under100ms test budget; DB remained byte-identical after500ms observation.
- Controlled expiry after writes but before category work: transaction rolled back; observation completed557ms including injected delay and300ms follow-up.
- Affected archive/category regression [41587820844](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41587820844):139ms normal transaction; five-item cap/archive-before-delete PASS; exact category min/max33490 PASS; expiry after archive-before-delete left no archive/product mutation, observed558ms including delay/follow-up.

For the **two controlled full five-product HTTP samples only**, nearest-rank p50=382ms, p95=max6824ms, max6824ms. n=2 with intentionally different simulated delays is not a production performance distribution. Actual new Worker quote sample and prior genuine three-platform10105ms relay result remain separately labelled; no relay subtraction/native estimate.

## Remaining native limits

The proposed budgets are not accepted for production until the final minimal patch runs on an isolated native VPS-equivalent route using five genuine eligible candidates and all unchanged retailer paths, including normal/slow/multi-wave behavior. Safe native isolation remains unavailable from the saved capability check; production MongoDB is never a substitute. Current production6s/8s mismatch is unchanged. Native proxy abort behavior, transaction support/latency under the exact deployed driver/topology and in-flight commit uncertainty under network failure are not proven by these pre-commit controls. A targeted frontend runtime/source backup has now been privately restored/hash verified without changing the live build. Native activation/recovery and genuine complete-response acceptance remain unperformed.

