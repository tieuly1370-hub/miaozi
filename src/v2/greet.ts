/** Lời chào Miao ở Hôm nay: chọn ngữ cảnh → bốc ngẫu nhiên 1 câu (không lặp câu vừa hiện), điền tên mục / số chữ. Thuần, test được. */
export type GreetIn = { off: boolean; mode: string; penN: number; act: string[]; allDone: boolean; firstOpen: boolean };
export const SEC_SAY: Record<string, string> = { s1: "chép phạt", s2: "Nạp từ", s3: "Ngữ pháp & Đọc hiểu", s4: "Thực hành viết", s5: "Luyện nói", s6a: "bài kiểm tra 6A", s6b: "bài kiểm tra 6B" };
export const joinVi = (a: string[]) => (a.length < 2 ? a[0] || "" : a.slice(0, -1).join(", ") + " và " + a[a.length - 1]);
/** Thứ tự ưu tiên: nghỉ > cạn pin > công ty > chép phạt > xong hết > mở app lần đầu trong ngày > đang chờ mục. */
export function greetCtx(g: GreetIn): string {
  if (g.off) return "nghi";
  if (g.mode === "low") return "can_pin";
  if (g.mode === "company") return "cong_ty";
  if (g.penN > 0) return "chep_phat";
  if (g.allDone || !g.act.length) return "xong_het";
  return g.firstOpen ? "mo_app" : "cho_muc";
}
export function fillGreet(text: string, vars: { muc?: string; n?: number }): string {
  const t = text.replace(/\{muc\}/g, vars.muc || "bài hôm nay").replace(/\{n\}/g, String(vars.n ?? 0));
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export function pickGreet<T extends { id: string; ctx: string }>(lines: T[], ctx: string, lastId?: string | null, rand: () => number = Math.random): T | undefined {
  const pool = lines.filter((l) => l.ctx === ctx);
  const cand = pool.length > 1 ? pool.filter((l) => l.id !== lastId) : pool;
  return cand[Math.floor(rand() * cand.length) % Math.max(1, cand.length)];
}
