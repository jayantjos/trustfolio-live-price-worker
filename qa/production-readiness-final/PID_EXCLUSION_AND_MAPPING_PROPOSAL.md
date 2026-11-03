# PID exclusions and mapping proposal

**BLOCKED — exact PIDs for audit155/234. PASS — safe exclusion proposal and focused resolver tests. Catalog-data problem; no new authoritative evidence or repeated HTML searches.**

-155: Mongo69f419289a622ea2d7ccb608; pageitmf65781027269c; GAMESOUL JS39P.
-234: Mongo69f4026f9a622ea2d7ccb2e6; pageitmf0e126c67d776; DZAB desktop.

Both canonical pages remain absent from the approved mapping table. Candidate workerItem returns null for their no-PID page identifiers; LiveBudgetRecommendationService excludes unsupported rows even if legacy price/live data exists. Preserve their production records; no delete or guessed mapping is proposed. No production MongoDB write is required for this exclusion.

The review patch contains five read-only canonical page→PID approvals already supported by primary Product SKU evidence in qa/final-live-price-integration/ (four washing machines plus Lenovo11IJL9). It resolves these in memory with exact page, brand and known capacity checks; conflicting existing PID or wrong capacity/brand is rejected. This makes deployment independent of staging-only Mongo fixture edits. Those new pure-resolver branches passed21 focused unit assertions, including blocked155/234. Genuine integration already exercised identical approved request IDs through the full pipeline, with fixture mappings; the final read-only allowlist was added afterward and was not separately rerun through a real DB/network request.

Before adding another entry: obtain an exact authoritative primary SKU tied to the same canonical URL/model/variant, record provenance and expected catalog context, review the mapping, and rerun only affected identity checks. An itm page ID, affiliate URL, recommendation SKU or plausible guess is insufficient. Production catalog corrections, if later chosen, require a separate reviewed scope.

