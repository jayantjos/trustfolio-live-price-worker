# Rollback and cutover plan — preparation only

**PASS — concrete plan/diff prepared. NO-GO for execution; no production action is authorized by this file.**

## Baseline and review

Worker repository baseline fe9fb273c4b50b5e93c0bec54568510a9f7f813a. Actual VPS source hashes match the patch base for all four modified existing files and unchanged policy/Croma source. Base/candidate hashes are in patch-source-hashes.json.

MINIMAL_BACKEND_PRODUCTION_PATCH.diff modifies LivePriceService, LiveBudgetRecommendationService, ProductRecommendationService candidate eligibility and ProductController bounds timing; adds LivePriceIdentity and the existing shared CatalogIdentityGuard as CJS. Existing service architecture, scoring/platform-quota/order functions, CategoryService implementation, Croma adapter, watcher and availability/deletion policy are preserved.

A small read-only evidence-backed canonical-page→PID table avoids depending on staging-only fixture edits.21 pure resolver assertions passed; full genuine integration used equivalent fixture mappings before this final table was added. Review that explicit coverage boundary.

## Preconditions before separate production approval

1. Close explicit Flipkart model-number evidence gate or agree to a narrower exact-listing-only pilot.
2. Provide native isolated staging runtime without production credentials in its write process. Verify native response time and frontend/proxy outer deadlines, including final allowlist branch. Do not install/configure production without separate authorization.
3. Re-read production source hashes; rebase/review if changed. Preserve completed evidence and rerun only affected checks.
4. Revalidate exact diff in a copy. Preparation passed git apply --check, JS syntax and focused regressions; nothing was patched on VPS.
5. Preserve exact existing backend revision and URL/secret references securely, outside QA logs. Never print/copy secret values into this report.
6. Present final diff/configuration/rollback and obtain the user's separate explicit approval. Until then no env update, patch deployment, key rotation or PM2 restart.

## Minimal proposed configuration

|Setting|Proposed handling after explicit approval only|
|---|---|
|PRICE_WORKER_URL|https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev|
|PRICE_WORKER_KEY|Matching existing permanent Worker key through current secure backend configuration; never print/log/commit|
|TF_PRICE_WORKER_KEY|GitHub Actions test-secret name; does not imply production key changed|
|Caller timeout|Candidate code8000ms; Worker upstream stays6500ms|
|Freshness|Existing backend60-second window; recommendation requires fresh accepted metadata|
|Croma|Existing VPS direct adapter/routing unchanged; never Cloudflare|

Do not blindly choose a different .env/config file. The developer must identify the existing effective secure configuration mechanism without exposing it. No secret rotation or bulk Mongo mapping migration is required by this candidate.

## Future approved cutover sequence

- Verify source and patch hashes; preserve secure revision/config-reference rollback snapshot; apply only the six-file reviewed diff.
- Set only approved Worker URL/key references. Leave Croma, scraper and social settings unchanged.
- Activate only the separately approved backend deployment/reload. If the verified app is trustfolio-backend, its PM2 activation must be within that explicit approval; do not restart unrelated processes.
- Run one bounded authenticated handler control and approved canary/Top-5 checks. Any production Mongo writes must be expressly included in that approved canary scope; none are authorized now.
- Verify exact identity, primary price/stock, cap/order/link, accepted persistence, bounds/cache and native latency. Stop rollout on a critical failure.

## Rollback

Triggers: persistent401/403/1042; wrong product/variant; unverified/stale price accepted; explicit false stock accepted; non-finite price; transient-failure deletion; wrong bounds; native deadline/SLA regression.

- Stop new live-price writes/cutover rollout through the approved rollback mechanism.
- Restore exact previous backend revision and old URL/key references from the secure snapshot. Do not guess old URL from memory or rotate secrets.
- Activate only the approved rollback backend change; production restart/reload requires that cutover/rollback approval scope.
- Preserve valid production data/evidence. Never copy disposable fixtures into production or blindly replay historical prices.
- Review archived exact ID/context before any unexpected-deletion restoration; restoration is a separately approved production write.
- Verify restored behavior, persistence safety, bounds and latency; preserve existing Croma/social/scraper paths.

## Safety and cleanup

Write-capable acceptance runners used guarded localhost disposable MongoDB and had no production Mongo/SSH/Cloudflare deployment credentials. Separate read-only source/VPS relay jobs performed genuine existing Croma API calls, never production Mongo writes.

DB drop was confirmed in all three acceptance runs. One focused job's cleanup404 was separately corrected without rerunning its successful retailer test. Ephemeral runner teardown and cleanup-only workflows removed external transport and encrypted-source artifacts; acceptance results remain.

Native capability check was read-only: Docker/Podman/mongod/mongosh absent. No runtime install, VPS configuration/PM2 change, production Mongo write/delete, URL/key replacement, key rotation, Worker redeploy, Croma routing change, scraper schedule change or social/ads workflow edit occurred. QA workflows stayed on an isolated branch; deliverable commit touches QA evidence/diff only.

