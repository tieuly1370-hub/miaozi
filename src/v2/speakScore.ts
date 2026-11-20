/**
 * Chấm nói v2 — khoan dung với đồng âm, dấu câu, chữ phồn thể, số Ả Rập.
 * So sánh theo âm tiết pinyin KHÔNG dấu (máy nhận giọng trả về chữ, nên thanh trong chữ là thanh từ điển, không phải thanh đã nói).
 * Thanh điệu (nếu đo được bằng YIN) chỉ hiển thị để tham khảo, không quyết định đạt/trượt.
 */
import { pinyin } from "pinyin-pro";

const TRAD: Record<string, string> = Object.fromEntries(
  ("們们師师學学謝谢見见請请問问麼么認认識识興兴國国這这誰谁還还嗎吗對对個个幾几媽妈兒儿歲岁兩两號号會会飯饭麵面條条餃饺電电腦脑歡欢機机話话買买東东錢钱塊块蘋苹貴贵員员貨货時时開开車车書书讀读視视聽听說说熱热藥药給给雞鸡寫写漢汉語语愛爱飛飞場场樓楼動动網网鐘钟點点現现間间醫医後后習习長长門门妳你氣气關关係系沒没業业園园邊边牠它隻只種种從从來来頭头樣样雙双裡里裏里為为課课醫医張张週周題题賣卖務务雪雪葉叶喫吃視视歲岁廳厅館馆鋪铺麼么吧吧貓猫戲戏紅红綠绿這这")
    .match(/../gu)!.map((p) => [...p] as [string, string]),
);
const DIG = "零一二三四五六七八九";

/** 0–99999 → chữ số Trung. */
export function numToZh(n: number): string {
  if (n < 10) return DIG[n];
  const units = ["", "十", "百", "千", "万"];
  const ds = String(n).split("").map(Number);
  let out = "";
  let zero = false;
  ds.forEach((d, i) => {
    const u = units[ds.length - 1 - i];
    if (d === 0) { zero = true; return; }
    if (zero && out) out += "零";
    zero = false;
    out += (d === 1 && u === "十" && i === 0 ? "" : DIG[d]) + u;
  });
  return out;
}

/** Chuẩn hoá chữ máy nghe được: bỏ dấu câu/khoảng trắng, phồn → giản, số → chữ. */
export function normalizeAsr(text: string): string {
  let s = (text || "").normalize("NFKC");
  s = s.replace(/\d+/g, (m) => numToZh(Number(m)));
  s = [...s].map((c) => TRAD[c] || c).join("");
  return [...s].filter((c) => /[\u3400-\u9fff]/.test(c)).join("");
}

/** Âm tiết pinyin không dấu cho từng chữ Hán (ü viết là v). */
export function sylls(hanzi: string): string[] {
  const h = normalizeAsr(hanzi);
  if (!h) return [];
  return (pinyin(h, { toneType: "none", type: "array" }) as string[]).map((x) => x.toLowerCase().replace(/ü/g, "v"));
}

const NEAR: [string, string][] = [["zh", "z"], ["ch", "c"], ["sh", "s"], ["n", "l"]];
function splitIF(s: string): [string, string] {
  const m = s.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(.*)$/)!;
  return [m[1] || "", m[2]];
}
/** Độ giống 2 âm tiết không dấu: 1 = đúng, 0.5 = gần (lẫn z/zh, n/l, en/eng, in/ing), 0 = sai. */
export function sylSim(exp: string, got: string): number {
  if (exp === got) return 1;
  const [ei, ef] = splitIF(exp);
  const [gi, gf] = splitIF(got);
  const iniNear = ei === gi || NEAR.some(([a, b]) => (ei === a && gi === b) || (ei === b && gi === a));
  const finNear = ef === gf || ef.replace(/g$/, "") === gf.replace(/g$/, "");
  if (iniNear && finNear) return 0.5;
  return 0;
}

