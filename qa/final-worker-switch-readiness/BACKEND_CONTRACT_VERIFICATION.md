# Backend contract verification

**PASS — actual LivePriceService genuine quotes and real disposable MongoDB. PASS — final scoped controller/ranker safety controls. UNVERIFIED — complete genuine native new-package Top-5.**

Actual developer source was reread in separate read-only jobs; base hashes checked before git apply. Write-capable jobs had guarded localhost MongoDB only and no production Mongo URI, SSH key or Cloudflare deployment token. Quote-only key was CMS-encrypted to a temporary runner certificate, never printed/committed in plaintext or installed on production. Databases dropped after every run, including the safely failed first draft.

POST /api/check + x-api-key + {items:[canonicalItem],useCache:false,browserProbe:false}; results[0] exact ASIN/PID and nested store status/priceNum/price/verificationStatus/inStock/in_stock were consumed by the actual service, not a reconstructed adapter.

|Genuine canary|Quote|RTT|Connected result|
|---|---|---|---|
|Amazon B0D41L64NR|₹33490; ok/ok; amazon_price_to_pay_parts|2362ms|Correct exact product, canonical/current/string price and live metadata persisted|
|Flipkart COMHCYMG83BGNQHH|₹22911; ok/ok; jsonld_product_offer|1010ms|Correct exact PID/URL, canonical/current/string price and live metadata persisted|

Both in one connected2392ms service call. Source quote timestamp06:03UTC,3November2026; raw full responses/Rays in deadline-genuine-and-controls-results.json. No newly independent Lenovo/Amazon retailer-price comparison was performed; prior independent accuracy evidence is reused. Genuine quote acceptance/persistence is not an all-catalog accuracy guarantee.

The final minimal scope keeps the exact same tested LivePriceService/CategoryService/identity/deadline hashes, while restoring the original production ranker and removing the unused broader-candidate option. Thus common-module genuine persistence evidence is reused; the final ranker/controller path was independently exercised with controlled quotes, not represented as fresh genuine full Top-5.

## Minimum safety corrections retained

Product URL projection/selection and canonical ASIN/PID resolution; exact response ID/retailer URL guard; existing catalog-context rejection only, no discovery/enrichment; finite positive verified accepted-price persistence; both stock aliases/null preserved; failed-live prices not selected as current live recommendations; request deadline/cancellation, transaction session propagation, category refresh and cache invalidation.

Records155/234 remain unsupported/excluded by the existing mapping guard; no requests, guessed PIDs, catalog edits or production deletions. Prior unknown/conflicting identity assertions are reused where code is identical. Existing ranker scoring/quota/candidate retrieval file and Croma/availability policy files are byte-identical to production in MINIMAL_BACKEND_REVIEW.diff. The older broad ranker candidate patch is retained only as labelled historical staging evidence, not proposed for this restricted switch.

Controlled 502/timeout cases did not overwrite accepted prices, invent availability, delete products or admit stale recommendations. Controlled null stock stayed null in the frontend-facing five-product responses. Archive-before-delete/cap and rollback-on-expiry were rerun only because the new transaction plumbing affects those operations. No product insertion, scraping, specifications, social or ad changes.

