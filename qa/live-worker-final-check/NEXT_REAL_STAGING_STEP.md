# Next real staging integration — prepared, not executed

**Status: PREPARED. Execution not performed in this task. Production cutover is not authorized.**

Use the existing permanent Worker and the newly matching GitHub Actions secret. Reuse the actual backend source/hashes and existing encrypted source handoff. Do not recreate disposable Workers, repeat the 300-product audit, or rebuild proven parser fixtures.

## 1. Isolate the real backend and database

- Separate read-only source acquisition from the write-capable disposable Mongo job.
- The write job may use a quote-only Worker caller credential; it must have no Cloudflare edit token, production SSH key, production .env or production Mongo connection.
- Connect only to an explicitly guarded loopback disposable database named trustfolio_acceptance_disposable. For real change-stream/watcher acceptance, use a disposable replica set.
- Reuse actual LivePriceService, LiveBudgetRecommendationService, ProductAvailabilityPolicy, ProductController, CategoryService, catalog ranker, schemas/helpers/OEM data and watcher source. Do not replace business logic with approximations or stub counters.

## 2. Apply only required staging compatibility changes

Review/apply the already proposed URL alias, false/null stock, finite accepted-price persistence, no stale Top-5 fallback and exact request/response identity safeguards. Do not apply them on the VPS.

Preserve Croma's VPS direct integration. Do not send Croma through this Worker.

Record the existing 6000 ms caller versus 6500 ms Worker upstream budget. Measure the normal caller deadline; a larger diagnostic timeout must be labelled explicitly and cannot establish six-second UX compatibility. Do not change production timeouts automatically.

## 3. Genuine quote-to-Mongo canary

Eligible starting mappings, independently matched in the completed live test:
- Amazon B0GJDLKM5H — HP 24-cr0023in, Ryzen 7 7730U, 16 GB DDR4, 512 GB SSD.
- Flipkart COMHCYMG83BGNQHH — Lenovo Chromebook 11IJL9, 4 GB / 64 GB.

Seed only disposable fixtures copied from approved catalog metadata. Treat observed ₹69,990 / ₹36,502 as historical observations; obtain a new genuine quote and do not hardcode them as permanently correct prices.

Through the actual staging LivePriceService, capture one connected trace: requested exact identifier, Worker response/accepted price and provenance, correct fixture ID, canonical price fields, verification timestamps and preserved stock. A failure must not overwrite an accepted canonical price or trigger unintended archive/delete. Do not substitute a mock for the genuine success path.

The ordinary Worker receives item strings, not complete catalog context. Validate the approved exact model/variant mapping before accepting the canary; do not infer generalized catalog protection from Acer's safe rejection.

## 4. Real category/controller/watcher acceptance

After the genuine fixture price changes, run the actual controller, CategoryService and watcher process on the disposable replica set. Capture category min/max, frontend-facing bounds before/after, actual cache invalidation effects and propagation time, without backend restart. Confirm failed checks cannot move bounds. Use an isolated category fixture when required to make a genuine change observable; label the fixture scope.

Reuse prior deletion-policy evidence. Re-run only a case affected by changed staging integration logic.

## 5. Keep full Top-5 and production gates separate

A real Top-5 needs five eligible, independently identified candidates from the same category and a valid budget, actual ranker order, next-candidate selection, no duplicates and no stale-price fallback. The current mixed-category eight-product sample is not such a test. Missing-PID records 155/234 remain excluded until genuine exact identity evidence exists.

Preserve results and restore/drop disposable fixtures only after evidence capture. Report PASS/FAIL/BLOCKED/UNVERIFIED with genuine versus simulated inputs clearly separated.

Only after real integration gates pass should a concrete minimal production diff and rollback plan be prepared for explicit approval. Do not replace the developer Worker URL, modify production Mongo, restart PM2 or change ad/social pipelines.
