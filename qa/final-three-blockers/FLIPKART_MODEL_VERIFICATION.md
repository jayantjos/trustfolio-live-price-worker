# Flipkart model verification

**PASS — direct catalog → exact retailer PID → retailer-declared manufacturer model binding for all three listings.** Independent manufacturer-owned technical-document corroboration remains limited as stated below; no factory certificate or universal specification accuracy is claimed.

Environment: read-only current VPS MongoDB identity query; normal independent browser primary product detail/specification drawers; targeted manufacturer-document research. No Worker redeployment, catalog writes, price sweep or screenshots.
Current catalog read: 2026-11-03T04:37:34.077478+00:00. Evidence: native-catalog-results.json and primary-model-evidence.json.

|Catalog record|Canonical page / exact PID|Primary Model Name|Matching known attributes|Status|
|---|---|---|---|---|
|69f419329a622ea2d7ccb736|itm85c805abf4849 / WMNHBK4HNYBSDJ9U|WFEON ZUS 9014 5.0 IDCRM GLWH|Godrej, 9kg, Glacial White (White, Grey); 1400rpm; Fully Automatic Front Load; non-WiFi; in-built heater|PASS listing-model binding|
|6a1013380f397d1e1344dd59|itm1ad6a5136676c / WMNG4WGVXYSRYHJZ|70FLAM5W|Motorola, 7kg, White; 1400rpm; Fully Automatic Front Load; non-WiFi; non-inverter; in-built heater|PASS listing-model binding|
|6a2c08a19665e4a0b177b34b|itm5b001b74dc1cc / WMNHHUCY5FWTHBAN|EFL80-IM12F3BKU1|Haier, 8kg, Black; 1200rpm; Fully Automatic Front Load; WiFi; in-built heater|PASS listing-model binding|

## Direct evidence chain

The current catalog records have title/brand/capacity/configuration and canonical URLs; no explicit model-number field. Godrej and Motorola retain itm page identifiers; current Haier already has SKU WMNHHUCY5FWTHBAN. No claim is made that this task changed that production state.

Each canonical page was opened at its exact pid= value. Within its own **Product highlights → Specifications → General**, the Model Name above was visibly read. Capacity, front-load configuration, finish, heater, RPM and WiFi fields belonged to the primary specification drawer, not a similar-product card. Observations: Godrej04:39:41Z, Motorola04:40:17Z, Haier04:45:17Z on2026-11-03 (raw timestamps UTC). The source URL and catalog fields are preserved in JSON.

This completes the previously missing explicit model-number link. Existing independent selling-price/PID evidence is reused; the browser observations were model verification, not a new Worker price audit.

## Manufacturer sources and limits

- Godrej's official [washing-machine manual index](https://www.godrejenterprises.com/support/appliances/washing-machines/user-manuals-and-catalogues) links an Eon Regalis manual at https://static.godrejenterprises.com/Eon_Regalis_73808e574f.pdf . Direct research retrieval returned403. A secondary tracker suggested the same WFEON model, but it was used only as a lead, not the acceptance authority.
- Motorola's exact primary Flipkart listing explicitly names70FLAM5W in its Model Name field and primary description. A separate manufacturer-hosted appliance manual tied to this exact PID was not established. Phone firmware pages and a mirror manual with a different70FLIAM5W string were rejected as proof.
- Haier's [brand-store model page](https://www.haierindia.com/washing-machines/haier-f3-8kg-front-load-washing-machine/efl80-im12f3bku1) is search-indexed with the exact EFL80-IM12F3BKU1 model,8kg, Black,1200rpm and525mm drum. Direct research retrieval returned503. Its indexed depth500mm differs from retailer465mm; neither is silently substituted. Current Mongo catalog does not assert depth, so the known catalog identity fields have no depth conflict. Full technical-spec equivalence remains UNVERIFIED.
- Retailer Godrej metadata includes a Pulsator wash-method label despite its explicit front-load type; no claim of verifying every auxiliary specification is made.

**OEM-only datasheet certification: UNVERIFIED for the complete three-product set.** The PASS above is the authoritative retailer's explicit manufacturer-model declaration bound to the exact SKU and known catalog attributes. It must not be described as three independently retrieved factory datasheets.

## Policy and regression

A reviewed exact-listing policy can safely limit accepted quotes to the proven canonical page/PID, brand/capacity/known finish and finite primary selling price, excluding any conflicting context. It cannot fill missing fields for other products or assert unverified dimensions. A stricter OEM-document-only policy would still require the missing documents; it was not silently adopted or waived.

The three newly resolved bindings were added to evidence fixtures; **12 focused pure identity assertions PASS** (three catalog-to-PID resolutions, accepted exact identity, wrong PID rejection and wrong-capacity rejection). These are unit evidence, not extra retailer requests. No candidate backend behavior changed. Test: model-binding-regression.cjs.

Remaining safety limit: scope is these three exact listings. Manufacturing provenance, all ancillary dimensions and other catalog products are not globally certified.

