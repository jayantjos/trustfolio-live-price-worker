# Flipkart temporary failure retest

**PASS — two bounded fresh genuine Worker quotes and fresh independent primary-price match. No Worker fix/deployment.**

Exact PID **WMNHBK4HNYBSDJ9U**; page itm85c805abf4849. [Run 41586290819](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41586290819).

|Request UTC, 3 November2026|HTTP|Selling price|Status / verification|Stock aliases|Source|RTT|Upstream|Ray|
|---|---|---|---|---|---|---|---|---|
|05:51:12.627|200|₹34490|ok / ok|true / true|jsonld_product_offer|1166ms|999ms|a5491b187d1ba60a-PDX|
|05:51:25.797|200|₹34490|ok / ok|true / true|jsonld_product_offer|1008ms|914ms|a5491b6a6d50aee3-PDX|

Exactly two authenticated requests, each useCache:false/browserProbe:false. A12-second pause followed the first response. No additional genuine Godrej requests were made in the integration runs; occurrences in controlled tests are simulated responses without outbound retailer traffic. Nothing was hardcoded as an expected current success price.

Independent primary Flipkart UI was deliberately refreshed once at **06:10:31.453UTC /11:40:31IST**. Same exact PID, selected9kg Non-WiFi listing: primary selling price₹34490, MRP₹58500, promotional bank/offer price₹29240, separate Protect Promise fee₹236. Only₹34490 matched the accepted quote. Primary seller KLPLWORLDRetail. Buy-now was visible; delivery location was unset, so universal pincode availability is not certified. This is a fresh independent observation about19minutes after the quotes, not a claim of simultaneous atomic price comparison. See fresh-primary-flipkart-evidence.json. No specification/model investigation or screenshot was performed.

## Failure classification

The saved earlier failure returned html_read_failed after6500ms upstream/6538ms RTT. Actual index.js calls boundedText(resp) before extractPrice; html_read_failed comes from that body-read catch. Therefore that failed attempt did not reach price parsing. Both new fresh requests parsed normally. Evidence supports an intermittent upstream/body-read delay/failure, consistent with the6500ms deadline; the historical catch suppresses the exception type, so exact timeout versus another body-stream error remains **UNCONFIRMED**. No parser defect was reproduced, and no speculative fix/redeployment was made.

Historical temporary error retained null price/unknown stock, not OOS. No production MongoDB record was written/deleted. Current extraction/observed price PASS is scoped to this PID/sample, not all future retailer responses.

