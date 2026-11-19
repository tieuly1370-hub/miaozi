/** Smart Queue Engine v2 — thuần logic (không DOM) để test được bằng node. */
export type SecId = "s1" | "s2" | "s3" | "s4" | "s5" | "s6a" | "s6b";
/** v2.1: chỉ còn Công ty và Cạn pin. Không chọn chế độ → app tự gợi ý mục tiếp theo. ("Xin nghỉ" là hành động trong ngày, không phải chế độ.) */
export type Mode = "company" | "low";
export const SEC_ORDER: SecId[] = ["s1", "s2", "s3", "s4", "s5", "s6a", "s6b"];
export const WEIGHT: Record<SecId, number> = { s1: 0, s2: 25, s3: 25, s4: 20, s5: 15, s6a: 7.5, s6b: 7.5 };
export const SILENT: SecId[] = ["s2", "s3", "s6a"];
export const MODE_MIN: Record<Mode, number> = { company: 20, low: 15 };
/** Số mục gợi ý khi không chọn chế độ. */
export const SUGGEST_N = 1;
export const LOW_MAX = 3;

export interface SecRec { done?: boolean; at?: number; owed?: { at: number; due: string; reason: string } }
export type SecMap = Partial<Record<SecId, SecRec>>;

export function percent(sec: SecMap): number {
  return SEC_ORDER.reduce((a, id) => a + (sec[id]?.done ? WEIGHT[id] : 0), 0);
}

/** Mục chưa xong (bỏ Mục 1 — Mục 1 chỉ sáng khi có lỗi phạt). Mục đang "nợ" vẫn là chưa xong. */
export function pending(sec: SecMap): SecId[] {
  return SEC_ORDER.filter((id) => id !== "s1" && !sec[id]?.done);
}

/** Mục được làm sáng theo chế độ. */
export function activeSections(mode: Mode | null, sec: SecMap, hasPenalty: boolean): SecId[] {
  const rest = pending(sec);
  const pen: SecId[] = hasPenalty ? ["s1"] : [];
  switch (mode) {
    case "company": return rest.filter((id) => SILENT.includes(id));
    case "low": return [...pen, ...rest.slice(0, 1)];
    default: return [...pen, ...rest.slice(0, SUGGEST_N)];
  }
}

/** Mục sẽ đạt sau khi làm hết các mục được làm sáng. */
export function percentAfter(mode: Mode | null, sec: SecMap, hasPenalty: boolean): number {
  const next: SecMap = { ...sec };
  for (const id of activeSections(mode, sec, hasPenalty)) next[id] = { done: true };
  return percent(next);
}

/** Bài xong 100%? */
export function lessonComplete(sec: SecMap): boolean { return percent(sec) >= 100 - 1e-9; }
/** Mở bài sau: đủ 100%, hoặc mọi mục còn thiếu đang "nợ" trong hạn tuần này. */
export function unlocksNext(sec: SecMap, today: string): boolean {
  return SEC_ORDER.filter((id) => id !== "s1").every((id) => sec[id]?.done || (sec[id]?.owed && sec[id]!.owed!.due >= today));
}

/* ---------- ngày / tuần ---------- */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function mondayOf(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay() || 7; // CN = 7
  x.setDate(x.getDate() - (dow - 1));
  return ymd(x);
}
export function sundayOf(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay() || 7;
  x.setDate(x.getDate() + (7 - dow));
  return ymd(x);
}

/* ---------- Cạn pin ---------- */
export interface LowEnergy { weekStart: string; count: number; days: string[] }
export function normLow(le: LowEnergy | undefined, now: Date): LowEnergy {
  const ws = mondayOf(now);
  if (!le || le.weekStart !== ws) return { weekStart: ws, count: 0, days: [] };
  return le;
}
export function lowLeft(le: LowEnergy | undefined, now: Date): number {
  return Math.max(0, LOW_MAX - normLow(le, now).count);
}
/** Chọn Cạn pin hôm nay: mỗi ngày chỉ trừ 1 lượt. Trả null nếu đã hết lượt. */
export function useLow(le: LowEnergy | undefined, now: Date): LowEnergy | null {
  const cur = normLow(le, now);
  const today = ymd(now);
  if (cur.days.includes(today)) return cur;
  if (cur.count >= LOW_MAX) return null;
  return { weekStart: cur.weekStart, count: cur.count + 1, days: [...cur.days, today] };
}
export const LOW_LABEL = (left: number) => `🔋 Cạn pin 15p (Còn ${left}/3 lượt tuần này)`;
export const LOW_EMPTY_MSG = "Bạn đã dùng hết 3 lượt Cạn pin tuần này, hãy học theo gợi ý hoặc chọn Chế độ Công ty nhé!";

/* ---------- streak ---------- */
/** Chuỗi: ngày học hoặc ngày "bận" (dời ca) đều giữ chuỗi; ngày trống làm đứt chuỗi. Hôm nay chưa học thì chưa đứt. */
export function streakFrom(studied: Set<string>, busy: Set<string>, today: Date, legacy?: { count: number; date: string } | null): number {
  let n = 0;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!studied.has(ymd(d))) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 3650; i++) {
    const k = ymd(d);
    if (legacy && legacy.count > 0 && k === legacy.date) return n + legacy.count;
    if (studied.has(k)) n++;
    else if (!busy.has(k)) break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/* ---------- Xin nghỉ ---------- */
/**
 * Hôm sau ngày "Xin nghỉ": thêm chép phạt.
 * - Case 1: chưa có chép phạt nào đang chờ → giao ≥ 5 từ của bài gần nhất.
 * - Case 2: đang có chép phạt chờ → thêm ≥ 5 từ nữa.
 * - Trần: tổng số từ phải chép (đang chờ + thêm) ≤ toàn bộ từ mới của bài trước.
 * Trả về danh sách từ cần thêm (có thể rỗng khi đã chạm trần).
 */
export const OFF_ADD = 5;
export function offPenaltyWords(pending: string[], lessonWords: string[], pick: (a: string[]) => string[] = (a) => a): string[] {
  const pend = new Set(pending);
  const cap = new Set(lessonWords).size;
  const room = Math.max(0, cap - pend.size);
  const pool = pick([...new Set(lessonWords)].filter((w) => !pend.has(w)));
  return pool.slice(0, Math.min(OFF_ADD, room));
}
