# Old Worker rollback acceptance

**PASS — existing backup integrity, genuine old Worker price route, isolated filesystem/config rollback. PASS — targeted frontend build private restoration. UNVERIFIED — live process/reactivation checks.**

Existing private backup unchanged: /home/scraperuser/trustfolio-cutover-backups/20261103T052423Z-41583713914/ . SHA2560805617812b132f1ad6d624d02e12ea3233b680afed5ac7728d5111120b81357;119 restored-file hashes rechecked PASS. No duplicate backup or confidential upload. [Read-only run 41586292840](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41586292840).

One genuine native-VPS Node request to the currently configured old Worker returned B0D41L64NR, HTTP200, priceNum33490, statusok, fresh cached:false,1648ms RTT/1004ms item time; Ray a5491b1bb82e3308-MRS;05:51:14UTC. This closes the previous empty-items-only route limitation. It did not pass through a write-capable production backend endpoint and did not update MongoDB. Current configured old credential remained unset, matching its accepted route. Old response version2026-10-15.8.

Existing backend revision27f2127477cecc939294afc199e3ae33c4519eb2 and source hashes match the backup/candidate base. All four PM2 apps online; backendPID130603/restart12 unchanged. No restart was used to prove rollback.

Isolated scratch test applied the actual candidate, changed **simulated** .env references, restored original code/config hashes and removed new fixture-only files. Croma/policy unchanged. This is filesystem/config mechanism PASS with synthetic credentials; it is not a live PM2 restart or production restoration test. See isolated-rollback-results.json. Final strict-package file list below omits ProductRecommendationService, which is unchanged and must not be reset.

## Final strict backend restore scope

Existing files: controllers/ProductController.js; services/LivePriceService.js; services/LiveBudgetRecommendationService.js; services/CategoryService.js; backend .env. New files: LivePriceIdentity.js, CatalogIdentityGuard.js, LivePriceDeadline.js. Restore the former from the private snapshot; remove the latter only if absent in the snapshot and their current hash equals the approved deployed candidate, or leave inert after restoring original imports. Never reset unrelated code or MongoDB.

Exact private backend recovery commands are in FINAL_CUTOVER_PACKAGE.md. PRICE_WORKER_URL/KEY must be restored from the private PM2/dotenv snapshot, including the previously unset key. Do not pm2 resurrect/restart all, rotate keys or restore historical product prices.

## Automatic trigger and escalation preparation

On a future explicitly approved cutover only: stop rollout immediately on401/403/1042, wrong ID/finite-price acceptance failure, null/error accepted as live, unexpected deletion, client/proxy deadline failure or genuine Top-5 regression. Execute the approved configuration/code restore once, activate only affected processes, verify old real quote and actual backend active route. If restore/source hash/activation verification fails, stop automated changes and escalate with private backup path and sanitized logs; do not claim ROLLED BACK or mutate MongoDB.

No automatic rollback daemon or production change was installed. Current production already uses the old Worker, so no rollback occurred. The119-file snapshot is backend-focused. A necessary targeted frontend backup was subsequently prepared without duplicating or altering that archive: frontend-timeout-preparation/frontend-runtime-before-timeout.tar.gz, SHA256 b70bef21639df14897b7ff291c6dcf5c3d581715ebaa4dc176e4843e88a463a4. It contains464 regular files plus the existing standalone/node_modules dependency symlink; regular hashes and link metadata were privately restored/verified. Existing node_modules were preserved, not duplicated. Source/build/env archive stayed0600 on the VPS; live files/web PID were unchanged. See frontend-runtime-backup-results.json and FRONTEND_ROLLBACK_COMMANDS.sh. No live activation was tested.

