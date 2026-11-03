# Native VPS and frontend performance

**FAIL — current complete timeout-contract compatibility. BLOCKED — safe isolated native full Top-5 execution. PASS — read-only native contract inspection and controlled reproduction.**

Environment: actual live VPS PM2/config/source/build inspection only; separate credential-free GitHub-runner HTTP control. No production price endpoint, backend deployment/restart, Mongo write, Nginx change or runtime installation.

Evidence: [native inspection 41579209184](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41579209184), [focused build/runtime inspection 41579896622](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41579896622), [actual-wrapper control 41580630569](https://github.com/jayantjos/trustfolio-live-price-worker/actions/runs/41580630569).
Raw: native-catalog-results.json, focused-timeout-results.json, frontend-deadline-results.json.

## Actual request chain and configured budgets

|Hop|Observed configuration|Interpretation|
|---|---|---|
|Website frontend|src/services/api.service.ts DEFAULT_API_TIMEOUT_MS=8000; fetchAPI AbortController at lines188–190; getTopProducts uses that wrapper|8000ms per API base attempt unless NEXT_PUBLIC_API_TIMEOUT_MS overrides|
|Current frontend override/build|Inspected frontend .env has no timeout value; PM2 web timeout env absent; deployed JS contains default8e3 and timeout-wrapper code|8000ms current default/build contract; no secret values emitted|
|Website Nginx|trustfolio.in/www →127.0.0.1:3000|Next frontend; existing production listener unchanged|
|API Nginx|api.trustfolio.in →127.0.0.1:8081; no proxy timeout override in reviewed nginx.conf/sites/conf.d|Documented proxy read/connect/send defaults60s inferred, not a measured native Top-5 timing|
|Native backend Node|v20.20.2; server.js app.listen, no response-timeout assignment|Native HTTP defaults measured in a separate non-listening Node instance: socket timeout0, requestTimeout300000, headersTimeout60000, keepAliveTimeout5000|
|Production LivePriceService|6000ms hardcoded; candidate patch8000ms|Only candidate per-Worker budget has been staged; production unchanged|
|Permanent Worker|6500ms upstream fetch deadline, browserProbe:false|Reused inspected Worker source; no deployment|
|Croma VPS adapter|curl connect3s / total5s per search; execFile5500ms; queue64 and max concurrency default8|Per-attempt bounds, not one overall multi-search/request deadline; adapter source unchanged|
|Mongo catalog ranker|maxTimeMS default6000 per query; configurable BUDGET_QUERY_MAX_TIME_MS|Not a global Top-5 deadline|
|Mongo connection|Actual mongoose.connect(uri,{dbName}) with no explicit timeout options|Driver connection/selection/operation defaults and any URI overrides must not be mistaken for a total response deadline; numeric option inspection saved separately|
|Candidate full recommendation|Up to4 waves; admission guard after8000ms|Not a strict16000ms complete-response cancellation boundary|

Node keepAliveTimeout concerns idle connection reuse, not permission to spend only5seconds generating a response. Request/header reception timeouts likewise do not guarantee complete handler latency. Nginx proxy_read_timeout is between read operations, not a full-response SLA; [official documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout) gives the60-second default.

## Newly demonstrated mismatch

The frontend's8000ms total fetch attempt equals the candidate's8000ms single Worker-call allowance, leaving no margin for Mongo queries, extra waves, category refresh, proxy/network overhead or a multi-attempt Croma search. This is a real configuration/contract gap; a fast sample alone cannot prove safe deadline nesting.

The **actual current frontend fetch wrapper** was transpiled unchanged and run against a local HTTP origin deliberately delayed9000ms:
- Current8000ms setting aborted at **8003ms**, error All API bases failed / timed out after8s.
- A hypothetical staging-only20000ms outer setting received the same delayed response at **9012ms**.
- No retailer/DB/proxy traffic was involved in these two controls. The second is a configuration demonstration, **not** a validated native production fix. No frontend setting was changed.

The previous complete three-platform10105ms result includes a temporary relay; it is retained as measured history, never converted into an estimated native result by subtraction.

## Native isolation prerequisite — checked, not assumed

Docker, Podman, mongod, mongosh, bubblewrap and proot are absent. unshare exists, but a user/mount/PID namespace probe failed: **write /proc/self/uid_map: Operation not permitted**. No safe credential-separated native write process/disposable Mongo environment was established under the unchanged-server restriction.

A process simply sharing the production account and credentials or using production Mongo under a different name is not substituted for that boundary. Required prerequisite: an authorized isolated native staging runtime/service account with no production credentials and a dedicated disposable Mongo endpoint, plus a staging-only listener/proxy path. Nothing was installed, opened publicly or restarted.

Therefore native full HTTP response time, five-product output through the native frontend/proxy-equivalent path and absence of premature abort are **BLOCKED / UNVERIFIED**, not PASS. Existing real three-retailer selection evidence is reused.

## Next scoped correction

Before cutover, agree/enforce a true backend aggregate deadline covering query/wave/Croma/persistence work, place an outer frontend/proxy budget above it with measured margin, and validate on the isolated native route. The existing frontend supports an override, but do not blindly deploy20000ms based on the local control: current Croma/Mongo/wave work has no coordinated total cancellation boundary.

No production configuration change, frontend redesign or unsupported Croma route was made. This combined native-isolation/deadline gate is the outstanding cutover blocker.

## Numeric option verification

[Read-only numeric-options run 41580950427](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41580950427) found no overrides for LIVE_PRICE_FRESH_MS, CROMA_MAX_CONCURRENT, BUDGET_QUERY_MAX_TIME_MS or NEXT_PUBLIC_API_TIMEOUT_MS in the inspected PM2/backend dotenv sources; inspected Mongo URI query strings contained no timeout options. No URI/host/credential was emitted. Actual installed versions: mongoose8.22.1 and mongodb6.20.0. Thus the documented source defaults apply: query maxTimeMS6000, Croma concurrency8 and frontend8000.

MongoDB driver connection/selection defaults are30000ms, socket/pool wait defaults0 (no configured finite timeout). These are transport/query semantics, not a complete-response guarantee. See numeric-timeout-options.json and the [driver6.20 API](https://mongodb.github.io/node-mongodb-native/6.20/interfaces/MongoClientOptions.html). Production server response budget is not safely bounded by the frontend8s attempt.


