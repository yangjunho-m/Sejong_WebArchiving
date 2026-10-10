"""Import the explicitly supplied course archive without changing cloud originals."""
from pathlib import Path
from collections import defaultdict
import zipfile, io, json, re, unicodedata, hashlib, subprocess, tempfile, argparse
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'Web'
REPORT = ROOT / 'reports' / 'submission-import'
REPORT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('archive', nargs='?', default='/private/tmp/graduation-submissions.zip')
ARCHIVE = Path(parser.parse_args().archive)
COURSES = {'I': 'identity', 'D': 'digital', 'T': 'product', 'S': 'system', 'IP': 'fusion'}
existing = json.loads((WEB / 'data/designers.json').read_text())
designers = existing['industrial'] + existing['visual']
by_name = {d['nameKo']: d for d in designers}
records = defaultdict(list)
ignored = []

def norm(s): return unicodedata.normalize('NFC', s)
def filename(info):
    s = info.filename
    if not info.flag_bits & 0x800:
        try: raw = s.encode('cp437')
        except UnicodeError: return norm(s)
        for encoding in ('utf-8', 'cp949'):
            try: s = raw.decode(encoding); break
            except UnicodeError: pass
    return norm(s)

def walk(z, team=None, origin=''):
    for info in z.infolist():
        n = filename(info)
        if info.is_dir() or '__MACOSX' in n or Path(n).name.startswith('.'):
            continue
        if any(word in n for word in ('가이드라인', '필독', '공지', '폰트 파일 배부')):
            ignored.append(origin + '/' + n); continue
        key = team or tuple(n.split('/')[:2])
        data = z.read(info)
        if n.lower().endswith('.zip'):
            with zipfile.ZipFile(io.BytesIO(data)) as nested: walk(nested, key, origin + '/' + n)
        else: records[key].append({'path': n, 'origin': origin + '/' + n, 'data': data})

with zipfile.ZipFile(ARCHIVE) as z: walk(z)

def text_content(record):
    if record['path'].lower().endswith('.rtf'):
        with tempfile.NamedTemporaryFile(suffix='.rtf') as f:
            f.write(record['data']); f.flush()
            return norm(subprocess.check_output(['textutil','-convert','txt','-stdout',f.name]).decode('utf-8'))
    for enc in ('utf-8-sig', 'utf-16', 'cp949'):
        try: return norm(record['data'].decode(enc))
        except UnicodeError: pass
    return ''

