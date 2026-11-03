#!/bin/bash
# REVIEW ONLY: not installed or executed; frontend release recovery remains separate.
set -euo pipefail
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
files=['services/LivePriceService.js','services/LiveBudgetRecommendationService.js','services/CategoryService.js','controllers/ProductController.js','.env']
# Refuse unrelated dotenv changes before replacing anything.
a=dotenv_values(b/'restore-verification/backend/.env');z=dotenv_values(root/'.env')
assert not [k for k in set(a)|set(z) if k not in {'PRICE_WORKER_URL','PRICE_WORKER_KEY'} and a.get(k)!=z.get(k)]
allowed={'controllers/ProductController.js': ['4d927892c950ba50e59d1fa53bf7110ea95c96018d63953b3ff3107ee5526562', '838aea3940432617f73f5eeb1f56a85a4e07816bbe2b5e34e678d23dd957f03b'], 'services/LiveBudgetRecommendationService.js': ['136ece5770aec60f3f712abc43983d0a5c5d56ce4065e8fcb1dd603474222184', 'd6be4d835b1710a48b93e8d5f58708e1e344beadac6e8b4e4de1f67ca30cc371'], 'services/LivePriceService.js': ['03d5c3c8ac73f7df281162bdaea467fef4f94859427938db1fbde65fef637f0d', 'd7183c0c3e2cb2cdf76235d958ab8681fd826c0dfd5aa8c0499c200126b77cc7'], 'services/CategoryService.js': ['d4b25e8c0fd59455d5e05d87a2dc75575751c93d658e4fc595a2467132f3dc9a', 'db79624a251b57a7c9044e74212af734b4245fccc598760517c57c4fa9d24645']}
for rel,allowedHashes in allowed.items():
 assert hashlib.sha256((root/rel).read_bytes()).hexdigest() in allowedHashes, "Unreviewed code change; stop automatic restore"
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

# Do not declare full rollback before old real price/backend and frontend checks pass.
