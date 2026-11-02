# Cloudflare Support case — draft, not submitted

**Subject:** workers.dev HTTP 404 / error 1042 despite enabled route and active 100% deployment; historical Ray correlation requested

Account ID: `354ff26b7db5ae21ded578fbae86c15f`; account subdomain: `jayantjoshi-joshi`.
Incident date: **2026-11-02 UTC**. No production change is requested.

## Affected deployments

| Hostname | UTC request window | Active deployed version |
|---|---|---|
| trustfolio-diag-41481560380.jayantjoshi-joshi.workers.dev | 16:27:17–16:27:27 | d493dddc-2109-4373-bfa4-cd684b51b8dd |
| trustfolio-diag-41481857078.jayantjoshi-joshi.workers.dev | 16:29:03–16:30:35 | a65e03e9-bfa4-4b29-9e85-b1a3071df70b |
| trustfolio-diag-41482339039.jayantjoshi-joshi.workers.dev | 16:32:00–16:32:16 | 7cca7632-9c95-494e-8074-3dd2ded8bfe0 |

These disposable Workers were intentionally deleted **after** evidence capture. Their present absence must not be mistaken for their state during the incident.

## Representative requests to correlate

All rows below are POST `https://<affected-host>/api/check`; the hostname is identified by run in the first column.

| Run suffix | UTC timestamp | Credential class | cf-ray | Client correlation ID |
|---|---|---|---|---|
| 41481560380 | 2026-11-02 16:27:17 | valid | a544817ccebc2ff4-DFW | 5b47a294-7a9f-4fc3-b583-f15f983c54f4 |
| 41481857078 | 2026-11-02 16:29:03 | missing | a54484131dad8638-STL | 2c16286c-7d58-4441-9850-1c57a606a4af |
| 41481857078 | 2026-11-02 16:29:03 | wrong | a5448413996653e5-STL | 802afcdb-1484-4146-af01-8c0142ff5b5b |
| 41481857078 | 2026-11-02 16:29:04 | valid | a54484141a2a53e5-STL | 032728e6-3a44-4ddf-950b-8e2cb6af8d00 |
| 41481857078 | 2026-11-02 16:30:35 | valid | a544864f3a4053e5-STL | bc17d595-ef9c-4597-ba08-b302134aaa58 |
| 41482339039 | 2026-11-02 16:32:01 | valid | a5448866da59a8ce-STL | ce7bd776-ff5e-422b-be5c-7f47e554901d |
| 41482339039 | 2026-11-02 16:32:16 | valid | a54488c5ef3445a4-STL | ee19aaa7-d6d8-4aca-904e-0dade28723ce |

Observed: all 39 historical authentication-only requests returned HTTP 404, body `error code: 1042\n`, server `cloudflare`, latency 46–130 ms. The application adds handler/source/version/echo response headers, but none appeared. This does not conclusively establish handler non-execution.

Safe request shape: Content-Type application/json; User-Agent TrustFolio-Staging-Diagnostic/2.0; x-staging-request-id as above; body `{"items":["invalid-staging-product"],"useCache":false,"browserProbe":false}`. Credentials are intentionally omitted. This invalid product makes no retailer/subrequest call. Expected missing/wrong credential response is application JSON HTTP 401; expected valid invalid-product response is application JSON HTTP 200.

## Account-side findings

At incident time, saved API evidence returned workers.dev `enabled:true`, `previews_enabled:true`, correct account subdomain and a single 100% deployed version. During the second experiment this persisted over about 92 seconds of failed requests. Secret was included in one immutable deployment. The `global_fetch_strictly_public` experiment did not resolve 1042. Curl health reproduced 1042. Default Python-user-agent GET controls separately returned 403/error 1010; do not conflate these with the custom-user-agent POST Rays.

Read-only follow-up at 16:56:26–16:57:53 UTC:
- Metadata access succeeded. Account defaults are standard usage / green_compute false.
- Existing live `trustfolio-live-price-worker` route is enabled, compatibility date 2026-10-29, flags empty, logs enabled/persisted. Latest deployment observed: `d993efa1-adcd-46b0-bb56-452781c8f12a` at 16:43:47.935062 UTC; this is current metadata, not incident-time handler availability proof.
- Historical Observability queries covering 16:27:00–16:33:00 UTC succeeded. Key discovery found `$workers.event.request.headers.cf-ray`. Correlation using saved full and bare Rays returned zero events. Staging-name and production-name control queries also returned zero events; historical log coverage is therefore not validated.
- Authorized account zone listing returned no visible zones. We could not inspect corresponding workers.dev edge/security events or establish a blocking rule.
- Deleted staging metadata now returns API error 10007, expected after cleanup.

## Requested investigation

Please trace the listed historical Rays through edge routing, workers.dev script lookup and security policy. Confirm the request destination/account/script/version actually selected, whether a Worker invocation was created, and whether an upstream same-zone Worker restriction, security action, disabled/stale exposure or other routing condition generated each 1042. Explain the observed enabled-control-plane / failed-data-plane combination and specify the minimal supported staging-only remediation.

Please also identify any security rule/action behind the separate 1010 controls without disabling or bypassing security controls. Do not modify production configuration or rotate secrets.

Attachments/evidence in `qa/final-staging-acceptance/`:
`cloudflare-1042-diagnostics.json` (all historical requests), `cloudflare-1042-account-evidence.json` (safe account metadata and historical queries), and `CLOUDFLARE_1042_ROOT_CAUSE_AND_FIX.md`.

**Root cause unconfirmed. No repair or new authentication test performed in this follow-up. Full staging integration remains blocked.**
