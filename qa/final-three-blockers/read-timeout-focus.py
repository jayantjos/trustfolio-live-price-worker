import os,json,re,hashlib,subprocess,datetime
from pathlib import Path
from dotenv import dotenv_values
base=Path.home()/'apps/trustfolio';web=base/'trustfolio-main';back=base/'node-backend'
r={'atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'productionWrites':0,'sources':[],'compiledFrontend':[],'frontendTimeoutEnv':[]}
targets=[(web/'src/services/api.service.ts',[(55,80),(170,245),(310,350)]),(back/'server.js',None),(back/'config/mongo.js',None),(back/'services/CromaLivePriceDirect.js',None),(back/'services/ProductRecommendationService.js',None)]
def safe(s):
 s=re.sub(r'mongodb(?:\+srv)?://[^\s\"\']+','[REDACTED_DB_URI]',s)
 return re.sub(r'(?i)((?:api[_-]?key|secret|token|password)\s*[:=]\s*)[^,\s;]+',r'\1[REDACTED]',s)[:700]
for p,ranges in targets:
 try:
  text=p.read_text();rows=[]
  for n,l in enumerate(text.splitlines(),1):
   if ranges and any(a<=n<=b for a,b in ranges) or not ranges and re.search(r'timeout|keepAlive|maxTimeMS|\.listen\(|createServer|\.connect\(|serverSelection|socketTimeout|connectTimeout|curl|max-time|MAX_QUEUE|MAX_CONCURRENT',l,re.I):rows.append({'line':n,'text':safe(l)})
  r['sources'].append({'path':str(p),'sha256':hashlib.sha256(text.encode()).hexdigest(),'lines':rows})
 except Exception as e:r['sources'].append({'path':str(p),'error':type(e).__name__})
for name in ['.env','.env.production','.env.local','.env.production.local']:
 p=web/name
 if p.exists():
  try:
   v=dotenv_values(p).get('NEXT_PUBLIC_API_TIMEOUT_MS');r['frontendTimeoutEnv'].append({'path':str(p),'NEXT_PUBLIC_API_TIMEOUT_MS':v if v is None or str(v).isdigit() else '[non-numeric value withheld]'})
  except:r['frontendTimeoutEnv'].append({'path':str(p),'error':'unreadable'})
try:
 p=subprocess.run(['pm2','jlist'],capture_output=True,text=True,timeout=8)
 for x in json.loads(p.stdout):
  if x.get('name')=='trustfolio-web':
   v=x.get('pm2_env',{}).get('NEXT_PUBLIC_API_TIMEOUT_MS');r['pm2FrontendTimeout']=v if v is None or str(v).isdigit() else '[non-numeric value withheld]'
except:r['pm2FrontendTimeout']='unavailable'
for p in (web/'.next/static/chunks').rglob('*.js'):
 try:
  text=p.read_text()
  if not ('NEXT_PUBLIC_API_TIMEOUT_MS' in text or '/api/products/top?' in text):continue
  fragments=[]
  for term in ['NEXT_PUBLIC_API_TIMEOUT_MS','/api/products/top?','timed out','AbortController']:
   start=text.find(term)
   if start>=0:fragments.append(safe(text[max(0,start-220):start+420]))
  r['compiledFrontend'].append({'path':str(p),'sha256':hashlib.sha256(text.encode()).hexdigest(),'fragments':fragments})
 except:pass
try:
 js="const h=require('http'),s=h.createServer();console.log(JSON.stringify({node:process.version,serverTimeout:s.timeout,requestTimeout:s.requestTimeout,headersTimeout:s.headersTimeout,keepAliveTimeout:s.keepAliveTimeout}))"
 p=subprocess.run(['node','-e',js],capture_output=True,text=True,env={'PATH':os.environ['PATH']},timeout=3);r['nativeNodeHTTPDefaults']=json.loads(p.stdout)
except:r['nativeNodeHTTPDefaults']='unavailable'
print('FOCUSED_TIMEOUT_CONTRACT='+json.dumps(r))
