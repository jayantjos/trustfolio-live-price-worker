# Real backend integration results

**Overall result: BLOCKED.**
Evidence types are separated: current source read-only inspection; real disposable MongoDB with simulated retailer failures; inherited genuine retailer requests. None is represented as a new connected Worker-to-MongoDB success.

## Source and staging assembly

A fresh read-only source snapshot was obtained from the current VPS backend, not recreated business logic. See `backend-source-manifest.json` and the missing-deletion runtime evidence for file hashes and actual modules loaded. No production .env, Mongo configuration or PM2 environment was copied. Source was encrypted before transfer; public artifacts contain only the public certificate and encrypted source.

The staging Mongo job has only read-only GitHub access and its hardcoded loopback disposable database. Production SSH credentials are confined to a separate read-only source job. It has no Cloudflare deployment token, production Worker key or production Mongo connection. Its URI guard rejects unexpected connections and embedded Mongo URI literals in copied source.

Actual business modules assembled include LivePriceService, LiveBudgetRecommendationService, ProductAvailabilityPolicy, ProductController, CategoryService, CategoryController, ProductRecommendationService, CromaLivePriceDirect, and the category watcher's source module. Loading a module does **not** count as exercising its controller, ranker or watcher loop.

Staging copies apply URL alias selection, both stock spellings/unknown preservation, successful finite-price persistence checks, no stale Top-5 catalog fallback, and a 10-second caller timeout. The original 6.5-second Worker upstream limit remains unchanged. The timeout budget is source-level preparation, **UNVERIFIED** under real connected tail latency. These patches were not applied to production.

Exact catalog model/variant context remains **UNVERIFIED**: the ordinary Worker handler accepts item strings and does not currently consume catalog context. It would be incorrect to claim that merely passing an extra JSON field implements identity acceptance.

## Connected genuine quote acceptance

| Required assertion | Result |
|---|---|
| Actual identifier and live retailer selling price | BLOCKED for a new connected run |
| Worker accepted quote and backend received matching response | BLOCKED by 1042 |
| Correct Mongo product selected and canonical price updated | BLOCKED for genuine Worker input |
| Live verification metadata updated | BLOCKED for genuine Worker input |
| Failed quote cannot overwrite accepted price | Inherited simulation PASS; new genuine chain BLOCKED |
| Unknown stock remains unknown | Inherited simulation PASS; preserved Croma evidence has null stock |
| No unintended archive/deletion | Missing-case simulation evidence is recorded separately; genuine chain BLOCKED |

The previous Amazon ₹26,030 and Flipkart OOS/null responses from run 41478638789 remain historical genuine HTTP evidence. They were not replayed and labelled as a new real connected success. No successful parser fixtures or 300-product audit were deliberately rerun by this acceptance work; the repository's existing push-triggered parser CI ran automatically after repository commits.

## Deletion policy

**PASS:** [run 41483277644](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41483277644) completed both missing checks with real disposable MongoDB and actual service/policy/controller modules. See `missing-deletion-results.json` for source hashes and fixture IDs. Archive fixture `6ae8bc6e39971fc1ec44b100`: archive completed 16:38:06.972 UTC, delete started 16:38:06.974 UTC, then exact original fixture restoration passed. Invalid-HTML fixture `6ae8bc6e39971fc1ec44b112`: two fresh simulated parser failures preserved ₹2,499, zero unavailable checks, and no archive/delete. These are simulated retailer failures, not genuine quote acceptance. The reduced job only fills missing archive ordering/restoration and invalid-HTML evidence; it does not re-run the previously proven entire scenario suite. All retailer responses in that reduced test are explicitly simulated.

Source policy distinguishes explicit permanent unavailability (immediately eligible), ambiguous unavailability (two fresh checks), and transport/parser failures (not eligible). Existing five-item-cap evidence remains in `mongo-staging-results.json`; no new cap result is claimed solely from source inspection.

## Croma preservation

**PASS: preservation and inherited genuine VPS verification.** Current adapter SHA-256 matches the previously tested VPS adapter:
`4be6c32c90c28757f1cb3ad2ea399274387088612f214d579c8de7e154f18c71`.
See `croma-preserved-evidence.json`. Existing exact SKU 317463 returned BUY ₹33,900 with stock null; SKU 300154 returned ₹2,799 with stock null; SKU 312748 returned ₹21,990 with stock null. These are prior genuine direct API observations, not current refreshed offers. The unchanged successful checks were not repeated. No blocked Cloudflare Croma request was made.

Production VPS, database, PM2, LivePriceService, Croma adapter, watcher, website and ad/social pipelines were not changed.
