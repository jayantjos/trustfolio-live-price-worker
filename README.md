# TrustFolio Live Price Worker

An independently deployable Cloudflare Worker. It has a **real Worker entry point**, fixes the blank-README build failure, and provides a compatible `POST /api/check` response for Amazon India and Flipkart URLs.

## Important truth about prices

This Worker **only returns a `Live` price when the requested store page actually contains a verified product-specific selling price**. It will not invent one from catalog/MRP/bank offers. For the specific Flipkart POCO X8 Pro Max (Blue, 512 GB), the previously observed HTTP 200 HTML did **not** contain its price at all, and Chromium also returned an empty product shell. A new Worker **cannot guarantee** fetching that SKU without another legitimate price-bearing source or browser-rendered session. In such cases it returns `status: "error"`, which must **not** delete the product or generate a `Live` badge.

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
