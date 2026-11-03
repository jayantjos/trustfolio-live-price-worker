# Top-5 primary price and variant accuracy

**PASS — all five tested selling prices match separate primary retailer evidence. UNVERIFIED — explicit manufacturer model-number equivalence for the three Flipkart catalog records.**

The earlier ₹35000 list was reused by exact identity; no historical price was hardcoded as a success expectation.
Genuine Worker quotes came through actual staged LivePriceService in [run 41573927581](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41573927581).
Independent HTML: [run 41574023843](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41574023843) and [Amazon primary-parts completion 41574514539](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41574514539).
Raw price-comparison-results.json contains timestamps, hashes, exact URLs/IDs and Ray IDs.

|Retailer / identifier|Current Worker price|Independent primary price|Brand/capacity/finish evidence|Explicit model evidence|Result|
|---|---|---|---|---|---|
|Flipkart WMNHBK4HNYBSDJ9U|₹34490|₹34490|Godrej9kg; primary title White/Grey; Product color Glacial White|Model number not supplied by catalog/primary JSON-LD|Price PASS; explicit model UNVERIFIED|
|Amazon B0D41L64NR|₹33490|₹33490|Bosch9kg, White, front load|WGA14200IN in primary title/specifications|Price/model PASS|
|Amazon B0GX9P1BWT|₹32990|₹32990|Samsung7kg, Inox, front load|WW70FG4S02AXTL in primary title/specifications|Price/model PASS|
|Flipkart WMNG4WGVXYSRYHJZ|₹33990|₹33990|Motorola7kg, White, front load|Separate manufacturer model number not captured|Price PASS; explicit model UNVERIFIED|
|Flipkart WMNHHUCY5FWTHBAN|₹30130|₹30130|Haier8kg, Black, front load, AI/steam features|Separate manufacturer model number not captured|Price PASS; explicit model UNVERIFIED|

Every Flipkart independent response contained exactly one primary Product with the exact SKU, one INR Offer and InStock availability. This verifies the exact retailer listing/PID and known variant attributes; it does not invent an unavailable manufacturer model field. Amazon identity was independently supported by primary ASIN input/canonical identity and model-bearing primary title/specifications. Amazon primary priceToPay whole components33490/32990 were used, not MRP, recommendations, coupon or alternate-seller minimum. Independent Amazon stock/delivery accuracy beyond listing-price evidence was not separately certified.

The first independent Amazon harness captured only offscreen spans and missed whole/fraction markup. Only the two incomplete captures were repeated with independent priceToPay whole/fraction handling. This was an evidence-harness completion; no Worker/parser defect or deployment.

Independent comparisons were separate HTTP captures approximately63–244seconds apart from their matched Worker observations, with exact times preserved. They are contemporaneous observations, not an atomic transaction or future price guarantee. No screenshot/browser rendering or retailer restriction bypass was used.

## Catalog-context enforcement and remaining evidence

Candidate guard requires the exact returned ASIN/PID and retailer URL, brand, known dimension/color/storage conflicts and explicit catalog model fields when supplied. Unknown page IDs are not SKUs. A read-only allowlist resolves five previously primary-SKU-confirmed canonical pages in memory; production MongoDB is not altered.21 focused pure mapping/identity regressions PASS; genuine integration previously exercised the same approved request IDs with staging fixture mappings.

**Remaining blocker classification: catalog-data problem + external retailer metadata limitation.** For the three Flipkart records, complete explicit model equivalence requires authoritative manufacturer model data linked to those exact SKUs and a matching catalog expectation. Their primary selling-price/PID verification is PASS; do not promote that to an exhaustive model-number certificate.

No new authoritative evidence exists for155/234; no repeated unsuccessful searches were made. They remain BLOCKED and are excluded by the candidate mapping guard. See PID_EXCLUSION_AND_MAPPING_PROPOSAL.md.
+A final model-only targeted pass ([run 41576247660](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41576247660)) inspected parsed JSON/script state tied to each exact primary SKU. Each returned HTTP200, four JSON trees, and no usable owner-bounded model field. See flipkart-model-results.json. It did not repeat Worker price checks, inspect155/234, or promote unrelated recommendation models. These three model-number gates therefore remain UNVERIFIED.

