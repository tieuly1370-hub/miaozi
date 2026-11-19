// node --experimental-strip-types tests/carrier.test.ts — bài nghe trợ từ: âm phát cả cụm thì đáp án cũng là cả cụm.
import { readFileSync } from "node:fs";
import { CARRIER, carrierPick, v2Items } from "../src/gate.ts";
import { WORD_BY_ID } from "../src/data/curriculum.ts";
let fail = 0;
const ok = (n: string, c: boolean, x = "") => { console.log((c ? "PASS " : "FAIL ") + n + (x ? " — " + x : "")); if (!c) fail++; };
const idx = JSON.parse(readFileSync("public/audio/index.json", "utf8"));
const fromIndex = Object.fromEntries(Object.entries(idx).filter(([, v]: any) => v.c).map(([k, v]: any) => [k, v.c]));
ok("CARRIER khớp index.json (9 từ)", JSON.stringify(Object.keys(CARRIER).sort()) === JSON.stringify(Object.keys(fromIndex).sort()) && Object.entries(CARRIER).every(([k, v]) => fromIndex[k] === v));
for (const [id, phrase] of Object.entries(CARRIER)) {
  const it = carrierPick(WORD_BY_ID[id], "k")!;
  const right = it.options!.find((o) => o.id === it.answer)!;
  ok(`${WORD_BY_ID[id].hanzi} → ${phrase}`, right.hanzi === phrase && it.answerHanzi === phrase && it.audio === id && it.options!.length >= 4 && new Set(it.options!.map((o) => o.hanzi)).size === it.options!.length && it.options!.every((o) => o.hanzi.length === phrase.length), it.options!.map((o) => o.hanzi).join(" "));
}
// mọi item nghe-chọn có âm = từ trợ từ trong đề thật đều dùng cụm; và không bắt nói riêng trợ từ
let seen = 0, bad = 0, speakBad = 0;
for (let r = 0; r < 30; r++) for (const n of [1, 3, 4, 7, 9, 12, 14]) for (const it of v2Items("s6a", n, [])) {
  if (it.t === "pick" && it.skill === "listen" && it.audio && CARRIER[it.audio]) { seen++; if (it.answerHanzi !== CARRIER[it.audio]) bad++; }
}
for (let r = 0; r < 30; r++) for (const n of [3, 4, 7]) for (const it of v2Items("s6b", n, [])) if (it.skill === "speak" && it.wordId && CARRIER[it.wordId]) speakBad++;
ok(`Đề 6A thật: ${seen} câu nghe trợ từ, đều là cụm`, seen > 0 && bad === 0);
ok("6B không bắt nói riêng một trợ từ", speakBad === 0);
if (fail) { console.log(fail + " FAIL"); process.exit(1); } else console.log("ALL PASS");
