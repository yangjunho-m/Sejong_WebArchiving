// Keep screen text and keyword artwork as vectors instead of shrinking a bitmap.
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function renderReceiptPreview({
  people,
  assets,
  nodes,
  edges,
  explanation,
}) {
  const lookup = new Map(assets.map((a) => [a.id, a]));
  const words = [...new Set(people.map((p) => p.assetId))].map((id) =>
    lookup.get(id),
  );
  const recommended = people.find((p) => p.works.length) || people[0];
  const title = recommended.works[0] || "작품 정보 준비 중";
  const owners = people.filter((p) => p.works.includes(title));
  const xs = nodes.map((n) => n.x),
    ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs),
    minY = Math.min(...ys);
  const rangeX = Math.max(...xs) - minX,
    rangeY = Math.max(...ys) - minY;
  const scale = Math.min(
    580 / Math.max(rangeX, 1),
    220 / Math.max(rangeY, 1),
    1.8,
  );
  const points = new Map(
    nodes.map((n) => [
      n.id,
      {
        x: 448 + (n.x - minX - rangeX / 2) * scale,
        y: 260 + (n.y - minY - rangeY / 2) * scale,
      },
    ]),
  );
  const paths = edges
    .map((e) => {
      const a = points.get(e.from),
        b = points.get(e.to);
      return `<path d="M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 65 * scale} ${b.x} ${b.y}"/>`;
    })
    .join("");
  const buttons = nodes
    .map((n) => {
      const p = points.get(n.id),
        r = 46 * n.scale,
        person = people.find((s) => s.id === n.id),
        word = lookup.get(person.assetId);
      return `<g transform="translate(${p.x} ${p.y})"><g transform="rotate(${n.rotation})"><circle r="${r + 5}" fill="#c3d3e9"/><circle r="${r}" fill="#e8e7e4" stroke="#141414" stroke-width="5"/>${[-12, 12].flatMap((x) => [-12, 12].map((y) => `<circle cx="${x * n.scale}" cy="${y * n.scale}" r="${5 * n.scale}" fill="#141414"/>`)).join("")}</g><image href="/${escape(word.letter)}" x="${-110 * n.scale}" y="${r - 8}" width="${220 * n.scale}" height="${56 * n.scale}" preserveAspectRatio="xMidYMid meet"><title>${escape(word.wordEn)}</title></image></g>`;
    })
    .join("");
  const pills = (values) =>
    `<div class="receipt-pills">${values.map((v) => `<span>${escape(v)}</span>`).join("")}</div>`;
  const description =
    recommended.workExplanation &&
    recommended.workExplanation !== "추후 입력 예정"
      ? recommended.workExplanation
      : "";
  const bottomText = description || explanation || "";
  const locations = people.filter((p) => p.location);
  const element = document.createElement("div");
  element.id = "receipt-artwork";
  element.className = "receipt-vector";
  element.innerHTML = `<div class="receipt-vector-title" aria-label="forward, BUTTON UP!"><img src="/img/forward_buttonUp.png" alt=""></div><svg class="receipt-vector-pattern" viewBox="0 0 896 570" role="img" aria-label="${escape(words.map((w) => w.wordKo).join(", "))} 단추 패턴"><g fill="none" stroke="#141414" stroke-width="4">${paths}</g>${buttons}<image href="/img/receipt-design-logo.png" x="739" y="531" width="109" height="27" preserveAspectRatio="xMidYMid meet"/></svg><div class="receipt-vector-details"><section><h2>선택한 단어</h2>${pills(words.map((w) => w.wordEn.toUpperCase()))}</section><section><h2>선택한 단어의 학생</h2>${pills(people.map((p) => p.displayName || p.name))}</section><section><h2>추천 졸업전시작 - ${escape(title)}</h2>${pills([...(owners.length ? owners : [recommended]).map((p) => p.displayName || p.name), recommended.major === "visual design" ? "VISUAL DESIGN" : "INDUSTRIAL DESIGN"])}${bottomText ? `<p class="receipt-description">${escape(bottomText)}</p>` : ""}</section>${locations.length ? `<p class="receipt-location">${escape(locations.map((p) => `${p.name}: ${p.location}`).join(" / "))}</p>` : ""}</div>`;
  return element;
}
