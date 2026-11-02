# Proposed backend changes

These changes are not deployed. Production Worker configuration, MongoDB and Top-5 behavior remain unchanged.

The patch handles product_url aliases, preserves false/null stock and rejects stale/error/OOS/over-budget Top-5 candidates while retaining ranker order.

The canary script was run against safely retrieved copies of the existing LivePriceService.js and LiveBudgetRecommendationService.js beside the script in scratch. It reproduces original defects and checks proposed replacements in isolated VMs with mocked dependencies. It makes no network or database calls. To reproduce, place those exact service-source copies beside the script and run node test-canaries.cjs in a non-production scratch folder. Never point it at production output files.

Real authenticated backend, Mongo update, min/max refresh and live Top-5 canaries remain required. Do not apply the patch or switch production until the readiness gates and explicit approval are satisfied.