/** Căn chỉnh Levenshtein, trả điểm khớp 0..1 so với câu mẫu. */
export function alignScore(exp: string[], got: string[], twoOk: Set<number> = new Set()): { score: number; marks: number[] } {
  const n = exp.length, m = got.length;
  if (!n) return { score: 0, marks: [] };
  const sim = (i: number, j: number) => (twoOk.has(i) && (got[j] === "er" || got[j] === "liang")) ? 1 : sylSim(exp[i], got[j]);
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const bt: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (i === 0 && j === 0) continue;
    let best = -Infinity, how = 0;
    if (i > 0 && j > 0) { const v = dp[i - 1][j - 1] + sim(i - 1, j - 1); if (v > best) { best = v; how = 1; } }
    if (i > 0) { const v = dp[i - 1][j]; if (v > best) { best = v; how = 2; } } // thiếu âm
    if (j > 0) { const v = dp[i][j - 1] - 0.25; if (v > best) { best = v; how = 3; } } // thừa âm
    dp[i][j] = best; bt[i][j] = how;
  }
  const marks = new Array(n).fill(0);
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const h = bt[i][j];
    if (h === 1) { marks[i - 1] = sim(i - 1, j - 1); i--; j--; }
    else if (h === 2) i--;
    else j--;
  }
  return { score: Math.max(0, Math.min(1, dp[n][m] / n)), marks };
}

export interface V2Score {
  pass: boolean;
  /** 0–100 */
  percent: number;
  sylPct: number;
  tonePct: number | null;
  heard: string;
  heardNorm: string;
  marks: { char: string; py: string; ok: number; tone?: { want: number; got?: number; ok: boolean } }[];
  message: string;
  /** v2.3: bỏ qua vì không thu âm / nhận giọng được — vẫn tính xong câu. */
  skipped?: boolean;
}

/** Câu nói được bỏ qua (micro/nhận giọng lỗi hoặc không có) — tính đã làm xong. */
export function skippedSpeak(_expected = ""): V2Score {
  return {
    pass: true, percent: 100, sylPct: 100, tonePct: null,
    heard: "", heardNorm: "", marks: [], skipped: true,
    message: "Đã bỏ qua — không thu âm / nhận giọng được.",
  };
}

export const PASS_PCT = 80;

/** Thanh mong đợi theo cách đọc thật (biến điệu 3-3, 不, 一; thanh nhẹ = 5). */
export function spokenTones(hanzi: string): number[] {
  const h = normalizeAsr(hanzi);
  const t = (pinyin(h, { toneType: "num", type: "array", toneSandhi: false }) as string[]).map((x) => Number(x.match(/(\d)$/)?.[1] || 5) || 5);
  const cs = [...h];
  for (let i = 0; i < t.length - 1; i++) {
    if (cs[i] === "不" && t[i + 1] === 4) t[i] = 2;
    if (cs[i] === "一" && t[i + 1] !== 5 && !(i > 0 && cs[i - 1] === "第")) t[i] = t[i + 1] === 4 ? 2 : 4;
  }
  for (let i = t.length - 2; i >= 0; i--) if (t[i] === 3 && t[i + 1] === 3) t[i] = 2;
  return t;
}

/** Thanh đo được có khớp không — khoan dung: thanh nhẹ khớp mọi thứ; thanh 3 cuối câu/đứng giữa hay đọc nửa (thấp/xuống) nên 3≈4 khi không cuối; thanh 2≈3 khi đo dốc lên. */
export function toneOk(want: number, got: number | undefined, last: boolean): boolean {
  if (got === undefined) return true;
  if (want === 5 || got === 5) return true;
  if (want === got) return true;
  if (want === 3 && (got === 2 || (!last && got === 4))) return true;
  if (want === 2 && got === 3) return true;
  return false;
}

