# Worker contract check

**PASS — supported-client authentication and Amazon extraction. FAIL — fresh Flipkart success gate. BLOCKED — complete safe production compatibility.**

Direct GitHub-runner Node20 native fetch, same HTTP client class as actual developer LivePriceService. No user-agent spoofing, proxy bypass, retailer browser probes/screenshots, Mongo credentials or production backend calls. [Run 41583883574](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41583883574).

|Check|Result|Observed evidence|
|---|---|---|
|Health|PASS|HTTP200,206ms, worker identity trustfolio-live-price-worker, application version1.2.2|
|Missing key|PASS|HTTP401,36ms; zero items|
|Wrong key|PASS|HTTP401,76ms; zero items|
|Matching key|PASS|Actual authenticated application results; GitHub secret only, never logged|
|Amazon B0D41L64NR|PASS, extraction scope|HTTP200, ₹33490, exact ASIN, status/verificationStatus ok; 2185ms RTT; upstream2090ms; fresh|
|Flipkart WMNHBK4HNYBSDJ9U|FAIL current successful-quote gate|HTTP200 but priceNum/price null; status error, html_read_failed, verificationStatus temporary_error, stock null; 6538ms RTT/upstream6500ms|
|1042|PASS in this bounded sample|Not observed; does not establish future reliability|
|Current production credential provisioning|BLOCKED|Production key remains unset; valid Actions key was not copied during failed safety gate|

Amazon accepted source amazon_price_to_pay_parts; both stock aliases true in quote. Previous independent primary-price evidence is reused; no new independent retailer-price comparison was made, so this report does not newly certify current selling-price accuracy from HTTP200 alone.

Flipkart was a genuine price attempt, not a simulated failure. Null price and unknown stock were retained; no quote acceptance or database persistence occurred. The observed temporary html-read deadline failure is not proof of a parser defect. No retry or Worker redeployment was performed. Existing OOS/missing-price safety evidence is reused; additional live canaries were stopped. Records155/234 were not requested.

Rays: health a548f6596e716ee6-DFW; missing a548f659af3c6ee6-DFW; wrong a548f65a1c18f78b-DFW; Amazon a548f65a597c6ee6-DFW; Flipkart a548f66808a16ee6-DFW. Full timestamps, request IDs and responses: worker-node-results.raw.json.

## Client diagnostic boundary

Initial Python urllib controls [41583769675](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41583769675) returned non-JSON403, including health/auth/first price attempt; harness stopped. A single purposeful supported-backend-client comparison above succeeded for routing/auth. Different clients/egress points/runs mean the exact403 cause remains UNCONFIRMED; no security policy was bypassed or changed. The Python harness field retailerRequests counts submitted Worker price requests, not proven upstream retailer fetches. Its blocked request is not counted as a successful genuine retailer quote.

Raw Node harness status PASS originally measured auth and echoed ID only. It does NOT mean the Flipkart price passed. The saved source now computes a separate finite accepted-price check; no extra live rerun was needed to correctly classify the preserved null/error response.

## Existing backend contract and minimal-change review

POST /api/check + x-api-key + {items:[item],useCache:false,browserProbe:false}; response results[0].amazon/flipkart with status,priceNum,price,inStock/in_stock,verificationStatus,extractionSource and exact ASIN/PID. Architecture/transport shape matches, but a URL/key-only replacement is not yet safe.

- Current6000ms caller is shorter than Worker6500ms upstream; observed6538ms response exceeds it. Candidate8000ms per call equals current frontend8000ms total attempt and does not close complete-response deadline compatibility.
- Product URL projection/selection, finite verified price handling, stock null/alias handling and failed-live stale-fallback safety need the already tested compatibility corrections.
- Existing six-file candidate also touches candidate eligibility/window labels and controller/category refresh timing. Scoring/order, policy/Croma source stay unchanged, but these are behavior changes beyond configuration. Do not blindly deploy the whole diff for this scoped replacement.
- Exact PID safeguards are reused as price-request safety; no specification/model research or catalog edits were performed.

No production patch was selected/deployed while the mandatory timeout gate remains open. OOS/null safety, actual service/DB persistence and all-three Top-5 previously passed in staging; those are reused, not relabelled current native production acceptance.

