from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];WEB=ROOT/'Web';REPORT=ROOT/'reports/submission-import'
data=json.loads((WEB/'data/projects.json').read_text());assets=json.loads((REPORT/'asset-manifest.json').read_text());summary=json.loads((REPORT/'import-report.json').read_text())
new_assets=[]
for asset in assets:
 if asset['webSize'][1]<=16383: new_assets.append(asset);continue
 path=WEB/asset['path'].removeprefix('../');project=next(p for p in data['projects'] if p['id']==asset['projectId'])
 im=Image.open(path);parts=[]
 for index,y in enumerate(range(0,im.height,8000),1):
  crop=im.crop((0,y,im.width,min(y+8000,im.height)));out=path.with_name(path.stem+f'-part-{index:02d}.webp');crop.save(out,'WEBP',quality=92,method=4)
  relative='../'+out.relative_to(WEB).as_posix();parts.append(relative)
  record={**asset,'path':relative,'webSize':list(crop.size),'sourceCrop':[0,y,im.width,min(y+8000,im.height)]};new_assets.append(record)
 idx=project['images'].index(asset['path']);project['images'][idx:idx+1]=parts
 path.unlink() # Generated intermediates only; the source archive stays intact.
summary['imageWebBytes']=sum(p.stat().st_size for p in (WEB/'img/projects').rglob('*') if p.is_file() and p.suffix in ('.webp','.png'))
summary['images']=len(new_assets);summary['uniqueImageFiles']=len({x['path'] for x in new_assets})
for p,v in [(WEB/'data/projects.json',data),(REPORT/'asset-manifest.json',new_assets),(REPORT/'import-report.json',summary)]:p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
print('Final optimized image bytes',summary['imageWebBytes'])
