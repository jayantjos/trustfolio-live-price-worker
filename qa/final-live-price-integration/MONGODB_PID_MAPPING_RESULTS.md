# MongoDB PID mapping results

**Result: BLOCKED — two exact Flipkart PIDs remain unconfirmed.** Evidence: real production MongoDB **read-only** queries and genuine bounded retailer HTML requests; no simulated mapping and no production writes.

Read-only source: [run 41504885028](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41504885028), commit `4e7617f09e1893ffcc63496a7091cbf8568732ba`. All field names and identifier/URL/title/specification/affiliate fields are preserved in `source-summary.json`. The real source snapshot read was 2026-11-02T19:03:43.219666+00:00.
Retailer evidence: [run 41506456208](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41506456208), `remaining-mapping-network-results.json`.

| Audit record | MongoDB fixture ID | Product | Stored platform_product_id | Affiliate | Result |
|---|---|---|---|---|---|
|155|69f419289a622ea2d7ccb608|GAMESOUL JS39P drone|itmf65781027269c|https://fkrt.clnk.in/Cfva|BLOCKED|
|234|69f4026f9a622ea2d7ccb2e6|DZAB i5/16 GB/512 GB/22-inch desktop|itmf0e126c67d776|https://fkrt.clnk.in/Cftt|BLOCKED|

The clean, ordinary and original product URLs resolve to the matching `/p/itm…` listing without a `pid=` query. Nested affiliate.original_url points to the same listing; affiliate status is pending. The stored itm page identifiers are **not confirmed SKU/PIDs**.

- Record 155: canonical https://www.flipkart.com/gamesoul-js39p-4k-brushless-motor-gimbal-camera-drone-display-remote/p/itmf65781027269c; HTTP 200; 376196 bytes; 1383 ms; primary JSON-LD Product count 0; SHA-256 `6b9234554438167ba76b5513cb51885026ab5a0e4888ff9ece561a3a0501e93f`.
- Record 234: canonical https://www.flipkart.com/dzab-gaming-core-i5-16-gb-ddr4-512-ssd-windows-11-home-4-gb-22-inch-screen-di5-3470-61-16-512-22-11/p/itmf0e126c67d776; HTTP 200; 1210794 bytes; 2434 ms; primary JSON-LD Product count 0; SHA-256 `0e48681730dfe683aede63fa8eee54406da12d1eb854a2b6efbade3237938a3e`.

HTTP 200 did not supply trustworthy unique primary Product SKU evidence. No unrelated recommendation IDs were promoted to primary identity. No guessed PID, alternate product, Worker quote, or MongoDB change was made for these two records.

**Remaining blocker:** an exact retailer-confirmed SKU/PID or authoritative canonical URL tied to each same model/variant is required. Mapping investigation completed; actual price acceptance for these records remains BLOCKED.

**Lenovo mapping: PASS, staging only.** MongoDB's original identifier was page ID `itmd2a376187074e`; the previously independently confirmed PID `COMHCYMG83BGNQHH` was explicitly selected in the disposable fixture. A new independent primary Product/Offer capture confirms the same 4 GB/64 GB model and current ₹22,911. Production mapping is unchanged.

