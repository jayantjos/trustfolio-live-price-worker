#!/bin/bash
# REVIEW ONLY; not installed/executed. Use only during the separately approved rollback.
set -euo pipefail
test "${TF_APPROVED_CONFIGURATION_ROLLBACK:-}" = yes
TF_FRONT_ROOT="$HOME/apps/trustfolio/trustfolio-main"
TF_FRONT_BACKUP="$HOME/trustfolio-cutover-backups/20261103T052423Z-41583713914/frontend-timeout-preparation"
printf '%s  %s\n' 'b70bef21639df14897b7ff291c6dcf5c3d581715ebaa4dc176e4843e88a463a4' "$TF_FRONT_BACKUP/frontend-runtime-before-timeout.tar.gz" | sha256sum --check --status
"$HOME/venv/bin/python" - "$TF_FRONT_ROOT" "$TF_FRONT_BACKUP" <<'PY'
import hashlib,json,os,sys
from pathlib import Path
root,b=map(Path,sys.argv[1:]);m=json.loads((b/'manifest.private.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for name,v in m.items():
 p=b/'restore-verification'/name
 if v.get('type')=='symlink':assert p.is_symlink() and os.readlink(p)==v['target']
 else:assert sha(p)==v['sha256']
assert sha(root/'src/services/api.service.ts') in {'36d74bdbfe88a2221c1929897caba75df4bddb8e260cd5a6ab5829be61410521','96e09dce023edb1bd67cc15ea12a35c7cf32df089a28a9e3e1d0c00703c96822'}
for name,v in m.items():
 if name.startswith('.env') or name.startswith('package') or name.startswith('next.config.'):
  assert sha(root/name)==v['sha256'], 'Unrelated frontend config/dependency change; stop recovery'
print('PRIVATE_FRONTEND_RESTORE_CONTENT_VERIFIED')
PY
TF_FRONT_STAMP=$(date -u +%Y%m%dT%H%M%SZ)
TF_FRONT_STAGE=$(mktemp -d "$TF_FRONT_ROOT/.approved-rollback.XXXXXX")
cp -a "$TF_FRONT_BACKUP/restore-verification/.next" "$TF_FRONT_STAGE/.next"
# Dependency symlink is preserved as metadata; never follow it while copying.
test -d "$TF_FRONT_ROOT/.next"
test ! -e "$TF_FRONT_ROOT/.next.failed-$TF_FRONT_STAMP"
# Only affected web process. These commands deliberately require the approved recovery window.
pm2 stop trustfolio-web >/dev/null
mv "$TF_FRONT_ROOT/.next" "$TF_FRONT_ROOT/.next.failed-$TF_FRONT_STAMP"
mv "$TF_FRONT_STAGE/.next" "$TF_FRONT_ROOT/.next"
cp "$TF_FRONT_BACKUP/restore-verification/src/services/api.service.ts" "$TF_FRONT_ROOT/src/services/api.service.ts"
pm2 restart trustfolio-web >/dev/null
echo 'FRONTEND_REACTIVATION_REQUESTED: verify website, old Worker/backend route and actual approved price smoke.'
# Never claim successful full rollback until those checks pass.
# If any command fails, stop further automation and escalate using preserved .next.failed-* and private backup.

