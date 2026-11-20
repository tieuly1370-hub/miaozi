/** Miao 2.2 — bộ đếm đúng/sai liên tiếp + chọn lời thoại. Thuần logic (không DOM, không store) để test bằng node. */
import { MIAO_LINES, type MiaoExpr, type MiaoLine } from "../data/miaoLines.ts";

export type MiaoEvent = "answer" | "can_pin" | "xin_nghi" | "thanh_tich" | "mo_app";
export interface MiaoCounters { right: number; wrong: number; day: string }
export interface MiaoCtx { ev: MiaoEvent; ok?: boolean; right: number; wrong: number }
/** Bảng luật: xét từ trên xuống, luật đầu tiên khớp thắng. Thêm nhóm mới = thêm một dòng + câu thoại cùng `group`. */
export interface MiaoRule { group: string; when: (c: MiaoCtx) => boolean; note: string }
export const MIAO_RULES: MiaoRule[] = [
  { group: "sai_lien_tuc", note: "sai ≥ 3 liên tiếp", when: (c) => c.ev === "answer" && c.ok === false && c.wrong >= 3 },
  { group: "sai_lan_2", note: "sai lần 2 liên tiếp", when: (c) => c.ev === "answer" && c.ok === false && c.wrong === 2 },
  { group: "sai_lan_dau", note: "sai lần đầu", when: (c) => c.ev === "answer" && c.ok === false && c.wrong === 1 },
  { group: "dung_nhieu", note: "đúng ≥ 5 liên tiếp", when: (c) => c.ev === "answer" && c.ok === true && c.right >= 5 },
  { group: "dung_vai_lan", note: "đúng 2–4 liên tiếp", when: (c) => c.ev === "answer" && c.ok === true && c.right >= 2 },
  { group: "dung_nhieu", note: "thành tích: xong mục / đạt bài kiểm tra", when: (c) => c.ev === "thanh_tich" },
  { group: "can_pin", note: "dùng lượt Cạn pin cuối của tuần", when: (c) => c.ev === "can_pin" },
  { group: "xin_nghi", note: "bấm Xin nghỉ (luôn cà khịa)", when: (c) => c.ev === "xin_nghi" },
];
export const MIAO_IMG: Record<MiaoExpr, string> = {
  vui: "vui", dac_y: "dac_y", ngai_ngu: "ngai_ngu", kho_chiu: "kho_chiu", cuoi_khinh_bi: "cuoi_khinh_bi", quan_tam: "quan_tam", nghi_ngo: "nghi_ngo", cau: "cau",
};
export const miaoSrc = (e: MiaoExpr) => `./miao/${MIAO_IMG[e]}.webp`;

export interface MiaoSay { line: MiaoLine; group: string }
export function createMiao(opts: { rand?: () => number; lines?: MiaoLine[] } = {}) {
  const rand = opts.rand || Math.random;
  const lines = opts.lines || MIAO_LINES;
  const c: MiaoCounters = { right: 0, wrong: 0, day: "" };
  let lastId = "";
  const roll = (day: string) => { if (c.day !== day) { c.day = day; c.right = 0; c.wrong = 0; } };
  const pick = (group: string): MiaoLine | null => {
    const pool = lines.filter((l) => l.group === group);
    if (!pool.length) return null;
    const cand = pool.length > 1 ? pool.filter((l) => l.id !== lastId) : pool;
    const l = cand[Math.floor(rand() * cand.length) % cand.length];
    lastId = l.id;
    return l;
  };
  const fire = (ctx: MiaoCtx): MiaoSay | null => {
    const r = MIAO_RULES.find((x) => x.when(ctx));
    if (!r) return null;
    const line = pick(r.group);
    return line ? { line, group: r.group } : null;
  };
  return {
    counters: c,
    get lastId() { return lastId; },
    /** Trả lời một câu: đúng → xoá chuỗi sai, sai → xoá chuỗi đúng. Sang ngày mới thì đếm lại. */
    answer(ok: boolean, day: string): MiaoSay | null {
      roll(day);
      if (ok) { c.right += 1; c.wrong = 0; } else { c.wrong += 1; c.right = 0; }
      return fire({ ev: "answer", ok, right: c.right, wrong: c.wrong });
    },
    event(ev: Exclude<MiaoEvent, "answer">, day: string): MiaoSay | null {
      roll(day);
      return fire({ ev, right: c.right, wrong: c.wrong });
    },
  };
}
/** Cạn pin: chỉ cà khịa khi lượt vừa dùng là lượt cuối (3/3) của tuần — lượt còn lại đi từ 1 về 0. */
export const canPinTrigger = (leftBefore: number, leftAfter: number) => leftBefore === 1 && leftAfter === 0;
