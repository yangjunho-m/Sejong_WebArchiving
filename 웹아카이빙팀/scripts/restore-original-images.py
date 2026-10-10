"""Restore submitted images at full resolution as lossless PNGs, preserving site metadata."""
from pathlib import Path
import io, json, unicodedata, zipfile
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'Web'
REPORT = ROOT / 'reports/submission-import'
Image.MAX_IMAGE_PIXELS = None

def filename(entry):
    name = entry.filename
    if not entry.flag_bits & 0x800:
        for encoding in ('utf-8', 'cp949'):
            try:
                name = entry.filename.encode('cp437').decode(encoding)
                break
            except UnicodeError:
                pass
    return unicodedata.normalize('NFC', name)

def walk(archive, origin=''):
    for entry in archive.infolist():
        name = filename(entry)
        if entry.is_dir() or '__MACOSX' in name or Path(name).name.startswith('.'):
            continue
        if Path(name).suffix.lower() == '.zip':
            with zipfile.ZipFile(io.BytesIO(archive.read(entry))) as nested:
                yield from walk(nested, origin + '/' + name)
        elif Path(name).suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'):
            yield origin + '/' + name, archive.read(entry)

def save_original(raw, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(raw)) as image:
        orientation = image.getexif().get(274, 1)
        image = ImageOps.exif_transpose(image)
        if image.mode not in ('RGB', 'RGBA', 'L', 'LA', 'P', 'I', 'I;16'):
            image = image.convert('RGB')
        size = list(image.size)
        # Copy submitted PNG bytes whenever orientation correction is unnecessary.
        if raw.startswith(b'\x89PNG\r\n\x1a\n') and orientation == 1:
            destination.write_bytes(raw)
        else:
            image.save(destination, 'PNG')
    return size

projects_path = WEB / 'data/projects.json'
projects = json.loads(projects_path.read_text())
assets = json.loads((REPORT / 'asset-manifest.json').read_text())
by_source = {}
for asset in assets:
    by_source.setdefault(asset['source'], []).append(asset)
replacements, restored = {}, []
with zipfile.ZipFile('/private/tmp/graduation-submissions.zip') as archive:
    for source, raw in walk(archive):
        matches = by_source.get(source)
        if not matches:
            continue
        first = matches[0]
        role = first['role'].split('-part-')[0]
        relative = f"../img/projects/{first['projectId']}/{role}.png"
        size = save_original(raw, WEB / relative.removeprefix('../'))
        for asset in matches:
            replacements[asset['path']] = relative
        restored.append({**{k: v for k, v in first.items() if k != 'sourceCrop'}, 'path': relative, 'originalSize': size, 'webSize': size})
assert len(replacements) == len({a['path'] for a in assets}), 'Some submission sources are missing'
for project in projects['projects']:
    project['thumbnail'] = replacements.get(project['thumbnail'], project['thumbnail'])
    project['images'] = list(dict.fromkeys(replacements.get(p, p) for p in project['images']))
projects_path.write_text(json.dumps(projects, ensure_ascii=False, indent=2) + '\n')
(REPORT / 'asset-manifest.json').write_text(json.dumps(restored, ensure_ascii=False, indent=2) + '\n')

profiles_path = WEB / 'data/designers.json'
profiles = json.loads(profiles_path.read_text())
designers = {d['id']: d for group in profiles.values() if isinstance(group, list) for d in group}
profile_report_path = REPORT / 'profile-import-report.json'
profile_report = json.loads(profile_report_path.read_text())
profile_sources = {r['source']: r for r in profile_report['matched']}
matched = set()
with zipfile.ZipFile('/private/tmp/designer-profiles-all.zip') as archive:
    for source, raw in walk(archive):
        record = profile_sources.get(source.lstrip('/'))
        if not record:
            continue
        relative = f"../img/profiles/designer-{record['id']:03d}.png"
        size = save_original(raw, WEB / relative.removeprefix('../'))
        designers[record['id']]['profileImage'] = relative
        record['originalSize'] = record['webSize'] = size
        matched.add(record['id'])
assert matched == {r['id'] for r in profile_report['matched']}, 'Some portrait sources are missing'
profiles_path.write_text(json.dumps(profiles, ensure_ascii=False, indent=2) + '\n')
profile_report['optimizedBytes'] = sum((WEB / designers[i]['profileImage'].removeprefix('../')).stat().st_size for i in matched)
profile_report['imageFormat'] = 'PNG, original resolution, lossless'
profile_report_path.write_text(json.dumps(profile_report, ensure_ascii=False, indent=2) + '\n')
summary_path = REPORT / 'import-report.json'
summary = json.loads(summary_path.read_text())
summary.update(imageWebBytes=sum((WEB / a['path'].removeprefix('../')).stat().st_size for a in restored), images=len(restored), uniqueImageFiles=len({a['path'] for a in restored}), imageFormat='PNG, original resolution, lossless')
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'projectImages': len(restored), 'profiles': len(matched), 'projectBytes': summary['imageWebBytes'], 'profileBytes': profile_report['optimizedBytes']}))

# Apply readable names after importing assets and updating their references.
__import__('subprocess').run([__import__('sys').executable, str(Path(__file__).resolve().parent / 'name-image-files.py')], check=True)
