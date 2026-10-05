import qrcode from "./vendor/qrcode-generator.js";

export function qrSvgDataUrl(value) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();

  const cellCount = qr.getModuleCount();
  const margin = 0;
  const size = cellCount + margin * 2;
  const cells = [];

  for (let row = 0; row < cellCount; row++) {
    for (let col = 0; col < cellCount; col++) {
      if (!qr.isDark(row, col)) continue;
      cells.push(`<rect x="${col + margin}" y="${row + margin}" width="1" height="1"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#000">${cells.join("")}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
