// v1.3: dựng dữ liệu bài theo Nhai HSK (HSK1 3.0). Chạy: node scripts/build_nhai.mjs
import fs from "node:fs";
import { pinyin as pp } from "pinyin-pro";
import { setWords, sentencePinyin, setTone } from "./pinyin.mjs";

const P = JSON.parse(fs.readFileSync("scripts/nhai_parsed.json", "utf8"));
const SYL = new Set(JSON.parse(fs.readFileSync("scripts/syllables.json", "utf8")));
const POOL = JSON.parse(fs.readFileSync("scripts/sent_pool.json", "utf8"));
const EXTRA = JSON.parse(fs.readFileSync("scripts/sent_extra.json", "utf8"));
const isHan = (c) => /[\u3400-\u9fff]/.test(c);
const han = (s) => [...s].filter(isHan);
const MARK = { "ā": ["a", 1], "á": ["a", 2], "ǎ": ["a", 3], "à": ["a", 4], "ē": ["e", 1], "é": ["e", 2], "ě": ["e", 3], "è": ["e", 4], "ī": ["i", 1], "í": ["i", 2], "ǐ": ["i", 3], "ì": ["i", 4], "ō": ["o", 1], "ó": ["o", 2], "ǒ": ["o", 3], "ò": ["o", 4], "ū": ["u", 1], "ú": ["u", 2], "ǔ": ["u", 3], "ù": ["u", 4], "ǖ": ["v", 1], "ǘ": ["v", 2], "ǚ": ["v", 3], "ǜ": ["v", 4], "ü": ["v", 0] };

function splitTok(tok, allowR) {
  const letters = []; const tones = [];
  for (const ch of tok.toLowerCase()) {
    if (MARK[ch]) { letters.push(MARK[ch][0]); tones.push(MARK[ch][1]); }
    else if (/[a-z]/.test(ch)) { letters.push(ch); tones.push(0); }
  }
  const s = letters.join("");
  const res = [];
  const go = (i) => {
    if (i === s.length) return true;
    for (let len = Math.min(6, s.length - i); len >= 1; len--) {
      const piece = s.slice(i, i + len);
      const ok = SYL.has(piece) || (allowR && piece === "r" && i + len === s.length);
      if (!ok) continue;
      res.push([i, i + len]);
      if (go(i + len)) return true;
      res.pop();
    }
    return false;
  };
  if (!go(0)) return null;
  return res.map(([a, b]) => {
    const t = tones.slice(a, b).find((x) => x > 0) || 5;
    const base = s.slice(a, b);
    return base === "r" ? "er5" : base.replace(/v/g, "ü") + t;
  });
}

