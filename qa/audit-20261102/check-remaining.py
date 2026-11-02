"""One request per fixed record. Browser evidence unavailable: never PASS."""
import sys,json,datetime,re
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
inventory=json.loads(Path('qa/audit-20261102/inventory.js').read_text().split(' = ',1)[1].rsplit(';',1)[0])
path=Path('worker-only-201-300.json')
report=json.loads(path.read_text()) if path.exists() else {'browser_environment_available':False,'retailer_pages_opened':0,'records':[],'stop_reason':None}
for seq in range(int(sys.argv[1]),int(sys.argv[2])+1):
    p=inventory[seq-1]
    row={'sequence':seq,'product_id':p['product_id'],'platform':p['platform'],'url':p['url'],'stored_price':p['stored_price'],'result':'UNVERIFIED','reason':'Work cloud browser and local runtime unavailable: no fresh independent retailer page or screenshot.','retailer_page_opened':False,'screenshot':None,'worker_attempted':False}
    if report['stop_reason']:
        row['worker_blocker']=report['stop_reason']
    else:
        req=Request('https://trustfolio-live-price-worker.jayantjoshi-joshi.workers.dev/qa/audit-300?sequence='+str(seq),headers={'Accept':'application/json'})
        row['worker_attempted']=True
        try:
            try:res=urlopen(req,timeout=45)
            except HTTPError as e:res=e
            row['http_status']=res.status
            raw=res.read(200000).decode('utf-8',errors='replace')
            try:row['worker']=json.loads(raw)
            except ValueError:row['worker']={'error':'non_json_worker_response','title':(re.search(r'<title[^>]*>([^<]+)</title>',raw,re.I).group(1) if re.search(r'<title[^>]*>([^<]+)</title>',raw,re.I) else None)}
            if res.status==429 or str(row['worker'].get('error','')).endswith('429'):
                report['stop_reason']='Upstream/Worker rate limit observed; no additional product calls attempted.'
        except Exception as e:row['worker']={'error_type':type(e).__name__}
        row['checked_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    report['records'].append(row)
    path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print('WORKER_ONLY='+json.dumps(row,ensure_ascii=False,separators=(',',':')),flush=True)
