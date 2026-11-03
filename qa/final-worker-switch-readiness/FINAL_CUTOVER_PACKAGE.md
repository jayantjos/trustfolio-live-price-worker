# Final cutover package — review only

**PASS — scoped diffs and backend recovery commands prepared. BLOCKED — production deployment approval/readiness pending native acceptance. No production switch.**

## Exact reviewed scope

Use **MINIMAL_BACKEND_REVIEW.diff**, SHA256 **6cce97d9ee39331ee134ebba020b62e2cae4975780d54b64ba6e556a518a9fc9**, and **STAGING_FRONTEND_CANDIDATE.diff**; base/candidate hashes in minimal-patch-source-hashes.json. Full frontend base36d74bdbfe88a2221c1929897caba75df4bddb8e260cd5a6ab5829be61410521; tested full candidate96e09dce023edb1bd67cc15ea12a35c7cf32df089a28a9e3e1d0c00703c96822. The patch was applied to actual full source, not just a recreated wrapper.

Backend existing files: ProductController, LivePriceService, LiveBudgetRecommendationService, CategoryService (session propagation only for price refresh). New modules: LivePriceIdentity, existing shared CatalogIdentityGuard, LivePriceDeadline. No new discovery or specification extraction. Canonical mapping and existing identity guard are reused price-request safety.

**Do not deploy STAGING_BACKEND_CANDIDATE.diff wholesale.** It preserves the older broad-candidate staging baseline for audit history. The final minimal diff deliberately excludes ProductRecommendationService. Production ranker hash remains **cadaae48fe765d2535449508bba75811ffc1df172eb01f3f9b07d30ff527d6e9**; scoring, platform quota, candidate retrieval and original windows stay unchanged. Final controlled fixtures explicitly used prices inside that original window; this does not claim a new solution for lower-window catalog eligibility outside this switch scope.

Croma adapter/policy/watcher/product insertion/scraper and social/ads code remain unchanged. Archive criteria/cap are preserved; only price-related transaction/deadline plumbing is added and tested separately.

## Configuration after gates PASS and separate explicit approval only

- PRICE_WORKER_URL=https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev .
- PRICE_WORKER_KEY: matching existing TF_PRICE_WORKER_KEY, delivered through the established private server configuration channel. Never put it in CLI arguments, logs, Git, tickets or this report. Existing Actions key was authenticated and safely envelope-tested; production remains unset.
- Retain current60s live freshness and VPS Croma direct routing. No secret rotation.
- Proposed deadlines: Worker6500ms unchanged; caller7500ms clamped; aggregate18500ms; Top-5-only shared frontend20500ms. They remain staging proposals until genuine native acceptance.
- Re-read all base hashes and effective PM2/dotenv precedence immediately before activation; stop on drift.

## Backup and exact recovery

Preserve the existing119-file private backup, its source/env/PM2 reference and SHA2560805617812b132f1ad6d624d02e12ea3233b680afed5ac7728d5111120b81357. Reconfirmed, no duplicate created. Old URL is https://spring-shape-2759.1shailendrasoni1.workers.dev ; original key unset in inspected sources. Native old genuine Amazon response and isolated file/env restoration now PASS.

**BACKEND_ROLLBACK_COMMANDS.sh** contains concrete guarded restore commands for the four existing backend files plus .env, with original/candidate source-hash checks, private snapshot credential recovery and affected-process-only PM2 reactivation. It was syntax checked, **not run on production**. It requires an explicitly approved rollback flag and stops on unrelated code/env changes. New helper files may remain inert after original imports are restored; no MongoDB restoration/deletion is part of rollback. Follow its final verification instruction; reactivation alone is not success.

A targeted private frontend runtime/source/env backup now complements the unchanged119-file backend archive: frontend-timeout-preparation/frontend-runtime-before-timeout.tar.gz; SHA256 b70bef21639df14897b7ff291c6dcf5c3d581715ebaa4dc176e4843e88a463a4;2855374 compressed bytes.464 regular-file hashes and the existing standalone/node_modules link metadata were restored privately and verified; live files and web PID stayed unchanged. The initial conservative symlink guard stopped before archive creation; the corrected backup explicitly preserved the supported dependency link without following it or copying node_modules. FRONTEND_ROLLBACK_COMMANDS.sh provides guarded affected-web-process recovery commands for that existing directory layout. Live activation/recovery remains UNVERIFIED; validate the procedure in the isolated native acceptance before production approval. Do not build over the live .next directory.

## Future approved activation and smoke sequence

1. Complete credential-separated native staging (disposable DB, staging listener/proxy) and genuine five-product all-path acceptance with this strict diff. Validate the exact production driver/topology supports the transaction options.
2. Reconfirm the preserved frontend build rollback, finalize source/config/release hashes, then obtain separate explicit user approval for the concrete package.
3. Build only an isolated candidate release. Set only the reviewed Worker URL/key references privately. Activate through the existing reviewed release procedure. Backend PM2 process: trustfolio-backend; frontend trustfolio-web is affected only if its compiled timeout patch is approved. Never restart admin/watcher/Croma or unrelated jobs. No activation was executed now.
4. Bounded smoke: one exact Amazon and one exact Flipkart quote through the actual backend; verify exact identifier, finite accepted selling price/metadata, cap/order/unknown stock and Croma route. Check actual production active URL and user-facing HTTP completion, not health alone. Any authorized production canary writes must be explicitly included in that future approval.
5. Trigger rollback immediately on auth/routing failure, wrong identity, invalid/stale accepted price, unexpected deletion, deadline/Top-5 failure or corrupt persistence. Restore reviewed code/config once, verify old genuine quote and actual backend route. If any step cannot be confirmed, stop further changes and escalate with sanitized evidence/private backup path; never claim successful restoration or replay database prices.

No automatic production switch/rollback workflow was installed. All executed write jobs used disposable MongoDB only. Separate user approval remains mandatory even after tests pass.

