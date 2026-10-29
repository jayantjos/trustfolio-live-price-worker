# TrustFolio v0.4 E002-safe price diagnostics

Flipkart E002 is a transient storefront error, never out-of-stock. Explicit single-product Browser Run diagnostic includes safe page evidence. No guessed or MRP prices, no automatic Browser Run usage. Do not switch TrustFolio VPS production to this Worker without verified real marketplace prices.

# TrustFolio Worker v0.2: Browser Run *opt-in diagnostic*

## Tested finding

The first authenticated live POCO response was `status: error`, `error: product_page_price_not_exposed`, so the secret and API contract work; the price was **not verified**. Do not point production TrustFolio to this Worker yet.

### Opt-in rendered price test (NOT automatic on normal requests)

Cloudflare Browser Run Quick Actions can fetch JavaScript-rendered HTML. The v0.2 Worker declares a `BROWSER` binding in `wrangler.jsonc` and calls `env.BROWSER.quickAction("content", ...)` *only* for an explicitly requested single SKU. Cloudflare Browser Run is available on Free and Paid plans with usage limits; no automatic rendering occurs on ordinary requests. Your Cloudflare account may block access or Flipkart may still return an empty page.

After uploading and deploying this v0.2 package, issue a POST to `/api/check` with your own `x-api-key`, **one item**, `"useCache":false`, and `"browserProbe":true`. Check `results[0].flipkart.browserDiagnostic`. If that says `rendered_page_no_price` or `product_page_price_not_exposed`, the new test did not retrieve a verified price; do not hardcode numbers or declare LIVE. If `browser_binding_missing`, inspect the `BROWSER` binding deployment.

See https://developers.cloudflare.com/browser-run/quick-actions/content-endpoint/

### Important safeguards

- No changes to existing production Worker, VPS or MongoDB.
- Standard requests still use raw HTML only and have no Browser Run usage.
- On a rendered page, original exact product/variant price checks still run.
- Any missing/blocked price returns error instead of `not_listed`/sold-out.
- Never use the bank-offer/EMI/MRP or price of other product variants.
- Browser probe requires explicit `browserProbe:true` AND `useCache:false`, one SKU maximum.

---

# TrustFolio Live Price Worker

An independently deployable Cloudflare Worker. It has a **real Worker entry point**, fixes the blank-README build failure, and provides a compatible `POST /api/check` response for Amazon India and Flipkart URLs.

## Important truth about prices

This Worker **only returns a `Live` price when the requested store page actually contains a verified product-specific selling price**. It will not invent one from catalog/MRP/bank offers. For the specific Flipkart POCO X8 Pro Max (Blue, 512 GB), the previously observed HTTP 200 HTML did **not** contain its price at all, and Chromium also returned an empty product shell. This Worker can now optionally try a Browser Run rendered session for ONE SKU, but it cannot guarantee that Flipkart will expose the price to automated browsers. In such cases it returns `status: "error"`, which must **not** delete the product or generate a `Live` badge.

## Cloudflare Build settings

- Git repository: `jayantjos/trustfolio-live-price-worker`
- Branch: `main`
- Build command: **leave empty** (no bundler needed)
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

These settings work because `wrangler.jsonc` has `main: "index.js"`.

## Upload via GitHub website

In the repository, choose **Add file → Upload files** and upload the extracted project files. Preserve `index.js`, `price.js`, `wrangler.jsonc`, `package.json` and `README.md` **at the repository root**. The `test/` and `.github/` folders are useful, but not required for the first Cloudflare build. Commit to `main`; Cloudflare will build on that commit. **Do not upload the ZIP without extracting it.**

## Protect the endpoint before using it

In Cloudflare Worker **Settings → Variables and Secrets**, create a **Secret** (not plain text variable) named:

`TF_PRICE_WORKER_KEY`

Give it a long random value; do not paste it into chat or commit it. The Worker intentionally returns HTTP 503 for `POST /api/check` until this is configured. Health check is public:

