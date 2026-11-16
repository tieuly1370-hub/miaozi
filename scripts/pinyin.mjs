// Pinyin chuẩn giáo trình: tách từ theo từ điển HSK1 + bổ sung, thanh nhẹ, 儿化, biến điệu 一/不.
import { pinyin as pp } from "pinyin-pro";

const MARK = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", ü: "ǖǘǚǜ" };
const REV = {};
for (const [v, s] of Object.entries(MARK)) [...s].forEach((c, i) => (REV[c] = [v, i + 1]));
export function toneOf(syl) { for (const c of syl) if (REV[c]) return REV[c][1]; return 5; }
export function toNum(syl) {
  let t = 5, out = "";
  for (const c of syl) { if (REV[c]) { out += REV[c][0]; t = REV[c][1]; } else out += c; }
  out = out.replace(/'/g, "");
  return out + t;
}
function setTone(syl, tone) {
  let plain = "";
  for (const c of syl) plain += REV[c] ? REV[c][0] : c;
  if (tone === 5) return plain;
  const order = ["a", "e", "ou", "o", "i", "u", "ü"];
  let idx = -1;
  if (plain.includes("a")) idx = plain.indexOf("a");
  else if (plain.includes("e")) idx = plain.indexOf("e");
  else if (plain.includes("ou")) idx = plain.indexOf("o");
  else { for (let k = plain.length - 1; k >= 0; k--) if ("iouü".includes(plain[k])) { idx = k; break; } }
  void order;
  if (idx < 0) return plain;
  const v = plain[idx];
  return plain.slice(0, idx) + MARK[v][tone - 1] + plain.slice(idx + 1);
}

// syllables separated by space; 儿化 counts as one syllable covering 2 chars
export const EXTRA = {
  "这个": "zhè ge", "那个": "nà ge", "哪个": "nǎ ge", "两个": "liǎng ge", "两点": "liǎng|diǎn",
  "一些": "yì xiē", "一本": "yì|běn", "一点儿": "yì diǎnr", "一起": "yì qǐ",
  "哪儿": "nǎr", "那儿": "nàr", "这儿": "zhèr", "中文": "Zhōng wén",
  "越南人": "Yuè nán rén", "去年": "qù nián", "明年": "míng nián", "贵": "guì", "难": "nán",
  "小明": "Xiǎo|Míng", "小红": "Xiǎo|Hóng", "李月": "Lǐ|Yuè", "不客气": "bú|kè qi", "打电话": "dǎ|diàn huà",
  "二十": "èr shí", "三十": "sān shí", "二十八": "èr shí bā", "二十五": "èr shí wǔ", "三十五": "sān shí wǔ", "十一": "shí yī", "十二": "shí èr",
  "星期一": "xīng qī yī", "星期二": "xīng qī èr", "星期三": "xīng qī sān", "星期四": "xīng qī sì", "星期五": "xīng qī wǔ", "星期六": "xīng qī liù", "王": "Wáng", "王先生": "Wáng|xiān sheng",
  "王老师": "Wáng|lǎo shī", "火车": "huǒ chē", "星期天": "xīng qī tiān", "星期日": "xīng qī rì", "星期几": "xīng qī jǐ",
  "中国人": "Zhōng guó rén", "北京人": "Běi jīng rén", "怎么读": "zěn me|dú", "怎么写": "zěn me|xiě",
  "老师再见": "lǎo shī|zài jiàn", "不太": "bú|tài", "不是": "bú|shì", "不会": "bú|huì", "不想": "bù|xiǎng",
  "不能": "bù|néng", "三个": "sān|ge", "一百": "yì bǎi",
  "什么时候": "shén me|shí hou", "做什么": "zuò|shén me", "认识你": "rèn shi|nǐ",
  "看书": "kàn|shū", "坐出租车": "zuò|chū zū chē", "多喝": "duō|hē", "多吃": "duō|chī", "回家": "huí|jiā", "请坐": "qǐng|zuò", "没买": "méi|mǎi",
};

let DICT = {};
export function setWords(words) {
  DICT = {};
  for (const w of words) DICT[w.hanzi] = w.syl;
  Object.assign(DICT, EXTRA);
}

const PUNCT = { "，": ",", "。": ".", "？": "?", "！": "!", "、": ",", "“": "\u201C", "”": "\u201D", "：": ":", "；": ";", "（": "(", "）": ")" };
const NUMS = "零一二三四五六七八九十百两几";

export function sentencePinyin(text) {
  const chars = [...text];
  const ctx = pp(text, { type: "array", toneSandhi: false });
  const toks = [];
  for (let i = 0; i < chars.length;) {
    let hit = null;
    for (let L = Math.min(5, chars.length - i); L >= 1; L--) {
      const sub = chars.slice(i, i + L).join("");
      if (DICT[sub] && (L > 1 || !["一", "不"].includes(sub))) { hit = { zh: sub, syl: DICT[sub].replace(/\|/g, " | ").split(" ").filter(Boolean) }; break; }
    }
    if (hit) { toks.push(hit); i += [...hit.zh].length; continue; }
    const c = chars[i];
    if (PUNCT[c] || /[\s.,!?]/.test(c)) toks.push({ zh: c, punct: PUNCT[c] || c });
    else toks.push({ zh: c, syl: [ctx[i]] });
    i++;
  }
  // sandhi 一 / 不 (single-char tokens)
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (!t.syl || t.zh.length !== 1) continue;
    const next = toks[k + 1];
    const nt = next && next.syl ? toneOf(next.syl[0]) : 0;
    if (t.zh === "不") t.syl = [nt === 4 ? "bú" : "bù"];
    if (t.zh === "一") {
      const prev = toks[k - 1];
      const numCtx = (prev && prev.syl && (NUMS.includes(prev.zh.slice(-1)) || prev.zh.endsWith("期") || prev.zh.endsWith("月"))) || (next && next.syl && (NUMS.includes(next.zh[0]) || next.zh[0] === "月" || next.zh[0] === "号"));
      t.syl = [!next || !next.syl || numCtx ? "yī" : nt === 4 || nt === 5 ? "yí" : "yì"];
    }
  }
  // join
  let out = "", cap = true, prevWord = false;
  for (const t of toks) {
    if (t.punct === "\u201C") { out += (out ? " " : "") + t.punct; prevWord = false; continue; }
    if (t.punct) { out += t.punct; if (/[.?!]/.test(t.punct)) cap = true; prevWord = false; continue; }
    let w = t.syl.join(" ").split(" | ").map((g) => joinSyl(g.split(" "))).join(" ");
    if (cap) { w = w[0].toUpperCase() + w.slice(1); cap = false; }
    out += (out && !out.endsWith("\u201C") ? " " : "") + w;
    prevWord = true;
  }
  void prevWord;
  const num = toks.filter((t) => t.syl).flatMap((t) => t.syl.filter((x) => x !== "|").map(toNum)).join(" ");
  return { pinyin: out.replace(/ ([,.?!:;\u201D])/g, "$1").trim(), pinyinNum: num.toLowerCase() };
}

export function joinSyl(syl) {
  let w = "";
  syl.forEach((s, i) => {
    if (i > 0 && /^[aeoāáǎàēéěèōóǒò]/.test(s)) w += "'";
    w += s;
  });
  return w;
}
export { setTone };