function pinyinNumOf(hanzi, py) {
  const n = han(hanzi).length;
  const toks = py.split("/")[0].trim().split(/[\s'’]+/).filter(Boolean);
  const out = [];
  for (const t of toks) { const r = splitTok(t, hanzi.endsWith("儿")); if (!r) return null; out.push(...r); }
  if (out.length !== n) return null;
  return out.join(" ");
}

// ---------- từ ----------
const lessons = [];
const allWords = [];
let bad = 0;
for (let n = 1; n <= 19; n++) {
  const list = P.vocab[String(n)];
  const words = list.map((w, i) => {
    const pn = pinyinNumOf(w.hanzi, w.pinyin);
    if (!pn) { bad++; console.log("PINYIN?", n, w.hanzi, w.pinyin); }
    return {
      id: `n${String(n).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`, lesson: n, hanzi: w.hanzi,
      pinyin: w.pinyin.split("/")[0].trim(), pinyinNum: pn || pp(w.hanzi, { toneType: "num" }),
      vi: w.vi, pos: "", decomps: [], mnemonic: "",
    };
  });
  allWords.push(...words);
  lessons.push({ n, words });
}
const numToMark = (x) => { const m = x.match(/^([a-zü]+)([1-5])$/i); return m ? setTone(m[1].toLowerCase(), Number(m[2])) : x; };
setWords(allWords.map((w) => ({ hanzi: w.hanzi, syl: w.pinyinNum.split(" ").map(numToMark).join(" ") })));

// ---------- câu ----------
const cum = new Set();
const tts = [];
const outLessons = [];
for (const { n, words } of lessons) {
  for (const w of words) for (const c of han(w.hanzi)) cum.add(c);
  const picked = [];
  const pool = (POOL[String(n)] || []).filter((s) => han(s.zh).length >= 3);
  pool.sort((a, b) => han(b.zh).length - han(a.zh).length);
  const seen = new Set();
  for (const s of pool) {
    if (picked.length >= 6) break;
    const key = han(s.zh).join("");
    if ([...seen].some((x) => x.includes(key) || key.includes(x))) continue;
    seen.add(key);
    picked.push({ id: s.id, zh: s.zh, vi: s.vi });
  }
  (EXTRA[String(n)] || []).forEach(([zh, vi], k) => {
    const miss = han(zh).filter((c) => !cum.has(c));
    if (miss.length) console.log("EXTRA uses unlearned chars", n, zh, miss.join(""));
    const id = `x${String(n).padStart(2, "0")}-${k + 1}`;
    picked.push({ id, zh, vi });
    tts.push({ id, text: zh, kind: "sent" });
  });
  const sentences = picked.map((s) => {
    const r = sentencePinyin(s.zh);
    return { id: s.id, lesson: n, hanzi: s.zh, pinyin: r.pinyin, pinyinNum: r.pinyinNum, vi: s.vi };
  });
  const g = P.grammar[String(n)];
  outLessons.push({
    id: n, titleZh: `第${n}课`, titleVi: P.titles[String(n)][0],
    grammarNote: g ? g.patterns.map((p) => p.name).join(" · ") : "",
    words, sentences, lecture: null, workbook: null, days: 3,
  });
}
console.log("pinyin issues:", bad, "words:", allWords.length);

// ---------- ghi curriculum.ts ----------
const path = "src/data/curriculum.ts";
const src = fs.readFileSync(path, "utf8");
const start = src.indexOf("export const LESSONS: Lesson[] = ");
const end = src.indexOf("\n];\n", start) + 4;
fs.writeFileSync(path, src.slice(0, start) + "export const LESSONS: Lesson[] = " + JSON.stringify(outLessons, null, 1) + ";\n" + src.slice(end));

// ---------- nhaiCourse.ts ----------
const seenC = new Set();
const course = outLessons.map((l) => {
  const g = P.grammar[String(l.id)];
  const newChars = [];
  for (const w of l.words) for (const c of han(w.hanzi)) if (!seenC.has(c)) { seenC.add(c); newChars.push(c); }
  return {
    id: l.id, title: l.titleVi, extended: l.id > 15,
    vocabUrl: `https://nhaihsk.com/vocab/hsk1/lesson-${l.id}`,
    grammarUrl: g ? g.url : null,
    patterns: g ? g.patterns : [],
    newChars,
  };
});
const certIds = ["H10000", "H10901", "H10902", "H11003", "H11004", "H11005", "H11006", "H11007", "H11008", "H11329", "H11330", "H11332", "H11334"];
fs.writeFileSync("src/data/nhaiCourse.ts",
  "// AUTO-GENERATED by scripts/build_nhai.mjs từ nhai_map.md — chỉ link + tên bài/mẫu câu của Nhai HSK\n" +
  "export type NPattern = { name: string; explain: string; url: string };\n" +
  "export type NLesson = { id: number; title: string; extended: boolean; vocabUrl: string; grammarUrl: string | null; patterns: NPattern[]; newChars: string[] };\n" +
  "export const NHAI_LESSONS: NLesson[] = " + JSON.stringify(course, null, 1) + ";\n" +
  "export const NHAI_CERT_TESTS: string[] = " + JSON.stringify(certIds.map((x) => `https://nhaihsk.com/certificate-test/hsk1/${x}`)) + ";\n" +
  "export const NHAI_UNLOCK_CODE = \"FREEHSK\";\n");
console.log("chars:", seenC.size);

// ---------- manifest âm ----------
const NEUTRAL_CARRIER = { "的": "我的", "了": "好了", "吗": "好吗", "呢": "你呢", "吧": "好吧", "们": "你们", "上|shang5": "桌子上" };
// đồng âm một cách đọc để thay chữ đa âm khi đọc riêng
const charset = new Set([...seenC, ..."知之支汁芝枝肢织脂纸指止址旨趾志至制治致智置质秩挚掷峙痔窒稚滞帜址子紫籽姊仔梓滓"]);
const single = new Map();
for (const c of charset) {
  const r = pp(c, { toneType: "num", multiple: true, type: "array" });
  if (r.length === 1) { const k = r[0]; if (!single.has(k)) single.set(k, []); single.get(k).push(c); }
}
// Chữ đa âm mà giọng đọc máy hay đọc sai khi đứng riêng (rút từ lỗi chủ báo ở 1.1)
const FORCE = { "几|ji3": "挤", "都|dou1": "兜", "和|he2": "盒", "那|na4": "纳", "会|hui4": "惠", "分|fen1": "芬", "喂|wei4": "位", "只|zhi1": "织", "还|hai2": "孩", "得|de5": "的", "长|zhang3": "掌", "要|yao4": "药", "教|jiao4": "叫" };
for (const w of allWords) {
  const chars = han(w.hanzi);
  const forced = chars.length === 1 ? FORCE[`${w.hanzi}|${w.pinyinNum}`] : undefined;
  if (forced) { tts.push({ id: w.id, text: forced, kind: "word", carrier: null }); continue; }
  let text = w.hanzi; let carrier = null;
  if (chars.length === 1) {
    const want = w.pinyinNum.replace("ü", "v");
    const def = pp(w.hanzi, { toneType: "num" }).replace("ü", "v");
    if (NEUTRAL_CARRIER[w.hanzi] && /5$/.test(want)) { text = NEUTRAL_CARRIER[w.hanzi]; carrier = text; }
    else if (NEUTRAL_CARRIER[`${w.hanzi}|${want}`]) { text = NEUTRAL_CARRIER[`${w.hanzi}|${want}`]; carrier = text; }
    else if (def !== want) {
      const alt = (single.get(want) || single.get(want.replace("v", "ü")) || []).filter((c) => c !== w.hanzi)[0];
      if (alt) { text = alt; console.log("homophone", w.hanzi, want, "<-", alt, "(default", def + ")"); }
      else console.log("NO HOMOPHONE", w.hanzi, want, def);
    }
  } else {
    const def = pp(w.hanzi, { toneType: "num" }).replace(/0/g, "5");
    if (def.replace(/5/g, "") !== w.pinyinNum.replace(/5/g, "").replace(/ü/g, "ü")) console.log("multi differs", w.hanzi, w.pinyinNum, "| default", def);
  }
  tts.push({ id: w.id, text, kind: "word", carrier });
}
fs.writeFileSync("scripts/tts-nhai.json", JSON.stringify(tts, null, 1));
console.log("tts jobs", tts.length);
