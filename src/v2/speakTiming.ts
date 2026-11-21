/** v2.1 — khi nào ngừng nghe (thuần, có unit test). */
export const SILENCE_END_MS = 2500;
export const MAX_LISTEN_MS = 15000;
export const GRACE_MS = 3000;
export interface ListenClock { elapsed: number; hasSpeech: boolean; sinceLastSpeech: number }
/**
 * - Tối đa 15 s.
 * - Chưa nói gì: không tự dừng (chờ tới 15 s hoặc bấm “Xong”).
 * - Đã nói: dừng khi im ≥ 2,5 s — nhưng không bao giờ trước 3 s đầu.
 */
export function shouldStop(c: ListenClock): boolean {
  if (c.elapsed >= MAX_LISTEN_MS) return true;
  return c.hasSpeech && c.elapsed >= GRACE_MS && c.sinceLastSpeech >= SILENCE_END_MS;
}
/** Ghép các đoạn kết quả cuối (continuous) thành danh sách phương án cho chấm điểm. */
export function joinAlts(finals: string[][], interim: string): string[] {
  const out = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const s = finals.map((f) => f[i] ?? f[0] ?? "").join("") + interim;
    if (s.trim()) out.add(s.trim());
  }
  if (!out.size && interim.trim()) out.add(interim.trim());
  return [...out];
}

/** Máy chỉ cho một bên dùng mic (Android, tablet Xiaomi chế độ desktop/PC). */
export function exclusiveMic(ua = "", hints?: { maxTouchPoints?: number; mobile?: boolean }): boolean {
  const u = ua || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (/Android/i.test(u)) return true;
  const touch = (hints?.maxTouchPoints ?? (typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0)) > 1;
  const mobile = hints?.mobile === true;
  return /Linux/i.test(u) && !/Android/i.test(u) && (touch || mobile);
}
/** Bật dòng gỡ lỗi nhận giọng khi URL có ?debug (search hoặc trong hash). */
export function asrDebugOn(search = "", hash = ""): boolean {
  return /(?:\?|&)debug(?:&|=|$)/.test(search) || /(?:\?|&)debug(?:&|=|$)/.test(hash);
}
/** Giữ chữ đã nghe; không để phiên sau (interim rỗng) xoá mất. */
export function rememberHeard(kept: string, candidate: string): string {
  const c = (candidate || "").trim();
  if (!c) return kept;
  if (!kept) return c;
  if (c.length >= kept.length) return c;
  if (kept.includes(c) || c.includes(kept)) return kept.length >= c.length ? kept : c;
  return kept;
}
/** Ghép final + interim + chữ đã giữ để chấm. */
export function collectAlts(finals: string[][], sessionFinals: string[][], interim: string, kept: string): string[] {
  const alts = joinAlts([...finals, ...sessionFinals], interim);
  const k = (kept || "").trim();
  if (!alts.length && k) return [k];
  if (k && !alts.some((a) => a.includes(k) || k.includes(a))) return [k, ...alts];
  return alts;
}
