/** Mẹo nhớ nhanh (không AI): HSK1 dùng mẹo đã soạn trong hanziInfo.ts, trình bày theo khuôn
 *  «Chữ 好 (hảo) – tốt: … mẹ 女 … con 子 …» — chèn mặt chữ của mảnh sau từ chỉ nghĩa của nó. */
import { HANZI_INFO } from "../data/hanziInfo";
import { PARTS } from "../data/hanziParts";
import { ALL_WORDS } from "../data/curriculum";

export interface Mnemo { char: string; hv: string; gloss: string; parts: { hz: string; hv: string; vi: string }[]; story: string; line: string }
/** Từ đồng nghĩa hay gặp trong mẹo đã soạn → để tìm chỗ chèn mặt chữ. */
const SYN: Record<string, string[]> = {
  "女": ["mẹ", "phụ nữ", "người nữ", "cô gái", "con gái", "nữ"], "子": ["con", "đứa trẻ", "trẻ"], "亻": ["người"], "人": ["người"], "口": ["miệng", "mồm"],
  "宀": ["mái nhà", "mái"], "木": ["cây", "gỗ"], "日": ["mặt trời", "ngày"], "月": ["trăng", "thịt", "tháng"], "心": ["trái tim", "tim", "lòng"], "忄": ["tim", "lòng"],
  "氵": ["nước"], "讠": ["lời nói", "lời"], "扌": ["tay"], "辶": ["bước đi", "bước", "đi"], "土": ["đất"], "门": ["cửa"], "目": ["mắt"], "艹": ["cỏ"],
  "火": ["lửa"], "灬": ["lửa"], "钅": ["kim loại", "vàng"], "贝": ["tiền", "vỏ sò"], "饣": ["ăn", "đồ ăn"], "纟": ["sợi tơ", "tơ", "sợi"], "雨": ["mưa"],
  "王": ["ngọc", "vua"], "大": ["người dang", "lớn"], "小": ["nhỏ"], "力": ["sức"], "刂": ["dao"], "田": ["ruộng"], "又": ["tay"], "豕": ["heo", "lợn"],
  "玉": ["ngọc"], "囗": ["khung", "vây quanh"], "马": ["ngựa"], "车": ["xe"], "见": ["thấy", "nhìn"], "白": ["trắng"], "夕": ["buổi tối", "tối"], "十": ["mười"], "一": ["một"], "八": ["tám"], "竹": ["tre"], "⺮": ["tre"],
};
const L = "\\p{L}\\p{M}";
const glossOf = (c: string, note: string) => {
  const w = ALL_WORDS.find((x) => x.hanzi === c);
  if (w) return w.vi;
  const m = note.split("—"); return m.length > 1 ? m[m.length - 1].replace(/[.。]\s*$/, "").trim() : "";
};
export const cleanPart = (p: string) => p.replace(/\s*\(.*$|\s*\.\.\.$|\)$/g, "").trim();
export function mnemonicFor(c: string): Mnemo | null {
  const h = HANZI_INFO[c];
  if (!h) return null;
  const parts = h.parts.map(cleanPart).filter((p) => p && p !== c && /[\u2e80-\u9fff]/.test(p))
    .map((p) => ({ hz: p, hv: PARTS[p]?.[0] || HANZI_INFO[p]?.hv || "", vi: PARTS[p]?.[1] || "" }));
  let story = h.note;
  for (const p of parts) {
    if (story.includes(p.hz)) continue;
    const words = [...(SYN[p.hz] || []), ...p.vi.split(/[/;,()]/).map((x) => x.trim()).filter((x) => x.length > 1)];
    for (const wd of words) {
      const re = new RegExp(`(^|[^${L}])(${wd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![${L}])`, "iu");
      const m = re.exec(story);
      if (m) { const at = m.index + m[1].length + m[2].length; story = story.slice(0, at) + " " + p.hz + story.slice(at); break; }
    }
  }
  const gloss = glossOf(c, h.note);
  const body = story.charAt(0).toLowerCase() + story.slice(1);
  return { char: c, hv: h.hv, gloss, parts, story, line: `Chữ ${c} (${h.hv})${gloss ? " – " + gloss.toLowerCase() : ""}: ${body}` };
}
