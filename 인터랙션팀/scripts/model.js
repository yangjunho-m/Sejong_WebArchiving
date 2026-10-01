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
export function connectionPath(a, b, bendX = 0, bendY = 0) {
  const mx = (a.x + b.x) / 2 + bendX,
    my = (a.y + b.y) / 2 + bendY,
    dx = (b.x - a.x) / 6,
    dy = (b.y - a.y) / 6;
  // Join two smooth halves at the dragged midpoint, keeping both ends fixed.
  return `M${a.x} ${a.y} C${a.x + dx} ${a.y + dy} ${mx - dx} ${my - dy} ${mx} ${my} C${mx + dx} ${my + dy} ${b.x - dx} ${b.y - dy} ${b.x} ${b.y}`;
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
