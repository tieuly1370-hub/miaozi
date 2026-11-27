// node --experimental-strip-types tests/strict_grade.test.ts
import fs from "node:fs";
import { gradeStrict, strokeZoneOk, type Pt } from "../src/v2/strictGrade.ts";
let fail = 0;
const ok = (c: boolean, m: string) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
const load = (c: string) => (JSON.parse(fs.readFileSync(new URL(`../public/hanzi-data/${c}.json`, import.meta.url), "utf8")).medians as number[][][]).map((s) => s.map(([x, y]) => ({ x, y })));
const G = fs.readFileSync(new URL("../src/data/compGroups.ts", import.meta.url), "utf8");
const groups = (c: string) => JSON.parse(G.slice(G.indexOf("{"), G.lastIndexOf("}") + 1))[c] as string;
let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280) * 2 - 1;
const jitter = (s: Pt[][], a: number) => s.map((st) => st.map((p) => ({ x: p.x + rnd() * a, y: p.y + rnd() * a })));
const tf = (st: Pt[], o: Pt, sx: number, sy: number, dx = 0, dy = 0) => st.map((p) => ({ x: o.x + (p.x - o.x) * sx + dx, y: o.y + (p.y - o.y) * sy + dy }));

const ge = load("哥"), g = groups("哥");
ok(g === "0000011111", "nhóm 哥 = 可 trên + 可 dưới: " + g);

// chữ gọn gàng: rung tay ±25, viết nhỏ hơn 15% và lệch 40 → đạt
const neat = jitter(ge, 25).map((s) => tf(s, { x: 512, y: 400 }, 0.85, 0.85, 40, -30));
ok(gradeStrict(ge, neat, g).ok, "哥 viết gọn (rung tay, hơi nhỏ, hơi lệch cả chữ) → ĐẠT");
ok(neat.every((s, i) => strokeZoneOk(ge[i], s)), "哥 gọn: từng nét nằm trong vùng");

// 哥 cẩu thả, lệch: 可 trên co nhỏ dồn về góc trái, 可 dưới kéo cao lệch phải → TRƯỢT
const sloppy = jitter(ge, 30).map((s, i) => (i < 5 ? tf(s, { x: 250, y: 780 }, 0.45, 0.45) : tf(s, { x: 512, y: 200 }, 1.15, 1.7, 140, 0)));
const r = gradeStrict(ge, sloppy, g);
ok(!r.ok, "哥 cẩu thả, lệch chỗ → TRƯỢT (" + r.reason + ")");
ok(r.badParts.length > 0, "phát hiện thành phần sai tỉ lệ / vị trí");

// lệch vừa: 可 dưới dịch phải 170, kéo cao 1.3 (chuẩn hoá cả chữ chia đôi sai lệch → cần kiểm tra vị trí tương đối)
const mild = ge.map((s, i) => (i < 5 ? s : tf(s, { x: 0, y: 300 }, 1, 1.3, 170, 0)));
ok(!gradeStrict(ge, mild, g).ok, "哥 可 dưới lệch phải / kéo cao → TRƯỢT");
const small = ge.map((s, i) => (i < 5 ? s : tf(s, { x: 0, y: 0 }, 1, 1, 50, -30)));
ok(gradeStrict(ge, small, g).ok, "哥 可 dưới lệch nhẹ (~60) → vẫn ĐẠT");

// tỉ lệ sai nhưng từng nét gần đúng chỗ: 可 trên chiếm ~3/4 chiều cao
const tall = ge.map((s, i) => (i < 5 ? tf(s, { x: 512, y: 900 }, 1, 1.5, 0, 0) : tf(s, { x: 512, y: -100 }, 1, 0.45, 0, 0)));
ok(!gradeStrict(ge, tall, g).ok, "哥 hai phần lệch tỉ lệ (trên to, dưới bẹt) → TRƯỢT");

// từng nét: lệch 300 → ngoài vùng; lệch 100 → trong vùng
ok(!strokeZoneOk(ge[0], ge[0].map((p) => ({ x: p.x + 300, y: p.y }))), "nét lệch 300 → ngoài vùng");
ok(strokeZoneOk(ge[0], ge[0].map((p) => ({ x: p.x + 100, y: p.y - 50 }))), "nét lệch ~110 → trong vùng");

// chữ khác: 好 gọn → đạt; 好 đổi chỗ 女/子 → trượt
const hao = load("好"), gh = groups("好");
ok(gradeStrict(hao, jitter(hao, 25), gh).ok, "好 gọn → ĐẠT");
const swapped = hao.map((s, i) => tf(s, { x: 0, y: 0 }, 1, 1, gh[i] === "0" ? 420 : -420, 0));
ok(!gradeStrict(hao, swapped, gh).ok, "好 đổi chỗ 女 / 子 → TRƯỢT");
// thiếu nét
ok(!gradeStrict(hao, hao.slice(0, 3), gh).ok, "thiếu nét → TRƯỢT");

console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
