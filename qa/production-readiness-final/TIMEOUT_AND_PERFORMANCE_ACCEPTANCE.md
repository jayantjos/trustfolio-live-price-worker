# Timeout and performance acceptance

**PASS — staged timeout alignment and bounded failure safety. Native production-topology UX/deadline acceptance remains BLOCKED/UNVERIFIED.**

Date: 3 November 2026 (IST). Raw timestamps and Ray IDs retain UTC for correlation.
Evidence: [affected guards / real three paths](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41573927581), [final fixed three-platform regression](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41574910954).
Raw: initial-final-integration-results.json, final-three-platform-results.json, bounds-fix-regression-results.json.

## Actual budgets and minimum staging fix

Actual developer LivePriceService hardcoded6000ms; permanent Worker index.js retrieve() uses AbortSignal.timeout(6500), including upstream response/body handling. Browser probing is false; no browser30-second path enters these tests. No permanent Worker change/deployment was needed.

Candidate backend caller **8000ms = 6500ms upstream +1500ms margin**. This is staged code, not a production environment increase. The Worker request remains fresh single-item; backend Mongo freshness remains60seconds. The existing inflight deduplication/architecture is preserved.

A valid genuine Bosch response took **6695ms** (Worker item handling6439ms), which would exceed the old6000ms caller but succeeded safely within8000ms. This is demonstrated need, not a blind production timeout increase.

## Clearly bounded sample

Twenty-one genuine fresh Worker requests through actual service and real disposable MongoDB:10 initial affected-integration,1 focused Haier bounds regression,10 final fixed integration. The second ten-request integration was necessary after the reproduced category-metadata bug fix. Earlier parser/deletion suite and prior20-request checkpoint were not repeated as a reliability sweep.

Nearest-rank percentiles, n=21:
- p50 **2108ms**, p95 **2630ms**, maximum **6695ms**.
- Client RTT minus Worker item handling: p50181ms, p95269ms, max334ms. This includes network/serialization and is not CPU measurement.
- HTTP errors or caller timeouts in these21 requests:0. One genuine response exceeded6000ms; no1042 observed.
- Candidate waves were actual bounded concurrent batches of at most5, not a production load test.
- Two complete three-path controller samples:10207ms before metadata correction, **10105ms after correction**. For n=2, nearest-rank p50=10105ms/p95=max10207ms; two samples are not a tail-latency estimate.
- The later ₹31500 query reused fresh Mongo live metadata; it did not call all retailers again or represent cached results as new extractions.

## Controlled HTTP timeout and identity regression

**PASS — actual LivePriceService + real disposable MongoDB; local HTTP responses are SIMULATED, not retailer evidence.**

|Controlled response|Injected delay|Observed service latency|Observed outcome|
|---|---|---|---|
|valid_slow|1200ms|1210ms|ok|
|valid_near_deadline|6900ms|6908ms|ok|
|timeout|9000ms|8009ms|error|
|wrong_identity|0ms|8ms|error|
|wrong_variant|0ms|7ms|error|
|unknown_stock|0ms|8ms|ok|

The9000ms server response was aborted at8009ms; no accepted price, no unavailable-check increment and no archive/delete. Prior accepted price was preserved. Valid6900ms response succeeded. Wrong ASIN and wrong8kg variant were rejected before availability decisions. Null stock remained null. Actual archive count was unchanged by these cases; ProductAvailabilityPolicy source was unchanged.

## End-to-end limitations and exact remaining blocker

The final Croma adapter ran on the **existing VPS**: native exact-SKU API call99ms; the temporary authenticated GitHub↔SSH relay added transport/orchestration, and staging Croma RTT was7760ms. Complete10105ms is the actual measured response, not a claimed native-VPS production timing. Do not subtract relay overhead and advertise an unmeasured faster response.

The wave admission guard avoids starting another8000ms fetch wave after8000ms elapsed; it is **not a hard16000ms HTTP deadline** because MongoDB/controller work also consumes time. Frontend/proxy/global caller timeout compatibility still requires explicit native-topology acceptance.

[Read-only native capability run 41575423669](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41575423669): docker/podman/mongod/mongosh absent; unshare present. No runtime was installed, production Mongo used for staging writes, or VPS configuration changed. **BLOCKED: native isolated staging runtime/access condition; UNVERIFIED: native full response UX and outer client/proxy deadlines.**

## Access anomaly retained honestly

Five initial Python-harness Worker attempts reported403 before independent reads, but that harness omitted failure URL/headers/Ray; their origin/cause is unconfirmed. They are not counted as genuine retailer successes. One bounded auth-only diagnostic then returned health200, missing/wrong401, valid200 with actual unsupported_product_url handler response; all21 actual-service quotes subsequently returned200. Diagnostic uses an explicit TrustFolio client identity, but no claim that a User-Agent policy was proven as root cause is made. No secret rotation, access-control bypass or repeated39-request1042 experiment occurred.

