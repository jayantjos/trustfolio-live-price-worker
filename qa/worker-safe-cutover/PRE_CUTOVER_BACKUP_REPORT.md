# Pre-cutover backup

**PASS — private filesystem/config snapshot and private restore verification. No cutover.**

Observed 3 November 2026, 10:54 IST (05:24 UTC). Backend QA run [41583713914](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41583713914).

- Private VPS directory: `/home/scraperuser/trustfolio-cutover-backups/20261103T052423Z-41583713914`; parent/directory permissions0700, archive0600. The source archive, environment, PM2 state and credential material stay on the VPS. Only sanitized metadata was uploaded.
- Archive: production-before-worker-change.tar.gz; SHA256 `0805617812b132f1ad6d624d02e12ea3233b680afed5ac7728d5111120b81357`; 203050 bytes; 119 files. No existing backup overwritten.
- Includes backend source/config/.env/package files, LivePriceService, PM2 private jlist/dumps and three Nginx files. Runtime dependencies, .git internals, logs and uploads excluded. Git revision `27f2127477cecc939294afc199e3ae33c4519eb2` plus per-file manifest preserve the deployed source baseline; this is a configuration/source backup, not a MongoDB or node_modules backup.
- Every archive member was extracted into the private restore-verification directory and SHA256 compared with the source manifest: PASS. No file was restored over live configuration. First attempt [41583626625](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41583626625) stopped on tar hardlink verification; corrected materialized archive passed. Earlier partial backup retained privately and is not the verified restore target.
- MongoDB read-only admin ping PASS; no production DB write/delete. All PM2 processes online; backend PID130603/restart count12 unchanged before/after.
- Active configured URL is https://spring-shape-2759.1shailendrasoni1.workers.dev. PRICE_WORKER_KEY was unset in inspected effective PM2/backend-dotenv sources. This exact previous credential state is preserved; no credential was printed or rotated. New GitHub TF_PRICE_WORKER_KEY is valid but has not been installed into production while gates are blocked.

Current source hashes match the reviewed patch base: LivePriceService03d5c3c8…; ProductController4d927892…; recommendation136ece57…/cadaae48…; unchanged policya814eb2a… and Croma4be6c32c…. Full safe hashes in precutover-backup-results.json.

**UNVERIFIED — live rollback activation and old Worker selling-price functionality.** File restoration alone does not establish those gates. See ROLLBACK_VERIFICATION.md. No production config, process, Worker deployment or catalog change.