`GET https://<new-worker-url>/health`

Once you have a secret, check a Flipkart PID via e.g. (run locally with your own secret; don't paste secret into chat):

```bash
curl -sS -X POST 'https://<new-worker-url>/api/check' \
  -H 'content-type: application/json' \
  -H "x-api-key: $TF_PRICE_WORKER_KEY" \
  --data '{"items":["https://www.flipkart.com/poco-x8-pro-max-blue-512-gb/p/itmfc8cc712fe4a5?pid=MOBHH2KYWG8UBBAF"],"useCache":false}'
```

The contract is `results[0].flipkart.status` and `priceNum`, `results[0].amazon` for Amazon, and `results[0].croma.status = "not_supported"` because your separate VPS Croma adapter remains unchanged.

## No production cutover yet

**Do not change your VPS `PRICE_WORKER_URL` until you test a real set of Amazon and Flipkart products.** Existing developer Worker must remain active. Ensure the existing `PRICE_WORKER_KEY`/new secret match on cutover; use an authorized deployment method and never commit secrets. A correct Worker response plus real prices (not just a successful Cloudflare build) is required before switching.

## Developer tests

```bash
node --test test/worker.test.js
```

## Product-specific extraction hierarchy

- Flipkart: JSON-LD Product `offers.price` with exact SKU/variant when supplied → product `ppd.fsp` → product metadata `itemprop=price`.
- Amazon: JSON-LD Product Offer → primary Amazon buy-box (`priceToPay`, `corePriceDisplay_desktop_feature_div`).
- No MRP, crossed-out list price, EMI, recommendations, conditional card/bank prices, or different storage/color products.
- HTTP 403/429/502, redirects, unknown HTML and missing prices return `error`, never `not_listed`.

This is a minimum viable Worker; marketplace responses can differ by location and may block automated requests. Browser Rendering or a verified authorized marketplace data source is a separate future integration, not silently included.

## Deploy v0.2 manually through the existing GitHub repository

1. Extract the supplied ZIP locally.
2. In `jayantjos/trustfolio-live-price-worker` on GitHub, **Add file → Upload files** or edit the root files. Upload updated `index.js`, `price.js`, `wrangler.jsonc`, `package.json`, `README.md`; keep root paths unchanged. Commit to `main`.
3. Cloudflare should build automatically. Confirm the deployment is **Ready**, and `GET /health` has `version: 0.2.0`. The existing `TF_PRICE_WORKER_KEY` secret is a Cloudflare setting; don't share or commit it.
4. The `wrangler.jsonc` browser binding is named `BROWSER`. If Cloudflare indicates that Browser Run is unavailable or the binding cannot be deployed, do not replace the working v0.1 deployment; resolve the account/binding restriction first.
5. On your VPS or your own trusted shell, run one browser probe (key will not echo):

```bash
read -rsp 'Cloudflare Worker Secret: ' TF_KEY; echo
curl -sS --max-time 60 \
  'https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev/api/check' \
  -H 'content-type: application/json' -H "x-api-key: $TF_KEY" \
  --data '{"items":["https://www.flipkart.com/poco-x8-pro-max-blue-512-gb/p/itmfc8cc712fe4a5?pid=MOBHH2KYWG8UBBAF"],"useCache":false,"browserProbe":true}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); x=(d.get("results")or [{}])[0].get("flipkart",{}); print({k:x.get(k) for k in ("status","priceNum","extractionSource","error","browserDiagnostic")})'
unset TF_KEY
```

If it returns `browserDiagnostic: verified_from_rendered_html`, verify the exact color, storage, PIN code, and final base selling price against the store page before considering production cutover. If it returns `browser_request_failed`, `browser_http_...`, `rendered_page_no_price`, or `product_page_price_not_exposed`, **the actual price is still not available**; a different authorized price source is needed. Cloudflare Browser Run may be blocked by the marketplace and does not guarantee success.
