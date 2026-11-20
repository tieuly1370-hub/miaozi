// node --experimental-strip-types tests/rad_quiz.test.ts
import { RADICALS } from "../src/data/radicals.ts";
import { HANZI_COMPS } from "../src/data/hanziComps.ts";
import { formsOf, hostChars, isSelfChar, makeQuiz, meaningClash, radicalInChar, type RadQ } from "../src/v2/radQuiz.ts";

let fail = 0;
const ok = (n: string, c: boolean, x = "") => { console.log((c ? "PASS " : "FAIL ") + n + (x ? " — " + x : "")); if (!c) fail++; };

ok("Mọi bộ thủ đều có chữ HSK1 khác chính nó để hỏi", RADICALS.every((r) => hostChars(r).length >= 1));

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const qs: RadQ[] = [];
for (let s = 1; s <= 80; s++) qs.push(...makeQuiz(10, mulberry(s)));
ok("Sinh đủ 10 câu mỗi lượt (80 lượt)", qs.length === 800, String(qs.length));

const which = qs.filter((q) => q.kind === "which");
const find = qs.filter((q) => q.kind === "find");
const meaning = qs.filter((q) => q.kind === "meaning");
ok("Có đủ 3 dạng câu", which.length > 200 && find.length > 200 && meaning.length > 200, `${meaning.length}/${which.length}/${find.length}`);

let selfQ = 0, badDist = 0, selfFind = 0, badFind = 0, clash = 0, noHint = 0;
const selfSamples: string[] = [];
const distSamples: string[] = [];
for (const q of which) {
  const c = q.show;
  if (isSelfChar(c, q.r) || formsOf(q.r).includes(c)) { selfQ++; if (selfSamples.length < 5) selfSamples.push(`${c} = ${q.r.f}`); }
  for (const o of q.opts) {
    if (o === q.ans) continue;
    const d = RADICALS.find((r) => r.f === o);
    if (!d) { badDist++; continue; }
    if (radicalInChar(d, c)) { badDist++; if (distSamples.length < 5) distSamples.push(`${c} chứa ${o}`); }
  }
}
for (const q of find) {
  if (isSelfChar(q.ans, q.r)) { selfFind++; if (selfSamples.length < 8) selfSamples.push(`find ${q.ans} = ${q.r.f}`); }
  for (const o of q.opts) {
    if (o === q.ans) continue;
    if (radicalInChar(q.r, o) || isSelfChar(o, q.r)) { badFind++; if (distSamples.length < 8) distSamples.push(`find ${o} có bộ ${q.r.f}`); }
  }
}
for (const q of meaning) {
  const rads = q.opts.map((vi) => RADICALS.find((r) => r.vi === vi)!).filter(Boolean);
  for (let i = 0; i < rads.length; i++) for (let j = i + 1; j < rads.length; j++) if (meaningClash(rads[i], rads[j])) clash++;
  if (!q.hint) noHint++;
}

ok("Câu «thuộc bộ nào» không hỏi chữ trùng bộ / biến thể / dạng đủ", selfQ === 0, selfSamples.join("; "));
ok("Đáp án nhiễu của «thuộc bộ nào» không phải mảnh của chữ được hỏi", badDist === 0, distSamples.join("; "));
ok("Câu «chữ nào có bộ» không lấy chữ trùng bộ thủ", selfFind === 0, selfSamples.join("; "));
ok("Đáp án nhiễu của «chữ nào có bộ» không chứa bộ đang hỏi", badFind === 0, distSamples.join("; "));
ok("Câu nghĩa: đáp án nhiễu không gần nghĩa (vd. bước đi / bước chân)", clash === 0, String(clash));
ok("Câu nghĩa có dòng ví dụ chữ HSK1", noHint === 0, String(noHint));

const female = which.filter((q) => q.r.k === "女");
ok("Bộ 女 chỉ hỏi chữ như 妈/好, không hỏi chữ 女", female.length > 0 && female.every((q) => q.show !== "女" && q.ans === "女"), female.slice(0, 4).map((q) => q.show).join(" "));

ok("HANZI_COMPS có đủ chữ HSK1 trong danh sách bộ thủ", RADICALS.every((r) => r.ex.every((c) => HANZI_COMPS[c] != null)));

if (fail) { console.log("\n" + fail + " FAIL"); process.exit(1); }
console.log("\nAll rad_quiz tests passed");
