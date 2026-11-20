/**
 * Phát âm TTS: một số chữ bị máy đọc sai.
 * 哪 thường bị Xiaoxiao/Google đọc thành nái (nai3) thay vì nǎ (na3).
 * Dùng bản đồ này mọi nơi gọi TTS, và khi tạo lại file âm.
 */
export const PRON_OVERRIDE: Record<string, string> = {
  // pinyin số — dùng khi engine nhận phiên âm
  "哪": "na3",
};

/** SSML phoneme SAPI (Azure / edge-tts) cho chữ cần ép thanh. */
export const SSML_PHONEME: Record<string, string> = {
  "哪": "na 3",
};

const HAS_OVERRIDE = /哪/;

export function needsPronOverride(text: string): boolean {
  return HAS_OVERRIDE.test(text);
}

/** Bọc chữ hay đọc sai trong SSML phoneme, giữ nguyên chữ khác (escape XML). */
export function ttsSsml(text: string, lang = "zh-CN"): string {
  let body = "";
  for (const ch of text) {
    const ph = SSML_PHONEME[ch];
    const esc = ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch;
    body += ph
      ? `<phoneme alphabet="sapi" ph="${ph}">${esc}</phoneme>`
      : esc;
  }
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">${body}</speak>`;
}

/** Văn bản gửi cho speechSynthesis / engine không SSML: chèn pinyin đúng thanh sau chữ hay đọc sai. */
export function ttsInput(text: string): string {
  return [...text].map((c) => {
    const py = PRON_OVERRIDE[c];
    return py ? `${c}（${numToMark(py)}）` : c;
  }).join("");
}

const TONE: Record<string, string> = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", ü: "ǖǘǚǜ" };
/** "na3" → "nǎ" */
export function numToMark(s: string): string {
  const m = /^([a-zü:]+)([1-5])$/.exec(s.toLowerCase());
  if (!m) return s;
  const b = m[1].replace(/v|u:/g, "ü"), t = Number(m[2]);
  if (t === 5) return b;
  let i = b.search(/[ae]/);
  if (i < 0) i = b.indexOf("ou");
  if (i < 0) { for (let j = b.length - 1; j >= 0; j--) if (TONE[b[j]]) { i = j; break; } }
  return i < 0 ? b : b.slice(0, i) + TONE[b[i]][t - 1] + b.slice(i + 1);
}
