// One artwork shared by the screen, PNG download, browser print and 1-bit export.
import { assetUrl } from "./paths.js";
import { connectionPath } from "./model.js";
const W = 896;
const INK = "#141414";
const PAPER = "#ebf0f6";
const KO = '"Malgun Gothic", sans-serif';
function image(url) {
  const img = new Image();
  img.src = url;
  return img.decode().then(() => img);
}
function lines(ctx, text, maxWidth) {
  const result = [];
  let line = "";
  for (const c of text) {
    if (c === "\n") {
      result.push(line);
      line = "";
      continue;
    }
    if (line && ctx.measureText(line + c).width > maxWidth) {
      result.push(line);
      line = c;
    } else line += c;
  }
  if (line) result.push(line);
  return result;
}
function outlinedTitle(ctx, text, y, size, maxWidth) {
  ctx.save();
  ctx.font = `700 ${size}px Avant, sans-serif`;
  const width = ctx.measureText(text).width;
  ctx.translate(W / 2, y);
  ctx.scale(Math.min(1, maxWidth / width), 1);
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 22;
  ctx.strokeText(text, 0, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 18;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
function pillRows(ctx, values, y, paint) {
  ctx.save();
  ctx.font = '400 18px Pretendard, "Malgun Gothic", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let x = 66;
  for (const value of values) {
    for (const part of lines(ctx, value, 724)) {
      const width = ctx.measureText(part).width + 28;
      if (x + width > W - 66 && x > 66) {
        x = 66;
        y += 42;
      }
      if (paint) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, 34, 17);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.fillStyle = INK;
        const metrics = ctx.measureText(part);
        const baseline = y + 17 +
          (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
        ctx.fillText(part, x + width / 2, baseline);
      }
      x += width + 9;
    }
  }
  ctx.restore();
  return y + 34;
}
export async function renderReceipt({
  people,
  assets,
  nodes,
  edges,
  explanation,
}) {
  await Promise.all([
    document.fonts.load("700 160px Avant"),
    document.fonts.load("400 18px Pretendard"),
    document.fonts.ready,
  ]);
  const lookup = new Map(assets.map((a) => [a.id, a]));
  const words = people.map((s) => lookup.get(s.assetId));
  const wordImages = await Promise.all(
    words.map((a) => image(assetUrl(a.letter))),
  );
  const titleLogo = await image(assetUrl("img/forward_buttonUp.png"));
  const designLogo = await image(assetUrl("img/receipt-design-logo.png"));
  const recommended = people.find((s) => s.works.length) || people[0];
  const title = recommended.works[0] || "작품 정보 준비 중";
  const owners = people.filter((s) => s.works.includes(title));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  let ctx = canvas.getContext("2d");
  // Measure text first, so long titles, eight selections and wrapped tags are never clipped.
  function details(paint) {
    let y = 1070;
    const heading = (text) => {
      ctx.font = `700 28px ${KO}`;
      for (const line of lines(ctx, text, W - 132)) {
        if (paint) {
          ctx.fillStyle = INK;
          ctx.fillText(line, 66, y);
        }
        y += 39;
      }
    };
    heading("선택한 단어");
    y =
      pillRows(
        ctx,
        [...new Set(words.map((a) => a.wordEn.toUpperCase()))],
        y - 10,
        paint,
      ) + 48;
    heading("선택한 단어의 학생");
    y =
      pillRows(
        ctx,
        people.map((s) => s.displayName || s.name),
        y - 10,
        paint,
      ) + 48;
    heading("추천 졸업전시작 - " + title);
    y =
      pillRows(
        ctx,
        [
          ...(owners.length ? owners : [recommended]).map(
            (s) => s.displayName || s.name,
          ),
          recommended.major === "visual design"
            ? "VISUAL DESIGN"
            : "INDUSTRIAL DESIGN",
        ],
        y - 10,
        paint,
      ) + 40;
    ctx.font = `18px ${KO}`;
    const description =
      recommended.workExplanation &&
      recommended.workExplanation !== "추후 입력 예정"
        ? recommended.workExplanation
        : "";
    const bottomText = description || explanation || "";
    if (bottomText) {
      for (const line of lines(ctx, bottomText, W - 132)) {
        if (paint) ctx.fillText(line, 66, y);
        y += 26;
      }
      y += 36;
    }
    y += 14;
    ctx.font = `16px ${KO}`;
    const locations = people.filter((s) => s.location);
    if (locations.length) {
      const locationText = locations
        .map((s) => `${s.name}: ${s.location}`)
        .join(" / ");
      for (const line of lines(ctx, locationText, W - 132)) {
        if (paint) ctx.fillText(line, 66, y);
        y += 28;
      }
    }
    return y + 65;
  }
  const logicalHeight = Math.ceil(details(false));
  const resolution = 2;
  canvas.width = W * resolution;
  canvas.height = logicalHeight * resolution;
  ctx = canvas.getContext("2d");
  ctx.scale(resolution, resolution);
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, logicalHeight);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, 430);
  const titleFit = Math.min(W / titleLogo.width, 430 / titleLogo.height);
  const titleW = titleLogo.width * titleFit;
  const titleH = titleLogo.height * titleFit;
  ctx.drawImage(
    titleLogo,
    (W - titleW) / 2,
    (430 - titleH) / 2,
    titleW,
    titleH,
  );
  const gradient = ctx.createLinearGradient(0, 430, 0, 982);
  gradient.addColorStop(0, "#7dabef");
  gradient.addColorStop(1, PAPER);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 430, W, 552);
  // Fit the visitor's composition into the graphic panel instead of shrinking the whole editor.
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
        ...n,
        x: W / 2 + (n.x - minX - rangeX / 2) * scale,
        y: 690 + (n.y - minY - rangeY / 2) * scale,
      },
    ]),
  );
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  for (const edge of edges) {
    const a = points.get(edge.from),
      b = points.get(edge.to);
    ctx.stroke(new Path2D(connectionPath(
      a, b, (edge.bendX ?? 0) * scale,
      (edge.bendY ?? edge.bend ?? 0) * scale,
    )));
  }
  nodes.forEach((n) => {
    const p = points.get(n.id),
      i = people.findIndex((s) => s.id === n.id),
      r = 46 * n.scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((n.rotation * Math.PI) / 180);
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = "#c3d3e9";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "#e8e7e4";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    for (const x of [-12, 12])
      for (const y of [-12, 12]) {
        ctx.beginPath();
        ctx.arc(x * n.scale, y * n.scale, 5 * n.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.restore();
    const img = wordImages[i];
    const fit = Math.min(148 / img.width, 38 / img.height);
    const w = img.width * fit,
      h = img.height * fit;
    ctx.drawImage(img, p.x - w / 2, p.y + r - 5, w, h);
  });
  ctx.drawImage(designLogo, W - 48 - 140, 895, 140, 35);
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 1018, W, logicalHeight - 1018);
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(48, 1018);
  ctx.lineTo(W - 48, 1018);
  ctx.stroke();
  details(true);
  ctx.fillStyle = INK;
  ctx.fillRect(0, logicalHeight - 3, W, 3);
  return canvas;
}
export function printReceipt(canvas) {
  const artwork = document.querySelector("#receipt-artwork");
  const fallback = `<img class="print-fallback" src="${canvas.toDataURL("image/png")}" alt="나의 첫 단추 영수증">`;
  const content = artwork ? artwork.outerHTML : fallback;

  // Print the receipt DOM/SVG instead of a flattened PNG so small text stays sharp
  // on the SRP-330II thermal printer.
  document.querySelector("#receipt-print-frame")?.remove();
  const frame = document.createElement("iframe");
  frame.id = "receipt-print-frame";
  frame.title = "영수증 인쇄";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;width:0;height:0;border:0;bottom:0;left:0;";
  const stylesheet = assetUrl("scripts/style.css");
  frame.onload = async () => {
    await frame.contentDocument.fonts?.ready;
    await Promise.all(
      [...frame.contentDocument.images].map((img) =>
        img.complete ? undefined : img.decode().catch(() => undefined),
      ),
    );
    frame.contentWindow.focus();
    requestAnimationFrame(() => frame.contentWindow.print());
  };
  frame.srcdoc = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>영수증</title><link rel="stylesheet" href="${stylesheet}"><style>
    @page { size: 80mm auto; margin: 0; }
    :root { color-scheme: light; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { width: 80mm; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    #receipt-artwork,
    .print-fallback {
      display: block;
      width: 72mm;
      height: auto;
      margin: 0 5mm 0 3mm;
      transform: translateY(-2mm);
    }
    .receipt-vector-details {
      background: #fff;
      color: #000;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.55;
    }
    .receipt-vector-details h2 {
      color: #000;
      font-weight: 800;
    }
    .receipt-pills span {
      color: #000;
      border-color: #111;
    }
    .receipt-vector {
      background: #fff;
    }
    .receipt-vector-title {
      background: #000;
    }
    .receipt-vector-pattern {
      background: transparent;
    }
    .receipt-vector-pattern > g:first-of-type {
      stroke: #000;
      stroke-width: 4.8;
    }
  </style></head><body>${content}</body></html>`;
  document.body.append(frame);
}
