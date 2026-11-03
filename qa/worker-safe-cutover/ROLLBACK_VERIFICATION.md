# Rollback verification

**PASS — private backup extraction/hash restoration. UNVERIFIED — live rollback reactivation and restored selling-price functionality. No rollback executed because no switch occurred.**

Verified archive: `/home/scraperuser/trustfolio-cutover-backups/20261103T052423Z-41583713914/production-before-worker-change.tar.gz`; SHA256 `0805617812b132f1ad6d624d02e12ea3233b680afed5ac7728d5111120b81357`.119 extracted files matched their manifest. Original backend revision27f2127477cecc939294afc199e3ae33c4519eb2; original source and .env/PM2 reference state are retained privately. Previous PRICE_WORKER_KEY was unset in reviewed sources; no secret value is needed in this report.

Native original-route diagnostic [41583934810](https://github.com/jayantjos/trustfolio-daily-ads/actions/runs/41583934810) used the actual default Node client from the VPS: POST /api/check with items:[], HTTP400 JSON,420ms, Ray a548f7254e65ae2d-MRS. This proves application reachability without retailer calls, not successful restored price extraction. Python403 controls do not establish that the old service is globally unavailable. No access-control workaround was used.

## Exact private verification commands — safe, no live restore

Run on the VPS as the existing backend owner; do not copy the archive, PM2 state or environment into GitHub/logs.

```bash
TF_ROLLBACK_DIR="$HOME/trustfolio-cutover-backups/20261103T052423Z-41583713914"
printf '%s  %s\n' '0805617812b132f1ad6d624d02e12ea3233b680afed5ac7728d5111120b81357' "$TF_ROLLBACK_DIR/production-before-worker-change.tar.gz" | sha256sum --check --status
"$HOME/venv/bin/python" - "$TF_ROLLBACK_DIR" <<'PY'
import hashlib,json,sys
from pathlib import Path
b=Path(sys.argv[1]);m=json.loads((b/'restore-manifest.private.json').read_text())
for name,v in m.items():
 p=b/'restore-verification'/name
 assert hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256']
print('PRIVATE_RESTORE_CONTENT_VERIFIED')
PY
```

The equivalent archive/extraction assertions have already actually passed; the above commands do not change production.

## Prepared recovery commands — NOT EXECUTED / not an approved deployment

The eventual minimal change list must be finalized after the deadline gate passes. The commands below restore the four existing files changed by the prior six-file candidate plus .env, if those files are in the approved cutover. They do not remove catalog data or reset unrelated Git changes. Any added unused helper files can remain inert after original services are restored; no deletion is required for recovery. Stop if source/config changed independently after backup; review rather than overwrite it.

**Do not run these commands now.** They are a manual recovery plan, not evidence of a tested automatic rollback. Separate concrete cutover/rollback approval and an actual critical failure are required.

```bash
# Only in an explicitly approved rollback of the reviewed candidate:
test "${TF_APPROVED_CONFIGURATION_ROLLBACK:-}" = "yes"
TF_ROLLBACK_DIR="$HOME/trustfolio-cutover-backups/20261103T052423Z-41583713914"
printf '%s  %s\n' '0805617812b132f1ad6d624d02e12ea3233b680afed5ac7728d5111120b81357' "$TF_ROLLBACK_DIR/production-before-worker-change.tar.gz" | sha256sum --check --status
"$HOME/venv/bin/python" - "$TF_ROLLBACK_DIR" <<'PY'
import hashlib,json,os,sys
from pathlib import Path
from dotenv import dotenv_values
b=Path(sys.argv[1]);root=Path.home()/'apps/trustfolio/node-backend'
m=json.loads((b/'restore-manifest.private.json').read_text())
files=['services/LivePriceService.js','services/LiveBudgetRecommendationService.js','services/ProductRecommendationService.js','controllers/ProductController.js','.env']
# Refuse unrelated dotenv changes before replacing anything.
a=dotenv_values(b/'restore-verification/backend/.env');z=dotenv_values(root/'.env')
assert not [k for k in set(a)|set(z) if k not in {'PRICE_WORKER_URL','PRICE_WORKER_KEY'} and a.get(k)!=z.get(k)]
for rel in files:
 data=(b/'restore-verification/backend'/rel).read_bytes()
 assert hashlib.sha256(data).hexdigest()==m['backend/'+rel]['sha256']
# Review current code diff and the final approved change list BEFORE this step.
for rel in files:
 src=b/'restore-verification/backend'/rel;target=root/rel
 tmp=target.with_name(target.name+'.approved-rollback.tmp')
 with tmp.open('xb') as f:f.write(src.read_bytes())
 os.chmod(tmp,m['backend/'+rel]['mode']);os.replace(tmp,target)
print('REVIEWED_FILES_RESTORED_REACTIVATION_STILL_REQUIRED')
PY
# Only the affected backend process; never pm2 resurrect or restart all:
"$HOME/venv/bin/python" - "$TF_ROLLBACK_DIR" <<'PY'
import json,os,subprocess,sys
from pathlib import Path
from dotenv import dotenv_values
b=Path(sys.argv[1]);saved=json.loads((b/'restore-verification/pm2/jlist.private.json').read_text())
p=next(p for p in saved if p['name']=='trustfolio-backend')['pm2_env']
snapshot={**dotenv_values(b/'restore-verification/backend/.env'),**(p.get('env') or {}),**{k:v for k,v in p.items() if isinstance(v,str)}}
assert snapshot.get('PRICE_WORKER_URL','').rstrip('/')=='https://spring-shape-2759.1shailendrasoni1.workers.dev'
current=json.loads(subprocess.check_output(['pm2','jlist'],text=True))
q=next(p for p in current if p['name']=='trustfolio-backend')['pm2_env']
env={**os.environ,**{k:str(v) for k,v in (q.get('env') or {}).items() if isinstance(v,(str,int,float,bool))}}
env['PRICE_WORKER_URL']=snapshot['PRICE_WORKER_URL'];env['PRICE_WORKER_KEY']=str(snapshot.get('PRICE_WORKER_KEY') or '')
subprocess.run(['pm2','restart','trustfolio-backend','--update-env'],env=env,check=True,capture_output=True)
print('BACKEND_REACTIVATION_REQUESTED_VERIFY_OLD_HANDLER_AND_PRICE_PATH')
PY
```

After any future execution, verify actual active URL, PM2 health, old Worker authenticated/application response and a bounded approved real backend price path. Do not report ROLLED BACK until verified. A400 empty-item response alone is insufficient. If reactivation or quote verification fails, stop further changes and escalate with the saved private snapshot; never restore historical MongoDB records as configuration rollback.

## Current outcome

No URL/key change, production patch, PM2 restart or Mongo write occurred. Configuration rollback was therefore unnecessary. Current final status: **NOT SWITCHED — SAFETY GATE BLOCKED**.

