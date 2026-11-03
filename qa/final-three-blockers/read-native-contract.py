import os,json,re,subprocess,hashlib,datetime
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
root=Path.home()/'apps/trustfolio/node-backend'
r={'atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'productionWrites':0,'pm2':[],'nginx':[],'timeoutSources':[],'capabilities':[],'catalog':[],'limits':[]}
def scrub(s):
 s=re.sub(r'mongodb(?:\+srv)?://[^\s\"\']+','[REDACTED_DB_URI]',s)
 s=re.sub(r'(https?://)[^/\s:@]+:[^/\s@]+@',r'\1[REDACTED]@',s)
 s=re.sub(r'(?i)((?:api[_-]?key|secret|token|password)\s*[:=]\s*)[^,\s;]+',r'\1[REDACTED]',s)
 return s[:450]
try:
 p=subprocess.run(['pm2','jlist'],capture_output=True,text=True,timeout=8)
 rows=json.loads(p.stdout)
 for x in rows:
  env=x.get('pm2_env',{});r['pm2'].append({k:v for k,v in {'name':x.get('name'),'pid':x.get('pid'),'status':env.get('status'),'cwd':env.get('pm_cwd'),'script':env.get('pm_exec_path'),'exec_mode':env.get('exec_mode'),'instances':env.get('instances'),'PORT':env.get('PORT'),'NODE_ENV':env.get('NODE_ENV'),'kill_timeout':env.get('kill_timeout'),'listen_timeout':env.get('listen_timeout')}.items() if v is not None})
except Exception as e:r['limits'].append('PM2 metadata unavailable: '+type(e).__name__)
paths=[Path('/etc/nginx/nginx.conf')]
for d in ['/etc/nginx/sites-enabled','/etc/nginx/conf.d']:
 try:paths.extend(p for p in Path(d).iterdir() if p.is_file())
 except:pass
nginxRoots=[]
for p in paths:
 try:
  text=p.read_text();rows=[]
  for n,line in enumerate(text.splitlines(),1):
   line=line.strip()
   if not line or line.startswith('#'):continue
   if re.search(r'\b(server_name|listen|root|location|proxy_pass|include|proxy_\w*timeout|send_timeout|client_\w*timeout|keepalive_timeout)\b',line):rows.append({'line':n,'text':scrub(line)})
   m=re.match(r'root\s+([^;]+)',line)
   if m:nginxRoots.append(m[1])
  r['nginx'].append({'path':str(p),'sha256':hashlib.sha256(text.encode()).hexdigest(),'directives':rows})
 except Exception as e:r['nginx'].append({'path':str(p),'error':type(e).__name__})
for tool in ['docker','podman','mongod','mongosh','bwrap','proot','unshare']:
 p=subprocess.run(['sh','-c','command -v '+tool],capture_output=True,text=True);r['capabilities'].append({'tool':tool,'present':p.returncode==0})
try:
 p=subprocess.run(['unshare','--user','--map-root-user','--mount','--pid','--fork','true'],capture_output=True,text=True,timeout=3)
 r['namespaceProbe']={'exitCode':p.returncode,'stderr':scrub(p.stderr)}
except Exception as e:r['namespaceProbe']={'error':type(e).__name__}
# Only relevant source and static build files; never .env, keys, logs or node_modules.
bases={root,root.parent}
for x in r['pm2']:
 if x.get('cwd') and str(root.parent) in x['cwd']:bases.add(Path(x['cwd']))
for x in nginxRoots:
 if x.startswith('/home/scraperuser/') or x.startswith('/var/www/'):bases.add(Path(x))
pattern=re.compile(r'AbortSignal\.timeout\s*\([^)]{1,60}\)|(?:proxy_read_timeout|proxy_send_timeout|proxy_connect_timeout|serverSelectionTimeoutMS|socketTimeoutMS|connectTimeoutMS|requestTimeout|headersTimeout|keepAliveTimeout|timeout|setTimeout|axios\.create|AbortController|/api/products/top)[\s\S]{0,110}',re.I)
seen=set();count=0
for base in sorted(bases,key=str):
 if not base.exists():continue
 for parent,dirs,files in os.walk(base):
  dirs[:]=[d for d in dirs if d not in ['node_modules','.git','cache','.cache','logs','coverage','images','public','uploads']]
  if len(Path(parent).relative_to(base).parts)>6:dirs[:]=[];continue
  for name in files:
   if not name.endswith(('.js','.ts','.jsx','.tsx','.mjs','.cjs','.conf')):continue
   p=Path(parent)/name
   if str(p) in seen:continue
   seen.add(str(p));count+=1
   if count>1800:break
   try:
    if p.stat().st_size>2500000:continue
    text=p.read_text(errors='replace')
    matches=[{'line':text.count('\n',0,m.start())+1,'fragment':scrub(m.group())} for m in pattern.finditer(text)]
    if matches:r['timeoutSources'].append({'path':str(p),'sha256':hashlib.sha256(text.encode()).hexdigest(),'matches':matches[:20]})
   except:pass
  if count>1800:break
r['sourceFilesScanned']=count
load_dotenv(Path.home()/'new_scraper/.env')
c=MongoClient(os.getenv('MONGODB_URI') or os.getenv('MONGO_URI') or os.getenv('MONGODB_URL'),serverSelectionTimeoutMS=8000,appname='TrustFolioFinalBlockersReadOnly')
col=c[os.getenv('MONGODB_DB','trustfolio')][os.getenv('PRODUCT_COLLECTION','my_products')]
for id in ['69f419329a622ea2d7ccb736','6a1013380f397d1e1344dd59','6a2c08a19665e4a0b177b34b']:
 d=col.find_one({'_id':ObjectId(id)},max_time_ms=5000)
 if d:r['catalog'].append({'_id':str(d['_id']),'fieldNames':list(d),'identityFields':{k:v for k,v in d.items() if re.search(r'model|brand|title|name|sku|spec|url|id|variant|colou?r|config|capacity|product_details|product_information',k,re.I)}})
c.close()
print('NATIVE_TIMEOUT_AND_MODEL_CATALOG='+json.dumps(r,default=str))
