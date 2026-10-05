export const MIN_SELECTION = 2;
export const MAX_SELECTION = 8; // Provisional exhibition setting, adjustable after design sign-off.
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function keywordStudents(students, assets, query = "") {
  const matching = new Set(
    searchStudents(students, assets, query).map((s) => s.assetId),
  );
  const seen = new Set();
  return students.filter((s) => {
    if (!matching.has(s.assetId) || seen.has(s.assetId)) return false;
    seen.add(s.assetId);
    return true;
  });
}
export function searchStudents(students, assets, query) {
  const q = query.trim().toLocaleLowerCase();
  const lookup = new Map(assets.map((a) => [a.id, a]));
  return students.filter((s) =>
    [
      s.name,
      s.major,
      lookup.get(s.assetId)?.wordKo,
      lookup.get(s.assetId)?.wordEn,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(q),
  );
}
export function initialNodes(ids) {
  return ids.map((id, i) => ({
    id,
    x: 500 + Math.cos((i / ids.length) * Math.PI * 2 - 0.9) * 280,
    y: 280 + Math.sin((i / ids.length) * Math.PI * 2 - 0.9) * 160,
    scale: 1,
    rotation: 0,
  }));
}
export function addConnection(edges, from, to) {
  if (from === to || edges.some((e) => e.from === from && e.to === to))
    return edges;
  return [...edges, { from, to, bendX: 0, bendY: 0 }];
}
export function constrainBend(a, b, bendX = 0, bendY = 0) {
  const max = Math.hypot(b.x - a.x, b.y - a.y) * 0.5;
  const distance = Math.hypot(bendX, bendY);
  if (!distance || distance <= max) return { bendX, bendY };
  const scale = max / distance;
  return {
    bendX: round(bendX * scale),
    bendY: round(bendY * scale),
  };
}
export function connectionPath(a, b, bendX = 0, bendY = 0) {
  ({ bendX, bendY } = constrainBend(a, b, bendX, bendY));
  const h = {
    x: (a.x + b.x) / 2 + bendX,
    y: (a.y + b.y) / 2 + bendY,
  };
  const d =
    2 *
    (a.x * (h.y - b.y) + h.x * (b.y - a.y) + b.x * (a.y - h.y));
  if (Math.abs(d) < 0.001) return `M${a.x} ${a.y} L${b.x} ${b.y}`;

  const aa = a.x * a.x + a.y * a.y,
    hh = h.x * h.x + h.y * h.y,
    bb = b.x * b.x + b.y * b.y,
    cx = (aa * (h.y - b.y) + hh * (b.y - a.y) + bb * (a.y - h.y)) / d,
    cy = (aa * (b.x - h.x) + hh * (a.x - b.x) + bb * (h.x - a.x)) / d,
    r = round(Math.hypot(a.x - cx, a.y - cy)),
    sweep = (h.x - a.x) * (b.y - h.y) - (h.y - a.y) * (b.x - h.x) > 0 ? 1 : 0;

  return `M${round(a.x)} ${round(a.y)} A${r} ${r} 0 0 ${sweep} ${round(h.x)} ${round(h.y)} A${r} ${r} 0 0 ${sweep} ${round(b.x)} ${round(b.y)}`;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
export function isConnected(nodes, edges) {
  if (nodes.length < 2) return false;
  const seen = new Set([nodes[0].id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edges) {
      if (seen.has(e.from) !== seen.has(e.to)) {
        seen.add(e.from);
        seen.add(e.to);
        changed = true;
      }
    }
  }
  return nodes.every((n) => seen.has(n.id));
}
export function explanation(selected, assets) {
  const words = selected.map(
    (s) => assets.find((a) => a.id === s.assetId).wordKo,
  );
  return `당신의 첫 단추는 ‘${words[0]}’에서 시작합니다. ${words
    .slice(1)
    .map((w) => `‘${w}’`)
    .join(
      ", ",
    )}까지 이어진 선택이 하나의 새로운 모양이 되었습니다. 서로 다른 시작을 연결한 이 모양에, 다음 이야기를 더해 보세요.`;
}
// 1-bit Windows BMP: bottom-up rows, black palette index 0, 4-byte row alignment.
export function encodeMonoBmp(rgba, width, height) {
  if (width % 8 || rgba.length !== width * height * 4)
    throw new Error("Invalid raster dimensions");
  const stride = Math.ceil(width / 32) * 4,
    offset = 62;
  const bytes = new Uint8Array(offset + stride * height),
    v = new DataView(bytes.buffer);
  bytes.set([66, 77]);
  v.setUint32(2, bytes.length, true);
  v.setUint32(10, offset, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, width, true);
  v.setInt32(22, height, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 1, true);
  v.setUint32(34, stride * height, true);
  v.setInt32(38, 7087, true);
  v.setInt32(42, 7087, true);
  v.setUint32(46, 2, true);
  bytes.set([255, 255, 255, 0], 58);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4,
        a = rgba[p + 3] / 255;
      const grey =
        (rgba[p] * 0.2126 + rgba[p + 1] * 0.7152 + rgba[p + 2] * 0.0722) * a +
        255 * (1 - a);
      if (grey >= 160)
        bytes[offset + (height - 1 - y) * stride + (x >> 3)] |= 128 >> (x % 8);
    }
  return bytes;
}
