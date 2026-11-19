// node --experimental-strip-types tests/speech.test.ts
import { scoreSpeech, normalizeAsr, numToZh } from "../src/v2/speakScore.ts";
let fail = 0;
const ok = (c: boolean, m: string) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
const cases: [string, string[], boolean, string][] = [
  ["你好", ["你好。"], true, "dấu chấm cuối"],
  ["你好", ["你好！"], true, "chấm than"],
  ["你好", ["妳好"], true, "chữ biến thể 妳"],
  ["你好", ["尼好"], true, "đồng âm 尼"],
  ["谢谢", ["謝謝"], true, "phồn thể"],
  ["王老师", ["王老師"], true, "phồn thể 師"],
  ["我叫什么名字", ["我叫什麼名字？"], true, "phồn thể 麼 + ？"],
  ["你叫什么名字？", ["你叫什么名字"], true, "câu mẫu có dấu, máy không"],
  ["我今年二十岁", ["我今年20岁"], true, "số Ả Rập 20"],
  ["我有两个孩子", ["我有2个孩子"], true, "2 thay 两"],
  ["认识你很高兴", ["认识你很高兴"], true, "nguyên câu"],
  ["认识你很高兴", ["认识你 很高兴"], true, "có khoảng trắng"],
  ["他是我哥哥", ["她是我哥哥"], true, "đồng âm 他/她"],
  ["我是学生", ["我是学僧"], true, "đồng âm gần"],
  ["对不起", ["对不起"], true, "biến điệu 不"],
  ["你好", ["再见"], false, "sai hoàn toàn"],
  ["我是中国人", ["我是"], false, "thiếu nửa câu"],
  ["你好", [""], false, "không nghe được gì"],
  ["我叫王生", ["我叫王", "我叫王生"], true, "lấy phương án tốt nhất"],
];
for (const [exp, alts, want, name] of cases) {
  const r = scoreSpeech(exp, alts, null);
  ok(r.pass === want, `${name}: “${alts[0]}” vs “${exp}” → ${r.percent}% ${r.pass ? "đạt" : "trượt"}`);
}
ok(numToZh(20) === "二十" && numToZh(105) === "一百零五" && numToZh(12) === "十二", "numToZh");
ok(normalizeAsr("你好，王老師！") === "你好王老师", "normalizeAsr");
// Thanh đo được sai một phần không được đánh trượt câu đúng âm
const r = scoreSpeech("你好", ["你好"], [1, 1]);
ok(r.pass, `âm đúng + thanh đo lệch vẫn đạt (${r.percent}%)`);
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
