// node --experimental-strip-types tests/stroke_match.test.ts
import { kindsMatch, strokeKind, typeAccepts, type Pt } from "../src/v2/strokeMatch.ts";
let fail = 0;
const ok = (c: boolean, m: string) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
const line = (x0: number, y0: number, x1: number, y1: number): Pt[] => {
  const n = 8, pts: Pt[] = [];
  for (let i = 0; i <= n; i++) pts.push({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n });
  return pts;
};

ok(strokeKind(line(100, 500, 800, 510)) === "heng", "ngang trái→phải");
ok(strokeKind(line(400, 800, 410, 200)) === "shu", "sổ trên→dưới (y-up: 800→200)");
ok(strokeKind(line(700, 800, 200, 200)) === "pie", "phẩy phải-trên → trái-dưới");
ok(strokeKind(line(200, 700, 800, 200)) === "na", "mác trái-trên → phải-dưới");
ok(strokeKind(line(100, 100, 140, 80)) === "dian", "chấm ngắn");
ok(strokeKind(line(200, 200, 600, 500)) === "ti", "háy lên sang phải");

// gập: ngang rồi sổ
const zhe: Pt[] = [...line(100, 700, 600, 700), ...line(600, 700, 600, 200).slice(1)];
ok(strokeKind(zhe) === "zhe", "gập ngang-sổ: " + strokeKind(zhe));

ok(kindsMatch("heng", "heng") && kindsMatch("dian", "na") && kindsMatch("gou", "shu"), "cặp nét gần được chấp nhận");
ok(!kindsMatch("heng", "shu") && !kindsMatch("pie", "heng"), "ngang ≠ sổ, phẩy ≠ ngang");

ok(typeAccepts(line(100, 500, 800, 500), line(150, 480, 820, 560)), "ngang lệch vị trí vẫn đúng loại");
ok(!typeAccepts(line(100, 500, 800, 500), line(400, 800, 400, 200)), "ngang vs sổ là sai loại");

console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
