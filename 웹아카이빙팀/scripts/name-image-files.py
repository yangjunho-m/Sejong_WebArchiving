"""Give image assets readable filenames and update site/report references."""
from pathlib import Path
import json, re, unicodedata

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'Web'
REPORT = ROOT / 'reports/submission-import'
COURSES = {'digital': '디지털미디어프로젝트', 'identity': '아이덴티티디자인', 'product': '제품및운송기기디자인', 'system': '제품시스템디자인', 'fusion': '융합디자인'}

COURSE_CODES = {'identity': 'I', 'digital': 'D', 'product': 'T', 'system': 'S', 'fusion': 'C'}

def clean(value):
    value = unicodedata.normalize('NFC', value.strip())
    return re.sub(r'[\s/\\:*?"<>|,]+', '_', value).strip('._')

def load(path):
    return json.loads(path.read_text())

def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

projects_path = WEB / 'data/projects.json'
designers_path = WEB / 'data/designers.json'
projects = load(projects_path)
designers = load(designers_path)
renames = {}

def rename(relative, stem):
    if not relative:
        return relative
    if relative in renames:
        return renames[relative]
    source = WEB / relative.removeprefix('../')
    target = source.with_name(stem + source.suffix)
    # Recover safely if a previous run stopped after renaming some files.
    assert source.exists() or target.exists(), str(source)
    if source != target and source.exists():
        assert not target.exists() or source.samefile(target), f'Filename collision: {target}'
        source.rename(target)
    result = '../' + target.relative_to(WEB).as_posix()
    renames[relative] = result
    return result

for group in designers.values():
    if not isinstance(group, list):
        continue
    for designer in group:
        designer['profileImage'] = rename(designer.get('profileImage', ''), clean(designer['nameKo']) + '_프로필')

# Plan all directory moves before changing files, including video paths.
folder_moves = []
folder_targets = set()
for project in projects['projects']:
    team = project.get('designerNames') or [project['sourceTeam']]
    folder_name = '_'.join(clean(x) for x in [COURSE_CODES[project['category']], project.get('title', ''), *team] if x)
    assets = [project.get('thumbnail', ''), *project['images'], *project.get('videos', [])]
    folders = {(WEB / relative.removeprefix('../')).parent for relative in assets if relative}
    assert len(folders) == 1, f"Unexpected asset folders: {project['id']}"
    source = folders.pop()
    target = WEB / 'img/projects' / folder_name
    assert target not in folder_targets, f'Duplicate project folder: {target}'
    folder_targets.add(target)
    assert source.exists(), str(source)
    assert source == target or not target.exists() or source.samefile(target), f'Folder collision: {target}'
    folder_moves.append((source, target))

folder_renames = {}
for source, target in folder_moves:
    for asset in source.rglob('*'):
        if asset.is_file():
            old = '../' + asset.relative_to(WEB).as_posix()
            new = '../' + (target / asset.relative_to(source)).relative_to(WEB).as_posix()
            folder_renames[old] = new
    if source != target:
        source.rename(target)
for project in projects['projects']:
    project['thumbnail'] = folder_renames.get(project['thumbnail'], project['thumbnail'])
    project['images'] = [folder_renames.get(p, p) for p in project['images']]
    project['videos'] = [folder_renames.get(p, p) for p in project.get('videos', [])]

missing_titles = []
for project in projects['projects']:
    course = COURSES[project['category']]
    title = project.get('title', '').strip()
    team = project.get('designerNames') or [project['sourceTeam']]
    stem = '_'.join(clean(x) for x in [course, title, *team] if x)
    if not title:
        missing_titles.append({'id': project['id'], 'team': project['sourceTeam']})
    project['thumbnail'] = rename(project.get('thumbnail', ''), stem + '_썸네일')
    project['images'] = [rename(relative, stem + f'_상세_{index:02d}') for index, relative in enumerate(project['images'], 1)]
write(projects_path, projects)
write(designers_path, designers)

def update(value):
    if isinstance(value, str):
        return renames.get(folder_renames.get(value, value), folder_renames.get(value, value))
    if isinstance(value, list):
        return [update(x) for x in value]
    if isinstance(value, dict):
        return {k: update(v) for k, v in value.items()}
    return value

for filename in ('asset-manifest.json', 'original-image-restore-report.json'):
    path = REPORT / filename
    if path.exists():
        write(path, update(load(path)))
write(REPORT / 'image-filename-report.json', {'renamedFiles': sum(a != b for a, b in renames.items()), 'renamedFolders': sum(a != b for a, b in folder_moves), 'missingProjectTitles': missing_titles})
print(json.dumps({'renamedFiles': sum(a != b for a, b in renames.items()), 'projectsWithoutTitles': len(missing_titles)}, ensure_ascii=False))
