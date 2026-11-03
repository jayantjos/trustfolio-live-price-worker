import json,re,time,hashlib,datetime,concurrent.futures
from pathlib import Path
from urllib.request import Request,urlopen
def work(c):
 e={'id':c['id'],'url':c['url'],'atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'UNVERIFIED','purpose':'missing model metadata only; no Worker or price retest'}
 try:
  with urlopen(Request(c['url'],headers={'User-Agent':'TrustFolio-Independent-Primary-Verification/1.0'}),timeout=8) as r:raw=r.read(2500001);e['http']=r.status;e['finalUrl']=r.url
  assert len(raw)<=2500000;e['sha256']=hashlib.sha256(raw).hexdigest();s=raw.decode(errors='replace');trees=[]
  for script in re.findall(r'<script\b[^>]*>([\s\S]*?)</script>',s,re.I):
   t=script.strip()
   try:trees.append(json.loads(t));continue
   except:pass
   m=re.search(r'(?:window\.)?__(?:INITIAL_STATE|NEXT_DATA|PRELOADED_STATE)__\s*=\s*',t)
   if m:
    try:trees.append(json.JSONDecoder().raw_decode(t[m.end():])[0])
    except:pass
  owners=[];seen=set()
  def exact(x):
   if not isinstance(x,dict):return False
   vals=[x.get(k) for k in ['productId','productID','pid','sku','id']]
   meta=x.get('productMeta');vals+=([meta.get('productId')] if isinstance(meta,dict) else [])
   return any(v==c['id'] for v in vals)
  def find(x,path='root',depth=0):
   if depth>60:return
   if isinstance(x,dict):
    if exact(x):owners.append((path,x))
    for k,v in x.items():
     if isinstance(v,(dict,list)):find(v,path+'.'+k,depth+1)
   elif isinstance(x,list):
    for i,v in enumerate(x):find(v,path+f'[{i}]',depth+1)
  for t in trees:find(t)
  fields=[]
  def fieldsWalk(x,path,depth=0):
   if depth>40:return
   if isinstance(x,dict):
    other=[x.get(k) for k in ['productId','productID','pid','sku'] if isinstance(x.get(k),str)]
    if other and c['id'] not in other:return
    for k,v in x.items():
     if re.fullmatch(r'model(?:\s*(?:name|number|no))?',str(k),re.I) and v:fields.append({'path':path+'.'+k,'value':v})
    label=x.get('key') or x.get('name') or x.get('label')
    if isinstance(label,str) and re.fullmatch(r'model(?:\s*(?:name|number|no))?',label,re.I):fields.append({'path':path,'label':label,'value':x.get('value') or x.get('values')})
    for k,v in x.items():
     if isinstance(v,(dict,list)):fieldsWalk(v,path+'.'+k,depth+1)
   elif isinstance(x,list):
    for i,v in enumerate(x):fieldsWalk(v,path+f'[{i}]',depth+1)
  for p,o in owners:fieldsWalk(o,p)
  e['jsonTrees']=len(trees);e['exactOwnerCount']=len(owners);e['modelFields']=fields[:20]
  e['status']='PASS' if any(x.get('value') for x in fields) else 'UNVERIFIED'
 except Exception as err:e['error']=type(err).__name__+': '+str(err)
 return e
cases=[c for c in json.loads(Path('accuracy-cases.json').read_text()) if c['platform']=='flipkart']
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:results=list(ex.map(work,cases))
r={'results':results,'productionWrites':0};Path('flipkart-model-results.json').write_text(json.dumps(r,indent=2));print('FLIPKART_MODEL_RESULTS='+json.dumps(r))