/**
 * Chấm một lần nói.
 * @param expected câu mẫu (chữ Hán)
 * @param alts các phương án máy nghe được (lấy phương án tốt nhất)
 * @param pitchTones thanh đo bằng YIN theo âm tiết (có thể null)
 */
export function scoreSpeech(expected: string, alts: string[], pitchTones: (number | undefined)[] | null = null): V2Score {
  const exp = sylls(expected);
  const chars = [...normalizeAsr(expected)];
  const twoOk = new Set(chars.map((c, i) => (c === "两" || c === "二" ? i : -1)).filter((i) => i >= 0));
  let best = { score: -1, marks: [] as number[], heard: "", norm: "" };
  for (const a of alts.length ? alts : [""]) {
    const norm = normalizeAsr(a);
    const r = alignScore(exp, sylls(norm), twoOk);
    if (r.score > best.score) best = { ...r, heard: a, norm };
  }
  const tonesWant = spokenTones(expected);
  const measured = pitchTones && pitchTones.filter((x) => x !== undefined).length >= Math.ceil(exp.length / 2) ? pitchTones : null;
  const marks = chars.map((c, i) => {
    const tone = measured ? { want: tonesWant[i], got: measured[i], ok: toneOk(tonesWant[i], measured[i], i === chars.length - 1) } : undefined;
    return { char: c, py: exp[i] || "", ok: best.marks[i] || 0, tone };
  });
  const sylPct = Math.round(best.score * 100);
  const tonePct = measured ? Math.round((marks.filter((m) => m.tone?.ok).length / Math.max(1, marks.length)) * 100) : null;
  // Đo thanh bằng YIN trên máy chỉ đúng ~40–60% kể cả với giọng chuẩn (xem tests/yin_*.test.ts) → chỉ để tham khảo, không tính điểm.
  const percent = sylPct;
  const pass = !!best.norm && sylPct >= PASS_PCT;
  const wrong = marks.filter((m) => m.ok < 1).map((m) => m.char);
  let message: string;
  if (!best.norm) message = "Máy chưa nghe được chữ nào. Nói to, rõ, gần mic hơn (không tính lượt).";
  else if (pass) message = wrong.length ? `Đạt ${percent}%. Chú ý thêm: ${wrong.join(" ")}.` : `Đạt ${percent}%. Rõ ràng, đúng âm.`;
  else message = `Chưa đạt (${percent}%, cần ${PASS_PCT}%). Âm chưa khớp: ${wrong.join(" ") || "—"}.`;
  if (tonePct !== null && tonePct < 50) message += " (Tham khảo) Cao độ nghe còn lệch — nghe mẫu rồi bắt chước.";
  return { pass, percent, sylPct, tonePct, heard: best.heard, heardNorm: best.norm, marks, message };
}

/* ---------- Thanh điệu v2: YIN contour → sửa quãng tám → chia đều phần hữu thanh → so cao độ tương đối ---------- */
function med(a: number[]): number { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length ? (b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2) : 0; }

