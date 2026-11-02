# Cloudflare 1042 diagnosis and fix status

**Result: FAIL. Exact root cause: UNVERIFIED. No successful 1042 fix or clean authentication acceptance is claimed.**
Evidence type: genuine HTTP to isolated staging Workers; zero retailer requests; no MongoDB.

Baseline: checkpoint `0b2f65a831571b71b21671c2ed6d164b33f90437`.
Inspected original Actions runs [41478863603](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41478863603) and [41478638789](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41478638789), including decoded job logs. The latter run's overall conclusion was failure, although its valid Amazon and Flipkart requests individually returned 200. A wrong-key request in that run returned 1042. The follow-up returned 401 for missing/wrong keys and 1042 for the valid key. Original logs did not preserve Ray IDs or response headers.

## New controlled observations

See `cloudflare-1042-diagnostics.json` for every authentication response, request ID, Ray ID, HTTP status, latency, deployment state and version.

| Run | Source commit | Deployed version | Experiment | Auth outcomes |
|---|---|---|---|---|
| [41481560380](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41481560380) | 87fbc038457a8fa8738b29fb82929afd2a4519b8 | d493dddc-2109-4373-bfa4-cd684b51b8dd | Secret included in one immutable deployment; response identity wrapper | 12/12 HTTP 404 / error 1042 |
| [41481857078](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41481857078) | c65fa2ded056a38a3002b6c767bfc37a6e9638bd | a65e03e9-bfa4-4b29-9e85-b1a3071df70b | Route/deployment API state, live tail attempt, seven rounds across about 92 seconds | 21/21 HTTP 404 / error 1042 |
| [41482339039](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41482339039) | 6162a72270426948241565dc3d14380308af81db | 7cca7632-9c95-494e-8074-3dd2ded8bfe0 | Explicit global_fetch_strictly_public staging flag; Python and curl controls | 6/6 HTTP 404 / error 1042 |

Total new auth-only requests: 39; missing/wrong/valid: 13 each. All 39 returned HTTP 404/error 1042, 46–130 ms. All used `invalid-staging-product`, which the actual handler rejects without retailer fetches. None carried the wrapper's handler, request-echo or live-version response headers. Therefore **no new valid request demonstrated entry into the intended handler**; version identity is from the control plane, not a successful handler response.

Cloudflare API returned `enabled:true`, `previews_enabled:true`, account subdomain `jayantjoshi-joshi`, and a single 100% active version matching Wrangler's deployed version. Deployment timestamps precede all requests; cleanup occurred after collection. This rules out a simple hostname typo or intentional deletion during these samples, but does not establish successful data-plane routing.

Representative Ray IDs: `a54484131dad8638-STL` (missing), `a5448413996653e5-STL` (wrong), `a54484141a2a53e5-STL` (valid), `a544864f3a4053e5-STL` (valid after ~92 seconds). Flag experiment valid: `a5448866da59a8ce-STL`, `a54488c5ef3445a4-STL`. Curl health also returned 404/1042: `a544892479815086-STL`. Python default-user-agent GET controls returned 403/1010; these were retained and no access-control evasion was attempted.

## Hypothesis assessment

| Hypothesis | Assessment |
|---|---|
| Authentication key or body parsing | Insufficient to explain pre-handler 1042 for all three credential classes and health. The original key-dependent appearance was not reproduced. |
| Target Worker making a Worker-to-Worker subrequest | Not supported by these invalid-input/health paths: they do not fetch a retailer or another Worker. Explicit documented strictly-public fetch flag did not resolve the failure. A restriction in an unobserved upstream caller remains UNVERIFIED. |
| Deploy/secret propagation | Atomic secret deployment removed the deploy-then-secret version race. The failure persisted across ~92 seconds on one API-confirmed version. A brief secret propagation race is not sufficient to explain this observation; persistent edge propagation remains possible. |
| Wrong hostname/disabled route | Hostname matches account subdomain and deployed Worker name; API says route enabled. Control-plane/data-plane disagreement remains UNVERIFIED. |
| Python harness alone | Curl reproduced 1042 on health. Not explained solely by Python JSON handling. |
| Worker lifecycle | Requests preceded explicit cleanup; active deployment existed. Startup/runtime handler execution was not proven. |
| Platform/account configuration | Still a plausible unresolved cause, requiring account-side routing/security events or Cloudflare investigation correlated with saved Ray IDs. |

The observed failure is consistent with rejection before the response wrapper returns; this is an **inference**, not proof of a particular platform setting. Tail files were empty and did not establish a connected log session; absence of tail events alone is not proof that no handler ran.

Cloudflare's [error reference](https://developers.cloudflare.com/workers/observability/errors/) describes 1042 for unsupported same-zone Worker fetches and for workers.dev URLs with no Worker serving them. Its [compatibility documentation](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#global-fetch-strictly-public) explains the supported strictly-public flag. These definitions do not establish this account's exact cause.

## Implemented harness improvements and unresolved fix

**PASS (harness only):** atomic secret deployment, per-request correlation, response handler/version headers, safe header/Ray capture, deployed-version lookup, route/subdomain state capture, retained failed attempts and cleanup.
**FAIL (experimental configuration fix):** enabling `global_fetch_strictly_public` in the disposable staging configuration did not fix 1042. It is not a recommended production change.
**BLOCKED:** a supported configuration repair cannot be selected from the available evidence. Do not rotate keys, bypass access controls, change production routes or assert cutover readiness.

All three diagnostic Workers were deleted after preserving evidence. Existing developer Worker and production Worker/configuration remained untouched.
