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