/** Từ đường cao độ (Hz, 0 = vô thanh) → thanh từng âm tiết. */
export function tonesFromContour(hz: number[], count: number): (number | undefined)[] {
  const voicedIdx = hz.map((h, i) => (h >= 70 && h <= 500 ? i : -1)).filter((i) => i >= 0);
  if (voicedIdx.length < count * 3 || count <= 0) return new Array(count).fill(undefined);
  const m0 = med(voicedIdx.map((i) => hz[i]));
  // sửa nhảy quãng tám
  let v = voicedIdx.map((i) => { let h = hz[i]; if (h > m0 * 1.7) h /= 2; else if (h < m0 * 0.6) h *= 2; return h; });
  // lọc trung vị 5
  v = v.map((_, i) => med(v.slice(Math.max(0, i - 2), i + 3)));
  const ref = med(v);
  const st = v.map((h) => 12 * Math.log2(h / ref));
  // chia theo các khoảng vô thanh (ranh giới âm tiết thật) rồi gộp/chia cho đủ count
  const runs: { s: number; e: number }[] = [];
  let s = 0;
  for (let k = 1; k <= voicedIdx.length; k++) {
    if (k === voicedIdx.length || voicedIdx[k] - voicedIdx[k - 1] > 2) { runs.push({ s, e: k }); s = k; }
  }
  let segs = runs.filter((r) => r.e - r.s >= 2);
  while (segs.length > count) { // gộp đoạn ngắn nhất vào hàng xóm
    let j = 0; for (let k = 1; k < segs.length; k++) if (segs[k].e - segs[k].s < segs[j].e - segs[j].s) j = k;
    const nb = j === 0 ? 1 : j === segs.length - 1 ? j - 1 : (segs[j - 1].e - segs[j - 1].s < segs[j + 1].e - segs[j + 1].s ? j - 1 : j + 1);
    const a = Math.min(j, nb); segs.splice(a, 2, { s: segs[a].s, e: segs[a + 1].e });
  }
  while (segs.length < count && segs.length) { // chia đoạn dài nhất
    let j = 0; for (let k = 1; k < segs.length; k++) if (segs[k].e - segs[k].s > segs[j].e - segs[j].s) j = k;
    const r = segs[j]; const mid = (r.s + r.e) >> 1; if (mid - r.s < 2) break;
    segs.splice(j, 1, { s: r.s, e: mid }, { s: mid, e: r.e });
  }
  if (segs.length !== count) return new Array(count).fill(undefined);
  return segs.map((r) => {
    const x = st.slice(r.s, r.e);
    const n = x.length;
    const a = Math.max(0, Math.floor(n * 0.1)), b = Math.max(a + 1, Math.ceil(n * 0.9));
    const y = x.slice(a, b);
    const q = Math.max(1, Math.floor(y.length / 3));
    const start = med(y.slice(0, q)), end = med(y.slice(-q)), mean = y.reduce((p, c) => p + c, 0) / y.length;
    let mn = Infinity, mx = -Infinity, imn = 0, imx = 0;
    y.forEach((v, k) => { if (v < mn) { mn = v; imn = k; } if (v > mx) { mx = v; imx = k; } });
    const L = Math.max(1, y.length - 1);
    const slope = end - start;
    if (n < 4 && Math.abs(slope) < 2) return 5;
    if (mx - end >= 3 && imx / L < 0.5 && slope <= -2.5) return 4;
    if (imn / L > 0.15 && imn / L < 0.85 && start - mn >= 1.5 && end - mn >= 1.5) return 3;
    if (slope >= 2.5 && imn / L < 0.5) return 2;
    if (slope <= -3) return 4;
    if (count > 1 && mean <= -2.5) return 3;
    if (Math.abs(slope) < 2 && (count === 1 || mean >= -1.5)) return 1;
    return slope > 0 ? 2 : slope < -1.5 ? 4 : 3;
  });
}

/** Đường cao độ có cổng năng lượng: khung yếu hơn ~-22 dB so với khung to nhất coi là vô thanh (bỏ nhiễu nền 70–80 Hz / 500 Hz giả). */
export function gatedContour(samples: Float32Array, sampleRate: number, yin: (s: Float32Array, sr: number) => { times: number[]; hz: number[] }): { times: number[]; hz: number[] } {
  const c = yin(samples, sampleRate);
  const frame = 1024, hop = 256;
  const rms: number[] = [];
  for (let start = 0, k = 0; start + frame < samples.length && k < c.hz.length; start += hop, k++) {
    let s = 0; for (let i = start; i < start + frame; i++) s += samples[i] * samples[i];
    rms.push(Math.sqrt(s / frame));
  }
  const top = Math.max(...rms, 1e-9);
  const hz = c.hz.map((h, i) => ((rms[i] ?? 0) >= top * 0.08 && h >= 75 && h <= 450 ? h : 0));
  return { times: c.times, hz };
}