contacts = defaultdict(set)
contact_sources = defaultdict(list)
projects, issues, asset_manifest = [], [], []
source_bytes = output_bytes = 0
hash_paths = {}
for (course, team), files in sorted(records.items()):
    code = re.search(r'\((IP|I|D|T|S)\)', course)
    if not code: issues.append({'source': course, 'issue': 'unknown course'}); continue
    category = COURSES[code[1]]
    names = [n.strip() for n in team.split(',')]
    ids = [by_name[n]['id'] for n in names if n in by_name]
    suffix = '-'.join(f'{i:03d}' for i in sorted(ids))
    if len(ids) != len(names): suffix += '-' + hashlib.sha256(team.encode()).hexdigest()[:6]
    pid = category + '-' + suffix
    texts = [r for r in files if r['path'].lower().endswith(('.txt','.rtf'))]
    tags, descriptions = [], []
    for r in texts:
        content = text_content(r)
        # Include filenames because a few submissions intentionally have empty text files.
        both = content + '\n' + Path(r['path']).stem
        for n in names:
            for match in re.finditer(re.escape(n) + r'\s*\(([^)]*)\)', both):
                raw = match[1].replace('＠','@').strip()
                handles = re.findall(r'@?([A-Za-z0-9_.]+)', raw)
                for h in handles:
                    if re.fullmatch(r'[A-Za-z0-9_.]+', h):
                        contacts[n].add('@' + h)
                        contact_sources[n].append({'project': pid, 'value': '@'+h, 'source': r['origin']})
        if len(names) == 1 and not contacts[names[0]]:
            for h in re.findall(r'(?<!\w)@([A-Za-z0-9_.]+)', content): contacts[names[0]].add('@'+h)
        lines = [line.strip() for line in content.splitlines() if line.strip()]
        desc = '\n\n'.join(line for line in lines[1:] if len(line) > 100)
        if desc: descriptions.append(desc)
        first = content.splitlines()[0] if content.strip() else Path(r['path']).stem
        first = re.sub(r'[^_(),]+\([^)]*\)', '', first)
        parts = re.split(r'[_，,]', first)
        for part in parts:
            t = part.strip(' .')
            if t and t not in names and t not in COURSES and t not in ('웹','태그') and len(t)<30:
                tags.append(t)
    imgs = [r for r in files if Path(r['path']).suffix.lower() in ('.png','.jpg','.jpeg','.webp')]
    thumbs = [r for r in imgs if any(t in r['path'] for t in ('썸네','섬네','썸내','thumbnail'))]
    details = [r for r in imgs if r not in thumbs]
    imgs = thumbs + sorted(details, key=lambda r:r['path'])
    thumbnail, detail_paths = '', []
    for index, r in enumerate(imgs):
        is_thumb = r in thumbs
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(r['data'])))
        original = im.size
        # Preserve tall posters and their embedded lettering; constrain width only.
        max_width = 800 if is_thumb else 1600
        if im.width > max_width: im = im.resize((max_width, round(im.height*max_width/im.width)), Image.Resampling.LANCZOS)
        im = im.convert('RGBA' if 'A' in im.getbands() else 'RGB')
        digest = hashlib.sha256(r['data'] + str(max_width).encode()).hexdigest()
        role = 'thumbnail' if is_thumb else f'detail-{len(detail_paths)+1:02d}'
        if digest in hash_paths:
            relative = hash_paths[digest]
        else:
            extension = '.png' if im.height > 16383 else '.webp'
            out = WEB / 'img/projects' / pid / (role+extension)
            out.parent.mkdir(parents=True,exist_ok=True)
            if not out.exists() or out.stat().st_size == 0:
                if extension == '.png': im.save(out,'PNG',optimize=True)
                else: im.save(out,'WEBP',quality=92 if not is_thumb else 86,method=4)
            relative = '../' + out.relative_to(WEB).as_posix()
            hash_paths[digest] = relative
            output_bytes += out.stat().st_size
        source_bytes += len(r['data'])
        if is_thumb and not thumbnail: thumbnail = relative
        elif not is_thumb: detail_paths.append(relative)
        asset_manifest.append({'projectId':pid,'role':role,'source':r['origin'],'path':relative,'originalSize':original,'webSize':im.size})
    videos=[]
    for r in files:
        if Path(r['path']).suffix.lower() not in ('.mp4','.webm'): continue
        out=WEB/'img/projects'/pid/f'video-{len(videos)+1:02d}{Path(r["path"]).suffix.lower()}'
        out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(r['data']);videos.append('../'+out.relative_to(WEB).as_posix())
    missing = []
    if not thumbnail: missing.append('thumbnail')
    if not detail_paths: missing.append('images')
    missing += ['title']
    if len(ids)!=len(names): missing.append('unmatchedDesigners')
    projects.append({'id':pid,'category':category,'title':'','sourceTeam':team,'designerIds':ids,'designerNames':names,'thumbnail':thumbnail,'images':detail_paths,'videos':videos,'tags':list(dict.fromkeys(tags)),'description':'\n\n'.join(descriptions),'missingFields':missing})
    issues.append({'projectId':pid,'team':team,'missingFields':missing})

conflicts=[]
for d in designers:
    for field in ('nameEn','email','instagram','profileImage'):
        if d.get(field)=='.': d[field]=''
    name=d['nameKo']; candidates=sorted(contacts[name])
    if len(candidates)==1: d['instagram']=candidates[0]
    elif len(candidates)>1:
        conflicts.append({'name':name,'id':d['id'],'values':candidates,'sources':contact_sources[name]})
    d['works']=[p['id'] for p in projects if d['id'] in p['designerIds']]

missing_designers=[{'id':d['id'],'name':d['nameKo'],'missingFields':[k for k in ('nameEn','email','instagram','profileImage') if not d.get(k) or d.get(k)=='.']} for d in designers]
missing_designers=[d for d in missing_designers if d['missingFields']]
summary={'sourceArchiveBytes':ARCHIVE.stat().st_size,'projects':len(projects),'categories':{c:sum(p['category']==c for p in projects) for c in COURSES.values()},'imageSourceBytes':source_bytes,'imageWebBytes':output_bytes,'images':len(asset_manifest),'uniqueImageFiles':len(hash_paths),'confirmedInstagram':sum(len(v)==1 for v in contacts.values()),'contactConflicts':conflicts,'unmatchedNames':sorted({n for p in projects for n in p['designerNames'] if n not in by_name}),'missingDesigners':missing_designers,'projectIssues':issues,'ignored':ignored}
for p,data in [(WEB/'data/designers.json',existing),(WEB/'data/projects.json',{'projects':projects}),(REPORT/'import-report.json',summary),(REPORT/'asset-manifest.json',asset_manifest)]:
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ('contactConflicts','missingDesigners','projectIssues','ignored')},ensure_ascii=False,indent=2))
print('conflicts',[(x['name'],x['values']) for x in conflicts])

subprocess.run([__import__('sys').executable, str(ROOT/'scripts/optimize-tall-submissions.py')], check=True)
