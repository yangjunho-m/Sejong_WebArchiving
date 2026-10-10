"""Read project titles and merged team groups from the supplied workbook."""
from pathlib import Path
import json, re, sys, zipfile, xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
SOURCE = 'https://docs.google.com/spreadsheets/d/1oMCxTKj15rKjQtH9IetUmeI0WUR7jU0kwgDTj7UWGqw/edit'
with zipfile.ZipFile(sys.argv[1]) as archive:
    strings = [''.join(t.text or '' for t in x.findall('.//m:t', NS)) for x in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', NS)]
    sheet = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
    cells = {}
    for cell in sheet.findall('.//m:c', NS):
        value = cell.find('m:v', NS)
        if value is not None:
            cells[cell.attrib['r']] = strings[int(value.text)] if cell.attrib.get('t') == 's' else value.text
    merges = [x.attrib['ref'] for x in sheet.findall('.//m:mergeCell', NS)]

aliases = {'공위천': '공유첸', '동천위': '동첸유'}
def key(names):
    return tuple(sorted(aliases.get(n.strip(), n.strip()) for n in names))

titles = {}
for category, name_col, title_col in [('identity', 'B', 'E'), ('digital', 'I', 'L'), ('product', 'P', 'S'), ('system', 'W', 'Z'), ('fusion', 'AD', 'AG')]:
    for address, value in cells.items():
        match = re.fullmatch(title_col + r'(\d+)', address)
        if not match or int(match[1]) < 3 or not value.strip():
            continue
        start = end = int(match[1])
        for merge in merges:
            if merge.split(':')[0] == address:
                end = int(re.search(r'\d+$', merge)[0])
                break
        names = [cells.get(f'{name_col}{row}', '').strip() for row in range(start, end + 1)]
        names = [name for name in names if name]
        identity = (category, key(names))
        assert identity not in titles, identity
        titles[identity] = {'title': value.strip(), 'sourceCell': address, 'sheetTeam': names}

path = ROOT / 'Web/data/projects.json'
data = json.loads(path.read_text())
matched, missing = [], []
for project in data['projects']:
    record = titles.get((project['category'], key(project['designerNames'])))
    if not record:
        missing.append({'id': project['id'], 'team': project['sourceTeam']})
        continue
    matched.append({'id': project['id'], 'previousTitle': project['title'], **record})
    project['title'] = record['title']
    project['missingFields'] = [field for field in project.get('missingFields', []) if field != 'title']
assert not missing, f'Unmatched teams: {missing}'
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
report = ROOT / 'reports/submission-import/project-title-import-report.json'
report.write_text(json.dumps({'source': SOURCE, 'sheet': '시트1', 'matched': matched, 'missing': missing}, ensure_ascii=False, indent=2) + '\n')
__import__('subprocess').run([sys.executable, str(ROOT / 'scripts/name-image-files.py')], check=True)
print('Matched project titles:', len(matched))
