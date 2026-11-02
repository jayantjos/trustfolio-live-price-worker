# Targeted pending Worker work — 2 November 2026

Authoritative status: [PENDING_WORKER_FIXES_STATUS.md](../../PENDING_WORKER_FIXES_STATUS.md), [Croma comparison](../../CROMA_VPS_VS_CLOUDFLARE_REPORT.md), [future connection plan](../../FUTURE_BACKEND_CONNECTION_PLAN.md).

Original 300-product audit remains 108 PASS / 16 FAIL / 176 UNVERIFIED. This folder adds targeted source/fixture/live evidence; it does not replace audit acceptance or authorize Mongo writes. Six Croma SKUs only; Cloudflare API 403 all six, VPS retained. Final Worker version and exact code commit in final-deployment.json; no backend cutover.

Source snapshots are deliberately not published. croma-vps-evidence.json retains source SHA256 hashes and actual non-secret API traces. Run backend-contract-canary.mjs with a private directory containing read-only LivePriceService.js/ProductAvailabilityPolicy.js snapshots. backend-proposed-canary.cjs needs private LivePriceService.js/LiveBudgetRecommendationService.js snapshots and creates proposed copies locally; never run against production service paths. Both use mocked dependencies, no Mongo connections or network calls. Current production sources were not edited.

Targeted live results do not promote UNVERIFIED audit rows. Price movement 199/220 now matches older evidence but lacks a contemporaneous independent visit. Missing primary JSON-LD remains unverified; not a fabricated OOS result. Mapping proposals are review-only and retain original catalog identities.
