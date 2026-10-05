import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import {
  searchStudents,
  initialNodes,
  addConnection,
  isConnected,
  encodeMonoBmp,
  constrainBend,
  connectionPath,
} from "../scripts/model.js";
import { server } from "../server.mjs";
const data = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url)),
);
test("connection bends as circular arcs through the dragged handle", () => {
  const a = { x: 100, y: 100 }, b = { x: 700, y: 400 };
  const values = connectionPath(a, b, -150, 80).match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert.deepEqual(values.slice(0, 2), [100, 100]);
  assert.deepEqual(values.slice(7, 9), [250, 330]);
  assert.deepEqual(values.slice(-2), [700, 400]);
  assert.equal(values[2], values[9]);
  assert.equal(values[3], values[10]);
  assert.match(connectionPath(a, b, 0, 0), /^M100 100 L700 400$/);
});
test("connection handle movement is capped at a semicircle distance", () => {
  const a = { x: 0, y: 0 }, b = { x: 300, y: 0 };
  assert.deepEqual(constrainBend(a, b, 0, 400), { bendX: 0, bendY: 150 });
  assert.deepEqual(constrainBend(a, b, 90, 120), { bendX: 90, bendY: 120 });
});
test("catalog preserves all student rows and shared asset relationships", async () => {
  assert.equal(data.students.length, 64);
  assert.equal(data.assets.length, 43);
  assert.equal(new Set(data.students.map((s) => s.id)).size, 64);
  for (const a of data.assets) {
    await access(new URL("../" + a.image, import.meta.url));
    await access(new URL("../" + a.letter, import.meta.url));
  }
  for (const s of data.students) {
    assert.ok(data.assets.some((a) => a.id === s.assetId));
    assert.equal(s.location, null);
    assert.ok(!("학번 이름" in s));
  }
});
test("search finds names, Korean words, English words, and handles empty results", () => {
  assert.equal(
    searchStudents(data.students, data.assets, "최수빈")[0].name,
    "최수빈",
  );
  const ko = searchStudents(data.students, data.assets, "애정"),
    en = searchStudents(data.students, data.assets, " AFFECTION ");
  assert.deepEqual(ko, en);
  assert.ok(ko.length > 0);
  assert.equal(
    searchStudents(data.students, data.assets, "no-such-word").length,
    0,
  );
});
test("connections disallow self and duplicate edges; disconnected groups cannot finish", () => {
  const n = initialNodes(["a", "b", "c", "d"]);
  let e = [];
  e = addConnection(e, "a", "a");
  assert.equal(e.length, 0);
  e = addConnection(e, "a", "b");
  e = addConnection(e, "a", "b");
  assert.equal(e.length, 1);
  e = addConnection(e, "c", "d");
  assert.equal(isConnected(n, e), false);
  e = addConnection(e, "b", "c");
  assert.equal(isConnected(n, e), true);
});
test("1-bit BMP has correct palette, row order, padding and resolution", () => {
  const rgba = new Uint8Array(8 * 2 * 4).fill(255);
  rgba.set([0, 0, 0, 255], 0);
  const bytes = encodeMonoBmp(rgba, 8, 2),
    v = new DataView(bytes.buffer);
  assert.equal(v.getUint16(28, true), 1);
  assert.equal(v.getInt32(18, true), 8);
  assert.equal(v.getInt32(22, true), 2);
  assert.equal(v.getInt32(38, true), 7087);
  assert.equal(bytes[62], 255);
  assert.equal(bytes[66], 127);
  assert.equal(bytes.length, 70);
  assert.throws(() => encodeMonoBmp(rgba, 7, 2));
});
test("server serves app but does not expose source workbook or review data", async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await fetch(base + "/data/catalog.json")).status, 200);
    assert.equal((await fetch(base + "/data/review.json")).status, 404);
    assert.equal(
      (await fetch(base + "/2026_졸준위_개발자님공유.xlsx")).status,
      404,
    );
    assert.equal((await fetch(base + "/package.json")).status, 404);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("keywords merge shared images and name searches retain the same selection identity", async () => {
  const { keywordStudents } = await import("../scripts/model.js");
  const all = keywordStudents(data.students, data.assets);
  assert.equal(all.length, new Set(data.students.map((s) => s.assetId)).size);
  const curiosity = keywordStudents(data.students, data.assets, "호기심");
  assert.equal(curiosity.length, 1);
  const members = data.students.filter(
    (s) => s.assetId === curiosity[0].assetId,
  );
  assert.equal(members.length, 4);
  for (const member of members) {
    assert.equal(
      keywordStudents(data.students, data.assets, member.name).find(
        (s) => s.assetId === member.assetId,
      ).id,
      curiosity[0].id,
    );
  }
});
