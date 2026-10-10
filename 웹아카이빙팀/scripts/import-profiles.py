"""Import named portraits from a Drive export without deploying originals."""
import io, json, sys, unicodedata, zipfile
from pathlib import Path
from PIL import Image, ImageOps
root = Path(__file__).resolve().parents[1]
data_path = root / 'Web/data/designers.json'
data = json.loads(data_path.read_text())
designers = data['industrial'] + data['visual']
by_name = {unicodedata.normalize('NFC', d['nameKo']): d for d in designers}
output = root / 'Web/img/profiles'
output.mkdir(parents=True, exist_ok=True)
report = {'matched': [], 'unmatched': [], 'missing': [], 'sourceBytes': 0, 'optimizedBytes': 0}
with zipfile.ZipFile(sys.argv[1]) as archive:
    for entry in archive.infolist():
        filename = entry.filename
        if not entry.flag_bits & 0x800:
            try: filename = filename.encode('cp437').decode('utf-8')
            except (UnicodeError, LookupError): pass
        filename = unicodedata.normalize('NFC', filename)
        if '__MACOSX' in filename or Path(filename).suffix.lower() not in ('.jpg', '.jpeg', '.png'): continue
        name = Path(filename).stem.strip()
        aliases = {'DONG CHENYU': '동첸유', 'GONG YUCHEN': '공유첸', '이한하': '이한나', '홍영하': '호영하'}
        designer = by_name.get(aliases.get(name, name))
        if not designer:
            report['unmatched'].append(name)
            continue
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(archive.read(entry)))).convert('RGB')
        original_size = image.size
        path = output / f"designer-{designer['id']:03d}.png"
        image.save(path, 'PNG')
        designer['profileImage'] = f'../img/profiles/{path.name}'
        report['matched'].append({'id': designer['id'], 'name': name, 'source': filename, 'originalSize': original_size, 'webSize': image.size})
        report['sourceBytes'] += entry.file_size
        report['optimizedBytes'] += path.stat().st_size
report['missing'] = [{'id': d['id'], 'name': d['nameKo']} for d in designers if not d['profileImage']]
data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
(root / 'reports/submission-import/profile-import-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({**report, 'matched': len(report['matched'])}, ensure_ascii=False))

# Apply readable names after importing assets and updating their references.
__import__('subprocess').run([__import__('sys').executable, str(Path(__file__).resolve().parent / 'name-image-files.py')], check=True)
