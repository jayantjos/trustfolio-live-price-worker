import json,time,re,hashlib,datetime,os,concurrent.futures
from html.parser import HTMLParser
from urllib.request import Request,urlopen
from pathlib import Path
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
class Primary(HTMLParser):
 def __init__(self):super().__init__();self.stack=[];self.prices=[];self.ids=[];self.canonical=None;self.title=[];self.tr=[];self.rows=[];self.scripts=[];self.script=[]
 def handle_starttag(self,t,a):
  d=dict(a);parent=self.stack[-1] if self.stack else {};p={'tag':t,'primary':parent.get('primary',False) or 'pricetopay' in d.get('class','').lower() or d.get('id') in ['priceToPay','priceblock_ourprice'],'off':parent.get('off',False) or 'a-offscreen' in d.get('class',''),'title':parent.get('title',False) or d.get('id')=='productTitle','json':t=='script' and d.get('type')=='application/ld+json'}
  if t=='link' and d.get('rel')=='canonical':self.canonical=d.get('href')
  if t=='input' and d.get('id')=='ASIN':self.ids.append(d.get('value'))
  if t=='tr':self.tr=[]
  if t=='script':self.script=[]
  if t not in ['input','link','meta','img','br','hr']:self.stack.append(p)
 def handle_endtag(self,t):
  if t=='tr' and self.tr:self.rows.append(' '.join(self.tr))
  if t=='script' and self.stack and self.stack[-1].get('json'):self.scripts.append(''.join(self.script))
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i]['tag']==t:self.stack=self.stack[:i];break
 def handle_data(self,s):
  if not self.stack:return
  p=self.stack[-1]
  if p.get('primary') and p.get('off') and s.strip():self.prices.append(s.strip())
  if p.get('title'):self.title.append(s)
  if any(x['tag']=='tr' for x in self.stack) and s.strip():self.tr.append(s.strip())
  if any(x.get('json') for x in self.stack):self.script.append(s)
def work(c):
 e={**c,'status':'UNVERIFIED','startedAt':now()};key=os.environ['TF_KEY'];t=time.monotonic()
 try:
  data=json.dumps({'items':[c['id'] if c['platform']=='amazon' else c['url']],'useCache':False,'browserProbe':False}).encode()
  req=Request('https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev/api/check',data=data,headers={'Content-Type':'application/json','x-api-key':key})
  with urlopen(req,timeout=8) as r:e['workerHttp']=r.status;e['ray']=r.headers.get('cf-ray');e['worker']=json.load(r)
  e['workerRTTms']=round((time.monotonic()-t)*1000);e['workerReceivedAt']=now()
  t2=time.monotonic()
  with urlopen(Request(c['url'],headers={'User-Agent':'TrustFolio-Independent-Primary-Verification/1.0','Accept-Language':'en-IN,en;q=0.9'}),timeout=8) as r:raw=r.read(2500001);e['retailerHttp']=r.status;e['finalUrl']=r.url
  e['independentRTTms']=round((time.monotonic()-t2)*1000);e['independentAt']=now();e['bytes']=len(raw);e['sha256']=hashlib.sha256(raw).hexdigest();assert len(raw)<=2500000,'bounded body limit'
  p=Primary();p.feed(raw.decode(errors='replace'));e['canonical']=p.canonical;e['asinInputs']=p.ids;e['primaryTitle']=' '.join(p.title).strip();e['variantRows']=[x for x in p.rows if re.search(r'model|brand|capacity|colou?r|load|energy|star|rpm',x,re.I)][:30]
  products=[]
  def walk(x):
   if isinstance(x,list):
    for y in x:walk(y)
   elif isinstance(x,dict):
    if x.get('@type')=='Product':products.append(x)
    if '@graph' in x:walk(x['@graph'])
  for s in p.scripts:
   try:walk(json.loads(s))
   except:pass
  e['primaryProducts']=[{k:x.get(k) for k in ['name','sku','model','color','brand','offers']} for x in products]
  prices=set()
  if c['platform']=='amazon':
   for x in p.prices:
    m=re.search(r'(?:₹|Rs\.?\s*)([\d,]+(?:\.\d+)?)',x)
    if m:prices.add(float(m[1].replace(',','')))
   e['independentIdentity']=c['id'] in p.ids or bool(p.canonical and '/'+c['id'] in p.canonical)
  elif len(products)==1 and products[0].get('sku')==c['id']:
   e['independentIdentity']=True
   offers=products[0].get('offers');offers=offers if isinstance(offers,list) else [offers]
   if len(offers)==1 and offers[0] and offers[0].get('priceCurrency')=='INR':
    prices.add(float(offers[0]['price']));e['independentAvailability']=offers[0].get('availability')
  e['primaryPrices']=sorted(prices)
  row=e['worker']['results'][0];s=row['amazon'] if c['platform']=='amazon' else row['flipkart'];e['selectedWorker']=s
  title=e['primaryTitle'] or (products[0].get('name','') if len(products)==1 else '')
  cap=str(c.get('capacity','')).lower().replace(' ','');e['capacityMatch']=cap in title.lower().replace(' ','') or any(cap in x.lower().replace(' ','') for x in e['variantRows'])
  e['brandMatch']=c['brand'].lower() in title.lower();e['priceMatches']=len(prices)==1 and s.get('priceNum') in prices
  e['priceStatus']='PASS' if e.get('independentIdentity') and e['brandMatch'] and e['capacityMatch'] and e['priceMatches'] and s.get('verificationStatus')=='ok' else 'UNVERIFIED'
  # Preserve model/finish evidence for review rather than declaring variant PASS from price equality alone.
  e['status']=e['priceStatus']
 except Exception as err:e['error']=type(err).__name__+': '+str(err)
 e['finishedAt']=now();return e
cases=json.loads(Path('accuracy-cases.json').read_text())
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:results=list(ex.map(work,cases))
report={'kind':'five genuine fresh Worker quotes paired with independent retailer HTML; no shared parser','results':results,'productionWrites':0}
Path('accuracy-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('ACCURACY_RESULTS='+json.dumps(report,ensure_ascii=False))
