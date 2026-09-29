"""Read the supplied XLSX without changing it. Run with Python 3."""

import json
import pathlib
import re
import xml.etree.ElementTree as ET
import zipfile


ROOT = pathlib.Path(__file__).resolve().parents[1]
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


with zipfile.ZipFile(next(ROOT.glob("*.xlsx"))) as z:
    if "xl/sharedStrings.xml" in z.namelist():
        strings = [
            "".join(item.itertext())
            for item in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("s:si", NS)
        ]
    else:
        strings = []

    rows = []
    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    for row in sheet.findall(".//s:sheetData/s:row", NS):
        values = {}

        for cell in row.findall("s:c", NS):
            col = re.sub(r"\d", "", cell.attrib["r"])
            value_node = cell.find("s:v", NS)
            value = value_node.text if value_node is not None else ""

            if cell.get("t") == "s":
                value = strings[int(value)]
            if cell.get("t") == "inlineStr":
                value = "".join(cell.find("s:is", NS).itertext())

            values[col] = value

        rows.append(values)


headers = rows[0]
students = []
assets = {}
review = []

for i, row in enumerate(rows[1:], 2):
    record = {headers[k]: v for k, v in row.items() if k in headers}
    asset_id = record.get("asset_id", "").strip()

    if not asset_id:
        continue

    if not re.fullmatch(r"\d{2}-[a-z-]+", asset_id):
        raise ValueError(f"Invalid asset id: {asset_id}")

    for folder, ext in [("img/photo", "png"), ("img/letter", "svg")]:
        if not (ROOT / folder / f"{asset_id}.{ext}").is_file():
            raise ValueError(f"Missing {folder}/{asset_id}.{ext}")

    assets.setdefault(
        asset_id,
        {
            "id": asset_id,
            "wordKo": record["word_ko"],
            "wordEn": record["word_en"],
            "image": f"img/photo/{asset_id}.png",
            "letter": f"img/letter/{asset_id}.svg",
        },
    )

    # Do not interpret free-text non_participants values as a boolean.
    if record.get("non_participants"):
        review.append(
            {
                "row": i,
                "name": record["name"],
                "value": record["non_participants"],
            }
        )

    students.append(
        {
            "id": f"student-{i:03}",
            "name": record["name"],
            "displayName": record.get("display_name", ""),
            "course": record.get("course", ""),
            "workExplanation": record.get("work_explanation", ""),
            "major": record["major"],
            "assetId": asset_id,
            "reason": record.get("reason", ""),
            "works": [record[k] for k in ("work_1", "work_2") if record.get(k)],
            "location": None,
        }
    )


catalog = {
    "students": students,
    "assets": sorted(assets.values(), key=lambda asset: asset["id"]),
}

review_data = {
    "studentCount": len(students),
    "assetCount": len(assets),
    "participationReview": review,
    "missingLocations": len(students),
}

(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data" / "catalog.json").write_text(
    json.dumps(catalog, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
(ROOT / "data" / "review.json").write_text(
    json.dumps(review_data, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(
    f"Imported {len(students)} students / {len(assets)} assets; "
    f"{len(review)} participation rows need review."
)
