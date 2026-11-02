# Final cutover readiness

**Overall: UNVERIFIED — production cutover NOT READY.** Remaining exact-PID product checks are BLOCKED. No production cutover was applied.

## Gate results

|Gate|Status|Evidence type / scope|
|---|---|---|
|Credential/health checkpoint|PASS, reused|Prior real handler and401 controls; no secret rotation|
|Current genuine authenticated quotes|PASS|20 real requests through actual staging LivePriceService; no1042 observed|
|Exact MongoDB mapping155/234|BLOCKED|Real read-only MongoDB and canonical retailer HTML; no trustworthy PID|
|HP/Lenovo connected price persistence|PASS|Real retailer → actual backend → disposable MongoDB|
|Fresh Lenovo independent selling price|PASS|Exact primary SKU/Offer₹22,911; historical price not reused|
|Full five-item bounded Amazon/Flipkart integration|PASS|Actual ranker/controller;10 genuine candidate quotes;4485ms|
|Stock/missing-price/budget/next-candidate/no duplicates|PASS bounded scope|Genuine quotes and actual selection|
|Category metadata/controller/cache/watcher|PASS bounded scope|Genuine updates; actual Mongo change stream and HTTP controller;6644ms propagation|
|Failed-price/no-stale/unknown-stock safeguards|PASS, simulation-labelled|Actual staging backend/DB; simulated controlled retailer transport|
|Independent selling-price/variant accuracy for every Top-5 row|UNVERIFIED|Exact ID/brand/dimension guard and Worker extraction, not five independent Offer comparisons|
|Fresh Croma-inclusive Top-5|UNVERIFIED|Existing VPS adapter untouched; inherited real exact-SKU evidence reused|
|Timeout budget and production latency tails|UNVERIFIED|6000ms caller vs6500ms upstream remains; one bounded Top-5 sample|
|Price-window frontend semantics|UNVERIFIED|Fresh Haier₹30,130 accepted under budget while original catalog-window metadata starts₹31,500|
|Production change safety|PASS|No production DB writes, VPS/config/restart, URL/key changes or deployments|

## Completed work and remaining boundaries

Real canary, Top-5 and controller/watcher infrastructure gates can now be used as the next integration checkpoint. All five requested report files and raw evidence are preserved here. These passes are scoped and do not erase unresolved price identity, independent accuracy or worst-case deadline gates.

No confirmed Worker/parser defect required a fix. The only test-harness correction was giving the unfinished Top-5 its own bounded ten-request budget; completed canary/watcher and parser tests were not repeated. Two stage-only service safety patches and exact approved mappings are reproducible in the runners. **URL/key replacement alone is insufficient** for the current unpatched developer backend.

Remaining work is specific: authoritative exact PID evidence for155/234; independently corroborate unresolved selected price/variant cases if full accuracy acceptance is required; reconcile caller/upstream deadline nesting and observe bounded tail behavior; resolve frontend price-window semantics; obtain same-category genuine Croma evidence if three-platform recommendation acceptance is required. Do not substitute mocks for these gates.

## Conditional cutover preparation — not an approved production patch

Since all critical gates have not passed, a production-ready patch is **not** declared. The staging runners contain the concrete minimal edits for review: URL selection, alias/null stock handling, accepted-price persistence, exact context validation and no stale fallback. Ranker, controller, watcher and Croma business source remain unchanged.

After remaining gates pass, prepare a reviewed backend diff against the recorded current source hashes. Configure the existing backend's PRICE_WORKER_URL to the permanent endpoint only with explicit approval; supply its matching PRICE_WORKER_KEY through the production secret manager without printing it or copying its value into instructions. TF_PRICE_WORKER_KEY is the GitHub Actions test secret name, not proof production configuration has changed. Do not rotate either credential automatically.

Rollback plan for a future approved cutover: preserve the exact pre-change backend revision and existing URL/secret reference securely; restore that revision and configuration reference if authentication, identity, accepted-price, stock or latency gates fail. Stop new live-price writes on failure; do not overwrite real MongoDB with disposable fixtures or blindly replay historical prices. Keep existing Croma routing. Any required production restart/deploy would be separately approved.

## Evidence and cleanup

- [Read-only mappings](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41504885028)
- [Actual connected canaries and watcher](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41506362145)
- [Missing-PID retailer evidence](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41506456208)
- [Completed Top-5-only continuation](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41507384017)
- [Independent changed Lenovo Offer](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41507464406)

Both disposable databases were dropped and Mongo containers removed. Transient plaintext key/source/private keys and branch-tip certificate/envelope transport blobs were removed. Exact encrypted-source artifacts were deleted after result preservation by [cleanup run 41507821821](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41507821821); subsequent artifact listings retain only acceptance-result artifacts. See cleanup-evidence.json. QA-only temporary workflows were added on an isolated branch; existing ads/social workflows were not modified. No temporary Worker was created.

Safety scope: no production MongoDB writes/deletes; no production VPS restart/configuration or Worker URL change; no key rotation; no Worker redeployment; no unsupported Croma Cloudflare calls; no mass audit, screenshots, access-control bypass or fabricated retailer quote.

