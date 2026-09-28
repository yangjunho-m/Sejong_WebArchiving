"""Read the supplied XLSX without changing it. Run with Python 3."""
import json, re, zipfile, pathlib, xml.etree.ElementTree as ET
ROOT = pathlib.Path(__file__).resolve().parents[1]
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(next(ROOT.glob('*.xlsx'))) as z:
    strings = [''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', NS)] if 'xl/sharedStrings.xml' in z.namelist() else []
    rows = []
    for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//s:sheetData/s:row', NS):
        values = {}
        for cell in row.findall('s:c', NS):
            col = re.sub(r'\d', '', cell.attrib['r'])
            v = cell.find('s:v', NS)
            value = v.text if v is not None else ''
            if cell.get('t') == 's': value = strings[int(value)]
            if cell.get('t') == 'inlineStr': value = ''.join(cell.find('s:is', NS).itertext())
            values[col] = value
        rows.append(values)
headers = rows[0]
students, assets, review = [], {}, []
for i, row in enumerate(rows[1:], 2):
    r = {headers[k]: v for k,v in row.items() if k in headers}
    aid = r.get('asset_id','').strip()
    if not aid: continue
    if not re.fullmatch(r'\d{2}-[a-z-]+', aid): raise ValueError(f'Invalid asset id: {aid}')
    for folder, ext in [('img/photo','png'), ('img/letter','svg')]:
        if not (ROOT/folder/f'{aid}.{ext}').is_file(): raise ValueError(f'Missing {folder}/{aid}.{ext}')
    assets.setdefault(aid, {'id':aid,'wordKo':r['word_ko'],'wordEn':r['word_en'],'image':f'img/photo/{aid}.png','letter':f'img/letter/{aid}.svg'})
    # Do not interpret free-text non_participants values as a boolean.
    if r.get('non_participants'): review.append({'row':i,'name':r['name'],'value':r['non_participants']})
    students.append({'id':f'student-{i:03}','name':r['name'],'displayName':r.get('display_name',''),'course':r.get('course',''),'workExplanation':r.get('work_explanation',''),'major':r['major'],'assetId':aid,'reason':r.get('reason',''), 'works':[r[k] for k in ('work_1','work_2') if r.get(k)], 'location':None})
catalog = {'students':students, 'assets':sorted(assets.values(),key=lambda a:a['id'])}
(ROOT/'data').mkdir(exist_ok=True)
(ROOT/'data'/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'data'/'review.json').write_text(json.dumps({'studentCount':len(students),'assetCount':len(assets),'participationReview':review,'missingLocations':len(students)},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Imported {len(students)} students / {len(assets)} assets; {len(review)} participation rows need review.')
